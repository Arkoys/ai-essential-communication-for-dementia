import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertTriangle, Zap } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { anonymize } from '../lib/anonymizer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStuck?: boolean;
  isInsufficientInfo?: boolean;
}

import { DEFAULT_SUGGESTED_PROMPTS } from '../lib/promptSettings';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, isStuck?: boolean) => void;
  isLoading: boolean;
  suggestedPrompts?: string[];
  provider?: string;
}

export function ChatWindow({
  messages,
  onSendMessage,
  isLoading,
  suggestedPrompts = DEFAULT_SUGGESTED_PROMPTS,
  provider = 'harvard',
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [isStuck, setIsStuck] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    onSendMessage(cleanInput, isStuck);
    setInput('');
  };

  const handleSuggestedPrompt = (prompt: string) => {
    if (isLoading) return;
    onSendMessage(prompt);
  };

  // Display name for provider
  const providerDisplayName = provider === 'harvard' ? 'Harvard GPT (OpenAI)' : provider === 'minimax' ? 'MiniMax' : provider;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 md:p-12 text-center space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl md:text-4xl font-semibold text-zinc-800 dark:text-zinc-200">
                Dementia Clinical Coach
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto text-sm md:text-base">
                Evidence-based decision support for primary care providers.
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 max-w-2xl mt-16">
              {suggestedPrompts.map((prompt) => (
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
              <MessageBubble key={msg.id} role={msg.role} content={msg.content} isStuck={msg.isStuck} isInsufficientInfo={msg.isInsufficientInfo} />
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
                      Clinical Coach
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
            <div className={[
              "relative flex flex-1 items-center min-w-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm transition-all",
              isStuck 
                ? "border-2 border-green-500 ring-4 ring-green-200 dark:ring-green-800/30" 
                : "border border-zinc-300 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500"
            ].join(" ")}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isStuck ? "Describe your stuck point..." : "Explain the patient's situation..."}
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
            <button
              type="button"
              onClick={() => setIsStuck(!isStuck)}
              className={[
                "shrink-0 px-3 py-2 md:px-4 md:py-3 rounded-xl font-medium text-sm transition-all flex items-center gap-2",
                isStuck
                  ? "bg-green-500 text-white hover:bg-green-600 shadow-md"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              ].join(" ")}
              title="Focus on stuck point - skip framework structure"
            >
              <Zap size={16} className={isStuck ? "fill-current" : ""} />
              <span className="hidden sm:inline">Stuck</span>
            </button>
          </form>
          <div className="flex items-center justify-between mt-1.5 md:mt-2 px-1">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              {providerDisplayName}
            </span>
            <span className="text-[10px] md:text-xs text-zinc-400 dark:text-zinc-500">
              AI-generated clinical guidance. Always verify with primary literature.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}