const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "../../data/parties.json");

function loadParties() {
  if (!fs.existsSync(FILE)) return {};
  return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveParties(parties) {
  fs.writeFileSync(FILE, JSON.stringify(parties, null, 2), "utf8");
}

let PARTIES = loadParties();

function addParty(party) {
  PARTIES[party.messageId] = party;
  saveParties(PARTIES);
}

function updateParty(messageId, changes) {
  if (!PARTIES[messageId]) return;
  PARTIES[messageId] = { ...PARTIES[messageId], ...changes };
  saveParties(PARTIES);
}

function removeParty(messageId) {
  delete PARTIES[messageId];
  saveParties(PARTIES);
}

function getParty(messageId) {
  return PARTIES[messageId] || null;
}

function lastPartyByHostInChannel(channelId, hostId) {
  const parties = Object.values(PARTIES).filter(
    p => p.channelId === channelId && p.hostId === hostId && !p.endedAt
  );
  if (!parties.length) return null;
  return parties.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
}

function sweepExpired(callback) {
  const now = Date.now();
  for (const [id, party] of Object.entries(PARTIES)) {
    if (!party.endedAt && now - new Date(party.createdAt).getTime() > 24 * 60 * 60 * 1000) {
      callback(party);
      removeParty(id);
    }
  }
}

module.exports = {
  PARTIES,
  addParty,
  updateParty,
  removeParty,
  getParty,
  lastPartyByHostInChannel,
  sweepExpired
};
