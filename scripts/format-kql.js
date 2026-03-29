import fs from "fs/promises";
import path from "path";

function formatKql(text) {
  // Basic formatting:
  // - Trim spaces
  // - Put pipes at start of line
  // - Remove extra empty lines
  return text
    .split("\n")
    .map(line => line.trim())
    .map(line => line.replace(/\s*\|\s*/g, "\n| "))
    .join("\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim() + "\n";
}

async function walk(dir) {
  const files = await fs.readdir(dir);
  for (const name of files) {
    const fullPath = path.join(dir, name);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      await walk(fullPath);
    } else if (fullPath.endsWith(".kql")) {
      await formatFile(fullPath);
    }
  }
}

async function formatFile(filePath) {
  const original = await fs.readFile(filePath, "utf8");
  const formatted = formatKql(original);
  if (formatted !== original) {
    await fs.writeFile(filePath, formatted, "utf8");
    console.log(`Formatted: ${filePath}`);
  } else {
    console.log(`Already formatted: ${filePath}`);
  }
}

walk(process.cwd()).catch(err => {
  console.error(err);
  process.exit(1);
});
