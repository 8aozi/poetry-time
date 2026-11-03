/* Build a Pages artifact using an explicit runtime allowlist. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const files = [
  'index.html', 'styles.css', 'app.js', 'learning-store.js', 'practice.js', 'practice-ui.js',
  'data/poems.js', 'assets/favicon.svg', 'assets/spring-garden.svg'
];
// Validate all inputs before replacing the generated directory.
for (const file of files) {
  if (!fs.statSync(path.join(root, file)).isFile()) throw new Error(`Missing runtime file: ${file}`);
}
fs.rmSync(output, {recursive: true, force: true});
for (const file of files) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), {recursive: true});
  fs.copyFileSync(path.join(root, file), target);
}
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`Built ${files.length} runtime files and .nojekyll in ${output}`);
