// Renders the hero posters and works out how to size them.
//   public/hero-poster-bare.webp (+ -640): the garden as the scroll story
//     starts (the torii and pond, nothing else): what most visitors see until
//     the 3D loads;
//   public/hero-poster.webp (+ -640): the whole garden, for reduced motion
//     and for browsers without WebGL.
// Both are stills of the scene on a transparent background, cropped around
// the point the camera aims at, so they sit exactly over the live scene.
//
// The scene's size on screen depends on the screen (the camera fits the
// garden to the canvas), so the script also measures that at a few sizes and
// prints the CSS for `.hero__poster` in src/components/hero/Hero.css.
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

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--ignore-gpu-blocklist'] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hide = `html, body, .hero { background: transparent !important; }
  .hero__bg, .hero__texture, .hero__glow, .hero__content, .hero__tabbar, .hero__progress, header,
  .hero__poster, .hero-scene__hint, .skip-link { visibility: hidden !important; }
  nextjs-portal { display: none !important; }`;

// Opens the page at a size, waits for the scene, and says how big it draws.
async function open(width, height, { query = '', reduced = false, scale = 1 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  // Reduced motion draws one still frame, with nothing swaying.
  if (reduced) await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.goto(`${url}${query}`, { waitUntil: 'networkidle2' });
  // (Narrow screens start the scene at the first touch, or after a few seconds.)
  if (width <= 900) await page.mouse.click(5, 5);
  await page.waitForSelector('.hero-scene.is-ready', { timeout: 30000 });
  await wait(700);
  const { pxPerUnit, canvasWidth, canvasHeight } = await page.$eval('.hero-scene__canvas', (el) => ({
    pxPerUnit: Number(el.dataset.pxPerUnit),
    canvasWidth: el.clientWidth,
    canvasHeight: el.clientHeight,
  }));
  return { page, pxPerUnit, canvasWidth, canvasHeight };
}

// The scene's size on screen at a viewport, in CSS pixels per world unit.
async function measure(width, height) {
  const { page, pxPerUnit, canvasWidth, canvasHeight } = await open(width, height);
  await page.close();
  return { pxPerUnit, canvasWidth, canvasHeight };
}

// A still of the whole scene as a PNG of its canvas.
async function still(query) {
  const { page, pxPerUnit } = await open(1440, 900, { query, reduced: true, scale: 2 });
  await page.addStyleTag({ content: hide });
  await wait(500);
  const box = await page.$eval('.hero-scene__canvas', (el) => el.getBoundingClientRect().toJSON());
  const png = await page.screenshot({ omitBackground: true, clip: box, captureBeyondViewport: false, encoding: 'base64' });
  await page.close();
  return { png, pxPerUnit };
}

// Crops a still around its middle (the camera's target), tight to what's in
// it unless a crop is given, and encodes it at two widths. Runs in a page:
// Chrome writes WebP with transparency.
async function cut(png, fixed) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  const result = await page.evaluate(
    async (src, given) => {
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
        // Symmetric around the middle (the poster frame aims there), so the
        // image's centre is the camera's target.
        const cx = W / 2;
        const cy = H / 2;
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
      return { crop, large: encode(960), small: encode(640) };
    },
    png,
    fixed ?? null,
  );
  await page.close();
  return result;
}

const whole = await still('?poster=whole');
const start = await still('?poster=bare');
const wholeCut = await cut(whole.png);
const startCut = await cut(start.png, wholeCut.crop);

// How the scene's size follows the screen: the camera fits the garden to the
// canvas, so it's the smaller of "so many pixels per pixel of width" and "...
// of height". Measured where each applies (wide and short, narrow and tall),
// for the desktop framing and the phone one (screens up to 900 px wide).
const desktop = { wide: await measure(3000, 900), tall: await measure(1200, 1400) };
const phone = { wide: await measure(880, 560), tall: await measure(390, 844) };
for (const set of [desktop, phone]) {
  set.fromHeight = set.wide.pxPerUnit / set.wide.canvasHeight;
  set.fromWidth = set.tall.pxPerUnit / set.tall.canvasWidth;
}
await browser.close();

for (const [name, cut] of [
  ['hero-poster', wholeCut],
  ['hero-poster-bare', startCut],
]) {
  writeFileSync(`public/${name}.webp`, Buffer.from(cut.large.data, 'base64'));
  writeFileSync(`public/${name}-640.webp`, Buffer.from(cut.small.data, 'base64'));
}
console.log(`Wrote hero-poster(-bare).webp (960 × ${wholeCut.large.height}) and their -640 versions.`);

// The poster is `cropWidth` CSS pixels wide at `whole.pxPerUnit`; on a screen
// the scene is min(fromWidth × width, fromHeight × height) pixels per unit.
const cropWidth = wholeCut.crop.w / 2;
const share = (perPixel) => ((100 * cropWidth * perPixel) / whole.pxPerUnit).toFixed(2);
console.log('\nFor .hero__poster in src/components/hero/Hero.css:');
console.log(`  desktop: width: min(${share(desktop.fromWidth)}cqw, ${share(desktop.fromHeight)}cqh);`);
console.log(`  phone:   width: min(${share(phone.fromWidth)}cqw, ${share(phone.fromHeight)}cqh);`);
console.log(`(poster ${cropWidth} CSS px wide; drawn at ${whole.pxPerUnit.toFixed(2)} px per unit)`);
