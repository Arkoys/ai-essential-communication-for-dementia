import React from 'react';
import { X, ExternalLink, FolderOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import { groupedResources } from '../lib/resources';

interface ResourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResourcesPanel({ isOpen, onClose }: ResourcesPanelProps) {
  const handleResourceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out w-80 max-w-[90vw] bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-700",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-1 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-orange-600 dark:text-orange-400" />
            <h2 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Resources</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto h-[calc(100dvh-49px)] p-2 space-y-5">
          {Object.entries(groupedResources).map(([category, resources]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                {category}
              </h3>
              <ul className="space-y-1">
                {resources.map((resource) => (
                  <li key={resource.url}>
                    <button
                      onClick={() => handleResourceClick(resource.url)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors group"
                    >
                      <span className="text-sm font-medium truncate">{resource.name}</span>
                      <ExternalLink 
                        size={14} 
                        className="shrink-0 text-zinc-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" 
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
