const { Events } = require("discord.js");
const { closeParty } = require("../modules/party/lifecycle");
const { getPartyService } = require("../modules/party/helpers");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const partyService = getPartyService(client);
    if (!partyService) {
      console.warn("파티 서비스가 등록되지 않았습니다. 자동 정리 기능을 건너뜁니다.");
      return;
    }

    await partyService.sweepExpired(async party => {
      try {
        await closeParty(client, partyService, party, "24시간 만료 자동 종료");
      } catch (error) {
        console.error("자동폭파 실패:", error.message);
      }
    });

    partyService.startSweepScheduler(async party => {
      try {
        await closeParty(client, partyService, party, "24시간 만료 자동 종료");
      } catch (error) {
        console.error("자동폭파 실패:", error.message);
      }
    });
  }
};
