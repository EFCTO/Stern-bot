const { Events } = require("discord.js");

async function handleWithFallback(interaction, executor) {
  try {
    await executor();
  } catch (error) {
    console.error("Interaction 처리 실패", error);
    const payload = {
      content: "작업 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
      ephemeral: true
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await handleWithFallback(interaction, () => command.execute(interaction, client));
      return;
    }

    if (interaction.isButton()) {
      const handler = client.getComponentHandler("buttons", interaction.customId);
      if (!handler) return;
      await handleWithFallback(interaction, () => handler.execute(interaction, client));
      return;
    }

    if (interaction.isModalSubmit()) {
      const handler = client.getComponentHandler("modals", interaction.customId);
      if (!handler) return;
      await handleWithFallback(interaction, () => handler.execute(interaction, client));
      return;
    }

    if (interaction.isAnySelectMenu()) {
      const handler = client.getComponentHandler("selectMenus", interaction.customId);
      if (!handler) return;
      await handleWithFallback(interaction, () => handler.execute(interaction, client));
    }
  }
};
