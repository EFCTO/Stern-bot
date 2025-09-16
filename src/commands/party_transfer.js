const { SlashCommandBuilder } = require("discord.js");
const { PARTIES, makeNoticeEmbed, makeCoh3Embed, makeHoi4Embed, getUserSafe } = require("../structures/partyUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("party_transfer")
    .setDescription("(방장) 파티장을 다른 참가자에게 넘깁니다.")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("새 파티장")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("message_id")
        .setDescription("파티 메시지 ID (선택)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const newHost = interaction.options.getUser("user");
    const messageId = interaction.options.getString("message_id");
    let party = null;

    if (messageId && !isNaN(messageId)) {
      party = PARTIES.get(Number(messageId));
    }
    if (!party) {
      party = PARTIES.lastPartyByHostInChannel(interaction.channel.id, interaction.user.id);
    }
    if (!party) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("오류", "대상 파티를 찾지 못했어요.")], ephemeral: true });
    }

    if (interaction.user.id !== party.hostId) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("권한 부족", "방장만 양도할 수 있어요.")], ephemeral: true });
    }
    if (!party.members.includes(newHost.id)) {
      return await interaction.reply({ embeds: [makeNoticeEmbed("오류", "해당 유저는 파티 참가자가 아니에요.")], ephemeral: true });
    }

    party.hostId = newHost.id;
    const baseMsg = await interaction.channel.messages.fetch(party.messageId);
    const newAuthor = await getUserSafe(interaction.client, interaction.guild, newHost.id);
    const embed = (party.game === "COH3")
      ? makeCoh3Embed(party, newAuthor)
      : makeHoi4Embed(party, newAuthor);

    await baseMsg.edit({ embeds: [embed] });
    await baseMsg.reply({ embeds: [makeNoticeEmbed("방장 양도", `이제부터 <@${newHost.id}> 님이 방장입니다.`)] });
    await interaction.reply({ embeds: [makeNoticeEmbed("완료", "방장을 양도했습니다.")], ephemeral: true });
  }
};
