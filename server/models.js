import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String }, // optional for Google auth
  googleSub: { type: String },
}, { timestamps: true });

const ChatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  role: { type: String, enum: ['user', 'model'], required: true },
  text: { type: String, required: true },
  timestamp: { type: Number, required: true },
}, { timestamps: true });

MessageSchema.index({ chatId: 1, timestamp: 1 });
ChatSchema.index({ userId: 1, createdAt: -1 });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
