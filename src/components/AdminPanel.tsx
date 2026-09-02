'use client';

import React, { useState, useEffect } from 'react';
import {
  getRagConfig,
  saveRagConfig,
  RagConfig,
  DEFAULT_RAG_CONFIG,
  listChunks,
  addChunk,
  removeChunk,
} from '../lib/rag';
import { ApiKnowledgeChunk } from '../lib/api-client';
import { Settings, Database, Plus, Trash2, Loader2 } from 'lucide-react';
import { DEFAULT_KNOWLEDGE_CHUNKS } from '../lib/defaultData';

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [config, setConfig] = useState<RagConfig>(DEFAULT_RAG_CONFIG);
  const [chunks, setChunks] = useState<ApiKnowledgeChunk[]>([]);
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
      const loadedConfig = await getRagConfig();
      setConfig(loadedConfig);

      const loadedChunks = await listChunks();
      setChunks(loadedChunks);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveRagConfig(config);
      alert('Configuration saved successfully.');
    } catch (error) {
      console.error('Error saving config:', error);
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
      await addChunk({ source: newSource, content: newContent });
      setNewContent('');
      setNewSource('');
      await loadData();
    } catch (error) {
      console.error('Error adding chunk:', error);
      alert('Failed to add resource.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteChunk = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await removeChunk(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting chunk:', error);
      alert('Failed to delete resource.');
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('This will inject the default Ariadne Labs resources. Continue?')) return;
    setIsAdding(true);
    try {
      for (const chunk of DEFAULT_KNOWLEDGE_CHUNKS) {
        await addChunk({ source: chunk.source, content: chunk.content });
      }
      await loadData();
    } catch (error) {
      console.error('Error seeding defaults:', error);
      alert('Failed to seed default resources.');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Settings size={24} className="text-orange-600" />
            <h2 className="text-xl font-bold">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-orange-600" size={32} />
            </div>
          ) : (
            <>
              {/* RAG Config */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Database size={18} />
                  RAG Configuration
                </h3>
                <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium">Top K (chunks to retrieve)</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={config.topK}
                      onChange={(e) => setConfig({ ...config, topK: Number(e.target.value) || DEFAULT_RAG_CONFIG.topK })}
                      className="w-full mt-1 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">Similarity Threshold (0–1)</span>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      value={config.similarityThreshold}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          similarityThreshold: Number(e.target.value) || DEFAULT_RAG_CONFIG.similarityThreshold,
                        })
                      }
                      className="w-full mt-1 p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950"
                    />
                  </label>
                  <button
                    onClick={handleSaveConfig}
                    disabled={isSaving}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </section>

              {/* Add New */}
              <section className="space-y-3">
                <h3 className="font-semibold text-lg">Knowledge Base</h3>
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
                        <div
                          key={chunk.id}
                          className="bg-white dark:bg-zinc-900 p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 flex justify-between gap-4"
                        >
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
