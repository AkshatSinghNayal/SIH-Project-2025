import mongoose from 'mongoose';
import { User } from './models.js';

export async function connectMongo(uri) {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB || undefined });
  console.log('MongoDB connected');
  User.syncIndexes().catch(err => console.warn('User syncIndexes warning:', err.message));
}
