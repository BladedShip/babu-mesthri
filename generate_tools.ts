import * as fs from 'fs';

const filePath = './services/ToolRegistry.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Extract POTENTIAL_TOOL_DOCS
const docsRegex = /export const POTENTIAL_TOOL_DOCS: ToolDoc\[\] = \[([\s\S]*?)\];/;
const match = content.match(docsRegex);

if (!match) {
    console.error("Could not find POTENTIAL_TOOL_DOCS");
    process.exit(1);
}

const docsContent = match[1];
const lineRegex = /\{\s*name:\s*'([^']+)',\s*description:\s*'([^']+)'/g;
let toolsAdded = [];

let m;
let generatedCode = '';

while ((m = lineRegex.exec(docsContent)) !== null) {
    const name = m[1];
    let desc = m[2];
    
    // Escape single quotes in description
    desc = desc.replace(/'/g, "\\'");
    
    generatedCode += `
  ${name}: {
    name: '${name}',
    description: '${desc}',
    parameters: { type: 'object', properties: { input: { type: 'string', description: 'Optional input data' } } },
    execute: async (params) => {
      // Auto-generated mock implementation
      return JSON.stringify({ success: true, message: "Mock executed for ${name}", params });
    }
  },`;
    toolsAdded.push(name);
}

// 2. Inject into AppTools
// Find the end of AppTools
const appToolsEndRegex = /  }\n};\n/g;
if (!content.match(appToolsEndRegex)) {
    console.log("Could not find end of AppTools");
}

content = content.replace(/  }\n};\n/, `  },${generatedCode}\n};\n`);

// 3. Remove POTENTIAL_TOOL_DOCS
content = content.replace(/\/\*\*[\s\S]*?export const POTENTIAL_TOOL_DOCS: ToolDoc\[\] = \[[\s\S]*?\];\n/, '');

fs.writeFileSync(filePath, content);
console.log(`Successfully added ${toolsAdded.length} tools and removed POTENTIAL_TOOL_DOCS.`);
