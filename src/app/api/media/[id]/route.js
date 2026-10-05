import mongoose from 'mongoose';
import { fail, handle } from '../../../../../server/http.js';
import { Media } from '../../../../../server/models/Media.js';

// Uploaded images. Each upload gets a new id, so responses never change and can
// be cached for a year by browsers and the CDN.
export const GET = handle(async (request, { params }) => {
  if (!mongoose.isValidObjectId(params.id)) return fail(404, 'Image not found.');
  const media = await Media.findById(params.id).select('data contentType');
  if (!media) return fail(404, 'Image not found.');
  return new Response(media.data, {
    headers: {
      'Content-Type': media.contentType,
      'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable',
    },
  });
});
