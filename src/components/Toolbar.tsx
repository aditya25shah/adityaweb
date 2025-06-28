import React from 'react';
import { 
  Save, 
  Upload, 
  Moon, 
  Sun, 
  Code, 
  History, 
  GitCommit,
  Play,
  Download,
  Share2,
  Zap,
  Bot,
  Sidebar,
  PanelLeftOpen,
  PanelLeftClose,
  Terminal as TerminalIcon
} from 'lucide-react';

interface ToolbarProps {
  onSave: () => void;
  onPush: () => void;
  onFormat: () => void;
  onToggleTheme: () => void;
  onShowHistory: () => void;
  onRunCode?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onToggleAI: () => void;
  onToggleExplorer: () => void;
  theme: 'light' | 'dark';
  hasChanges: boolean;
  isLoading: boolean;
  aiSidebarOpen: boolean;
  explorerVisible: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onSave,
  onPush,
  onFormat,
  onToggleTheme,
  onShowHistory,
  onRunCode,
  onDownload,
  onShare,
  onToggleAI,
  onToggleExplorer,
  theme,
  hasChanges,
  isLoading,
  aiSidebarOpen,
  explorerVisible,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {/* Panel Controls */}
        <div className="flex items-center gap-1 mr-3">
          <button
            onClick={onToggleExplorer}
            className={`p-2 rounded-lg text-sm transition-all duration-200 ${
              explorerVisible
                ? 'bg-gray-700/50 text-gray-200'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
            }`}
            title="Toggle Explorer"
          >
            {explorerVisible ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Primary Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            disabled={!hasChanges || isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={onPush}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Upload className="w-4 h-4" />
            Push
          </button>

          {onRunCode && (
            <button
              onClick={onRunCode}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg text-sm hover:from-green-600 hover:to-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Open Terminal"
            >
              <TerminalIcon className="w-4 h-4" />
              Terminal
            </button>
          )}

          <button
            onClick={onFormat}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700/50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Code className="w-4 h-4" />
            Format
          </button>

          <button
            onClick={onShowHistory}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700/50 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <History className="w-4 h-4" />
            History
          </button>

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          )}

          {onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Status Indicators */}
        {hasChanges && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 text-orange-300 rounded-lg text-sm shadow-sm border border-orange-800/50">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            <GitCommit className="w-3 h-3" />
            Unsaved changes
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 text-blue-300 rounded-lg text-sm border border-blue-800/50">
            <Zap className="w-3 h-3 animate-spin" />
            Processing...
          </div>
        )}

        {/* AI Toggle */}
        <button
          onClick={onToggleAI}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md ${
            aiSidebarOpen
              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white'
              : 'border border-gray-600 text-gray-300 hover:bg-gray-700/50'
          }`}
          title="Toggle AI Assistant"
        >
          <Bot className="w-4 h-4" />
          AI
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};