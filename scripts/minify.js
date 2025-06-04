const fs = require('fs');
function minify(code){
  return code
    .replace(/\/\*[\s\S]*?\*\//g,'')
    .replace(/\/\/.*$/gm,'')
    .replace(/\s+/g,' ')
    .replace(/\s*([{};,:])\s*/g,'$1')
    .trim();
}
const [src,dst]=process.argv.slice(2);
fs.writeFileSync(dst,minify(fs.readFileSync(src,'utf8')));
