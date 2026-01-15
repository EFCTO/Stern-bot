function getMusicService(client) {
  return client.getService("music");
}

const MUSIC_TARGET_ERROR_MESSAGES = {
  no_guild: "This command must be used in a server.",
  guild_not_found: "Target server is not available. Check MUSIC_TARGET_GUILD_ID.",
  member_not_found: "You must be in the target server to use music commands."
};

function getMusicTargetGuildId(interaction) {
  const envGuildId = (process.env.MUSIC_TARGET_GUILD_ID || "").trim();
  return envGuildId || interaction.guildId || interaction.guild?.id || null;
}

function getMusicTargetErrorMessage(code) {
  return MUSIC_TARGET_ERROR_MESSAGES[code] || "Unable to resolve the music server.";
}

async function resolveMusicTarget(interaction) {
  const targetGuildId = getMusicTargetGuildId(interaction);
  if (!targetGuildId) {
    return { error: "no_guild" };
  }

  let guild = interaction.guild;
  if (!guild || guild.id !== targetGuildId) {
    guild = interaction.client.guilds.cache.get(targetGuildId)
      || await interaction.client.guilds.fetch(targetGuildId).catch(() => null);
  }

  if (!guild) {
    return { error: "guild_not_found" };
  }

  const member = await guild.members.fetch(interaction.user.id).catch(() => null);
  if (!member) {
    return { error: "member_not_found", guild };
  }

  let botMember = guild.members.me;
  if (!botMember) {
    botMember = await guild.members.fetchMe().catch(() => null);
  }

  return { guild, member, botMember };
}

async function ensureMusicService(interaction) {
  let service = getMusicService(interaction.client);

  if (!service) {
    try {
      const services = require("../../services");
      if (services?.musicService) {
        interaction.client.registerService?.("music", services.musicService);
        service = getMusicService(interaction.client);
      }
    } catch (_) {
      // ignore resolution failures and fall back to reply below
    }
  }

  if (!service) {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: "음악 서비스가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.",
        ephemeral: true
      });
    }
    return null;
  }
  return service;
}

module.exports = {
  getMusicService,
  getMusicTargetErrorMessage,
  resolveMusicTarget,
  ensureMusicService
};
