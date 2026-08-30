import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String },
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

const CommunityPostSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  text: { type: String, required: true, maxlength: 600 },
  author: { type: String, required: true, maxlength: 40 },
  actorId: { type: String, required: true, index: true },
  ts: { type: Number, required: true, index: true },
  supportCount: { type: Number, default: 0, min: 0 },
  reportCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ['active', 'review', 'deleted'], default: 'active', index: true },
}, { timestamps: true });

const CommunitySupportSchema = new mongoose.Schema({
  postId: { type: String, required: true, index: true },
  actorId: { type: String, required: true, index: true },
}, { timestamps: true });
CommunitySupportSchema.index({ postId: 1, actorId: 1 }, { unique: true });

const CommunityReportSchema = new mongoose.Schema({
  postId: { type: String, required: true, index: true },
  actorId: { type: String, required: true, index: true },
  reason: { type: String, maxlength: 80, default: 'unsafe' },
}, { timestamps: true });
CommunityReportSchema.index({ postId: 1, actorId: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Chat = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
export const CommunityPost = mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema);
export const CommunitySupport = mongoose.models.CommunitySupport || mongoose.model('CommunitySupport', CommunitySupportSchema);
export const CommunityReport = mongoose.models.CommunityReport || mongoose.model('CommunityReport', CommunityReportSchema);
