const REQUIRED_TECH_ROLE_ID = "1205045348754530344";

function getGuildMember(interaction) {
  if (!interaction) return null;
  return interaction.member ?? null;
}

function resolveTargetRole(member) {
  if (!member) return null;
  return member.guild?.roles?.cache?.get(REQUIRED_TECH_ROLE_ID) ?? null;
}

function hasTechRoleOrHigher(member) {
  if (!member) return false;

  if (member.roles?.cache?.has(REQUIRED_TECH_ROLE_ID)) {
    return true;
  }

  const targetRole = resolveTargetRole(member);
  if (!targetRole) {
    // If the role is missing (perhaps deleted), fall back to explicit possession only.
    return false;
  }

  const highest = member.roles?.highest;
  if (!highest) return false;

  return highest.comparePositionTo(targetRole) >= 0;
}

async function ensureTechRole(interaction) {
  const member = getGuildMember(interaction);
  if (!member) {
    await interaction.reply({
      content: "이 명령은 서버에서만 사용할 수 있어요.",
      ephemeral: true,
    }).catch(() => null);
    return false;
  }

  if (hasTechRoleOrHigher(member)) {
    return true;
  }

  const payload = {
    content: `이 명령은 <@&${REQUIRED_TECH_ROLE_ID}> 역할 이상만 사용할 수 있어요.`,
    ephemeral: true,
  };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload).catch(() => null);
  } else {
    await interaction.reply(payload).catch(() => null);
  }

  return false;
}

module.exports = {
  REQUIRED_TECH_ROLE_ID,
  hasTechRoleOrHigher,
  ensureTechRole,
};
