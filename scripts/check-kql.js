const fs = require("fs").promises;
const path = require("path");

let hasError = false;

function checkBrackets(text, file) {
  let count = 0;
  for (let c of text) {
    if (c === "(") count++;
    if (c === ")") count--;
    if (count < 0) {
      console.error(`❌ Unbalanced brackets in ${file}`);
      hasError = true;
      return;
    }
  }
  if (count !== 0) {
    console.error(`❌ Unbalanced brackets in ${file}`);
    hasError = true;
  }
}

async function walk(dir) {
  const files = await fs.readdir(dir);

  for (const name of files) {
    const full = path.join(dir, name);
    const stat = await fs.stat(full);

    if (stat.isDirectory()) {
      await walk(full);
    } else if (full.endsWith(".kql")) {
      const text = await fs.readFile(full, "utf8");

      if (text.trim().length === 0) {
        console.error(`❌ Empty file: ${full}`);
        hasError = true;
      }

      if (!text.includes("|")) {
        console.warn(`⚠️ No pipe found: ${full}`);
      }

      if (text.length < 15) {
        console.warn(`⚠️ Very short query: ${full}`);
      }

      checkBrackets(text, full);

      console.log("Checked:", full);
    }
  }
}

(async () => {
  await walk(process.cwd());

  if (hasError) {
    process.exit(1);
  }
})();
