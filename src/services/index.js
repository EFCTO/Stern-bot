const path = require("path");
const PartyRepository = require("../modules/party/PartyRepository");
const PartyService = require("../modules/party/PartyService");

const partyRepository = new PartyRepository(path.join(__dirname, "../../data/parties.json"));
const partyService = new PartyService(partyRepository);

async function initializeServices() {
  await partyService.initialize();
  return { party: partyService };
}

async function shutdownServices() {
  partyService.stopSweepScheduler();
}

module.exports = {
  initializeServices,
  shutdownServices,
  partyService
};
