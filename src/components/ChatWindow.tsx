import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertTriangle, AlignLeft, AlignJustify } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { cn } from '../lib/utils';
import { anonymize } from '../lib/anonymizer';
import type { AnswerLengthMode } from '../lib/llm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWindowProps {
  messages: Message[];
  /** Second arg is the mode at send time (sync with toggle; avoids stale parent state). */
  onSendMessage: (content: string, answerLength: AnswerLengthMode) => void;
  isLoading: boolean;
  answerLengthMode: AnswerLengthMode;
  onAnswerLengthModeChange: (mode: AnswerLengthMode) => void;
}

const SUGGESTED_PROMPTS = [
  "Ask about treatment alternatives",
  "Ask a tough question",
  "Construct a workup"
];

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  answerLengthMode,
  onAnswerLengthModeChange,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  /** Local mode updates synchronously on toggle so submit uses the value the user just picked. */
  const [lengthMode, setLengthMode] = useState<AnswerLengthMode>(answerLengthMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLengthMode(answerLengthMode);
  }, [answerLengthMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const cleanInput = anonymize(input);
    onSendMessage(cleanInput, lengthMode);
    setInput('');
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt, lengthMode);
  };

  const handleLengthToggle = (mode: AnswerLengthMode) => {
    setLengthMode(mode);
    onAnswerLengthModeChange(mode);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4 md:p-8 text-center space-y-6 md:space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-semibold text-zinc-800 dark:text-zinc-200">
                Dementia Clinical Assistant
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto text-sm md:text-base">
                Evidence-based decision support for primary care providers.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-2xl">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs md:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="pb-36 md:pb-32">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
            ))}
            {isLoading && (
              <div className="flex w-full py-4 md:py-6 bg-zinc-50 dark:bg-zinc-900">
                <div className="max-w-3xl mx-auto flex gap-4 md:gap-6 w-full px-4">
                  <div className="shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Loader2 size={18} className="animate-spin" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                      Clinical Assistant
                    </div>
                    <div className="text-zinc-500 dark:text-zinc-400 text-sm">
                      Analyzing and retrieving evidence...
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 p-2 md:p-4 pt-8 md:pt-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-2 flex items-center justify-center gap-2 text-[10px] md:text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 py-1 md:py-1.5 px-2 md:px-3 rounded-full w-fit mx-auto border border-amber-200 dark:border-amber-900/50 text-center">
            <AlertTriangle size={12} className="shrink-0" />
            <span className="line-clamp-1 md:line-clamp-none">Do not input identifiable patient data (PHI). Inputs are anonymized.</span>
          </div>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
          >
            <div
              className="flex shrink-0 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/80 p-0.5"
              role="group"
              aria-label="Answer length"
            >
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleLengthToggle('concise')}
                title="Short bullets, on-the-spot"
                className={cn(
                  'flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-2 text-[11px] sm:text-xs font-medium transition-colors min-w-0 flex-1 sm:flex-initial',
                  lengthMode === 'concise'
                    ? 'bg-white dark:bg-zinc-800 text-orange-700 dark:text-orange-300 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                <AlignLeft size={14} className="shrink-0" aria-hidden />
                <span>Concise</span>
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleLengthToggle('detailed')}
                title="Full structured answer"
                className={cn(
                  'flex items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-2 sm:px-2.5 py-2 text-[11px] sm:text-xs font-medium transition-colors min-w-0 flex-1 sm:flex-initial',
                  lengthMode === 'detailed'
                    ? 'bg-white dark:bg-zinc-800 text-orange-700 dark:text-orange-300 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                )}
              >
                <AlignJustify size={14} className="shrink-0" aria-hidden />
                <span>Detailed</span>
              </button>
            </div>
            <div className="relative flex flex-1 items-center min-w-0 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a medical question..."
                className="w-full bg-transparent py-3 md:py-4 pl-4 md:pl-6 pr-12 md:pr-14 outline-none text-sm md:text-base text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-1.5 md:right-2 p-1.5 md:p-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-colors"
              >
                <Send size={16} className="md:w-[18px] md:h-[18px]" />
              </button>
            </div>
          </form>
          <div className="text-center mt-1.5 md:mt-2 text-[10px] md:text-xs text-zinc-400 dark:text-zinc-500">
            AI-generated clinical guidance. Always verify with primary literature.
          </div>
        </div>
      </div>
    </div>
  );
}
