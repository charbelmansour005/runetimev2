import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 200 },
    name: { type: String, trim: true, maxlength: 80, default: '' },
    passwordHash: { type: String, required: true },
    // Bumped on password change so existing sessions stop working.
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return { id: this.id, email: this.email, name: this.name };
};

export const User = mongoose.model('User', userSchema);
