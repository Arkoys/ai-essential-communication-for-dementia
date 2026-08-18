import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ChevronLeft, ChevronRight, Download, ExternalLink, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

// Internal Resources - PDFs stored in /public/documents
interface InternalResource {
  id: string;
  name: string;
  filename: string;
  description?: string;
}

const INTERNAL_RESOURCES: InternalResource[] = [
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

export default function DocumentsPage() {
  const [activeDocId, setActiveDocId] = useState<string>(INTERNAL_RESOURCES[0].id);
  const [showSidebar, setShowSidebar] = useState(true);

  const handleDownload = (doc: InternalResource) => {
    const link = document.createElement('a');
    link.href = `/documents/${doc.filename}`;
    link.download = doc.filename;
    link.click();
  };

  const activeDocument = INTERNAL_RESOURCES.find(d => d.id === activeDocId);

  const navigatePrev = () => {
    const currentIndex = INTERNAL_RESOURCES.findIndex(d => d.id === activeDocId);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : INTERNAL_RESOURCES.length - 1;
    setActiveDocId(INTERNAL_RESOURCES[prevIndex].id);
  };

  const navigateNext = () => {
    const currentIndex = INTERNAL_RESOURCES.findIndex(d => d.id === activeDocId);
    const nextIndex = currentIndex < INTERNAL_RESOURCES.length - 1 ? currentIndex + 1 : 0;
    setActiveDocId(INTERNAL_RESOURCES[nextIndex].id);
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-950">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft size={18} />
            Back to app
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Internal Resources</h1>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={navigatePrev}
            className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Previous document"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm text-zinc-500 dark:text-zinc-400 min-w-[80px] text-center">
            {INTERNAL_RESOURCES.findIndex(d => d.id === activeDocId) + 1} / {INTERNAL_RESOURCES.length}
          </span>
          <button
            onClick={navigateNext}
            className="p-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title="Next document"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-72 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 overflow-y-auto shrink-0">
            <div className="p-4">
              <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                Available Documents
              </h2>
              <ul className="space-y-1">
                {INTERNAL_RESOURCES.map((doc) => (
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
          </aside>
        )}

        {/* PDF Viewer */}
        <main className="flex-1 flex flex-col min-w-0">
          {activeDocument && (
            <>
              {/* Document Header */}
              <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 px-4 py-2 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="font-medium text-zinc-900 dark:text-zinc-100">{activeDocument.name}</h2>
                  {activeDocument.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeDocument.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/documents/${activeDocument.filename}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-1.5 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    <ExternalLink size={16} />
                    Open in browser
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
              <div className="flex-1 bg-zinc-200 dark:bg-zinc-800">
                <iframe
                  src={`/documents/${activeDocument.filename}`}
                  className="w-full h-full"
                  title={activeDocument.name}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
