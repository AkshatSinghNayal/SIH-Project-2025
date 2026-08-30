import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import communityRouter from '../community.js';
import { CommunityPost } from '../models.js';

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGODB_URI);

  app = express();
  app.use(express.json());
  app.use('/api/community', communityRouter);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await CommunityPost.deleteMany({});
});

describe('Community API Tests', () => {
  it('should create an anonymous community session', async () => {
    const res = await request(app).post('/api/community/session');
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.alias).toBeDefined();
  });

  it('should reject fetching community posts without session token', async () => {
    const res = await request(app).get('/api/community/posts');
    expect(res.status).toBe(401);
  });

  it('should allow posting and viewing community messages with valid token', async () => {
    const sessionRes = await request(app).post('/api/community/session');
    const token = sessionRes.body.token;

    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'This is a supportive student message.' });

    expect(postRes.status).toBe(201);
    expect(postRes.body.post.text).toBe('This is a supportive student message.');
    expect(postRes.body.post.isOwn).toBe(true);

    const listRes = await request(app)
      .get('/api/community/posts')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.posts.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject posts with contact information or links', async () => {
    const sessionRes = await request(app).post('/api/community/session');
    const token = sessionRes.body.token;

    const badPostRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Call me at 999-888-7777 or email test@example.com' });

    expect(badPostRes.status).toBe(400);
    expect(badPostRes.body.error).toContain('privacy');
  });

  it('should support and un-support posts', async () => {
    const sessionRes = await request(app).post('/api/community/session');
    const token = sessionRes.body.token;

    const postRes = await request(app)
      .post('/api/community/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'Another encouraging thought for everyone.' });

    const postId = postRes.body.post.id;

    // Toggle support ON
    const supp1 = await request(app)
      .post(`/api/community/posts/${postId}/support`)
      .set('Authorization', `Bearer ${token}`);
    expect(supp1.status).toBe(200);
    expect(supp1.body.supported).toBe(true);
    expect(supp1.body.supports).toBe(1);

    // Toggle support OFF
    const supp2 = await request(app)
      .post(`/api/community/posts/${postId}/support`)
      .set('Authorization', `Bearer ${token}`);
    expect(supp2.status).toBe(200);
    expect(supp2.body.supported).toBe(false);
    expect(supp2.body.supports).toBe(0);
  });
});
