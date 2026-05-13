import React, { useState } from 'react';
import { Plus, MessageSquare, LogOut, Trash2, Settings, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

interface SidebarHistoryProps {
  conversations: { id: string; title: string; createdAt: Date; updatedAt: Date }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  userEmail: string;
  setShowAdminPanel: (show: boolean) => void;
  setShowSettingsPanel: (show: boolean) => void;
  onClose?: () => void;
}

export function SidebarHistory({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onLogout,
  userEmail,
  setShowAdminPanel,
  setShowSettingsPanel,
  onClose,
}: SidebarHistoryProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={cn(
        "h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-all duration-300",
        isOpen ? "w-72 md:w-64" : "w-16"
      )}
    >
      {/* HEADER */}
      <div className="p-4 flex flex-col gap-4 border-b border-zinc-200 dark:border-zinc-800">
        
        {/* Logo + Toggle */}
        <div className="flex items-center justify-between">
          {isOpen && (
            <img 
              src="https://www.ariadnelabs.org/wp-content/themes/ariadne-labs/assets/images/AL-logo-solo-white.svg" 
              alt="Ariadne Labs" 
              className="h-10 w-auto dark:invert-0 invert opacity-90"
            />
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {isOpen ? <ChevronLeft size={20} className="pointer-events-none" /> : <ChevronRight size={20} className="pointer-events-none" />}
          </button>
        </div>

        {/* New button */}
        <button
          onClick={() => {
            onNew();
            onClose?.();
          }}
          className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-2 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus size={18} />
          {isOpen && "New Consultation"}
        </button>
      </div>

      {/* CONVERSATIONS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          isOpen && (
            <div className="text-center text-zinc-500 dark:text-zinc-400 text-sm mt-8">
              No history yet
            </div>
          )
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={cn(
                "group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors",
                activeId === conv.id
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              )}
              onClick={() => {
                onSelect(conv.id);
                onClose?.();
              }}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={16} className="shrink-0" />
                
                {isOpen && (
                  <div className="truncate text-sm font-medium">
                    {conv.title || 'New Consultation'}
                    <div className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                      {format(conv.updatedAt, 'MMM d, yyyy')}
                    </div>
                  </div>
                )}
              </div>

              {isOpen && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-all p-1"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          
          {isOpen && (
            <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate pr-2">
              {userEmail}
            </div>
          )}

          <div className="flex items-center gap-1">
            {userEmail === 'victor.negadi@gmail.com' && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="text-zinc-400 hover:text-orange-500 transition-colors p-1"
                title="Admin Panel"
              >
                <Settings size={18} />
              </button>
            )}

            <button
              onClick={() => setShowSettingsPanel(true)}
              className="text-zinc-400 hover:text-blue-500 transition-colors p-1"
              title="Prompt Settings"
            >
              <Settings size={18} />
            </button>

            <button
              onClick={onLogout}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors p-1"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}