const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'pixel_dash_standalone.html');
const fontPath = path.join(rootDir, 'assets', 'fonts', 'PressStart2P-latin.woff2');
const faviconPath = path.join(rootDir, 'favicon.svg');
const cssPath = path.join(rootDir, 'src', 'styles.css');
const gameLogicPath = path.join(rootDir, 'src', 'game-logic.js');
const gamePath = path.join(rootDir, 'src', 'game.js');

function toDataUri(mimeType, buffer) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

function minifyHtml(html) {
  return html.replace(/>\s+</g, '><').trim();
}

async function buildStandalone() {
  const fontData = fs.readFileSync(fontPath);
  const faviconSvg = fs.readFileSync(faviconPath, 'utf8').trim();
  const cssSource = fs.readFileSync(cssPath, 'utf8');
  const jsSource = `${fs.readFileSync(gameLogicPath, 'utf8')}\n\n${fs.readFileSync(gamePath, 'utf8')}`;

  const fontDataUri = toDataUri('font/woff2', fontData);
  const faviconDataUri = toDataUri('image/svg+xml', Buffer.from(faviconSvg, 'utf8'));

  const minifiedJs = (await transform(jsSource, {
    loader: 'js',
    minify: true,
    target: 'es2018',
  })).code.trim();

  const cssWithFonts = cssSource.replace(/url\((['"]?)\.\.\/assets\/fonts\/PressStart2P-latin\.woff2\1\)/g, `url(${fontDataUri})`);
  const minifiedCss = minifyCss(cssWithFonts);

  const html = `<!doctype html><html lang="en" class="h-full"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;"><title>Pixel Dash</title><link rel="icon" type="image/svg+xml" sizes="any" href="${faviconDataUri}"><link rel="shortcut icon" type="image/svg+xml" href="${faviconDataUri}"><style>${minifiedCss}</style></head><body class="h-full bg-black"><canvas id="game"></canvas><script>${minifiedJs}</script></body></html>`;

  fs.writeFileSync(outputPath, minifyHtml(html));
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}

buildStandalone().catch(err => {
  console.error(err);
  process.exit(1);
});