const OfficialMulti = require("./OfficialMulti");

class OfficialMultiService {
  constructor(repository) {
    this.repository = repository;
    this.multis = new Map();
  }

  async initialize() {
    this.multis = await this.repository.load();
  }

  async createMulti(data) {
    if (!data?.messageId) {
      throw new Error("messageId is required to create an official multi");
    }
    const multi = new OfficialMulti(data);
    this.multis.set(multi.messageId, multi);
    await this.repository.save(this.multis);
    return multi;
  }

  getByMessageId(messageId) {
    return this.multis.get(messageId) ?? null;
  }

  getLatestInChannel(channelId) {
    let latest = null;
    for (const multi of this.multis.values()) {
      if (multi.channelId !== channelId) continue;
      if (!latest || multi.createdAt > latest.createdAt) {
        latest = multi;
      }
    }
    return latest;
  }

  async updateMulti(messageId, updater) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return null;
    }
    const before = JSON.stringify(multi.toJSON());
    await Promise.resolve(updater(multi));
    const after = JSON.stringify(multi.toJSON());
    if (before !== after) {
      this.multis.set(messageId, multi);
      await this.repository.save(this.multis);
    }
    return multi;
  }

  async addParticipant(messageId, participant) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    if (multi.status !== "active") {
      return { status: "not_active", multi };
    }
    if (multi.isBlocked(participant.userId)) {
      return { status: "blocked", multi };
    }
    if (multi.hasParticipant(participant.userId)) {
      return { status: "already_joined", multi };
    }
    if (multi.isCountryTaken(participant.country)) {
      return { status: "country_taken", multi };
    }

    multi.addParticipant({
      userId: participant.userId,
      nickname: participant.nickname,
      country: participant.country,
      joinedAt: participant.joinedAt ?? new Date()
    });
    await this.repository.save(this.multis);
    return { status: "joined", multi };
  }

  async removeParticipant(messageId, userId) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    if (!multi.hasParticipant(userId)) {
      return { status: "not_participant", multi };
    }

    multi.removeParticipant(userId);
    await this.repository.save(this.multis);
    return { status: "removed", multi };
  }

  async blockUser(messageId, userId) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    const alreadyBlocked = multi.isBlocked(userId);
    multi.blockUser(userId);
    await this.repository.save(this.multis);
    return { status: alreadyBlocked ? "already_blocked" : "blocked", multi };
  }

  async unblockUser(messageId, userId) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    const removed = multi.unblockUser(userId);
    if (removed) {
      await this.repository.save(this.multis);
    }
    return { status: removed ? "unblocked" : "not_blocked", multi };
  }

  async kickUser(messageId, userId) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    const wasParticipant = multi.hasParticipant(userId);
    if (!wasParticipant) {
      return { status: "not_participant", multi };
    }
    multi.removeParticipant(userId);
    await this.repository.save(this.multis);
    return { status: "kicked", multi };
  }

  async updateInfo(messageId, changes) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }

    await this.updateMulti(messageId, target => {
      target.updateInfo({
        multiId: changes.multiId ?? target.multiId,
        password: changes.password ?? target.password
      });
    });
    return { status: "updated", multi: this.multis.get(messageId) };
  }

  async markStarted(messageId) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    if (multi.status === "started") {
      return { status: "already_started", multi };
    }
    if (multi.status === "ended") {
      return { status: "already_ended", multi };
    }

    multi.markStarted();
    await this.repository.save(this.multis);
    return { status: "started", multi };
  }

  async endMulti(messageId) {
    const multi = this.multis.get(messageId);
    if (!multi) {
      return { status: "not_found" };
    }
    if (multi.status === "ended") {
      return { status: "already_ended", multi };
    }

    multi.markEnded();
    await this.repository.save(this.multis);
    return { status: "ended", multi };
  }
}

module.exports = OfficialMultiService;
