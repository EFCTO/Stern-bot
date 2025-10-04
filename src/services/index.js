const path = require("path");
const PartyRepository = require("../modules/party/PartyRepository");
const PartyService = require("../modules/party/PartyService");
const MusicService = require("../modules/music/MusicService");
const ChzzkRepository = require("../modules/chzzk/ChzzkRepository");
const ChzzkService = require("../modules/chzzk/ChzzkService");
const OfficialMultiRepository = require("../modules/multi/OfficialMultiRepository");
const OfficialMultiService = require("../modules/multi/OfficialMultiService");

const partyRepository = new PartyRepository(path.join(__dirname, "../../data/parties.json"));
const partyService = new PartyService(partyRepository);
const musicService = new MusicService();
const chzzkRepository = new ChzzkRepository(path.join(__dirname, "../../data/chzzk.json"));
const chzzkService = new ChzzkService(chzzkRepository);
const officialMultiRepository = new OfficialMultiRepository(path.join(__dirname, "../../data/multis.json"));
const officialMultiService = new OfficialMultiService(officialMultiRepository);

async function initializeServices() {
  await partyService.initialize();
  await chzzkService.initialize();
  await officialMultiService.initialize();
  return {
    party: partyService,
    music: musicService,
    chzzk: chzzkService,
    officialMulti: officialMultiService
  };
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
  chzzkService,
  officialMultiService
};
