import crypto from 'node:crypto';
import express from 'express';
import {
  CommunityPost,
  CommunityReport,
  CommunitySupport,
} from './models.js';

const router = express.Router();
const useMongo = () => !!process.env.MONGODB_URI;
const sessionSecret = process.env.COMMUNITY_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

if (!process.env.COMMUNITY_SESSION_SECRET) {
  console.warn('COMMUNITY_SESSION_SECRET is not set; community sessions will reset when the server restarts.');
}

const ADJECTIVES = ['Gentle', 'Quiet', 'Steady', 'Kind', 'Bright', 'Patient', 'Brave', 'Thoughtful'];
const PLANTS = ['Fern', 'Sage', 'Lotus', 'Cedar', 'Willow', 'Marigold', 'Moss', 'Jasmine'];
const rateBuckets = new Map();

const seedPosts = [
  {
    _id: 'seed-1', actorId: 'seed', author: 'Quiet Cedar', ts: Date.now() - 1000 * 60 * 60 * 26,
    text: 'Failed my first internals and genuinely thought I was done. Talked to my seniors and apparently half of them did too. If you’re in that hole right now — it’s a pothole, not a grave.',
    supportCount: 0, reportCount: 0, status: 'active',
  },
  {
    _id: 'seed-2', actorId: 'seed', author: 'Gentle Fern', ts: Date.now() - 1000 * 60 * 60 * 9,
    text: 'Small win: I studied for 25 minutes without picking up my phone. That’s it. That’s the post. Baby steps are still steps.',
    supportCount: 0, reportCount: 0, status: 'active',
  },
  {
    _id: 'seed-3', actorId: 'seed', author: 'Steady Lotus', ts: Date.now() - 1000 * 60 * 60 * 4,
    text: 'Reminder that asking for an extension is not weakness. I emailed my professor two lines and got a week. The scary part was only in my head.',
    supportCount: 0, reportCount: 0, status: 'active',
  },
];

const memoryPosts = new Map(seedPosts.map(post => [post._id, { ...post }]));
const memorySupports = new Map();
const memoryReports = new Map();
let seededMongo = false;

const ensureMongoSeeds = async () => {
  if (!useMongo() || seededMongo) return;
  await Promise.all(seedPosts.map(post => CommunityPost.updateOne(
    { _id: post._id }, { $setOnInsert: post }, { upsert: true },
  )));
  seededMongo = true;
};

const cleanText = (value, max) =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';

const aliasFor = actorId => {
  const digest = crypto.createHash('sha256').update(actorId).digest();
  return `${ADJECTIVES[digest[0] % ADJECTIVES.length]} ${PLANTS[digest[1] % PLANTS.length]}`;
};

