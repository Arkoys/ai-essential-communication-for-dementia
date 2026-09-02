'use client';

import React, { useState } from 'react';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { anonymize } from '../lib/anonymizer';

interface CompareInputFormProps {
  onSendMessage: (content: string, isStuck?: boolean) => void;
  basicLoading: boolean;
  condensedLoading: boolean;
}

export function CompareInputForm({
  onSendMessage,
  basicLoading,
  condensedLoading,
}: CompareInputFormProps) {
  const [input, setInput] = useState('');
  const [isStuck, setIsStuck] = useState(false);
  const isLoading = basicLoading || condensedLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const cleanInput = anonymize(input);
    onSendMessage(cleanInput, isStuck);
    setInput('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-2 flex items-center justify-center gap-2 text-[10px] md:text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 py-1 md:py-1.5 px-2 md:px-3 rounded-full w-fit mx-auto border border-blue-200 dark:border-blue-800/50 text-center">
        <AlertTriangle size={12} className="shrink-0" />
        <span className="line-clamp-1 md:line-clamp-none">Compare Mode: Basic vs Condensed responses</span>
      </div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
      >
        <div className={[
          "relative flex flex-1 items-center min-w-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm transition-all",
          isStuck 
            ? "border-2 border-green-500 ring-4 ring-green-200 dark:ring-green-800/30" 
            : "border border-zinc-300 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500"
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
            className="absolute right-1.5 md:right-2 p-1.5 md:p-2 rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 transition-colors"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="md:w-[18px] md:h-[18px]" />}
          </button>
        </div>
      </form>
    </div>
  );
}
