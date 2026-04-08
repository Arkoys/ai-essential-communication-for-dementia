import React, { useState, useEffect } from 'react';
import { RagConfig, DEFAULT_RAG_CONFIG, KnowledgeChunk } from '../lib/rag-types';
import { Settings, Database, Plus, Trash2, Loader2 } from 'lucide-react';
import { DEFAULT_KNOWLEDGE_CHUNKS } from '../lib/defaultData';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<RagConfig>(DEFAULT_RAG_CONFIG);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [configRes, chunksRes] = await Promise.all([
        fetch('/api/rag-config'),
        fetch('/api/chunks')
      ]);
      
      if (configRes.ok) {
        setConfig(await configRes.json());
      }
      if (chunksRes.ok) {
        setChunks(await chunksRes.json());
      }
    } catch (error) {
      console.error("Error loading admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await fetch('/api/rag-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      alert('Configuration saved successfully.');
    } catch (error) {
      console.error("Error saving config:", error);
      alert('Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChunk = async () => {
    if (!newContent.trim() || !newSource.trim()) {
      alert('Please provide both content and source.');
      return;
    }
    setIsAdding(true);
    try {
      await fetch('/api/chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent, source: newSource })
      });
      setNewContent('');
      setNewSource('');
      await loadData();
    } catch (error) {
      console.error("Error adding chunk:", error);
      alert('Failed to add resource.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteChunk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await fetch(`/api/chunks/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error("Error deleting chunk:", error);
      alert('Failed to delete resource.');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('This will inject the default Ariadne Labs resources. Continue?')) return;
    setIsAdding(true);
    try {
      const defaultChunks = DEFAULT_KNOWLEDGE_CHUNKS;

      for (const chunk of defaultChunks) {
        await fetch('/api/chunks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: chunk.content, source: chunk.source })
        });
      }
      await loadData();
      alert('Default resources added successfully!');
    } catch (error) {
      console.error("Error adding default chunks:", error);
      alert('Failed to add default resources.');
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl flex flex-col items-center">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
          <p>Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-orange-500" />
            Admin Panel
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* RAG Configuration */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Database size={20} />
              RAG Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Top K (Number of chunks to retrieve)
                </label>
                <input
                  type="number"
                  value={config.topK}
                  onChange={(e) => setConfig({ ...config, topK: parseInt(e.target.value) || 3 })}
                  className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Similarity Threshold (0.0 to 1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={config.similarityThreshold}
                  onChange={(e) => setConfig({ ...config, similarityThreshold: parseFloat(e.target.value) || 0.7 })}
                  className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                  min="0"
                  max="1"
                />
              </div>
            </div>
            <button
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-200 dark:hover:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Parameters'}
            </button>
          </section>

          {/* Knowledge Base */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Database size={20} />
              Knowledge Base Resources
            </h3>
            
            {/* Add New */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <h4 className="font-medium">Add New Resource</h4>
              <input
                type="text"
                placeholder="Source Name (e.g., 'Ariadne Labs - Stuck Points')"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
              />
              <textarea
                placeholder="Paste document content here..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 h-32 resize-y"
              />
              <button
                onClick={handleAddChunk}
                disabled={isAdding || !newContent.trim() || !newSource.trim()}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {isAdding ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                {isAdding ? 'Processing & Embedding...' : 'Add Resource'}
              </button>
            </div>

            {/* List Existing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Indexed Resources ({chunks.length})</h4>
                {chunks.length === 0 && (
                  <button
                    onClick={handleSeedDefaults}
                    disabled={isAdding}
                    className="text-sm bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    {isAdding ? 'Seeding...' : 'Seed Default Resources'}
                  </button>
                )}
              </div>
              {chunks.length === 0 ? (
                <p className="text-zinc-500 text-sm">No resources indexed yet. Click "Seed Default Resources" to add the Ariadne Labs PDFs.</p>
              ) : (
                <div className="space-y-2">
                  {chunks.map((chunk) => (
                    <div key={chunk.id} className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-orange-600 dark:text-orange-400 mb-1">
                          {chunk.source}
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {chunk.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteChunk(chunk.id)}
                        className="text-zinc-400 hover:text-red-500 p-2 shrink-0 self-start"
                        title="Delete resource"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
