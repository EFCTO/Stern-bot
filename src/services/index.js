const path = require("path");
const PartyRepository = require("../modules/party/PartyRepository");
const PartyService = require("../modules/party/PartyService");
const MusicService = require("../modules/music/MusicService");
const ChzzkRepository = require("../modules/chzzk/ChzzkRepository");
const ChzzkService = require("../modules/chzzk/ChzzkService");

const partyRepository = new PartyRepository(path.join(__dirname, "../../data/parties.json"));
const partyService = new PartyService(partyRepository);
const musicService = new MusicService();
const chzzkRepository = new ChzzkRepository(path.join(__dirname, "../../data/chzzk.json"));
const chzzkService = new ChzzkService(chzzkRepository);

async function initializeServices() {
  await partyService.initialize();
  await chzzkService.initialize();
  return { party: partyService, music: musicService, chzzk: chzzkService };
}

async function shutdownServices() {
  partyService.stopSweepScheduler();
  await musicService.shutdown();
  await chzzkService.shutdown();
}

module.exports = {
  initializeServices,
  shutdownServices,
  partyService,
  musicService,
  chzzkService
};
