const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const svgPath = path.join(root, 'assets', 'images', 'box.svg');

if (!fs.existsSync(svgPath)) {
  console.error(`Missing SVG source: ${svgPath}`);
  process.exit(1);
}

const svgBuffer = fs.readFileSync(svgPath);

const outputs = [
  { size: 1024, file: path.join(root, 'assets', 'images', 'icon.png') },
  { size: 1024, file: path.join(root, 'assets', 'images', 'splash-icon.png') },
  { size: 1024, file: path.join(root, 'assets', 'images', 'logo-1024.png') },
  { size: 512, file: path.join(root, 'assets', 'images', 'logo-512.png') },
  { size: 256, file: path.join(root, 'assets', 'images', 'logo-256.png') },
  { size: 128, file: path.join(root, 'assets', 'images', 'logo-128.png') },
  { size: 200, file: path.join(root, 'ios', 'TrinketMobile', 'Images.xcassets', 'SplashScreenLogo.imageset', 'image.png') },
  { size: 400, file: path.join(root, 'ios', 'TrinketMobile', 'Images.xcassets', 'SplashScreenLogo.imageset', 'image@2x.png') },
  { size: 600, file: path.join(root, 'ios', 'TrinketMobile', 'Images.xcassets', 'SplashScreenLogo.imageset', 'image@3x.png') },
];

Promise.all(
  outputs.map(({ size, file }) =>
    sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(file)
  )
)
  .then(() => {
    console.log('✅ Box icon assets generated.');
  })
  .catch((error) => {
    console.error('Failed to generate icons:', error);
    process.exit(1);
  });
