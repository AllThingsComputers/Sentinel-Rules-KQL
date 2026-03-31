// check-kql-human.js
const fs = require("fs").promises;
const path = require("path");

// Check one KQL file
async function checkKqlFile(file) {
    const content = await fs.readFile(file, "utf8");
    let inString = false;
    let stringType = ""; // @" or @'
    const bracketStack = [];

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextTwo = content.substr(i, 2);

        // Start of a string
        if (!inString && (nextTwo === '@"' || nextTwo === "@'")) {
            inString = true;
            stringType = nextTwo;
            i++; // skip next char
            continue;
        }

        // Inside a string
        if (inString) {
            if (stringType === '@"' && char === '"') {
                inString = false;
                stringType = "";
            } else if (stringType === "@'" && char === "'") {
                if (content[i + 1] === "'") { // doubled quote inside string
                    i++; // skip doubled quote
                } else {
                    inString = false;
                    stringType = "";
                }
            }
            continue; // ignore everything inside strings
        }

        // Track brackets outside strings
        if (char === "(") bracketStack.push("(");
        if (char === ")") {
            if (bracketStack.length === 0) {
                console.log(`Unbalanced closing bracket in ${file}`);
            } else {
                bracketStack.pop();
            }
        }

        // Track suspicious pipes outside strings (optional)
        if (char === "|" && content[i + 1] !== "|") {
            // Comment out or enable this if you want to detect only real pipe usage
            // console.log(`Suspicious pipe usage in ${file} at char ${i}`);
        }
    }

    if (bracketStack.length > 0) {
        console.log(`Unbalanced brackets in ${file}`);
    }
}

// Recursively scan folder for KQL files
async function scanFolder(folder) {
    const entries = await fs.readdir(folder, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(folder, entry.name);
        if (entry.isDirectory()) await scanFolder(fullPath);
        else if (entry.name.endsWith(".kql")) await checkKqlFile(fullPath);
    }
}

// Run
scanFolder("./").catch(console.error);
