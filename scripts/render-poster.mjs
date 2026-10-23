// Renders the hero posters: stills of the 3D garden at its starting view, on
// a transparent background, cropped around the point the camera aims at so
// they line up with the scene.
//   public/hero-poster-bare.webp (+ -640): the bare plate the scroll story
//     starts from — what most visitors see until the 3D loads;
//   public/hero-poster.webp (+ -640): the whole garden, for reduced motion
//     and for browsers without WebGL.
// Both use the same crop, so Hero.css sizes them the same way.
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

// Must match the hero's frame in src/components/hero/HeroScene.jsx.
const CENTER_Y = 0.45;
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--ignore-gpu-blocklist'] });

// A still of the scene, as a PNG of the whole canvas.
async function still(address) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  // Reduced motion draws one still frame, with nothing swaying.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(address, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.hero-scene.is-ready', { timeout: 20000 });
  await page.addStyleTag({
    content: `html, body, .hero { background: transparent !important; }
      .hero__bg, .hero__texture, .hero__glow, .hero__content, .hero__tabbar, .hero__progress, header,
      .hero__poster, .hero-scene__hint, .skip-link { visibility: hidden !important; }
      nextjs-portal { display: none !important; }`,
  });
  await new Promise((resolve) => setTimeout(resolve, 600));
  const box = await page.$eval('.hero-scene__canvas', (el) => el.getBoundingClientRect().toJSON());
  const png = await page.screenshot({ omitBackground: true, clip: box, captureBeyondViewport: false, encoding: 'base64' });
  return { page, png };
}

// Crops a still (around the camera's target; `fixed` reuses another crop)
// and encodes it at two widths. Runs in the page: Chrome writes WebP.
const cut = (page, png, fixed) =>
  page.evaluate(
    async (src, centerY, given) => {
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
      let crop = given;
      if (!crop) {
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
        crop = { x: Math.round(cx - hw), y: Math.round(cy - hh), w: Math.round(hw * 2), h: Math.round(hh * 2) };
      }
      const encode = (width) => {
        const out = document.createElement('canvas');
        out.width = width;
        out.height = Math.round((crop.h * width) / crop.w);
        out.getContext('2d').drawImage(canvas, crop.x, crop.y, crop.w, crop.h, 0, 0, out.width, out.height);
        return { data: out.toDataURL('image/webp', 0.72).split(',')[1], height: out.height };
      };
      return { crop, large: encode(960), small: encode(640), width: crop.w / 2, box: W / 2 };
    },
    png,
    CENTER_Y,
    fixed ?? null,
  );

const full = await still(url);
const whole = await cut(full.page, full.png);
const bare = await still(`${url}${url.includes('?') ? '&' : '?'}poster=bare`);
const start = await cut(bare.page, bare.png, whole.crop);
await browser.close();

const write = (name, { large, small }) => {
  writeFileSync(`public/${name}.webp`, Buffer.from(large.data, 'base64'));
  writeFileSync(`public/${name}-640.webp`, Buffer.from(small.data, 'base64'));
};
write('hero-poster', whole);
write('hero-poster-bare', start);
console.log(`Wrote hero-poster(-bare).webp (960 × ${whole.large.height}) and their -640 versions.`);
// Hero.css sizes the posters for this crop: its width as a share of the
// canvas (1440 × 900 at the time of writing).
console.log(`The garden is ${whole.width} px wide in a ${whole.box} px wide canvas at 1440 × 900.`);
