import mongoose from 'mongoose';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Submissions from the site's contact form, shown in the CMS inbox.
const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please tell us your name'], trim: true, maxlength: 100 },
    email: {
      type: String,
      required: [true, 'Please add your email'],
      trim: true,
      lowercase: true,
      maxlength: 200,
      match: [EMAIL_PATTERN, 'That email address doesn’t look right'],
    },
    company: { type: String, trim: true, maxlength: 120, default: '' },
    message: {
      type: String,
      required: [true, 'Please add a message'],
      trim: true,
      minlength: [10, 'Your message is a little short — add a few more details'],
      maxlength: [5000, 'Please keep your message under 5,000 characters'],
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
