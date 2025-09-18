const { REST, Routes } = require("discord.js")
require("dotenv").config()

const clientId = process.env.CLIENT_ID
const guildId = process.env.GUILD_ID
const token = process.env.DISCORD_TOKEN

const rest = new REST({ version: "10" }).setToken(token)

;(async () => {
  try {
    console.log("기존 명령어 전부 제거 시작")
    
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
    console.log("길드 명령어 전부 제거 완료")

    await rest.put(Routes.applicationCommands(clientId), { body: [] })
    console.log("글로벌 명령어 전부 제거 완료")
  } catch (err) {
    console.error("오류:", err)
  }
})()
