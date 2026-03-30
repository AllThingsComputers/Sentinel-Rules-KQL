const fs = require("fs").promises;
const path = require("path");

const INDENT = 2;

function formatKql(text) {
  let indent = 0;

  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const out = [];

  for (let line of lines) {
    // Normalize spacing
    line = line.replace(/\s+/g, " ");

    // Move pipes to new lines
    line = line.replace(/\s*\|\s*/g, "\n| ");

    const split = line.split("\n");

    split.forEach((l, i) => {
      let current = l.trim();

      // Decrease indent on closing bracket
      if (current.startsWith(")")) {
        indent = Math.max(indent - 1, 0);
      }

      // Apply indent
      const formatted = " ".repeat(indent * INDENT) + current;
      out.push(formatted);

      // Increase indent after opening bracket
      if (current.endsWith("(")) {
        indent++;
      }
    });
  }

  return out.join("\n") + "\n";
}

async function walk(dir) {
  const files = await fs.readdir(dir);

  for (const name of files) {
    const full = path.join(dir, name);
    const stat = await fs.stat(full);

    if (stat.isDirectory()) {
      await walk(full);
    } else if (full.endsWith(".kql")) {
      const original = await fs.readFile(full, "utf8");
      const formatted = formatKql(original);

      if (original !== formatted) {
        await fs.writeFile(full, formatted);
        console.log("Formatted:", full);
      }
    }
  }
}

walk(process.cwd()).catch(err => {
  console.error(err);
  process.exit(1);
});
