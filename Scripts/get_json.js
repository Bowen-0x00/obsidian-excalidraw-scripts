const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const directoryPath = __dirname;
const rawBase = 'https://raw.githubusercontent.com/Bowen-0x00/obsidian-excalidraw-scripts/main/Scripts/';

// Script metadata uses scalar fields and indented lists, without dependencies.
function parseFrontmatter(content) {
  const match = content.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('Missing script frontmatter');
  const data = {};
  let currentKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(item[1]);
      continue;
    }
    const field = line.match(/^([\w-]+):\s*(.*)$/);
    if (!field) continue;
    currentKey = field[1];
    data[currentKey] = field[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return data;
}

function getScriptPaths(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) getScriptPaths(fullPath, result);
    else if (entry.isFile() && /^(Action-|Feature-).+\.md$/.test(entry.name)) {
      result.push(path.relative(directoryPath, fullPath).split(path.sep).join('/'));
    }
  }
  return result;
}

// --no-index also excludes mistakenly tracked experiments. Exit 1 means no matches.
function getIgnoredPaths(paths) {
  if (!paths.length) return new Set();
  const result = spawnSync('git', ['check-ignore', '--no-index', '--stdin', '-z'], {
    cwd: directoryPath,
    input: paths.join('\0') + '\0',
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || 'Unable to read Git ignore rules');
  }
  return new Set(result.stdout.split('\0').filter(Boolean));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
}

function scalarRow(label, value) {
  if (!value || Array.isArray(value)) return '';
  return `  <tr valign="top"><td class="label">${label}</td><td class="data">${escapeHtml(value)}</td></tr>`;
}

function listRow(label, values) {
  if (!Array.isArray(values) || !values.length) return '';
  return `  <tr valign="top"><td class="label">${label}</td><td class="data"><ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul></td></tr>`;
}

function writeIfChanged(filename, content) {
  const target = path.join(directoryPath, filename);
  if (fs.existsSync(target) && fs.readFileSync(target, 'utf8') === content) return;
  fs.writeFileSync(target, content, 'utf8');
}

try {
  const paths = getScriptPaths(directoryPath).sort();
  const ignored = getIgnoredPaths(paths);
  const names = new Set();
  const scripts = paths.filter(relativePath => !ignored.has(relativePath)).map(relativePath => {
    const fullPath = path.join(directoryPath, relativePath);
    const fname = path.basename(fullPath);
    // The custom market resolves updates and installations by basename.
    if (names.has(fname)) throw new Error(`Duplicate market filename: ${fname}`);
    names.add(fname);
    const meta = parseFrontmatter(fs.readFileSync(fullPath, 'utf8'));
    if (!meta.version) throw new Error(`Missing version: ${relativePath}`);
    return { fname, relativePath, mtime: fs.statSync(fullPath).mtimeMs, meta };
  });

  const categories = new Map();
  for (const script of scripts) {
    const category = path.posix.dirname(script.relativePath);
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category).push(script);
  }
  const tables = [...categories].map(([category, entries]) => {
    const title = category === '.' ? 'Other' : category[0].toUpperCase() + category.slice(1);
    const rows = entries.map(({ fname }) => `|<span>${fname}</span>|[[#${fname.slice(0, -3)}]]|`).join('\n');
    return `## ${title}\n**Keywords**: ${title}\n\n| Script | Details |\n| --- | --- |\n${rows}`;
  }).join('\n\n');

  const details = scripts.map(({ fname, relativePath, meta }) => {
    const url = rawBase + relativePath.split('/').map(encodeURIComponent).join('/');
    const rows = [
      scalarRow('Name', meta.name),
      scalarRow('Author', meta.author),
      scalarRow('Version', meta.version),
      `  <tr valign="top"><td class="label">Source</td><td class="data"><a href="${url}">File on GitHub</a></td></tr>`,
      scalarRow('Description', meta.description),
      scalarRow('Usage', meta.usage),
      listRow('Features', meta.features),
      listRow('Dependencies', meta.dependencies),
      scalarRow('Autorun', meta.autorun),
      scalarRow('License', meta.license),
    ].filter(Boolean).join('\n');
    return `## ${fname.slice(0, -3)}\n\n\`\`\`excalidraw-script-install\n${url}\n\`\`\`\n<table>\n${rows}\n</table>`;
  }).join('\n\n');

  // Build both outputs before writing either; fail nonzero on generation errors.
  const inventory = JSON.stringify(scripts.map(({ meta, ...entry }) => entry), null, 2) + '\n';
  const market = `# List of available scripts\n\n${tables}\n\n# Description and Installation\n\n${details}\n`;
  writeIfChanged('directory-info.json', inventory);
  writeIfChanged('index.md', market);
  console.log(`Generated directory-info.json and index.md: ${scripts.length} scripts, ${categories.size} categories; excluded ${ignored.size} ignored scripts.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
