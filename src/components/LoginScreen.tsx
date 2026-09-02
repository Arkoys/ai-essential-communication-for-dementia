'use client';

import { useState } from 'react';
import { Stethoscope } from 'lucide-react';

type Mode = 'signin' | 'signup';

interface LoginScreenProps {
  onEmailSignIn: (email: string, password: string) => Promise<void> | void;
  onEmailSignUp: (email: string, password: string, name: string) => Promise<void> | void;
  isLoading: boolean;
  error: string | null;
}

export function LoginScreen({
  onEmailSignIn,
  onEmailSignUp,
  isLoading,
  error,
}: LoginScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signin') {
      void onEmailSignIn(email, password);
    } else {
      void onEmailSignUp(email, password, name || email.split('@')[0]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 space-y-6">
        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto">
          <Stethoscope size={32} />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Dementia Clinical Coach
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Evidence-based decision support for primary care providers.
          </p>
        </div>

        {/* Email */}
        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 text-sm rounded-lg ${
                mode === 'signin'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm rounded-lg ${
                mode === 'signup'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              Create account
            </button>
          </div>

          {mode === 'signup' && (
            <input
              type="text"
              required
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          )}
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-zinc-900 hover:bg-zinc-700 dark:bg-zinc-100 dark:hover:bg-zinc-300 disabled:opacity-50 text-white dark:text-zinc-900 font-medium py-2.5 px-4 rounded-xl transition-colors"
          >
            {mode === 'signin' ? 'Sign in with email' : 'Create account'}
          </button>
        </form>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800/50">
            {error}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <img
            src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg"
            alt="Ariadne Labs"
            className="sm:h-20 h-8 w-auto invert dark:invert-0"
          />
        </div>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
          For authorized clinical personnel only. Do not input identifiable patient data.
        </p>
      </div>
    </div>
  );
}
