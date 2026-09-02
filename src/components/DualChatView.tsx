'use client';

import React from 'react';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';
import { PROVIDER_REGISTRY } from '../lib/providers/types';

interface DualChatViewProps {
  primaryMessages: { id: string; role: 'user' | 'assistant'; content: string }[];
  secondaryMessages: { id: string; role: 'user' | 'assistant'; content: string }[];
  primaryProvider: string;
  secondaryProvider: string;
  primaryLoading: boolean;
  secondaryLoading: boolean;
}

export function DualChatView({
  primaryMessages,
  secondaryMessages,
  primaryProvider,
  secondaryProvider,
  primaryLoading,
  secondaryLoading,
}: DualChatViewProps) {
  const primaryProviderName = PROVIDER_REGISTRY[primaryProvider as keyof typeof PROVIDER_REGISTRY]?.name || primaryProvider;
  const secondaryProviderName = PROVIDER_REGISTRY[secondaryProvider as keyof typeof PROVIDER_REGISTRY]?.name || secondaryProvider;

  return (
    <div className="flex h-full gap-1 bg-white dark:bg-zinc-950">
      {/* Primary Model (Left) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-800/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-semibold text-orange-800 dark:text-orange-300">
              {primaryProviderName}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-36 md:pb-32">
          {primaryMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-sm">Waiting for input...</p>
              <p className="text-xs mt-1">Responses will appear here</p>
            </div>
          ) : (
            <>
              {primaryMessages.map((msg) => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {primaryLoading && (
                <div className="flex w-full py-4 md:py-6 bg-zinc-50 dark:bg-zinc-900">
                  <div className="max-w-3xl mx-auto flex gap-4 md:gap-6 w-full px-4">
                    <div className="shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                        {primaryProviderName}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Generating response...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Secondary Model (Right) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20 border-b border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="font-semibold text-purple-800 dark:text-purple-300">
              {secondaryProviderName}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-36 md:pb-32">
          {secondaryMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-sm">Waiting for input...</p>
              <p className="text-xs mt-1">Responses will appear here</p>
            </div>
          ) : (
            <>
              {secondaryMessages.map((msg) => (
                <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
              ))}
              {secondaryLoading && (
                <div className="flex w-full py-4 md:py-6 bg-zinc-50 dark:bg-zinc-900">
                  <div className="max-w-3xl mx-auto flex gap-4 md:gap-6 w-full px-4">
                    <div className="shrink-0 mt-1">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                        {secondaryProviderName}
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Generating response...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}