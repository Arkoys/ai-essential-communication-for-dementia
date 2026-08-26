import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
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
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if this is a new session (no messages yet)
  const isNewSession = messages.length === 0;

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
      <div className="flex-1 overflow-y-auto relative z-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center">
            {/* Intro text */}
            <div className="px-8 md:px-16 lg:px-24 pb-2">
              <div className="max-w-2xl mx-auto text-center">
                <h1 className="text-2xl md:text-3xl font-semibold text-zinc-700 dark:text-zinc-200 leading-tight">
                  Welcome to the Cognitive Care Coach
                </h1>
                <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 leading-relaxed mt-3">
                  Practical communication support for primary care conversations about cognitive health, memory concerns, and dementia.
                </p>
                <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 font-medium mt-3">
                  What would help today?
                </p>
              </div>
            </div>
            
            {/* Centered input form + example prompts as single block */}
            <div className="flex items-start justify-center px-4 md:px-8">
              <div className="w-full max-w-2xl space-y-0">
                <div className={[
                  "bg-white dark:bg-zinc-900 rounded-2xl shadow-sm transition-all border-2 border-zinc-400 overflow-hidden",
                  isStuck 
                    ? "ring-4 ring-green-200 dark:ring-green-800/30" 
                    : !isInputFocused 
                      ? "animate-pulse-border" 
                      : ""
                ].join(" ")}>
                  <form
                    onSubmit={handleSubmit}
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      placeholder={isStuck ? "Describe your stuck point..." : "Ask the coach…"}
                      className={`w-full bg-transparent py-3 md:py-4 pl-4 md:pl-6 pr-12 md:pr-14 outline-none text-sm md:text-base text-zinc-800 dark:text-zinc-200 ${!isInputFocused && !isStuck ? 'placeholder:text-zinc-400 animate-pulse-text' : 'placeholder:text-zinc-400'}`}
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 p-1.5 md:p-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                  <div className="border-t border-zinc-200 dark:border-zinc-700/30">
                    <div className="flex flex-col gap-1.5 p-3">
                      {suggestedPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestedPrompt(prompt)}
                          className="text-left px-3 py-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          disabled={isLoading}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {/* PHI Warning */}
                <div className="flex justify-center pt-3">
                  <div className="inline-flex items-center gap-2 text-[10px] md:text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 py-1.5 px-3 rounded-full border border-amber-200 dark:border-amber-900/50">
                    <AlertTriangle size={12} className="shrink-0" />
                    <span>Do not input identifiable patient data (PHI). Inputs are anonymized.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-12 md:pt-14 pb-24 md:pb-28">
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

      {messages.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-950 dark:via-zinc-950 p-2 md:p-4 pt-6 md:pt-10">
          <div className="max-w-3xl mx-auto">
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
            >
              <div className={[
                "relative flex flex-1 items-center min-w-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm transition-all",
                isStuck 
                  ? "border-2 border-green-500 ring-4 ring-green-200 dark:ring-green-800/30" 
                  : isNewSession && !isInputFocused
                    ? "border-2 border-orange-500 animate-pulse-border"
                    : isNewSession && isInputFocused
                      ? "border-2 border-orange-500"
                      : "border border-zinc-300 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500"
              ].join(" ")}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
                  placeholder={isStuck ? "Describe your stuck point..." : "Ask the coach…"}
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
            <div className="flex items-center justify-between mt-1.5 md:mt-2 px-1">
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                {providerDisplayName}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
