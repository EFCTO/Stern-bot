const fs = require("fs");
const path = require("path");

function walkJavaScriptFiles(dir) {
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }

  const stack = [dir];
  const files = [];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

module.exports = {
  walkJavaScriptFiles
};
