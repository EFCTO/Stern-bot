const { SlashCommandBuilder } = require("discord.js");
const { makeNoticeEmbed } = require("../utils/embed");
const { makeCoh3Embed, makeHoi4Embed } = require("../modules/party/embeds");
const { fetchUserSafe, ensurePartyService } = require("../modules/party/helpers");
const { ensureTechRole } = require("../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("party_transfer")
    .setDescription("파티의 방장을 다른 참여자로 변경합니다")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("새 방장으로 지정할 유저")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("message_id")
        .setDescription("파티 메시지 ID (선택)")
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!(await ensureTechRole(interaction))) {
      return;
    }

    const partyService = await ensurePartyService(interaction);
    if (!partyService) return;

    const newHost = interaction.options.getUser("user", true);
    const messageId = interaction.options.getString("message_id");
    let party = null;

    if (messageId) {
      party = partyService.getByMessageId(messageId);
    }
    if (!party) {
      party = partyService.getLastPartyByHostInChannel(interaction.channel.id, interaction.user.id);
    }
    if (!party) {
      party = partyService.getLatestPartyInChannel?.(interaction.channel.id) ?? null;
    }
    if (!party) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("오류", "대상 파티를 찾지 못했어요.")],
        ephemeral: true
      });
    }

    if (!party.members.includes(newHost.id)) {
      return await interaction.reply({
        embeds: [makeNoticeEmbed("오류", "해당 유저는 파티 참여자가 아니에요.")],
        ephemeral: true
      });
    }

    const updatedParty = await partyService.updateParty(party.messageId, data => {
      data.hostId = newHost.id;
    });

    const baseMsg = await interaction.channel.messages.fetch(updatedParty.messageId);
    const newAuthor = await fetchUserSafe(interaction.client, interaction.guild, newHost.id);
    const embed = updatedParty.game === "COH3"
      ? makeCoh3Embed(updatedParty, newAuthor)
      : makeHoi4Embed(updatedParty, newAuthor);

    await baseMsg.edit({ embeds: [embed] });
    await baseMsg.reply({ embeds: [makeNoticeEmbed("방장 이동", `이제부터 <@${newHost.id}> 님이 방장이에요.`)] });
    await interaction.reply({ embeds: [makeNoticeEmbed("완료", "방장을 변경했어요.")], ephemeral: true });
  }
};
