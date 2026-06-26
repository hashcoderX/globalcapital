import fs from 'fs';
import path from 'path';

const ROOT = 'c:/xampp/htdocs/globalcapital';
const PATCH_DIR = path.join(ROOT, 'frontend/scripts/_restore');

const SKIP = new Set([
  'patch_001_frontend_app_dashboard_credit_page.tsx.txt',
  'patch_002_frontend_app_dashboard_credit_page.tsx.txt',
  'patch_003_frontend_app_dashboard_credit_page.tsx.txt',
  'patch_004_frontend_app_dashboard_credit_page.tsx.txt',
  'patch_045_frontend_app_dashboard_microfinance_reports_customer-payment-history_page.tsx.txt',
  'patch_046_frontend_app_dashboard_microfinance_reports_customer-payment-history_page.tsx.txt',
]);

function parsePatch(patchText) {
  const fileMatch = patchText.match(/\*\*\* Update File: ([^\n]+)/);
  if (!fileMatch) throw new Error('No file in patch');
  const filePath = fileMatch[1].replace(/\\/g, '/').replace(/^c:\/xampp\/htdocs\/globalcapital\//i, '');
  const lines = patchText.split('\n');
  const hunks = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].startsWith('@@')) {
      i++;
      const hunk = { context: [], remove: [], add: [] };
      while (i < lines.length && !lines[i].startsWith('@@') && !lines[i].startsWith('*** End Patch')) {
        const line = lines[i];
        if (line.startsWith('+')) hunk.add.push(line.slice(1));
        else if (line.startsWith('-')) hunk.remove.push(line.slice(1));
        else if (line.startsWith(' ')) hunk.context.push(line.slice(1));
        else if (line === '') {
          hunk.context.push('');
          hunk.remove.push('');
          hunk.add.push('');
        }
        i++;
      }
      hunks.push(hunk);
    } else i++;
  }
  return { filePath, hunks };
}

function normalize(s) {
  return s.replace(/\r\n/g, '\n');
}

function applyHunk(content, hunk) {
  const oldLines = [];
  for (let i = 0; i < Math.max(hunk.context.length, hunk.remove.length); i++) {
    oldLines.push(hunk.remove[i] ?? hunk.context[i] ?? '');
  }
  const newLines = [];
  for (let i = 0; i < Math.max(hunk.context.length, hunk.add.length); i++) {
    newLines.push(hunk.add[i] ?? hunk.context[i] ?? '');
  }
  const oldBlock = normalize(oldLines.join('\n'));
  const newBlock = normalize(newLines.join('\n'));
  const normContent = normalize(content);
  if (normContent.includes(oldBlock)) {
    return normContent.replace(oldBlock, newBlock);
  }
  return null;
}

function applyPatch(patchText) {
  const { filePath, hunks } = parsePatch(patchText);
  const abs = path.join(ROOT, filePath);
  let content = fs.readFileSync(abs, 'utf8');
  for (const hunk of hunks) {
    const next = applyHunk(content, hunk);
    if (next === null) {
      const preview = [...hunk.context, ...hunk.remove].slice(0, 3).join(' | ');
      throw new Error(`Hunk failed in ${filePath}: ${preview}`);
    }
    content = next;
  }
  fs.writeFileSync(abs, content);
  return filePath;
}

const files = fs.readdirSync(PATCH_DIR).filter((f) => f.endsWith('.txt') && !SKIP.has(f)).sort();
let ok = 0;
let fail = 0;
for (const file of files) {
  const patchText = fs.readFileSync(path.join(PATCH_DIR, file), 'utf8');
  try {
    applyPatch(patchText);
    console.log('OK', file);
    ok++;
  } catch (err) {
    console.error('FAIL', file, err.message);
    fail++;
  }
}
console.log(`\nApplied: ${ok} Failed: ${fail}`);
if (fail) process.exit(1);
