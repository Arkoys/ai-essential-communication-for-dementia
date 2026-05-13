import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Loader2, BookOpen, Zap, MessageSquare, Info } from 'lucide-react';
import { getPromptSettings, savePromptSettings, resetPromptSettings, PromptSettings, getDefaultPromptSettings } from '../lib/promptSettings';

interface SettingsPanelProps {
  onClose: () => void;
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<PromptSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompts' | 'knowledge' | 'quick'>('prompts');
  const [hasChanges, setHasChanges] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const loaded = await getPromptSettings();
      setSettings(loaded);
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await savePromptSettings(settings);
      setHasChanges(false);
      alert('Settings saved successfully!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setShowResetConfirm(true);
  };

  const confirmReset = async () => {
    setShowResetConfirm(false);
    setIsLoading(true);
    try {
      const defaults = await resetPromptSettings();
      setSettings(defaults);
      setHasChanges(false);
      alert('Settings reset to defaults!');
    } catch (error) {
      console.error("Error resetting settings:", error);
      alert('Failed to reset settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof PromptSettings, value: string | string[]) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
    setHasChanges(true);
  };

  const updateSuggestedPrompt = (index: number, value: string) => {
    if (!settings) return;
    const newPrompts = [...settings.suggestedPrompts];
    newPrompts[index] = value;
    setSettings({ ...settings, suggestedPrompts: newPrompts });
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl flex flex-col items-center">
          <Loader2 className="animate-spin text-orange-500 mb-4" size={32} />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl">
          <p className="text-red-500">Failed to load settings.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-zinc-200 dark:border-zinc-800">
        {/* Header */}
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="text-orange-500" />
            Prompt Settings
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
            Close
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'prompts'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-white dark:bg-zinc-950'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <BookOpen size={18} />
            System Prompts
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'knowledge'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-white dark:bg-zinc-950'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <Zap size={18} />
            Stuck Mode
          </button>
          <button
            onClick={() => setActiveTab('quick')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'quick'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-white dark:bg-zinc-950'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <MessageSquare size={18} />
            Quick Prompts
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'prompts' && (
            <div className="space-y-6">
              {/* System Prompt */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-semibold flex items-center gap-2">
                    <BookOpen size={20} className="text-blue-500" />
                    Main System Prompt
                  </label>
                  <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                    <Info size={12} />
                    Active in normal mode
                  </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
                  <strong>📊 Influence:</strong> Shapes the overall response structure, framework guidance, response format, and clinical tone. Used for all regular queries.
                </div>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => updateField('systemPrompt', e.target.value)}
                  className="w-full h-80 p-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm resize-y"
                  placeholder="Enter system prompt..."
                />
                <p className="text-xs text-zinc-500">
                  {settings.systemPrompt.length} characters
                </p>
              </div>

              {/* Knowledge Content */}
              <div className="space-y-3">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen size={20} className="text-green-500" />
                  Knowledge Content
                </label>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg p-3 text-sm text-green-800 dark:text-green-200">
                  <strong>📊 Influence:</strong> Embedded into prompts for MiniMax. Contains the Ariadne Labs toolkit content the AI uses to generate responses.
                </div>
                <textarea
                  value={settings.knowledgeContent}
                  onChange={(e) => updateField('knowledgeContent', e.target.value)}
                  className="w-full h-64 p-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm resize-y"
                  placeholder="Enter knowledge content..."
                />
                <p className="text-xs text-zinc-500">
                  {settings.knowledgeContent.length} characters
                </p>
              </div>
            </div>
          )}

          {activeTab === 'knowledge' && (
            <div className="space-y-6">
              {/* Stuck Mode Prompt */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-lg font-semibold flex items-center gap-2">
                    <Zap size={20} className="text-purple-500" />
                    Stuck Mode Prompt
                  </label>
                  <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                    <Zap size={12} />
                    Active when "Stuck" is toggled
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50 rounded-lg p-3 text-sm text-purple-800 dark:text-purple-200">
                  <strong>📊 Influence:</strong> Activated when user toggles "Stuck" button. Overrides normal framework structure for relational support (acknowledge, get curious, summarize & plan).
                </div>
                <textarea
                  value={settings.stuckModePrompt}
                  onChange={(e) => updateField('stuckModePrompt', e.target.value)}
                  className="w-full h-80 p-4 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm resize-y"
                  placeholder="Enter stuck mode prompt..."
                />
                <p className="text-xs text-zinc-500">
                  {settings.stuckModePrompt.length} characters
                </p>
              </div>
            </div>
          )}

          {activeTab === 'quick' && (
            <div className="space-y-6">
              {/* Quick Prompts */}
              <div className="space-y-3">
                <label className="text-lg font-semibold flex items-center gap-2">
                  <MessageSquare size={20} className="text-orange-500" />
                  Quick Action Prompts
                </label>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 text-sm text-orange-800 dark:text-orange-200">
                  <strong>📊 Influence:</strong> Displayed as quick action buttons on the chat home screen. Users can click to send pre-defined prompts.
                </div>
                <div className="space-y-3">
                  {settings.suggestedPrompts.map((prompt, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-zinc-400 text-sm font-medium w-8">#{index + 1}</span>
                      <input
                        type="text"
                        value={prompt}
                        onChange={(e) => updateSuggestedPrompt(index, e.target.value)}
                        className="flex-1 p-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                        placeholder={`Quick prompt ${index + 1}...`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-zinc-500">
                  These appear as buttons on the chat home screen.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <RotateCcw size={18} />
              Reset to Defaults
            </button>
            {hasChanges && (
              <span className="text-xs text-amber-600 dark:text-amber-400">Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl max-w-md mx-4">
              <h3 className="text-lg font-bold mb-2">Reset to Defaults?</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                This will replace all custom prompts with the default Ariadne Labs prompts. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReset}
                  className="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}