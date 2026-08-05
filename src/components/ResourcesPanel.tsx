import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, FolderOpen, FileText, ChevronLeft, ChevronRight, Download, ExternalLink, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface ResourcesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Internal Documents - PDFs stored in /public/documents
interface InternalDocument {
  id: string;
  name: string;
  filename: string;
  description?: string;
}

const INTERNAL_DOCUMENTS: InternalDocument[] = [
  {
    id: 'navigation-map',
    name: 'Navigation Map',
    filename: 'navigation-map.pdf',
    description: 'Clear structure for the dementia journey'
  },
  {
    id: 'sample-language',
    name: 'Sample Language',
    filename: 'sample-language.pdf',
    description: 'Ready-to-use language for sensitive conversations'
  },
  {
    id: 'stuck-points',
    name: 'Stuck Points Framework',
    filename: 'stuck-points.pdf',
    description: 'Practical tools for communication obstacles'
  },
];

export function ResourcesPanel({ isOpen, onClose }: ResourcesPanelProps) {
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const handleDownload = (doc: InternalDocument) => {
    const link = document.createElement('a');
    link.href = `/documents/${doc.filename}`;
    link.download = doc.filename;
    link.click();
  };

  const activeDocument = INTERNAL_DOCUMENTS.find(d => d.id === activeDocId);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className={cn(
        "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out",
        "w-full md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-5xl",
        "bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-700",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-1 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <FolderOpen size={18} className="text-orange-600 dark:text-orange-400" />
            <h2 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">Internal Documents</h2>
            <Link
              to="/documents"
              target="_blank"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-md hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              <Maximize2 size={12} />
              Open full page
            </Link>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 -mr-1.5 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex h-[calc(100dvh-49px)]">
          {/* Sidebar - Document List */}
          <div className="w-72 border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Available Documents
              </h3>
              <ul className="space-y-1">
                {INTERNAL_DOCUMENTS.map((doc) => (
                  <li key={doc.id}>
                    <button
                      onClick={() => setActiveDocId(doc.id)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2 text-left rounded-lg transition-colors",
                        activeDocId === doc.id
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                      )}
                    >
                      <FileText size={16} className="shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">{doc.name}</span>
                        {doc.description && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mt-0.5 line-clamp-2">
                            {doc.description}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Document Navigation */}
            <div className="mt-auto p-4 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Document {activeDocId ? INTERNAL_DOCUMENTS.findIndex(d => d.id === activeDocId) + 1 : 0} of {INTERNAL_DOCUMENTS.length}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const currentIndex = INTERNAL_DOCUMENTS.findIndex(d => d.id === activeDocId);
                      const prevIndex = currentIndex > 0 ? currentIndex - 1 : INTERNAL_DOCUMENTS.length - 1;
                      setActiveDocId(INTERNAL_DOCUMENTS[prevIndex].id);
                    }}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const currentIndex = INTERNAL_DOCUMENTS.findIndex(d => d.id === activeDocId);
                      const nextIndex = currentIndex < INTERNAL_DOCUMENTS.length - 1 ? currentIndex + 1 : 0;
                      setActiveDocId(INTERNAL_DOCUMENTS[nextIndex].id);
                    }}
                    className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 relative flex flex-col">
            {activeDocument ? (
              <>
                {/* Document Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700">
                  <div>
                    <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{activeDocument.name}</h3>
                    {activeDocument.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeDocument.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={`/documents/${activeDocument.filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                      <ExternalLink size={16} />
                      Open full page
                    </a>
                    <button
                      onClick={() => handleDownload(activeDocument)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <Download size={16} />
                      Download
                    </button>
                  </div>
                </div>
                
                {/* PDF iframe */}
                <div className="flex-1 bg-zinc-200 dark:bg-zinc-700">
                  <iframe
                    src={`/documents/${activeDocument.filename}`}
                    className="w-full h-full"
                    title={activeDocument.name}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-zinc-500 dark:text-zinc-400 p-8">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Select a document to view</p>
                  <p className="text-sm">Choose from the list on the left</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
