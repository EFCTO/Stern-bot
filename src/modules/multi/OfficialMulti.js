class OfficialMulti {
  constructor(data) {
    this.hostId = data.hostId;
    this.channelId = data.channelId ?? null;
    this.messageId = data.messageId ?? null;
    this.multiId = data.multiId ?? "";
    this.password = data.password ?? "";
    this.status = data.status ?? "active";
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.startedAt = data.startedAt ? new Date(data.startedAt) : null;
    this.endedAt = data.endedAt ? new Date(data.endedAt) : null;
    this.participants = Array.isArray(data.participants)
      ? data.participants.map(participant => ({
          userId: participant.userId,
          nickname: participant.nickname ?? "",
          country: participant.country ?? "",
          joinedAt: participant.joinedAt ? new Date(participant.joinedAt) : new Date()
        }))
      : [];
    this.blockedUserIds = new Set(Array.isArray(data.blockedUserIds) ? data.blockedUserIds : []);
  }

  hasParticipant(userId) {
    return this.participants.some(participant => participant.userId === userId);
  }

  isBlocked(userId) {
    return this.blockedUserIds.has(userId);
  }

  isCountryTaken(country) {
    if (!country) {
      return false;
    }
    const normalized = country.trim().toLowerCase();
    return this.participants.some(participant => (participant.country ?? "").trim().toLowerCase() === normalized);
  }

  addParticipant(data) {
    if (!data?.userId) {
      throw new Error("userId is required to add participant");
    }
    if (this.hasParticipant(data.userId)) {
      return false;
    }
    if (this.isCountryTaken(data.country)) {
      return false;
    }
    this.participants.push({
      userId: data.userId,
      nickname: data.nickname ?? "",
      country: data.country ?? "",
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date()
    });
    return true;
  }

  removeParticipant(userId) {
    const before = this.participants.length;
    this.participants = this.participants.filter(participant => participant.userId !== userId);
    return this.participants.length !== before;
  }

  blockUser(userId) {
    if (!userId) {
      return false;
    }
    const sizeBefore = this.blockedUserIds.size;
    this.blockedUserIds.add(userId);
    this.removeParticipant(userId);
    return this.blockedUserIds.size !== sizeBefore;
  }

  unblockUser(userId) {
    return this.blockedUserIds.delete(userId);
  }

  updateInfo({ multiId, password }) {
    if (typeof multiId === "string") {
      this.multiId = multiId;
    }
    if (typeof password === "string") {
      this.password = password;
    }
  }

  markStarted() {
    this.status = "started";
    this.startedAt = new Date();
    this.endedAt = null;
  }

  markEnded() {
    this.status = "ended";
    this.endedAt = new Date();
  }

  toJSON() {
    return {
      hostId: this.hostId,
      channelId: this.channelId,
      messageId: this.messageId,
      multiId: this.multiId,
      password: this.password,
      status: this.status,
      createdAt: this.createdAt?.toISOString?.() ?? this.createdAt,
      startedAt: this.startedAt ? (this.startedAt.toISOString?.() ?? this.startedAt) : null,
      endedAt: this.endedAt ? (this.endedAt.toISOString?.() ?? this.endedAt) : null,
      participants: this.participants.map(participant => ({
        userId: participant.userId,
        nickname: participant.nickname,
        country: participant.country,
        joinedAt: participant.joinedAt?.toISOString?.() ?? participant.joinedAt
      })),
      blockedUserIds: [...this.blockedUserIds]
    };
  }
}

module.exports = OfficialMulti;
