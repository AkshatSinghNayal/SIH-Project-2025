import React, { useEffect, useMemo, useState } from 'react';
import type { CommunityPost } from '../types';
import { useAuth } from '../hooks/useAuth';
import {
  createCommunityPost,
  deleteCommunityPost,
  listCommunityPosts,
  reportCommunityPost,
  toggleCommunitySupport,
} from '../services/communityService';
import { getHiddenPostIds, hidePost } from '../services/storageService';
import { BreathingCircle, SectionHeading } from './design';
import {
  CheckIcon,
  CommunityIcon,
  EyeOffIcon,
  FlagIcon,
  HeartIcon,
  LockIcon,
  SparkIcon,
  TrashIcon,
} from './icons';

type FeedSort = 'new' | 'supported';

const timeAgo = (timestamp: number): string => {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const Avatar: React.FC<{ name: string; large?: boolean }> = ({ name, large }) => {
  const hue = [...name].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 3;
  const tone = ['from-dusk-500 to-dusk-700', 'from-sage-500 to-sage-700', 'from-honey-500 to-coral-500'][hue];
  return (
    <span className={`${large ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs'} rounded-full bg-gradient-to-br ${tone} text-white flex items-center justify-center font-semibold flex-shrink-0 shadow-sm`} aria-hidden="true">
      {name.split(' ').map(word => word[0]).join('').slice(0, 2)}
    </span>
  );
};

const FeedSkeleton = () => (
  <div className="space-y-4" aria-label="Loading community posts">
    {[1, 2, 3].map(item => (
      <div key={item} className="card-soft p-5 animate-pulse"><div className="flex gap-3"><span className="w-9 h-9 rounded-full bg-sage-100" /><div className="flex-1"><div className="h-3 bg-sage-100 rounded w-32" /><div className="h-3 bg-sage-50 rounded w-full mt-5" /><div className="h-3 bg-sage-50 rounded w-4/5 mt-2" /></div></div></div>
    ))}
  </div>
);

const Community: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [hidden, setHidden] = useState<string[]>(() => user ? getHiddenPostIds(user.id) : []);
  const [draft, setDraft] = useState('');
  const [sort, setSort] = useState<FeedSort>('new');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pendingSupports, setPendingSupports] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const result = await listCommunityPosts();
      setPosts(previous => {
        if (!quiet || previous.length === 0) return result.posts;
        const latestIds = new Set(result.posts.map(post => post.id));
        return [...result.posts, ...previous.filter(post => !latestIds.has(post.id))];
      });
      if (!quiet) setNextCursor(result.nextCursor);
      setError('');
    } catch (requestError) {
      if (!quiet) setError(requestError instanceof Error ? requestError.message : 'Could not open the community.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh(true);
    }, 12_000);
    return () => clearInterval(interval);
  // The feed owns its refresh lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const visible = useMemo(() => {
    const available = posts.filter(post => !hidden.includes(post.id));
    return sort === 'supported'
      ? [...available].sort((a, b) => b.supports - a.supports || b.ts - a.ts)
      : [...available].sort((a, b) => b.ts - a.ts);
  }, [posts, hidden, sort]);

  if (!user) return null;

  const share = async () => {
    const text = draft.trim();
    if (text.length < 8) {
      setError('Add a little more so others can understand your thought.');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      const { post } = await createCommunityPost(text);
      setPosts(previous => [post, ...previous]);
      setDraft('');
      setNotice('Your note is now part of the garden.');
      setTimeout(() => setNotice(''), 3500);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Your post could not be shared.');
    } finally {
      setPublishing(false);
    }
  };

  const support = async (postId: string) => {
    if (pendingSupports.includes(postId)) return;
    const previous = posts.find(post => post.id === postId);
    if (!previous) return;
    setPendingSupports(current => [...current, postId]);
    setPosts(current => current.map(post => post.id === postId ? {
      ...post,
      supported: !post.supported,
      supports: Math.max(0, post.supports + (post.supported ? -1 : 1)),
    } : post));
    try {
      const result = await toggleCommunitySupport(postId);
      setPosts(current => current.map(post => post.id === postId ? { ...post, ...result } : post));
    } catch (requestError) {
      setPosts(current => current.map(post => post.id === postId ? previous : post));
      setError(requestError instanceof Error ? requestError.message : 'Could not send support.');
    } finally {
      setPendingSupports(current => current.filter(id => id !== postId));
    }
  };

  const hide = (postId: string) => {
    setHidden(hidePost(user.id, postId));
    setNotice('Post hidden on this device.');
    setTimeout(() => setNotice(''), 2500);
  };

  const report = async (postId: string, reason: string) => {
    try {
      await reportCommunityPost(postId, reason);
      setReportingId(null);
      hide(postId);
      setNotice('Reported and hidden. Thank you for protecting this space.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not report this post.');
    }
  };

  const remove = async (postId: string) => {
    try {
      await deleteCommunityPost(postId);
      setPosts(current => current.filter(post => post.id !== postId));
      setDeletingId(null);
      setNotice('Your post was removed.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not delete this post.');
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await listCommunityPosts(nextCursor);
      setPosts(current => {
        const existing = new Set(current.map(post => post.id));
        return [...current, ...result.posts.filter(post => !existing.has(post.id))];
      });
      setNextCursor(result.nextCursor);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load more posts.');
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10 pb-16">
      <div className="relative overflow-hidden card-organic bg-gradient-to-br from-sage-50 via-surface to-dusk-50 p-6 sm:p-8 mb-7">
        <BreathingCircle size={190} tone="sage" className="absolute -right-16 -top-20 opacity-30" />
        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 text-sage-700 text-sm font-medium"><span className="w-2 h-2 rounded-full bg-sage-500 animate-pulse" />Global student community</div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink-900 mt-2">A garden of honest moments</h1>
          <p className="text-ink-600 mt-3 max-w-xl">Share a small win, a lesson, or encouragement. Posts and support counts are visible to everyone here—not only on this device.</p>
          <div className="flex flex-wrap gap-2 mt-5"><span className="chip bg-surface text-xs"><LockIcon className="w-3.5 h-3.5" />Anonymous garden name</span><span className="chip bg-surface text-xs"><CommunityIcon className="w-3.5 h-3.5" />Shared globally</span><span className="chip bg-surface text-xs"><SparkIcon className="w-3.5 h-3.5" />Kindness first</span></div>
        </div>
      </div>

      <section className="card-organic p-5 sm:p-6 mb-8">
        <div className="flex items-start gap-3 mb-4"><span className="w-10 h-10 rounded-soft bg-sage-100 text-sage-700 flex items-center justify-center flex-shrink-0"><SparkIcon className="w-5 h-5" /></span><div><h2 className="font-medium text-ink-900">Plant a note</h2><p className="text-sm text-ink-600 mt-0.5">You’ll receive a consistent private garden name. Do not include names, phone numbers, links, or contact details.</p></div></div>
        <label htmlFor="community-draft" className="sr-only">Write a community post</label>
        <textarea id="community-draft" value={draft} onChange={event => { setDraft(event.target.value.slice(0, 600)); setError(''); }} rows={4} maxLength={600} placeholder="Something I needed to hear this week was…" className="input-calm resize-none text-base" />
        <div className="flex items-center justify-between mt-3 gap-3"><span className={`text-xs ${draft.length > 550 ? 'text-coral-500' : 'text-ink-600'}`}>{draft.length}/600</span><button onClick={share} className="btn-primary py-2.5 px-5" disabled={publishing || draft.trim().length < 8}>{publishing ? 'Planting…' : 'Share with the garden'}</button></div>
      </section>

      {(error || notice) && (
        <div role={error ? 'alert' : 'status'} className={`mb-5 px-4 py-3 rounded-soft border text-sm flex items-center gap-2 ${error ? 'bg-coral-100 border-coral-500/30 text-ink-900' : 'bg-sage-50 border-sage-200 text-sage-700'}`}>
          {error ? <span className="w-2 h-2 rounded-full bg-coral-500" /> : <CheckIcon className="w-4 h-4" />}{error || notice}
          {error && <button onClick={() => setError('')} className="ml-auto text-xs underline">Dismiss</button>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <SectionHeading title="What students are sharing" sub="Support means “I hear you”—not a popularity score." className="mb-0" />
        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-full bg-sage-50 border border-line-200">
            <button onClick={() => setSort('new')} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${sort === 'new' ? 'bg-surface shadow-sm text-sage-700 font-medium' : 'text-ink-600'}`}>Newest</button>
            <button onClick={() => setSort('supported')} className={`px-3 py-1.5 rounded-full text-xs transition-colors ${sort === 'supported' ? 'bg-surface shadow-sm text-sage-700 font-medium' : 'text-ink-600'}`}>Most supported</button>
          </div>
          <button onClick={() => void refresh()} disabled={refreshing} className="btn-ghost px-3 py-2 text-xs">{refreshing ? 'Refreshing…' : 'Refresh'}</button>
        </div>
      </div>

      {loading ? <FeedSkeleton /> : visible.length === 0 ? (
        <div className="card-soft text-center py-14 px-5"><BreathingCircle size={62} tone="mist" className="mx-auto mb-4" /><p className="font-display text-xl text-ink-900">It’s quiet in this part of the garden</p><p className="text-sm text-ink-600 mt-2">A kind sentence can be a good first seed.</p></div>
      ) : (
        <div className="space-y-4">
          {visible.map(post => (
            <article key={post.id} className={`card-soft p-5 sm:p-6 animate-rise transition-shadow hover:shadow-soft-lg ${post.isOwn ? 'border-sage-500/30' : ''}`}>
              <div className="flex items-start gap-3">
                <Avatar name={post.author} large />
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-ink-900">{post.author}</span>{post.isOwn && <span className="px-2 py-0.5 rounded-full bg-sage-100 text-sage-700 text-[10px] font-medium">Your post</span>}<span className="text-xs text-ink-600">· {timeAgo(post.ts)}</span></div><p className="text-xs text-ink-600 mt-0.5">Anonymous student</p></div>
              </div>
              <p className="text-ink-900 leading-relaxed whitespace-pre-wrap break-words mt-4 max-w-proseletter">{post.text}</p>
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-line-200">
                <button onClick={() => void support(post.id)} disabled={pendingSupports.includes(post.id)} className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm transition-all disabled:opacity-60 ${post.supported ? 'bg-coral-100 text-coral-500 font-medium' : 'text-ink-600 hover:bg-coral-100 hover:text-coral-500'}`} aria-pressed={post.supported}>
                  <HeartIcon className={`w-4 h-4 ${post.supported ? 'animate-rise' : ''}`} filled={post.supported} />
                  <span>{post.supported ? 'Supported' : 'Send support'}</span><span className="min-w-5 text-center">{post.supports}</span>
                </button>
                <span className="flex-1" />
                {post.isOwn ? (
                  <button onClick={() => setDeletingId(post.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-ink-600 hover:text-coral-500 hover:bg-coral-100"><TrashIcon className="w-4 h-4" />Delete</button>
                ) : (
                  <><button onClick={() => hide(post.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs text-ink-600 hover:bg-sage-50"><EyeOffIcon className="w-4 h-4" />Hide</button><button onClick={() => setReportingId(post.id)} className="p-2 rounded-full text-ink-600/60 hover:text-coral-500 hover:bg-coral-100" aria-label="Report post" title="Report"><FlagIcon className="w-4 h-4" /></button></>
                )}
              </div>

              {reportingId === post.id && (
                <div className="mt-4 rounded-soft bg-coral-100/60 border border-coral-500/20 p-4 animate-rise"><p className="text-sm font-medium text-ink-900">What feels unsafe about this post?</p><div className="flex flex-wrap gap-2 mt-3">{['Harassment', 'Personal information', 'Harmful advice', 'Spam'].map(reason => <button key={reason} onClick={() => void report(post.id, reason)} className="chip bg-surface text-xs py-1.5">{reason}</button>)}<button onClick={() => setReportingId(null)} className="btn-ghost text-xs py-1.5">Cancel</button></div></div>
              )}
              {deletingId === post.id && (
                <div className="mt-4 rounded-soft bg-coral-100/60 border border-coral-500/20 p-4 flex flex-col sm:flex-row sm:items-center gap-3 animate-rise"><p className="text-sm text-ink-900 flex-1">Remove this post for everyone? This cannot be undone.</p><button onClick={() => void remove(post.id)} className="btn-primary bg-coral-500 hover:bg-coral-500 py-2 px-4 text-sm">Delete everywhere</button><button onClick={() => setDeletingId(null)} className="btn-ghost py-2 text-sm">Keep it</button></div>
              )}
            </article>
          ))}
        </div>
      )}

      {nextCursor && sort === 'new' && <button onClick={() => void loadMore()} disabled={loadingMore} className="btn-secondary w-full mt-5">{loadingMore ? 'Opening more…' : 'Load older posts'}</button>}

      <div className="mt-10 rounded-organic bg-dusk-50 border border-dusk-200 p-5 flex items-start gap-3"><LockIcon className="w-5 h-5 text-dusk-700 flex-shrink-0 mt-0.5" /><div><p className="text-sm font-medium text-ink-900">A community, not crisis support</p><p className="text-xs text-ink-600 mt-1 leading-relaxed">Posts come from other students and are not professional advice. If you may be in immediate danger or need urgent help, use the support resources available from the sidebar.</p></div></div>
    </div>
  );
};

export default Community;
