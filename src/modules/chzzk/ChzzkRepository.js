const fs = require("fs");
const path = require("path");

class ChzzkRepository {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { broadcaster: null };
  }

  async load() {
    try {
      const raw = await fs.promises.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        this.data.broadcaster = parsed.broadcaster ?? null;
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error("치지직 저장소 로드 실패", error);
      }
      await this.#ensureDirectory();
      await this.#write();
    }
  }

  async setBroadcaster(broadcaster) {
    this.data.broadcaster = broadcaster ? { ...broadcaster } : null;
    await this.#write();
  }

  getBroadcaster() {
    const broadcaster = this.data.broadcaster;
    return broadcaster ? { ...broadcaster } : null;
  }

  async #write() {
    await this.#ensureDirectory();
    const payload = JSON.stringify(this.data, null, 2);
    await fs.promises.writeFile(this.filePath, payload, "utf8");
  }

  async #ensureDirectory() {
    const dir = path.dirname(this.filePath);
    await fs.promises.mkdir(dir, { recursive: true });
  }
}

module.exports = ChzzkRepository;
