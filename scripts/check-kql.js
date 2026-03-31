const fs = require("fs").promises;
const path = require("path");

let errorCount = 0;

function report(file, line, message) {
  console.log(`::error file=${file},line=${line}::${message}`);
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
        report(fullPath, 1, "Empty file");
        continue;
      }

      const lines = content.split("\n");

      let bracketCount = 0;
      let quoteOpen = null;

      lines.forEach((line, i) => {
        const lineNum = i + 1;

        // --- QUOTES ---
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

        // --- BRACKETS ---
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const prev = line[j - 1];

          if (!quoteOpen) {
            if (char === "(" && prev !== "\\") bracketCount++;
            if (char === ")" && prev !== "\\") bracketCount--;
          }
        }

        // --- DOUBLE PIPE ---
        if (line.includes("||")) {
          report(fullPath, lineNum, "Double pipe '||' detected");
        }

        // --- PIPE AT END ---
        if (line.trim().endsWith("|")) {
          report(fullPath, lineNum, "Pipe at end of line");
        }

        // --- BAD START (common mistake) ---
        if (
          line.trim().startsWith("|") &&
          !line.match(/^\|\s*(where|extend|project|summarize|join|order|take|limit)/i)
        ) {
          report(fullPath, lineNum, "Suspicious pipe usage");
        }

        // --- MULTILINE REGEX BREAK (your issue) ---
        if (
          line.includes("regex") &&
          line.trim().endsWith("|")
        ) {
          report(fullPath, lineNum, "Regex likely broken across lines");
        }
      });

      if (bracketCount !== 0) {
        report(fullPath, 1, "Unbalanced brackets");
      }

      if (quoteOpen) {
        report(fullPath, 1, "Unclosed quote detected");
      }

      // --- MISSING PIPE ---
      if (!content.includes("|")) {
        report(fullPath, 1, "No pipe operator found");
      }
    }
  }
}

(async () => {
  await walk(process.cwd());

  if (errorCount > 0) {
    console.log(`❌ Found ${errorCount} issues`);
    process.exit(1);
  } else {
    console.log("✅ No issues found");
  }
})();
