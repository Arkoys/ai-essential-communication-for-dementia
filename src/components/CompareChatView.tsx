'use client';

import React from 'react';
import { MessageBubble } from './MessageBubble';
import { Loader2 } from 'lucide-react';
import { AlignLeft, Minimize2 } from 'lucide-react';

interface CompareChatViewProps {
  primaryMessages: { id: string; role: 'user' | 'assistant'; content: string }[];
  secondaryMessages: { id: string; role: 'user' | 'assistant'; content: string }[];
  primaryLoading: boolean;
  secondaryLoading: boolean;
}

export function CompareChatView({
  primaryMessages,
  secondaryMessages,
  primaryLoading,
  secondaryLoading,
}: CompareChatViewProps) {
  return (
    <div className="flex h-full gap-1 bg-white dark:bg-zinc-950">
      {/* Basic Mode (Left) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20 border-b border-orange-200 dark:border-orange-800/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <AlignLeft size={16} className="text-orange-600 dark:text-orange-400" />
            <span className="font-semibold text-orange-800 dark:text-orange-300">
              Basic
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-36 md:pb-32">
          {primaryMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-sm">Waiting for input...</p>
              <p className="text-xs mt-1">Basic responses will appear here</p>
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
                        Basic Mode
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Generating...
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Condensed Mode (Right) */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="shrink-0 px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 border-b border-blue-200 dark:border-blue-800/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <Minimize2 size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-blue-800 dark:text-blue-300">
              Condensed
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto pb-36 md:pb-32">
          {secondaryMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center text-zinc-500 dark:text-zinc-400">
              <p className="text-sm">Waiting for input...</p>
              <p className="text-xs mt-1">Condensed responses will appear here</p>
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
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Loader2 size={18} className="animate-spin" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                        Condensed Mode
                      </div>
                      <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                        Generating...
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
