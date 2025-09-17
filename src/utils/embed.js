const { EmbedBuilder } = require("discord.js")

function makeSetupEmbed(title, desc) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(0x11806a)
    .setTimestamp()
}

function makeNoticeEmbed(title, desc, color = 0x5865F2) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setTimestamp()
}

module.exports = { makeSetupEmbed, makeNoticeEmbed }
