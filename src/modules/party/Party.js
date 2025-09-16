class Party {
  constructor(data) {
    this.game = data.game;
    this.hostId = data.hostId;
    this.channelId = data.channelId ?? null;
    this.messageId = data.messageId ?? null;
    this.mode = data.mode ?? null;
    this.maxSlots = data.maxSlots ?? null;
    this.faction = data.faction ?? null;
    this.createdAt = data.createdAt instanceof Date ? data.createdAt : new Date(data.createdAt ?? Date.now());
    this.endedAt = data.endedAt ? (data.endedAt instanceof Date ? data.endedAt : new Date(data.endedAt)) : null;
    this.members = Array.isArray(data.members) ? [...data.members] : [];
    this.hoi4ServerId = data.hoi4ServerId ?? null;
    this.hoi4Pw = data.hoi4Pw ?? null;
    this.hoi4Version = data.hoi4Version ?? null;
    this.hoi4Mods = data.hoi4Mods ?? null;
    this.lastRemindAt = data.lastRemindAt ? (data.lastRemindAt instanceof Date ? data.lastRemindAt : new Date(data.lastRemindAt)) : null;
  }

  get activeMembersCount() {
    return this.members.length;
  }

  isFull() {
    return this.maxSlots !== null && this.members.length >= this.maxSlots;
  }

  addMember(userId) {
    if (this.members.includes(userId)) return false;
    if (this.isFull()) return false;
    this.members.push(userId);
    return true;
  }

  removeMember(userId) {
    this.members = this.members.filter(id => id !== userId);
  }

  hasAnyMember() {
    return this.members.length > 0;
  }

  isExpired(maxAgeMs) {
    if (!Number.isFinite(maxAgeMs)) return false;
    const createdAt = this.createdAt instanceof Date ? this.createdAt : new Date(this.createdAt);
    return !this.endedAt && Date.now() - createdAt.getTime() >= maxAgeMs;
  }

  toJSON() {
    return {
      game: this.game,
      hostId: this.hostId,
      channelId: this.channelId,
      messageId: this.messageId,
      mode: this.mode,
      maxSlots: this.maxSlots,
      faction: this.faction,
      createdAt: this.createdAt instanceof Date ? this.createdAt.toISOString() : this.createdAt,
      endedAt: this.endedAt instanceof Date ? this.endedAt.toISOString() : this.endedAt,
      members: [...this.members],
      hoi4ServerId: this.hoi4ServerId,
      hoi4Pw: this.hoi4Pw,
      hoi4Version: this.hoi4Version,
      hoi4Mods: this.hoi4Mods,
      lastRemindAt: this.lastRemindAt instanceof Date ? this.lastRemindAt.toISOString() : this.lastRemindAt
    };
  }
}

module.exports = Party;
