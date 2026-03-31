const fs = require("fs").promises;
const path = require("path");

let errorCount = 0;

// --- Report error as GitHub Actions annotation ---
function report(file, line, message) {
  const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
  console.log(`::error file=${relativePath},line=${line}::${message}`);
  errorCount++;
}

// --- Walk folder recursively and check each .kql file ---
async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (fullPath.endsWith(".kql")) {
      const content = await fs.readFile(fullPath, "utf8");

      if (!content.trim()) {
        report(fullPath, 1, "Empty file");
        continue;
      }

      const lines = content.split("\n");

      let bracketCount = 0;
      let quoteOpen = null;

      lines.forEach((line, i) => {
        const lineNum = i + 1;
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
          if (prev === "\\") continue; // ignore escaped
          if (char === "(") bracketCount++;
          if (char === ")") bracketCount--;
        }

        // --- DOUBLE PIPE ---
        if (line.includes("||")) {
          report(fullPath, lineNum, "Double pipe '||' detected");
        }

        // --- PIPE AT END ---
        if (trimmed.endsWith("|")) {
          report(fullPath, lineNum, "Pipe at end of line");
        }

        // --- SUSPICIOUS PIPE USAGE ---
        if (trimmed.startsWith("|")) {
          const validKeywords = [
            "where", "extend", "project", "summarize",
            "join", "order", "take", "limit", "project-away", "project-rename"
          ];
          const matches = validKeywords.some(k => trimmed.match(new RegExp(`^\\|\\s*${k}`, "i")));
          if (!matches) {
            report(fullPath, lineNum, "Suspicious pipe usage");
          }
        }

        // --- MULTILINE REGEX CHECK ---
        if (line.includes("regex") && line.endsWith("|")) {
          report(fullPath, lineNum, "Regex likely broken across lines");
        }
      });

      // --- FILE-WIDE CHECKS ---
      if (bracketCount !== 0) {
        report(fullPath, 1, `Unbalanced brackets: ${bracketCount > 0 ? "+" + bracketCount : bracketCount}`);
      }

      if (quoteOpen) {
        report(fullPath, 1, "Unclosed quote detected");
      }

      if (!content.includes("|")) {
        report(fullPath, 1, "No pipe operator found");
      }
    }
  }
}

// --- Run ---
(async () => {
  await walk(process.cwd());

  if (errorCount > 0) {
    console.log(`❌ Found ${errorCount} issues`);
    process.exit(1);
  } else {
    console.log("✅ No issues found");
  }
})();
