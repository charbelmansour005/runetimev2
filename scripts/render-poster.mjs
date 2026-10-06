// Renders the hero poster (public/hero-poster.webp and hero-poster-640.webp):
// a still of the 3D garden at its starting view, on a transparent background,
// cropped around the point the camera aims at so it lines up with the scene.
//
// With the site running locally (npm run build && npm start):
//   npx -p puppeteer-core node scripts/render-poster.mjs [http://localhost:3000/]
// Set CHROME to Chrome's path if it isn't in the usual macOS place.
import { writeFileSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:3000/';
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('Run it with puppeteer-core: npx -p puppeteer-core node scripts/render-poster.mjs');
  process.exit(1);
}

// Must match CENTER_Y in src/components/hero/HeroScene.jsx.
const CENTER_Y = 0.45;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
// Reduced motion draws one still frame: the same first frame everyone sees.
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
await page.goto(url, { waitUntil: 'networkidle2' });
await page.waitForSelector('.hero-scene.is-ready', { timeout: 20000 });
await page.addStyleTag({
  content: `html, body, .hero { background: transparent !important; }
    .hero__bg, .hero__texture, .hero__glow, .hero__content, .hero__tabbar, .hero__progress, header,
    .hero__poster, .hero-scene__hint, .skip-link { visibility: hidden !important; }`,
});
await new Promise((resolve) => setTimeout(resolve, 500));
const box = await page.$eval('.hero-scene__canvas', (el) => el.getBoundingClientRect().toJSON());
const png = await page.screenshot({ omitBackground: true, clip: box, captureBeyondViewport: false, encoding: 'base64' });

// Crop and encode in the page (Chrome writes WebP with transparency).
const result = await page.evaluate(
  async (src, centerY) => {
    const image = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = `data:image/png;base64,${src}`;
    });
    const { width: W, height: H } = image;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const alpha = ctx.getImageData(0, 0, W, H).data;
    let [left, top, right, bottom] = [W, H, 0, 0];
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (alpha[(y * W + x) * 4 + 3] > 3) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    // Symmetric around the camera's target, so the image's centre is that point.
    const cx = W / 2;
    const cy = centerY * H;
    const hw = Math.max(cx - left, right - cx) + 6;
    const hh = Math.max(cy - top, bottom - cy) + 6;
    const crop = { x: Math.round(cx - hw), y: Math.round(cy - hh), w: Math.round(hw * 2), h: Math.round(hh * 2) };
    const encode = (width) => {
      const out = document.createElement('canvas');
      out.width = width;
      out.height = Math.round((crop.h * width) / crop.w);
      out.getContext('2d').drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
      return { data: out.toDataURL('image/webp', 0.72).split(',')[1], height: out.height };
    };
    return { large: encode(960), small: encode(640), width: crop.w / 2 };
  },
  png,
  CENTER_Y,
);
await browser.close();

writeFileSync('public/hero-poster.webp', Buffer.from(result.large.data, 'base64'));
writeFileSync('public/hero-poster-640.webp', Buffer.from(result.small.data, 'base64'));
console.log(`Wrote public/hero-poster.webp (960 × ${result.large.height}) and hero-poster-640.webp.`);
// Hero.css sizes the poster for a 677 px wide crop at this viewport.
console.log(`The garden is ${result.width} px wide at 1440 × 900 (it was 677).`);
console.log(
  'If that changed, scale the poster width in Hero.css by the same factor, and update its height in Hero.jsx.',
);
