const { SlashCommandBuilder } = require("discord.js");
const { ensureTechRole } = require("../utils/permissions");
const { ensureOfficialMultiService } = require("../modules/multi/helpers");
const { createOfficialMultiCreateModal } = require("../modules/multi/modals");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("multi_create")
    .setDescription("공식 멀티를 생성합니다")
    .setDMPermission(false),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

    const service = await ensureOfficialMultiService(interaction);
    if (!service) {
      return;
    }

    const modal = createOfficialMultiCreateModal(interaction.channelId);
    await interaction.showModal(modal);
  }
};
