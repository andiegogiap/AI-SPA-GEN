import React, { useState, useEffect, useMemo } from 'react';
import { AIResponse, ActiveTab } from '../types';
import { SpinnerIcon, PanelRightCloseIcon, ClipboardIcon, CheckIcon, LightbulbIcon } from './icons';
import WelcomeView from './WelcomeView';

// Define types for globally available libraries from CDN
declare global {
    interface Window {
        html_beautify?: (html: string, options?: any) => string;
        marked?: {
            parse: (markdown: string) => string;
        };
        PetiteVue?: {
            createApp: (initialData?: any) => { mount: (selector?: string) => void };
        };
    }
}

interface ResponsePanelProps {
  response: AIResponse;
  hasResponse: boolean;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isLoading: boolean;
  error: string | null;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  suggestedPrompts: string[];
  onExamplePromptClick: (prompt: string) => void;
  aiHint: string | null;
}

const TabButton: React.FC<{
  label: string;
  tabName: ActiveTab;
  activeTab: ActiveTab;
  onClick: (tab: ActiveTab) => void;
}> = ({ label, tabName, activeTab, onClick }) => {
  const isActive = activeTab === tabName;
  return (
    <button
      onClick={() => onClick(tabName)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
        isActive
          ? 'bg-primary text-dark font-bold shadow-glow-blue'
          : 'bg-neon-input hover:bg-neon-input/50 text-text-main'
      }`}
    >
      {label}
    </button>
  );
};

const ResponsePanel: React.FC<ResponsePanelProps> = ({
  response,
  hasResponse,
  activeTab,
  onTabChange,
  isLoading,
  error,
  onToggleCollapse,
  isCollapsed,
  suggestedPrompts,
  onExamplePromptClick,
  aiHint,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const beautifiedCode = useMemo(() => {
    if (!response.codeContent) return '';
    // Check if it's likely HTML/XML before beautifying
    if (response.codeContent.trim().startsWith('<') && window.html_beautify) {
        try {
            return window.html_beautify(response.codeContent, {
                indent_size: 2,
                space_in_empty_paren: true,
            });
        } catch (e) {
            console.error("Failed to beautify HTML", e);
        }
    }
    return response.codeContent;
  }, [response.codeContent]);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  if (isCollapsed) {
    return null;
  }

  const handleCopy = () => {
    if (!hasResponse) return;
    const contentToCopy = activeTab === 'code' ? beautifiedCode : response.previewContent;
    navigator.clipboard.writeText(contentToCopy).then(() => {
        setIsCopied(true);
    }).catch(err => {
        console.error("Failed to copy content: ", err);
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neon-input/80 z-10">
          <SpinnerIcon />
          <span className="mt-2 text-text-main">Generating...</span>
        </div>
      );
    }
    if (error && !isLoading) {
      return <div className="p-4 font-mono text-sm text-red-400 whitespace-pre-wrap">{error}</div>;
    }
    if (!hasResponse) {
      return <WelcomeView onExamplePromptClick={onExamplePromptClick} />;
    }

    let processedPreview = response.previewContent;
    // Heuristic: if content doesn't look like HTML, assume it's Markdown and parse it.
    if (!processedPreview.trim().toLowerCase().startsWith('<') && window.marked) {
        try {
            processedPreview = window.marked.parse(processedPreview);
        } catch (e) {
            console.error("Failed to parse markdown", e);
        }
    }

    const previewDoc = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/water.css@2/out/dark.css">
          <script src="https://unpkg.com/htmx.org@1.9.12" defer></script>
          <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
          <script src="https://unpkg.com/petite-vue" init defer></script>
          <style>
            :root {
                --background-body: transparent;
            }
            body { 
              background-color: transparent; 
              color: #e0e0e0; 
              font-family: sans-serif;
              padding: 1rem;
              margin: 0;
            } 
            a { color: #00f6ff; }
            pre { background-color: #0a0a0a; padding: 1em; border-radius: 8px; border: 1px solid rgba(157, 0, 255, 0.2); }
            code { font-family: monospace; font-size: 0.9em; }
            ::-webkit-scrollbar { width: 8px; height: 8px; }
            ::-webkit-scrollbar-track { background: transparent; }
            ::-webkit-scrollbar-thumb { background: rgba(224, 224, 224, 0.5); border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: rgba(224, 224, 224, 0.8); }
            html { scrollbar-color: rgba(224, 224, 224, 0.5) transparent; scrollbar-width: thin; }
          </style>
        </head>
        <body>
          ${processedPreview}
        </body>
      </html>`;

    return (
      <>
        <iframe
          title="AI Preview"
          srcDoc={previewDoc}
          className={`w-full h-full border-0 bg-transparent ${activeTab !== 'preview' ? 'hidden' : ''}`}
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
        <pre className={`w-full h-full p-3 font-mono text-sm text-text-input overflow-auto ${activeTab !== 'code' ? 'hidden' : ''}`}>
          <code>
            {beautifiedCode}
          </code>
        </pre>
      </>
    );
  };

  return (
    <aside className="bg-neon-panel backdrop-blur-xl border border-neon-border rounded-lg overflow-hidden flex flex-col h-full min-w-0">
      <div className="flex justify-between items-center p-4 border-b border-neon-border flex-shrink-0">
        <h2 className="text-lg font-bold text-primary truncate" style={{ textShadow: '0 0 5px #00f6ff' }}>AI Response</h2>
        <div className="flex items-center gap-4">
            {hasResponse && !error && (
              <div className="flex items-center gap-2 p-1 bg-neon-panel/50 rounded-lg">
                  <TabButton label="Preview" tabName="preview" activeTab={activeTab} onClick={onTabChange} />
                  <TabButton label="Code" tabName="code" activeTab={activeTab} onClick={onTabChange} />
                   <button
                        onClick={handleCopy}
                        title="Copy to Clipboard"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                            isCopied
                            ? 'bg-neon-green text-dark font-bold shadow-glow-green'
                            : 'bg-neon-input hover:bg-neon-input/50 text-text-main'
                        }`}
                        >
                        {isCopied ? <CheckIcon /> : <ClipboardIcon />}
                        {isCopied ? 'Copied!' : 'Copy'}
                    </button>
              </div>
            )}
            <button onClick={onToggleCollapse} title="Collapse Panel" className="text-text-main hover:text-primary transition-colors">
                <PanelRightCloseIcon />
            </button>
        </div>
      </div>
      <div className="flex-grow m-2.5 bg-neon-input rounded-md relative overflow-auto">
        {renderContent()}
      </div>

       {aiHint && !isLoading && (
        <div className="flex-shrink-0 p-3 mx-2.5 mb-2.5 bg-neon-purple/10 border border-neon-purple/30 rounded-md">
            <div className="flex items-start">
                <LightbulbIcon className="w-5 h-5 mr-2.5 text-neon-purple flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-bold text-neon-purple">Hint</h4>
                    <p className="text-sm text-text-main/90">{aiHint}</p>
                </div>
            </div>
        </div>
       )}

       {hasResponse && !isLoading && !error && suggestedPrompts.length > 0 && (
          <div className="flex-shrink-0 p-3 border-t border-neon-border">
            <h3 className="text-md font-semibold text-neon-pink mb-2 flex items-center" style={{textShadow: '0 0 4px #ff00ff'}}>
                <LightbulbIcon className="mr-2"/>
                AI Suggestions
            </h3>
            <div className="flex flex-col gap-1.5">
                {suggestedPrompts.map((p, i) => (
                    <button
                        key={i}
                        onClick={() => onExamplePromptClick(p)}
                        className="w-full text-left p-2 bg-neon-panel border border-neon-border rounded-md cursor-pointer text-sm truncate transition-colors duration-200 hover:bg-neon-input/50 hover:border-neon-pink/50"
                        title={p}
                    >
                        {p}
                    </button>
                ))}
            </div>
          </div>
        )}
    </aside>
  );
};

export default ResponsePanel;