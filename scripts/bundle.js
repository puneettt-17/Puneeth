const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
const cssPath = path.join(__dirname, '..', 'styles.css');
const jsPath = path.join(__dirname, '..', 'app.js');
const outPath = path.join(__dirname, '..', 'bundle.html');

let html = fs.readFileSync(htmlPath, 'utf-8');
const css = fs.readFileSync(cssPath, 'utf-8');
const js = fs.readFileSync(jsPath, 'utf-8');

html = html.replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`);
html = html.replace('<script src="app.js"></script>', `<script>\n${js}\n</script>`);

fs.writeFileSync(outPath, html, 'utf-8');
console.log(`Successfully generated standalone bundle at: ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
