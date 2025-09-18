const roleButton = require("../interactions/buttons/roleButton");
const roleCfg = require("../config/roleButtons");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (interaction.isButton()) {
        if (interaction.customId.startsWith(roleButton.customIdStartsWith)) {
          return roleButton.handle(interaction);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        return;
      }
    } catch (err) {
      console.error("[interactionCreate] error", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "처리 중 오류가 발생했습니다.", ephemeral: true });
      }
    } finally {
      if (roleCfg.DEBUG && interaction.isButton()) {
        console.log("[ROLE][POST] replied:", interaction.replied, "deferred:", interaction.deferred);
      }
    }
  }
};