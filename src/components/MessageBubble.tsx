import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { User, Stethoscope, Zap, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isStuck?: boolean;
  isInsufficientInfo?: boolean;
}

export function MessageBubble({ role, content, isStuck, isInsufficientInfo }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        "flex w-full py-6",
        isUser 
          ? "bg-white dark:bg-zinc-950" 
          : isStuck 
            ? "bg-green-50 dark:bg-green-900/20" 
            : isInsufficientInfo
              ? "bg-amber-50 dark:bg-amber-900/20"
              : "bg-zinc-50 dark:bg-zinc-900"
      )}
    >
      <div className="max-w-3xl mx-auto flex gap-6 w-full px-4">
        <div className="shrink-0 mt-1">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <User size={18} />
            </div>
          ) : (
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              isStuck 
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                : isInsufficientInfo
                  ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                  : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            )}>
              {isStuck ? <Zap size={18} /> : isInsufficientInfo ? <AlertCircle size={18} /> : <Stethoscope size={18} />}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className={cn(
            "font-semibold text-sm",
            isUser 
              ? "text-zinc-800 dark:text-zinc-200" 
              : isStuck 
                ? "text-green-800 dark:text-green-200" 
                : isInsufficientInfo
                  ? "text-amber-800 dark:text-amber-200"
                  : "text-zinc-800 dark:text-zinc-200"
          )}>
            {isUser 
              ? 'You' 
              : isStuck 
                ? 'Stuck Mode Coach' 
                : isInsufficientInfo
                  ? 'Coach (needs more info)'
                  : 'Clinical Coach'}
          </div>
          <div className={cn(
            "prose max-w-none text-sm leading-relaxed",
            isStuck ? "prose-green dark:prose-invert" : isInsufficientInfo ? "prose-amber dark:prose-invert" : "prose-zinc dark:prose-invert"
          )}>
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2
                    className={cn(
                      "font-semibold text-base mt-6 mb-2 border-l-4 pl-3",
                      isStuck
                        ? "text-green-800 dark:text-green-200 border-green-500"
                        : isInsufficientInfo
                          ? "text-amber-800 dark:text-amber-200 border-amber-500"
                          : "text-orange-800 border-orange-400"
                    )}
                  >
                    {children}
                  </h2>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
