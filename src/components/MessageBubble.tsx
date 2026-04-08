import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { User, Stethoscope } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        "flex w-full py-6",
        isUser ? "bg-white dark:bg-zinc-950" : "bg-zinc-50 dark:bg-zinc-900"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-6 w-full px-4">
        <div className="shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <User size={18} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Stethoscope size={18} />
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
            {isUser ? 'You' : 'Clinical Assistant'}
          </div>
          <div className="prose prose-zinc dark:prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
