const Party = require("./Party");

function createdAtMs(party) {
  const createdAt = party.createdAt instanceof Date ? party.createdAt : new Date(party.createdAt);
  return createdAt.getTime();
}

class PartyService {
  constructor(repository, options = {}) {
    this.repository = repository;
    this.options = {
      expirationMs: options.expirationMs ?? 24 * 60 * 60 * 1000,
      sweepIntervalMs: options.sweepIntervalMs ?? 10 * 60 * 1000
    };
    this.activeParties = new Map();
    this.drafts = new Map();
    this._sweepTimer = null;
  }

  async initialize() {
    this.activeParties = await this.repository.load();
    let mutated = false;
    for (const [messageId, party] of this.activeParties) {
      if (party.endedAt) {
        this.activeParties.delete(messageId);
        mutated = true;
      }
    }
    if (mutated) {
      await this.repository.save(this.activeParties);
    }
  }

  createDraft(data) {
    const members = Array.isArray(data.members) ? data.members.filter(Boolean) : [];
    if (data.hostId) {
      members.unshift(data.hostId);
    }
    const uniqueMembers = [...new Set(members)];

    let maxSlots = null;
    if (data.maxSlots != null) {
      const parsed = Number(data.maxSlots);
      if (Number.isInteger(parsed) && parsed > 0) {
        maxSlots = parsed;
      }
    }

    const draft = {
      hostId: data.hostId,
      game: data.game,
      createdAt: data.createdAt ?? new Date(),
      members: uniqueMembers,
      mode: data.mode ?? null,
      maxSlots,
      faction: data.faction ?? null,
      hoi4ServerId: data.hoi4ServerId ?? null,
      hoi4Pw: data.hoi4Pw ?? null,
      hoi4Version: data.hoi4Version ?? null,
      hoi4Mods: data.hoi4Mods ?? null
    };
    this.drafts.set(data.hostId, draft);
    return draft;
  }

  getDraft(hostId) {
    return this.drafts.get(hostId) ?? null;
  }

  updateDraft(hostId, changes) {
    const draft = this.drafts.get(hostId);
    if (!draft) throw new Error("Draft not found");
    Object.assign(draft, changes);
    return draft;
  }

  removeDraft(hostId) {
    this.drafts.delete(hostId);
  }

  async activateDraft(hostId, channelId, messageId) {
    if (!channelId || !messageId) {
      throw new Error("Channel ID와 Message ID가 필요합니다.");
    }
    const draft = this.drafts.get(hostId);
    if (!draft) throw new Error("Draft not found");
    const party = new Party({
      ...draft,
      channelId,
      messageId,
      createdAt: draft.createdAt
    });
    this.activeParties.set(messageId, party);
    this.drafts.delete(hostId);
    await this.repository.save(this.activeParties);
    return party;
  }

  getByMessageId(messageId) {
    return this.activeParties.get(messageId) ?? null;
  }

  getLastPartyByHostInChannel(channelId, hostId) {
    let latest = null;
    for (const party of this.activeParties.values()) {
      if (party.channelId !== channelId || party.hostId !== hostId) continue;
      if (!latest || createdAtMs(party) > createdAtMs(latest)) {
        latest = party;
      }
    }
    return latest;
  }

  getLatestPartyInChannel(channelId) {
    let latest = null;
    for (const party of this.activeParties.values()) {
      if (party.channelId !== channelId) continue;
      if (!latest || createdAtMs(party) > createdAtMs(latest)) {
        latest = party;
      }
    }
    return latest;
  }

  async updateParty(messageId, updater) {
    const party = this.activeParties.get(messageId);
    if (!party) return null;
    const before = JSON.stringify(party.toJSON());
    await Promise.resolve(updater(party));
    const after = JSON.stringify(party.toJSON());
    if (before !== after) {
      await this.repository.save(this.activeParties);
    }
    return party;
  }

  async addMember(messageId, userId) {
    const party = this.activeParties.get(messageId);
    if (!party) {
      return { status: "not_found" };
    }
    if (party.members.includes(userId)) {
      return { status: "already_member", party };
    }
    if (party.isFull()) {
      return { status: "full", party };
    }

    party.addMember(userId);
    await this.repository.save(this.activeParties);
    return { status: "joined", party };
  }

  async removeMember(messageId, userId) {
    const party = this.activeParties.get(messageId);
    if (!party) {
      return { status: "not_found" };
    }
    if (party.hostId === userId) {
      return { status: "is_host", party };
    }
    if (!party.members.includes(userId)) {
      return { status: "not_member", party };
    }

    party.removeMember(userId);
    await this.repository.save(this.activeParties);
    return { status: "left", party };
  }

  async removeParty(messageId) {
    this.activeParties.delete(messageId);
    await this.repository.save(this.activeParties);
  }

  async sweepExpired(handler) {
    const expired = [...this.activeParties.values()].filter(party => party.isExpired(this.options.expirationMs));
    for (const party of expired) {
      try {
        await handler(party);
      } catch (error) {
        console.error("만료 파티 처리 실패", error);
      }
    }
  }

  startSweepScheduler(handler) {
    this.stopSweepScheduler();
    this._sweepTimer = setInterval(() => {
      this.sweepExpired(handler).catch(err => console.error("파티 만료 스케줄러 오류", err));
    }, this.options.sweepIntervalMs);
    if (typeof this._sweepTimer.unref === "function") {
      this._sweepTimer.unref();
    }
  }

  stopSweepScheduler() {
    if (this._sweepTimer) {
      clearInterval(this._sweepTimer);
      this._sweepTimer = null;
    }
  }
}

module.exports = PartyService;