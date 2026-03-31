const fs = require("fs").promises;
const path = require("path");

let errorCount = 0;

// Report error with GitHub Actions annotation
function report(file, line, message) {
  const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
  console.log(`::error file=${relativePath},line=${line}::${message}`);
  errorCount++;
}

// Recursively walk folder
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

      lines.forEach((line, i) => {
        const lineNum = i + 1;
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          const prev = line[j - 1];

          // Ignore escaped brackets
          if (prev === "\\") continue;

          if (char === "(") bracketCount++;
          if (char === ")") bracketCount--;
        }
      });

      if (bracketCount !== 0) {
        report(fullPath, 1, `Unbalanced brackets: ${bracketCount > 0 ? "+" + bracketCount : bracketCount}`);
      }
    }
  }
}

(async () => {
  await walk(process.cwd());
  if (errorCount > 0) {
    console.log(`❌ Found ${errorCount} bracket issues`);
    process.exit(1);
  } else {
    console.log("✅ All brackets are balanced (ignoring escaped ones)");
  }
})();
