class Track {
  constructor({
    title,
    url,
    durationMS = 0,
    thumbnail,
    author,
    source = "youtube",
    requestedBy,
    raw
  }) {
    this.title = title;
    this.url = url;
    this.durationMS = durationMS;
    this.thumbnail = thumbnail;
    this.author = author;
    this.source = source;
    this.requestedBy = requestedBy;
    this.raw = raw;
    this.addedAt = Date.now();
  }

  get durationSeconds() {
    return Math.floor(this.durationMS / 1000);
  }
}

module.exports = Track;
