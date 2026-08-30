import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BreathingCircle } from './design';
import { LockIcon, LogoMark } from './icons';
import { COPY } from '../content';

const ORBS = [
  { size: 320, top: '-6%', left: '-8%', tone: 'bg-sage-100', delay: '0s' },
  { size: 240, top: '55%', left: '78%', tone: 'bg-dusk-100', delay: '2s' },
  { size: 180, top: '70%', left: '8%', tone: 'bg-honey-100', delay: '4s' },
];

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup, loginAsGuest } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Both fields are needed to keep your space secure.');
      return;
    }

    if (!isLogin) {
      if (cleanUsername.length < 3 || cleanUsername.length > 32) {
        setError('Username must be between 3 and 32 characters long.');
        return;
      }
      if (!/^[a-zA-Z0-9_@.-]+$/.test(cleanUsername)) {
        setError('Username can only contain letters, numbers, underscores, hyphens, dots, and @.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must contain at least one letter and one number.');
        return;
      }
    }

    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(cleanUsername, password);
      } else {
        await signup(cleanUsername, password);
      }
    } catch (err: any) {
      setError(err.message || COPY.error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* Slow-drifting tinted orbs — an early morning in a quiet garden */}
      {ORBS.map((orb, i) => (
        <div
          key={i}
          className={`absolute rounded-full blur-3xl opacity-70 animate-drift-slow ${orb.tone}`}
          style={{ width: orb.size, height: orb.size, top: orb.top, left: orb.left, animationDelay: orb.delay }}
          aria-hidden="true"
        />
      ))}

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-10 items-center">
        {/* Welcome moment — sets the tone before asking for anything */}
        <div className="text-center md:text-left animate-fade-in">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-8">
            <LogoMark className="w-9 h-9" />
            <span className="font-display text-2xl font-semibold text-ink-900">helloMind</span>
          </div>
          <div className="flex justify-center md:justify-start mb-8">
            <BreathingCircle size={96} tone="sage" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-medium text-ink-900 leading-tight">
            You don’t have to carry it all alone.
          </h1>
          <p className="mt-4 text-ink-600 max-w-md mx-auto md:mx-0">
            A quiet place to check in on how you feel, talk it out, and find your next gentle step. No judgement,
            no rush.
          </p>
        </div>

        {/* The form itself — soft, unhurried */}
        <div className="card-organic p-7 sm:p-8 animate-rise">
          <h2 className="font-display text-xl font-medium text-ink-900">
            {isLogin ? 'Welcome back' : 'Your space is ready'}
          </h2>
          <p className="text-sm text-ink-600 mt-1 mb-6">
            {isLogin ? 'Pick up right where you left off.' : 'It takes a moment, and it’s just yours.'}
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label htmlFor="username" className="label-calm">
                A name for yourself
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                className="input-calm"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="e.g. sleepy_owl"
              />
            </div>
            <div className="mb-2">
              <label htmlFor="password" className="label-calm">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="input-calm"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Something only you know"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-coral-500 mt-3">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary w-full mt-5" disabled={isLoading}>
              {isLoading ? 'One moment…' : isLogin ? 'Come on in' : 'Create my space'}
            </button>
          </form>

          <button onClick={toggleForm} className="btn-ghost w-full mt-3 text-sm">
            {isLogin ? 'New here? Create your space' : 'Already have a space? Sign in'}
          </button>

          <div className="flex items-center gap-3 my-5" aria-hidden="true">
            <span className="h-px flex-1 bg-line-200" />
            <span className="text-xs text-ink-600">or</span>
            <span className="h-px flex-1 bg-line-200" />
          </div>

          <button onClick={loginAsGuest} className="chip w-full justify-center">
            Continue as guest — just for an assessment
          </button>

          <p className="flex items-start gap-2 text-xs text-ink-600 mt-6">
            <LockIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-sage-500" />
            {COPY.privacyLine}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
