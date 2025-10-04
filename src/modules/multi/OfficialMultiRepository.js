const fs = require("fs/promises");
const path = require("path");
const OfficialMulti = require("./OfficialMulti");

class OfficialMultiRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const json = JSON.parse(content);
      const map = new Map();
      for (const [messageId, raw] of Object.entries(json)) {
        map.set(messageId, new OfficialMulti({ ...raw, messageId }));
      }
      return map;
    } catch (error) {
      if (error.code === "ENOENT") {
        await this.#ensureDir();
        await fs.writeFile(this.filePath, "{}", "utf8");
        return new Map();
      }
      throw error;
    }
  }

  async save(multis) {
    await this.#ensureDir();
    const serialized = {};
    for (const [messageId, multi] of multis.entries()) {
      serialized[messageId] = multi.toJSON();
    }
    await fs.writeFile(this.filePath, JSON.stringify(serialized, null, 2), "utf8");
  }

  async #ensureDir() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }
}

module.exports = OfficialMultiRepository;
