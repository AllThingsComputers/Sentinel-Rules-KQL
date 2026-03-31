#!/usr/bin/env node

/**
 * check-kql-human.js
 * Checks all .kql files in the repo for:
 * - Unbalanced brackets: (), {}, []
 * - Unclosed quotes: " or '
 * - Empty files
 * Produces human-readable output for GitHub Actions or local runs.
 */

const fs = require("fs").promises;
const path = require("path");

const KQL_DIR = "."; // root of repo

// Recursively get all .kql files
async function getKqlFiles(dir) {
  let files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(await getKqlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".kql")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Main checker function
async function checkKqlFile(file) {
  const content = await fs.readFile(file, "utf8");
  if (!content.trim()) {
    console.log(`Empty file: ${file}`);
    return 1; // count as error
  }

  let errors = 0;
  let bracketStack = [];
  let quoteOpen = null;

  const bracketPairs = {
    "(": ")",
    "{": "}",
    "[": "]"
  };

  const openBrackets = Object.keys(bracketPairs);
  const closeBrackets = Object.values(bracketPairs);

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();

    // Ignore comments
    if (trimmed.startsWith("//")) continue;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const prev = line[i - 1];

      // Ignore escaped characters
      if (prev === "\\") continue;

      // Handle quotes
      if ((char === '"' || char === "'")) {
        if (!quoteOpen) {
          quoteOpen = char;
        } else if (quoteOpen === char) {
          quoteOpen = null;
        }
        continue;
      }

      // Skip bracket checks inside quotes
      if (quoteOpen) continue;

      // Bracket handling
      if (openBrackets.includes(char)) {
        bracketStack.push(char);
      } else if (closeBrackets.includes(char)) {
        const last = bracketStack.pop();
        if (!last || bracketPairs[last] !== char) {
          console.log(`Unbalanced bracket '${char}' in ${file}`);
          errors++;
        }
      }
    }
  }

  // Remaining unclosed brackets
  while (bracketStack.length > 0) {
    const unclosed = bracketStack.pop();
    console.log(`Unbalanced bracket '${unclosed}' in ${file}`);
    errors++;
  }

  // Remaining unclosed quote
  if (quoteOpen) {
    console.log(`Unclosed quote '${quoteOpen}' in ${file}`);
    errors++;
  }

  return errors;
}

async function main() {
  const files = await getKqlFiles(KQL_DIR);
  let totalErrors = 0;

  for (const file of files) {
    totalErrors += await checkKqlFile(file);
  }

  if (totalErrors > 0) {
    console.log(`\nTotal errors found: ${totalErrors}`);
    process.exit(1); // fail workflow if errors exist
  } else {
    console.log("All KQL files passed checks ✅");
  }
}

main().catch(err => {
  console.error("Error checking KQL files:", err);
  process.exit(1);
});
