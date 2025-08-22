import React, { useState, useEffect } from 'react';
import * as githubService from '../services/githubService';
import { generateCodebaseOverview } from '../services/geminiService';
import { XIcon, SpinnerIcon, BookOpenIcon } from './icons';
import { GitHubNode } from '../types';

declare global {
    interface Window {
        marked?: {
            parse: (markdown: string) => string;
        };
    }
}

interface CodebaseOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  githubToken: string;
  repo: string;
  fileTree: GitHubNode[];
}

const CodebaseOverviewModal: React.FC<CodebaseOverviewModalProps> = ({
  isOpen,
  onClose,
  githubToken,
  repo,
  fileTree,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [overviewContent, setOverviewContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setOverviewContent('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);
  
  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setOverviewContent('');
    try {
      const [owner, repoName] = repo.split('/');
      const allFiles = await githubService.getAllFileContents(githubToken, owner, repoName, fileTree);
      
      if (allFiles.length === 0) {
        throw new Error("No readable files found in the repository to generate an overview.");
      }

      const concatenatedContent = allFiles
        .map(file => `
// Path: ${file.path}
// ===================================================================================

${file.content}

// ===================================================================================
`)
        .join('\n');

      const overview = await generateCodebaseOverview(concatenatedContent);
      setOverviewContent(overview);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate overview: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderedHtml = overviewContent && window.marked ? window.marked.parse(overviewContent) : '';

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neon-panel border border-neon-purple/50 rounded-lg shadow-2xl shadow-neon-purple/20 w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-neon-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <BookOpenIcon className="w-6 h-6 text-primary" />
            <h2 id="overview-title" className="text-xl font-bold text-primary" style={{ textShadow: '0 0 5px #00f6ff' }}>
              Codebase Overview
            </h2>
          </div>
          <button onClick={onClose} title="Close Panel" className="text-text-main hover:text-primary transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-grow p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <SpinnerIcon />
              <p className="mt-4 text-lg text-text-main">Analyzing codebase...</p>
              <p className="text-sm text-text-main/70">This might take a moment.</p>
            </div>
          ) : error ? (
            <div className="text-red-400 bg-red-500/10 p-4 rounded-md">
                <h3 className="font-bold mb-2">An Error Occurred</h3>
                <p>{error}</p>
            </div>
          ) : overviewContent ? (
             <article className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderedHtml }}></article>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <BookOpenIcon className="w-16 h-16 text-primary/50 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Analyze Your Codebase</h3>
              <p className="max-w-md text-text-main/80 mb-6">
                Get a high-level overview of your project's purpose, technologies, components, and potential improvements powered by AI.
              </p>
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-primary text-dark rounded-md font-bold transition-all duration-200 hover:shadow-glow-blue"
              >
                Generate Overview
              </button>
            </div>
          )}
        </main>
      </div>
       <style>{`
        .prose { color: #e0e0e0; }
        .prose h1, .prose h2, .prose h3, .prose h4 { color: #fff; }
        .prose a { color: #00f6ff; }
        .prose strong { color: #fff; }
        .prose blockquote { border-left-color: #9d00ff; color: #e0e0e0; }
        .prose code { color: #ff00ff; background-color: rgba(255, 0, 255, 0.1); padding: 0.2em 0.4em; margin: 0; font-size: 85%; border-radius: 3px; }
        .prose pre { background-color: #0a0a0a; border: 1px solid rgba(157, 0, 255, 0.2); }
        .prose pre code { color: inherit; padding: 0; background-color: transparent; }
        .prose ul > li::before { background-color: #00f6ff; }
      `}</style>
    </div>
  );
};

export default CodebaseOverviewModal;
