import React from 'react';
import { X, FileText, ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface Document {
  id: string;
  name: string;
  filename: string;
  description?: string;
}

interface DocumentsPageProps {
  documents: Document[];
  activeDocumentId: string | null;
  onClose: () => void;
  onSelectDocument: (id: string) => void;
}

// Internal Documents - PDFs stored in /public/documents
export const INTERNAL_DOCUMENTS: Document[] = [
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

export function DocumentsPage({ documents, activeDocumentId, onClose, onSelectDocument }: DocumentsPageProps) {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  
  const activeDocument = documents.find(d => d.id === activeDocumentId) || documents[0];
  
  React.useEffect(() => {
    if (activeDocumentId) {
      const index = documents.findIndex(d => d.id === activeDocumentId);
      if (index !== -1) setCurrentIndex(index);
    }
  }, [activeDocumentId, documents]);

  const handlePrev = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : documents.length - 1;
    setCurrentIndex(newIndex);
    onSelectDocument(documents[newIndex].id);
  };

  const handleNext = () => {
    const newIndex = currentIndex < documents.length - 1 ? currentIndex + 1 : 0;
    setCurrentIndex(newIndex);
    onSelectDocument(documents[newIndex].id);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    if (activeDocument) {
      const link = document.createElement('a');
      link.href = `/documents/${activeDocument.filename}`;
      link.download = activeDocument.filename;
      link.click();
    }
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col">
        {/* Fullscreen Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <Minimize2 size={20} />
            </button>
            <span className="text-white font-medium">{activeDocument?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700 transition-colors"
              title="Download"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-700 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Fullscreen PDF Viewer */}
        <div className="flex-1 relative bg-zinc-800">
          {activeDocument && (
            <iframe
              src={`/documents/${activeDocument.filename}#toolbar=0&navpanes=0`}
              className="w-full h-full"
              title={activeDocument.name}
            />
          )}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full shadow-lg transition-colors"
        >
          <ChevronRight size={24} />
        </button>

        {/* Document Counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-800/90 text-white text-sm rounded-full">
          {currentIndex + 1} / {documents.length}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out",
      "w-full md:w-[85vw] lg:w-[80vw] xl:w-[75vw] max-w-7xl",
      "bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-700",
      activeDocumentId ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-3">
          <FileText size={20} className="text-orange-600 dark:text-orange-400" />
          <div>
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Internal Documents</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{activeDocument?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeDocument && (
            <>
              <button
                onClick={handleDownload}
                className="p-2 text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Download PDF"
              >
                <Download size={18} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Fullscreen"
              >
                <Maximize2 size={18} />
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100dvh-57px)]">
        {/* Sidebar - Document List */}
        <div className="hidden md:flex w-64 flex-col border-r border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Available Documents
            </h3>
            <ul className="space-y-1">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <button
                    onClick={() => onSelectDocument(doc.id)}
                    className={cn(
                      "w-full flex items-start gap-3 px-3 py-2 text-left rounded-lg transition-colors",
                      activeDocumentId === doc.id || (!activeDocumentId && doc === documents[0])
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
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrev}
                className="p-2 text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {currentIndex + 1} / {documents.length}
              </span>
              <button
                onClick={handleNext}
                className="p-2 text-zinc-500 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 relative">
          {activeDocument ? (
            <>
              <iframe
                src={`/documents/${activeDocument.filename}#toolbar=0&navpanes=0`}
                className="w-full h-full"
                title={activeDocument.name}
              />
              
              {/* Mobile Navigation */}
              <div className="md:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 bg-white dark:bg-zinc-700 rounded-full shadow-lg">
                <button
                  onClick={handlePrev}
                  className="p-2 text-zinc-600 dark:text-zinc-300"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  {currentIndex + 1} / {documents.length}
                </span>
                <button
                  onClick={handleNext}
                  className="p-2 text-zinc-600 dark:text-zinc-300"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Select a document to view</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
