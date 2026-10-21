const fs = require('node:fs');
const path = require('node:path');
const {Script} = require('node:vm');
const root = path.resolve(__dirname, '../extension');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const files = [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page, ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap(x => x.js)];
for (const file of files) if (!fs.existsSync(path.join(root, file))) throw Error(`Missing manifest file: ${file}`);
for (const file of fs.readdirSync(root).filter(x => x.endsWith('.js'))) new Script(fs.readFileSync(path.join(root, file), 'utf8'), {filename:file});
for (const html of ['options.html','popup.html']) {
  const text = fs.readFileSync(path.join(root,html),'utf8');
  for (const match of text.matchAll(/(?:src|href)="([^"#:]+)"/g)) if (!fs.existsSync(path.join(root,match[1]))) throw Error(`Missing UI resource: ${match[1]}`);
}
console.log('Manifest, packaged resources and JavaScript syntax are valid.');
