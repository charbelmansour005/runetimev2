import mongoose from 'mongoose';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Digits with the usual separators, like +44 20 7946 0958 or (555) 010-0199:
// 7 to 15 digits, the most an international number has.
const PHONE_CHARS = /^\+?[\d ().\-/]+$/;
const isPhone = (v) => PHONE_CHARS.test(v) && /^(?:\D*\d){7,15}\D*$/.test(v);

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
    // Required for new messages; ones sent before the field existed have none.
    phone: {
      type: String,
      required: [true, 'Please add your phone number'],
      trim: true,
      maxlength: [30, 'That phone number is too long'],
      validate: { validator: isPhone, message: 'That phone number doesn’t look right' },
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
