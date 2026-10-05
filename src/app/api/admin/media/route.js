import { fail, handle, json, readImage } from '../../../../../server/http.js';
import { Media, mediaUrl, sniffImageType } from '../../../../../server/models/Media.js';

// The CMS sends the (already compressed) image as the raw request body.
export const POST = handle(
  async (request, { user }) => {
    const data = await readImage(request);
    if (!data?.length) return fail(400, 'Send the image file as the request body.');
    const contentType = sniffImageType(data);
    if (!contentType) return fail(415, 'Use a PNG, JPG, WebP, GIF or AVIF image.');

    const query = new URL(request.url).searchParams;
    const dimension = (v) => Math.max(0, Math.min(20000, Math.round(Number(v) || 0)));
    const media = await Media.create({
      filename: String(query.get('filename') ?? '').slice(0, 200),
      contentType,
      size: data.length,
      width: dimension(query.get('width')),
      height: dimension(query.get('height')),
      data,
      uploadedBy: user.email,
    });
    return json({ url: mediaUrl(media.id), width: media.width, height: media.height, size: media.size }, { status: 201 });
  },
  { auth: true },
);
