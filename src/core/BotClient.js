const fs = require("fs");
const path = require("path");
const { Client, Collection } = require("discord.js");
const { walkJavaScriptFiles } = require("./fileLoader");

const COMPONENT_TYPES = ["buttons", "modals", "selectMenus"];

class BotClient extends Client {
  constructor(options) {
    super(options);

    this.commands = new Collection();
    this.componentHandlers = new Map();
    this.services = new Map();
  }

  registerService(name, service) {
    if (!name) return;
    this.services.set(name, service);
  }

  getService(name) {
    return this.services.get(name);
  }

  async initialize() {
    await this.#loadCommands();
    for (const type of COMPONENT_TYPES) {
      await this.#loadInteractionHandlers(type);
    }
    await this.#loadEvents();
  }

  getComponentHandler(type, customId) {
    const handlers = this.componentHandlers.get(type);
    if (!handlers) return null;
    for (const handler of handlers) {
      try {
        if (handler.match(customId)) {
          return handler;
        }
      } catch (error) {
        console.error(`컴포넌트 핸들러 매칭 오류 (${type})`, error);
      }
    }
    return null;
  }

  async #loadCommands() {
    const commandsDir = path.join(__dirname, "../commands");
    for (const file of walkJavaScriptFiles(commandsDir)) {
      const command = require(file);
      if (!command?.data || typeof command.execute !== "function") continue;
      this.commands.set(command.data.name, command);
    }
  }

  async #loadInteractionHandlers(type) {
    const dir = path.join(__dirname, `../interactions/${type}`);
    if (!fs.existsSync(dir)) return;

    const bucket = this.#ensureComponentBucket(type);
    for (const file of walkJavaScriptFiles(dir)) {
      const mod = require(file);
      const definitions = Array.isArray(mod) ? mod : [mod];
      for (const definition of definitions) {
        if (!definition || typeof definition.execute !== "function") continue;
        const matcher = this.#createMatcher(definition);
        bucket.push({ match: matcher, execute: definition.execute });
      }
    }
  }

  async #loadEvents() {
    const eventsDir = path.join(__dirname, "../events");
    for (const file of walkJavaScriptFiles(eventsDir)) {
      const event = require(file);
      if (!event?.name || typeof event.execute !== "function") continue;
      if (event.once) {
        this.once(event.name, (...args) => event.execute(...args, this));
      } else {
        this.on(event.name, (...args) => event.execute(...args, this));
      }
    }
  }

  #ensureComponentBucket(type) {
    if (!this.componentHandlers.has(type)) {
      this.componentHandlers.set(type, []);
    }
    return this.componentHandlers.get(type);
  }

  #createMatcher(definition) {
    if (typeof definition.match === "function") {
      return definition.match;
    }

    if (definition.regex instanceof RegExp) {
      return customId => definition.regex.test(customId);
    }

    if (definition.prefix) {
      const prefixes = Array.isArray(definition.prefix) ? definition.prefix : [definition.prefix];
      return customId => prefixes.some(prefix => customId.startsWith(prefix));
    }

    if (definition.id) {
      const ids = Array.isArray(definition.id) ? definition.id : [definition.id];
      return customId => ids.includes(customId);
    }

    if (definition.ids) {
      const ids = Array.isArray(definition.ids) ? definition.ids : [definition.ids];
      return customId => ids.includes(customId);
    }

    return () => false;
  }
}

module.exports = BotClient;
