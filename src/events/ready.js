const { Events } = require("discord.js");
const { closeParty } = require("../modules/party/lifecycle");
const { getPartyService } = require("../modules/party/helpers");
const { getChzzkService } = require("../modules/chzzk/helpers");
const { ensureYoutubeService } = require("../modules/youtube/helpers");
const { bootstrapGuide } = require("../modules/championship/guideManager");
const { startStatsJobs } = require("../jobs/statsScheduler");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    try {
      await bootstrapGuide(client);
    } catch (error) {
      console.error("[ChampionshipGuide] Failed to bootstrap guide", error);
    }

    try {
      const youtubeService = await ensureYoutubeService(client);
      if (youtubeService?.state?.channelId) {
        console.log(`[YouTube] Monitoring channel ${youtubeService.state.channelId}`);
      }
    } catch (error) {
      console.error("[YouTube] Failed to initialize", error);
    }

    const partyService = getPartyService(client);
    if (!partyService) {
      console.warn("Party service is not registered. Skipping sweep scheduler.");
    } else {
      await partyService.sweepExpired(async party => {
        try {
          await closeParty(client, partyService, party, "24-hour timeout auto close");
        } catch (error) {
          console.error("Party auto-close failed:", error.message);
        }
      });

      partyService.startSweepScheduler(async party => {
        try {
          await closeParty(client, partyService, party, "24-hour timeout auto close");
        } catch (error) {
          console.error("Party auto-close failed:", error.message);
        }
      });
    }

    const chzzkService = getChzzkService(client);
    if (chzzkService) {
      try {
        await chzzkService.start(client);
      } catch (error) {
        console.error("[Chzzk] service start failed", error);
      }
    }

    try {
      startStatsJobs(client);
      console.log("[StatsScheduler] jobs started");
    } catch (error) {
      console.error("[StatsScheduler] failed to start", error);
    }
  }
};
