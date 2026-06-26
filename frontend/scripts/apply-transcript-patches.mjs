import fs from 'fs';
import path from 'path';

const ROOT = 'c:/xampp/htdocs/globalcapital';
const PATCH_DIR = path.join(ROOT, 'frontend/scripts/_restore');

function parsePatch(patchText) {
  const lines = patchText.split('\n');
  const fileMatch = patchText.match(/\*\*\* Update File: ([^\n]+)/);
  if (!fileMatch) throw new Error('No file in patch');
  const filePath = fileMatch[1].replace(/\\/g, '/').replace(/^c:\/xampp\/htdocs\/globalcapital\//i, '');
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
    } else {
      i++;
    }
  }
  return { filePath, hunks };
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
  const oldBlock = oldLines.join('\n');
  const newBlock = newLines.join('\n');
  if (content.includes(oldBlock)) {
    return content.replace(oldBlock, newBlock);
  }
  // tolerate CRLF
  const oldCrlf = oldBlock.replace(/\n/g, '\r\n');
  const newCrlf = newBlock.replace(/\n/g, '\r\n');
  if (content.includes(oldCrlf)) {
    return content.replace(oldCrlf, newCrlf);
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

const files = fs.readdirSync(PATCH_DIR).filter((f) => f.endsWith('.txt')).sort();
const applied = [];
const failed = [];
for (const file of files) {
  const patchText = fs.readFileSync(path.join(PATCH_DIR, file), 'utf8');
  try {
    const fp = applyPatch(patchText);
    applied.push({ file, path: fp });
    console.log('OK', file);
  } catch (err) {
    failed.push({ file, error: err.message });
    console.error('FAIL', file, err.message);
  }
}
console.log('\nApplied:', applied.length, 'Failed:', failed.length);
if (failed.length) process.exit(1);
