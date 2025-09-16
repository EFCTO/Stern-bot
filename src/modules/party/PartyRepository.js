const fs = require("fs/promises");
const path = require("path");
const Party = require("./Party");

class PartyRepository {
  constructor(filePath) {
    this.filePath = filePath;
  }

  async load() {
    try {
      const content = await fs.readFile(this.filePath, "utf8");
      const json = JSON.parse(content);
      const parties = new Map();
      for (const [messageId, data] of Object.entries(json)) {
        parties.set(messageId, new Party({ ...data, messageId }));
      }
      return parties;
    } catch (err) {
      if (err.code === "ENOENT") {
        await this.#ensureDir();
        await fs.writeFile(this.filePath, "{}", "utf8");
        return new Map();
      }
      throw err;
    }
  }

  async save(parties) {
    await this.#ensureDir();
    const serialized = {};
    for (const [messageId, party] of parties) {
      serialized[messageId] = party.toJSON();
    }
    await fs.writeFile(this.filePath, JSON.stringify(serialized, null, 2), "utf8");
  }

  async #ensureDir() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }
}

module.exports = PartyRepository;
