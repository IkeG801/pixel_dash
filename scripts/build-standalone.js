const fs = require('fs');
const path = require('path');
const { transform } = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'pixel_dash_standalone.html');
const fontPath = path.join(rootDir, 'assets', 'fonts', 'PressStart2P-latin.woff2');
const musicPaths = [
  path.join(rootDir, 'assets', 'music', 'high_score_run.mp3'),
  path.join(rootDir, 'assets', 'music', 'squelchy_basin_run.mp3'),
  path.join(rootDir, 'assets', 'music', 'frozen_ascent.mp3'),
  path.join(rootDir, 'assets', 'music', 'Below_the_Obsidian_Peak.mp3')
];
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
  const musicDataUris = musicPaths.map(musicPath => toDataUri('audio/mpeg', fs.readFileSync(musicPath)));
  const faviconSvg = fs.readFileSync(faviconPath, 'utf8').trim();
  const cssSource = fs.readFileSync(cssPath, 'utf8');
  const jsSource = `${fs.readFileSync(gameLogicPath, 'utf8')}\n\n${fs.readFileSync(gamePath, 'utf8')}`;

  const fontDataUri = toDataUri('font/woff2', fontData);
  const faviconDataUri = toDataUri('image/svg+xml', Buffer.from(faviconSvg, 'utf8'));

  const jsWithEmbeddedMusic = `const __PIXEL_DASH_MUSIC_URLS__ = ${JSON.stringify(musicDataUris)};\n${jsSource}`;

  const minifiedJs = (await transform(jsWithEmbeddedMusic, {
    loader: 'js',
    minify: true,
    target: 'es2018',
  })).code.trim();

  const standaloneFontCss = [
    `@font-face{font-family:'Press Start 2P';src:url(${fontDataUri}) format('woff2');font-style:normal;font-weight:400;font-display:swap}`,
    `@font-face{font-family:'Silkscreen';src:url(${fontDataUri}) format('woff2');font-style:normal;font-weight:400;font-display:swap}`,
  ].join('');
  const cssWithoutFonts = cssSource.replace(/@font-face\s*\{[\s\S]*?\}\s*/g, '');
  const minifiedCss = minifyCss(`${standaloneFontCss}${cssWithoutFonts}*{font-family:'Press Start 2P','Silkscreen',monospace}`);

  const html = `<!doctype html><html lang="en" class="h-full"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:;"><title>Pixel Dash</title><link rel="icon" type="image/svg+xml" sizes="any" href="${faviconDataUri}"><link rel="shortcut icon" type="image/svg+xml" href="${faviconDataUri}"><style>${minifiedCss}</style></head><body class="h-full bg-black"><canvas id="game"></canvas><script>${minifiedJs}</script></body></html>`;

  fs.writeFileSync(outputPath, minifyHtml(html));
  console.log(`Wrote ${path.relative(rootDir, outputPath)}`);
}

buildStandalone().catch(err => {
  console.error(err);
  process.exit(1);
});