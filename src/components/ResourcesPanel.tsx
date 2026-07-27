import React from 'react';
import { X, ExternalLink, FolderOpen, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Internal Ariadne Labs Resources - Core Toolkit PDFs
const INTERNAL_RESOURCES = [
  {
    name: 'Navigation Map',
    url: 'https://drive.google.com/file/d/1YBBHRlW78rzFDLydKyetFtWkwfWxIBlj/view',
    description: 'Clear structure for the dementia journey'
  },
  {
    name: 'Sample Language',
    url: 'https://drive.google.com/file/d/1SpGFF38frlTqQTQUCf_YJcwxWC_75b8q9dyqsJyDVLU/view',
    description: 'Ready-to-use language for sensitive conversations'
  },
  {
    name: 'Stuck Points Framework',
    url: 'https://drive.google.com/file/d/1TnAgt9ElwCax5-mUdHNLP317-B99TfkA/view',
    description: 'Practical tools for communication obstacles'
  },
];

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
        <div className="overflow-y-auto h-[calc(100dvh-49px)] p-4">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Core Toolkit
            </h3>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Essential Communications Toolkit resources
            </p>
          </div>
          
          <ul className="space-y-3">
            {INTERNAL_RESOURCES.map((resource) => (
              <li key={resource.name}>
                <button
                  onClick={() => handleResourceClick(resource.url)}
                  className="w-full flex items-start gap-3 px-3 py-3 text-left rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 transition-colors group"
                >
                  <div className="shrink-0 mt-0.5">
                    <FileText size={18} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {resource.name}
                      </span>
                      <ExternalLink 
                        size={14} 
                        className="shrink-0 text-zinc-400 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors" 
                      />
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {resource.description}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center">
              Additional clinical resources are referenced in AI responses when relevant to your query.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
