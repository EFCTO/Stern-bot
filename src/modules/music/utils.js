function formatDuration(durationMS) {
  if (!Number.isFinite(durationMS) || durationMS <= 0) {
    return "LIVE";
  }

  const totalSeconds = Math.floor(durationMS / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) {
    parts.push(hours.toString());
  }

  parts.push(String(minutes).padStart(hours > 0 ? 2 : 1, "0"));
  parts.push(String(seconds).padStart(2, "0"));

  return parts.join(":");
}

module.exports = {
  formatDuration
};
