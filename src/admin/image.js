// Shrinks and compresses images in the browser before upload, so they load
// fast on the site and fit under the hosting upload limit (4.5 MB on Vercel).

const MAX_BYTES = 3.8 * 1024 * 1024;
const ACCEPTED = /^image\/(png|jpe?g|webp|gif|avif)$/i;

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

export async function prepareImage(file, { maxSize = 1600 } = {}) {
  if (!ACCEPTED.test(file.type)) {
    throw new Error('Use a PNG, JPG, WebP, GIF or AVIF image.');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file couldn’t be read as an image.');
  });

  try {
    // Re-encoding a GIF would drop its animation, so upload those as they are.
    if (file.type === 'image/gif') {
      if (file.size > MAX_BYTES) throw new Error('GIFs need to be under 3.8 MB.');
      return { blob: file, width: bitmap.width, height: bitmap.height };
    }

    let scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);

      // WebP keeps transparency and is small; fall back where it isn't supported.
      let blob = await toBlob(canvas, 'image/webp', 0.86);
      if (!blob || blob.type !== 'image/webp') {
        blob = await toBlob(canvas, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.86);
      }
      if (blob && blob.size <= MAX_BYTES) return { blob, width, height };
      scale *= 0.75;
    }
    throw new Error('That image is too large, even after compressing it. Try a smaller one.');
  } finally {
    bitmap.close?.();
  }
}
