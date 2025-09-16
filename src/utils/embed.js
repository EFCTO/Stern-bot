const { EmbedBuilder } = require("discord.js")

function makeSetupEmbed(title, desc) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor("DarkTeal")
    .setTimestamp()
}

function makeNoticeEmbed(title, desc, color = "Blurple") {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(desc)
    .setColor(color)
    .setTimestamp()
}

module.exports = { makeSetupEmbed, makeNoticeEmbed }
