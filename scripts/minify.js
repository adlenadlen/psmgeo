const fs = require('fs');

function stripComments(code) {
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inBlock = false;
  let inLine = false;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1];

    if (inBlock) {
      if (ch === '*' && next === '/') {
        inBlock = false;
        i++;
      }
      continue;
    }

    if (inLine) {
      if (ch === '\n') {
        inLine = false;
        out += ch;
      }
      continue;
    }

    if (!inSingle && !inDouble && !inTemplate) {
      if (ch === '/' && next === '*') {
        inBlock = true;
        i++;
        continue;
      }
      if (ch === '/' && next === '/') {
        inLine = true;
        i++;
        continue;
      }
    }

    if (ch === "'" && !inDouble && !inTemplate) inSingle = !inSingle;
    else if (ch === '"' && !inSingle && !inTemplate) inDouble = !inDouble;
    else if (ch === '`' && !inSingle && !inDouble) inTemplate = !inTemplate;

    out += ch;
  }

  return out;
}

function minify(code) {
  return stripComments(code)
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,:])\s*/g, '$1')
    .trim();
}

const [src, dst] = process.argv.slice(2);
fs.writeFileSync(dst, minify(fs.readFileSync(src, 'utf8')));
