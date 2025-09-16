class Party {
  constructor({
    game,
    hostId,
    channelId,
    messageId = null,
    mode = null,
    maxSlots = null,
    faction = null,
    createdAt = Date.now(),
    endedAt = null,
    members = [],
    hoi4ServerId = null,
    hoi4Pw = null,
    hoi4Version = null,
    hoi4Mods = null
  }) {
    this.game = game
    this.hostId = hostId
    this.channelId = channelId
    this.messageId = messageId
    this.mode = mode
    this.maxSlots = maxSlots
    this.faction = faction
    this.createdAt = createdAt
    this.endedAt = endedAt
    this.members = members
    this.hoi4ServerId = hoi4ServerId
    this.hoi4Pw = hoi4Pw
    this.hoi4Version = hoi4Version
    this.hoi4Mods = hoi4Mods
    this.lastRemindAt = null
  }

  isFull() {
    return this.maxSlots !== null && this.members.length >= this.maxSlots
  }

  addMember(userId) {
    if (!this.isFull() && !this.members.includes(userId)) {
      this.members.push(userId)
      return true
    }
    return false
  }

  removeMember(userId) {
    this.members = this.members.filter(id => id !== userId)
  }

  hasAnyMember() {
    return this.members.length > 0
  }
}

module.exports = Party
