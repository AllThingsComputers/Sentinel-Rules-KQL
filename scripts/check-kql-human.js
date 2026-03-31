const fs = require("fs").promises;
const path = require("path");

let errorCount = 0;

function report(file, message) {
  console.log(`${message} in ${file}`);
  errorCount++;
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (fullPath.endsWith(".kql")) {
      const content = await fs.readFile(fullPath, "utf8");

      if (!content.trim()) {
        report(fullPath, "Empty file");
        continue;
      }

      const lines = content.split("\n");

      let bracketCount = 0;
      let quoteOpen = null;

      lines.forEach((line) => {
        const trimmed = line.trim();

        // --- QUOTE CHECK ---
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const prev = line[j - 1];
          if ((char === '"' || char === "'") && prev !== "\\") {
            if (quoteOpen === char) {
              quoteOpen = null;
            } else if (!quoteOpen) {
              quoteOpen = char;
            }
          }
        }

        // --- BRACKET CHECK (ignores escaped) ---
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const prev = line[j - 1];
          if (prev === "\\") continue;
          if (char === "(") bracketCount++;
          if (char === ")") bracketCount--;
        }
      });

      // --- FILE-WIDE REPORT ---
      if (bracketCount !== 0) {
        report(fullPath, `Unbalanced brackets (${bracketCount > 0 ? "+" + bracketCount : bracketCount})`);
      }

      if (quoteOpen) {
        report(fullPath, "Unclosed quote detected");
      }
    }
  }
}

(async () => {
  await walk(process.cwd());

  if (errorCount > 0) {
    console.log(`\n❌ Found ${errorCount} KQL issues`);
    process.exit(1);
  } else {
    console.log("✅ No KQL issues found");
  }
})();
