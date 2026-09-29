import mongoose from 'mongoose';

// Uploaded images live in MongoDB so uploads work on serverless hosts, whose
// disks don't persist between requests. The CMS resizes and compresses images
// before upload, so each stays small (well under MongoDB's 16 MB limit).
export const MEDIA_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'];
export const MEDIA_URL_PATTERN = /^\/api\/media\/[a-f0-9]{24}$/;
export const mediaUrl = (id) => `/api/media/${id}`;

const mediaSchema = new mongoose.Schema(
  {
    filename: { type: String, trim: true, maxlength: 200, default: '' },
    contentType: { type: String, required: true, enum: MEDIA_TYPES },
    size: { type: Number, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    data: { type: Buffer, required: true },
    uploadedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Media = mongoose.model('Media', mediaSchema);

// Trust the file's bytes, not the Content-Type header the client sent.
export function sniffImageType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(buf.toString('ascii', 8, 12))) return 'image/avif';
  return null;
}
