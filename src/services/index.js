const path = require("path");
const PartyRepository = require("../modules/party/PartyRepository");
const PartyService = require("../modules/party/PartyService");
const MusicService = require("../modules/music/MusicService");

const partyRepository = new PartyRepository(path.join(__dirname, "../../data/parties.json"));
const partyService = new PartyService(partyRepository);
const musicService = new MusicService();

async function initializeServices() {
  await partyService.initialize();
  return { party: partyService, music: musicService };
}

async function shutdownServices() {
  partyService.stopSweepScheduler();
  await musicService.shutdown();
}

module.exports = {
  initializeServices,
  shutdownServices,
  partyService,
  musicService
};
