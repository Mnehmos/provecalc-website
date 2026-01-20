const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'logo.svg');
const svg = fs.readFileSync(svgPath, 'utf8');

const sizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'android-chrome-192x192.png', size: 192 },
  { name: 'android-chrome-512x512.png', size: 512 },
];

const outputDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (const { name, size } of sizes) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: size,
    },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(outputDir, name), pngBuffer);
  console.log(`Generated: ${name} (${size}x${size})`);
}

console.log('\nAll icons generated in ./icons/');