const createToken = actorId => {
  const payload = Buffer.from(JSON.stringify({ sub: actorId, iat: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyToken = token => {
  try {
    const [payload, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
    if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!data.sub || Date.now() - data.iat > 1000 * 60 * 60 * 24 * 90) return null;
    return data.sub;
  } catch {
    return null;
  }
};

const requireActor = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const actorId = token ? verifyToken(token) : null;
  if (!actorId) return res.status(401).json({ error: 'community session required' });
  req.communityActorId = actorId;
  next();
};

const withinRate = (key, limit, windowMs) => {
  const now = Date.now();
  const recent = (rateBuckets.get(key) || []).filter(timestamp => now - timestamp < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateBuckets.set(key, recent);
  return true;
};

const containsContactDetails = text =>
  /(?:https?:\/\/|www\.|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?\d[\s().-]*){7,})/i.test(text);

const publicPost = (post, actorId, supported = false) => ({
  id: post._id,
  text: post.text,
  author: post.author,
  anonymous: true,
  ts: post.ts,
  supports: post.supportCount || 0,
  supported,
  isOwn: post.actorId === actorId,
});

router.post('/session', (_req, res) => {
  const actorId = crypto.randomUUID();
  res.status(201).json({ token: createToken(actorId), alias: aliasFor(actorId) });
});

router.get('/posts', requireActor, async (req, res) => {
  try {
    const limit = Math.min(30, Math.max(5, Number(req.query.limit) || 15));
    const before = Number(req.query.before) || Number.POSITIVE_INFINITY;
    const actorId = req.communityActorId;

    if (useMongo()) {
      await ensureMongoSeeds();
      const posts = await CommunityPost.find({ status: 'active', ts: { $lt: before } }).sort({ ts: -1 }).limit(limit).lean();
      const supportedRows = await CommunitySupport.find({ actorId, postId: { $in: posts.map(post => post._id) } }).select('postId').lean();
      const supported = new Set(supportedRows.map(row => row.postId));
      return res.json({
        posts: posts.map(post => publicPost(post, actorId, supported.has(post._id))),
        nextCursor: posts.length === limit ? posts.at(-1).ts : null,
      });
    }

    const posts = [...memoryPosts.values()].filter(post => post.status === 'active' && post.ts < before).sort((a, b) => b.ts - a.ts).slice(0, limit);
    return res.json({
      posts: posts.map(post => publicPost(post, actorId, memorySupports.get(post._id)?.has(actorId))),
      nextCursor: posts.length === limit ? posts.at(-1).ts : null,
    });
  } catch (error) {
    console.error('Community list failed:', error.message);
    res.status(500).json({ error: 'Could not open the community right now.' });
  }
});

router.post('/posts', requireActor, async (req, res) => {
  try {
    const actorId = req.communityActorId;
    if (!withinRate(`post:${actorId}`, 3, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Please wait a little before sharing another post.' });
    }
    const text = cleanText(req.body?.text, 600);
    if (text.length < 8) return res.status(400).json({ error: 'Add a little more so others can understand your thought.' });
    if (containsContactDetails(text)) return res.status(400).json({ error: 'For everyone’s privacy, remove links and personal contact details.' });

    const post = {
      _id: `post_${crypto.randomUUID()}`,
      text,
      author: aliasFor(actorId),
      actorId,
      ts: Date.now(),
      supportCount: 0,
      reportCount: 0,
      status: 'active',
    };
    if (useMongo()) await CommunityPost.create(post);
    else memoryPosts.set(post._id, post);
    res.status(201).json({ post: publicPost(post, actorId, false) });
  } catch (error) {
    console.error('Community create failed:', error.message);
    res.status(500).json({ error: 'Your post could not be shared. Please try again.' });
  }
});

router.post('/posts/:postId/support', requireActor, async (req, res) => {
  try {
    const { postId } = req.params;
    const actorId = req.communityActorId;
    if (!withinRate(`support:${actorId}`, 30, 60 * 1000)) return res.status(429).json({ error: 'Please slow down for a moment.' });

    if (useMongo()) {
      const post = await CommunityPost.findOne({ _id: postId, status: 'active' });
      if (!post) return res.status(404).json({ error: 'Post not found.' });
      const existing = await CommunitySupport.findOneAndDelete({ postId, actorId });
      let supported = false;
      if (!existing) {
        try { await CommunitySupport.create({ postId, actorId }); supported = true; }
        catch (error) { if (error.code !== 11000) throw error; supported = true; }
      }
      const supports = await CommunitySupport.countDocuments({ postId });
      await CommunityPost.updateOne({ _id: postId }, { $set: { supportCount: supports } });
      return res.json({ supported, supports });
    }

    const post = memoryPosts.get(postId);
    if (!post || post.status !== 'active') return res.status(404).json({ error: 'Post not found.' });
    const supporters = memorySupports.get(postId) || new Set();
    const supported = !supporters.has(actorId);
    if (supported) supporters.add(actorId); else supporters.delete(actorId);
    memorySupports.set(postId, supporters);
    post.supportCount = (seedPosts.some(seed => seed._id === postId) ? seedPosts.find(seed => seed._id === postId).supportCount : 0) + supporters.size;
    return res.json({ supported, supports: post.supportCount });
  } catch (error) {
    console.error('Community support failed:', error.message);
    res.status(500).json({ error: 'Could not update support.' });
  }
});

router.post('/posts/:postId/report', requireActor, async (req, res) => {
  try {
    const { postId } = req.params;
    const actorId = req.communityActorId;
    const reason = cleanText(req.body?.reason, 80) || 'unsafe';
    if (useMongo()) {
      try { await CommunityReport.create({ postId, actorId, reason }); } catch (error) { if (error.code !== 11000) throw error; }
      const reportCount = await CommunityReport.countDocuments({ postId });
      await CommunityPost.updateOne({ _id: postId }, { $set: { reportCount }, ...(reportCount >= 5 ? { $set: { reportCount, status: 'review' } } : {}) });
    } else {
      const reports = memoryReports.get(postId) || new Set();
      reports.add(actorId);
      memoryReports.set(postId, reports);
      const post = memoryPosts.get(postId);
      if (post && reports.size >= 5) post.status = 'review';
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Community report failed:', error.message);
    res.status(500).json({ error: 'Could not report this post.' });
  }
});

router.delete('/posts/:postId', requireActor, async (req, res) => {
  try {
    const { postId } = req.params;
    const actorId = req.communityActorId;
    if (useMongo()) {
      const result = await CommunityPost.updateOne({ _id: postId, actorId }, { $set: { status: 'deleted' } });
      if (!result.matchedCount) return res.status(404).json({ error: 'Post not found.' });
    } else {
      const post = memoryPosts.get(postId);
      if (!post || post.actorId !== actorId) return res.status(404).json({ error: 'Post not found.' });
      post.status = 'deleted';
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Community delete failed:', error.message);
    res.status(500).json({ error: 'Could not delete this post.' });
  }
});

export default router;
