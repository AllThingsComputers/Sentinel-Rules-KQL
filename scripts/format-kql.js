const fs = require("fs").promises;
const path = require("path");

// Configuration: number of spaces per indent level
const INDENT_SIZE = 2;

// Format a single KQL query
function formatKql(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const formattedLines = [];
  let indentLevel = 0;

  for (let line of lines) {
    // Handle multi-line pipes: put | at start
    if (line.startsWith("|")) {
      formattedLines.push(" ".repeat(indentLevel * INDENT_SIZE) + line);
      continue;
    }

    // Handle let statements
    if (/^let\s+/i.test(line)) {
      formattedLines.push(" ".repeat(indentLevel * INDENT_SIZE) + line);
      continue;
    }

    // Handle closing brackets
    if (/^\)/.test(line)) {
      indentLevel = Math.max(indentLevel - 1, 0);
      formattedLines.push(" ".repeat(indentLevel * INDENT_SIZE) + line);
      continue;
    }

    // Handle opening brackets
    if (/\($/.test(line)) {
      formattedLines.push(" ".repeat(indentLevel * INDENT_SIZE) + line);
      indentLevel += 1;
      continue;
    }

    // Default: indent and keep pipes aligned
    line = line.replace(/\s*\|\s*/g, "\n| ");
    const pipeLines = line.split("\n");
    pipeLines.forEach((pl, idx) => {
      const spaces = " ".repeat(indentLevel * INDENT_SIZE);
      formattedLines.push(idx === 0 ? spaces + pl : spaces + pl.trim());
    });
  }

  return formattedLines.join("\n") + "\n";
}

// Recursively walk through the repo and format .kql files
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

// Format a single file and overwrite if changed
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
