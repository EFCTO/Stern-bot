const fs = require("fs");
const path = require("path");

class ChzzkRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { broadcasters: [] };
  }

  async load() {
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.broadcasters)) {
          this.data.broadcasters = parsed.broadcasters.map(b => ({ ...b }));
        } else if (parsed.broadcaster && typeof parsed.broadcaster === "object") {
          // backward-compat: migrate single broadcaster to array
          this.data.broadcasters = [{ ...parsed.broadcaster }];
        } else {
          this.data.broadcasters = [];
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("치지직 저장소 로드 실패", error);
      }
      await this.#ensureDirectory();
      await this.#write();
    }
  }

  getBroadcasters() {
    return this.data.broadcasters.map(b => ({ ...b }));
  }

  async setBroadcasters(list) {
    this.data.broadcasters = Array.isArray(list) ? list.map(b => ({ ...b })) : [];
    await this.#write();
  }

  async upsertBroadcaster(broadcaster) {
    if (!broadcaster || !broadcaster.channelId) return;
    const i = this.data.broadcasters.findIndex(b => b.channelId === broadcaster.channelId);
    if (i >= 0) {
      this.data.broadcasters[i] = { ...this.data.broadcasters[i], ...broadcaster };
    } else {
      this.data.broadcasters.push({ ...broadcaster });
    }
    await this.#write();
  }

  async removeBroadcaster(channelIdOrName) {
    const before = this.data.broadcasters.length;
    const key = String(channelIdOrName || "").toLowerCase();
    this.data.broadcasters = this.data.broadcasters.filter(
      b => !(b.channelId === channelIdOrName || String(b.channelName || "").toLowerCase() === key)
    );
    const changed = this.data.broadcasters.length !== before;
    if (changed) await this.#write();
    return changed;
  }

  async #write() {
    await this.#ensureDirectory();
    const payload = JSON.stringify({ broadcasters: this.data.broadcasters }, null, 2);
    await fs.promises.writeFile(this.filePath, payload, "utf8");
  }

  async #ensureDirectory() {
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

module.exports = ChzzkRepository;

