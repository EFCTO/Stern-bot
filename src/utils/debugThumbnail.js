const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const DEBUG_IMAGE_PATH = path.join(__dirname, "../../assets/debug/source.jpg");

async function prepareDebugThumbnail({ width = 1280, height = 720, format = "png" } = {}) {
  if (!fs.existsSync(DEBUG_IMAGE_PATH)) {
    return null;
  }

  const buffer = await sharp(DEBUG_IMAGE_PATH)
    .resize(width, height, { fit: "cover", position: "centre" })
    .toFormat(format)
    .toBuffer();

  return buffer;
}

module.exports = {
  prepareDebugThumbnail,
  DEBUG_IMAGE_PATH,
};
