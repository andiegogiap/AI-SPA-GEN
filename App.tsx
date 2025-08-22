import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AIResponse, ActiveTab, GenerationSettings, HistoryItem, GitHubNode, ActiveFile, Agent } from './types';
import { EXAMPLE_PROMPTS } from './constants';
import { generateAiResponse, generateSuggestion } from './services/geminiService';
import * as githubService from './services/githubService';
import GitHubConnect from './components/GitHubConnect';
import FileExplorer from './components/FileExplorer';
import CentralPanel from './components/CentralPanel';
import ResponsePanel from './components/ResponsePanel';
import ResizeHandle from './components/ResizeHandle';
import QuickNav from './components/QuickNav';
import CustomInstructionPanel from './components/CustomInstructionPanel';
import CodebaseOverviewModal from './components/CodebaseOverviewModal';
import { PanelLeftOpenIcon, PanelRightOpenIcon, OrchestrationIcon } from './components/icons';

const MIN_PANEL_WIDTH = 200;
const MAX_PANEL_WIDTH = 800;

// Default custom instructions
const defaultAiSupervisorInstruction = "You are an elite software architect. Prioritize creating code that is scalable, maintainable, and follows best practices. When providing explanations, be concise and focus on the 'why' behind the code. Always think step-by-step before generating the final response. Your output must be clean, professional, and directly address the user's request.";
const defaultSystemOrchestratorInstruction = "System Task: Orchestrate the AI agents to fulfill the user's request. First, analyze the user's prompt to determine intent (generation, refactoring, explanation, etc.). Second, select the most appropriate AI agent and provide it with all necessary context (file content, user prompt, AI supervisor instructions). Third, validate the AI's response for correctness and adherence to the schema before presenting it to the user. The goal is a seamless and highly effective user experience.";

function App() {
  // GitHub state
  const [githubToken, setGithubToken] = useState('');
  const [repo, setRepo] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [fileTree, setFileTree] = useState<GitHubNode[]>([]);

  const [activeFile, setActiveFile] = useState<ActiveFile | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isEditorDirty, setIsEditorDirty] = useState(false);

  const [promptInput, setPromptInput] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<AIResponse>({ previewContent: '', codeContent: '' });
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [responseActiveTab, setResponseActiveTab] = useState<ActiveTab>('preview');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuggesting, setIsSuggesting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [leftPanelWidth, setLeftPanelWidth] = useState(280);
  const [rightPanelWidth, setRightPanelWidth] = useState(550);
  const [isLeftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  
  const [settings, setSettings] = useState<GenerationSettings>({ provider: 'gemini', temperature: 0.2 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [agent, setAgent] = useState<Agent>('lyra');
  
  // Lifted state for QuickNav control
  const [activeMainTab, setActiveMainTab] = useState<'editor' | 'inference'>('editor');
  const [activeInferenceTab, setActiveInferenceTab] = useState<'settings' | 'activity' | 'orchestration'>('settings');

  // Custom instructions state
  const [isInstructionPanelOpen, setIsInstructionPanelOpen] = useState(false);
  const [aiSupervisorInstruction, setAiSupervisorInstruction] = useState<string>(defaultAiSupervisorInstruction);
  const [systemOrchestratorInstruction, setSystemOrchestratorInstruction] = useState<string>(defaultSystemOrchestratorInstruction);
  
  // Codebase Overview Modal state
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);


  const hasResponse = useMemo(() => !!(aiResponse.previewContent || aiResponse.codeContent), [aiResponse]);
  const quickNavRoot = useMemo(() => document.getElementById('quick-nav-root'), []);

  useEffect(() => {
    setEditorContent(activeFile?.content ?? '');
    setIsEditorDirty(false);
  }, [activeFile]);

  const handleConnect = async (token: string, repoUrl: string) => {
    const [owner, repoName] = repoUrl.split('/');
    if (!owner || !repoName) {
      throw new Error("Invalid repository format. Please use 'owner/repo'.");
    }
    const tree = await githubService.getRepoTree(token, owner, repoName);
    setGithubToken(token);
    setRepo(repoUrl);
    setFileTree(tree);
    setIsConnected(true);
  };

  const handleFileSelect = useCallback(async (path: string) => {
    setIsLoading(true);
    try {
      const [owner, repoName] = repo.split('/');
      const fileData = await githubService.getFileContent(githubToken, owner, repoName, path);
      setActiveFile({ path, ...fileData });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch file content.');
    } finally {
      setIsLoading(false);
    }
  }, [githubToken, repo]);
  
  const handleCommit = async (commitMessage: string) => {
    if (!activeFile || !isEditorDirty) return;
    setIsLoading(true);
    try {
        const [owner, repoName] = repo.split('/');
        const updatedFile = await githubService.updateFile(
            githubToken,
            owner,
            repoName,
            activeFile.path,
            commitMessage,
            editorContent,
            activeFile.sha
        );
        setActiveFile({ ...activeFile, content: editorContent, sha: updatedFile.content.sha });
        setIsEditorDirty(false);
    } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to commit file.');
    } finally {
        setIsLoading(false);
    }
  };

  const startResize = useCallback((e: React.MouseEvent, panel: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startLeftWidth = leftPanelWidth;
    const startRightWidth = rightPanelWidth;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      if (panel === 'left') setLeftPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startLeftWidth + dx)));
      else setRightPanelWidth(Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, startRightWidth - dx)));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  }, [leftPanelWidth, rightPanelWidth]);
  
  const gridTemplateColumns = useMemo(() => {
    const leftCol = isLeftPanelCollapsed ? '0px' : `${leftPanelWidth}px`;
    const rightCol = isRightPanelCollapsed ? '0px' : `${rightPanelWidth}px`;
    return `${leftCol} 5px 1fr 5px ${rightCol}`;
  }, [isLeftPanelCollapsed, isRightPanelCollapsed, leftPanelWidth, rightPanelWidth]);

  const toggleLeftPanel = () => setLeftPanelCollapsed(prev => !prev);
  const toggleRightPanel = () => setRightPanelCollapsed(prev => !prev);

  const handleGenerate = useCallback(async () => {
    if (!promptInput.trim() || isLoading || !activeFile) return;

    setIsLoading(true);
    setError(null);
    setAiResponse({ previewContent: '', codeContent: '' });
    setSuggestedPrompts([]);
    setAiHint(null);
    setResponseActiveTab('preview');
    
    try {
      const response = await generateAiResponse(activeFile.path, editorContent, promptInput, settings, agent, aiSupervisorInstruction, systemOrchestratorInstruction);
      setAiResponse(response);
      
      const newHistoryItem: HistoryItem = { id: Date.now(), prompt: promptInput, response, fileName: activeFile.path, fileContent: editorContent, timestamp: new Date().toISOString(), agent };
      setHistory(prev => [newHistoryItem, ...prev]);

      const suggestionResult = await generateSuggestion({ fileName: activeFile.path, fileContent: editorContent, userPrompt: promptInput, aiResponse: response });
      setSuggestedPrompts(suggestionResult.suggestions);
      setAiHint(suggestionResult.hint);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to get response from AI: ${errorMessage}`);
      setAiResponse({ previewContent: `<div class="p-4 font-sans text-red-400">Error: ${errorMessage}</div>`, codeContent: `// Error: ${errorMessage}` });
    } finally {
      setIsLoading(false);
    }
  }, [activeFile, editorContent, promptInput, isLoading, settings, agent, aiSupervisorInstruction, systemOrchestratorInstruction]);
  
  const handleSuggest = useCallback(async () => {
    if (isSuggesting || !activeFile) return;
    setIsSuggesting(true);
    try {
        const suggestions = await generateSuggestion({ fileName: activeFile.path, fileContent: editorContent, userPrompt: promptInput || 'Suggest a starting prompt.', aiResponse });
        if (suggestions.suggestions.length > 0) setPromptInput(suggestions.suggestions[0]);
    } catch (err) {
        console.error("Failed to generate suggestion:", err);
    } finally {
        setIsSuggesting(false);
    }
  }, [activeFile, editorContent, promptInput, aiResponse, isSuggesting]);

  const handleExamplePromptClick = useCallback((newPrompt: string) => {
    setPromptInput(newPrompt);
    document.querySelector<HTMLInputElement>('#prompt-input')?.focus();
  }, []);
  
  const handleRestoreHistory = useCallback(async (item: HistoryItem) => {
    await handleFileSelect(item.fileName);
    setPromptInput(item.prompt);
    setAiResponse(item.response);
    setEditorContent(item.fileContent); // Restore specific content from history
    setAgent(item.agent);
    setIsEditorDirty(true); // Mark as dirty since it might differ from repo
    setResponseActiveTab('preview');
    setSuggestedPrompts([]);
    setAiHint(null);
  }, [handleFileSelect]);

  // Handlers for QuickNav
  const handleFocusPrompt = () => {
    document.querySelector<HTMLInputElement>('#prompt-input')?.focus();
  };

  const handleShowActivityLog = () => {
    setActiveMainTab('inference');
    setActiveInferenceTab('activity');
  };

  if (!isConnected) {
    return <GitHubConnect onConnect={handleConnect} />;
  }

  return (
    <div className="flex flex-col h-screen font-sans bg-neon-dark text-text-main overflow-hidden">
       <header className="relative bg-neon-panel/75 backdrop-blur-xl py-4 px-5 border-b border-neon-border text-center flex-shrink-0">
          {isLeftPanelCollapsed && <button onClick={toggleLeftPanel} title="Open File Explorer" className="absolute left-4 top-1/2 -translate-y-1/2 text-text-main hover:text-primary transition-colors"><PanelRightOpenIcon /></button>}
          
          <h1 className="text-2xl font-bold text-primary" style={{ textShadow: '0 0 10px #00f6ff, 0 0 20px #00f6ff' }}>AI SPA Generator & Assistant</h1>
          <p className="text-sm text-text-main/70">Connected to: <span className="font-bold text-neon-green">{repo}</span></p>

          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-4">
              <button onClick={() => setIsInstructionPanelOpen(true)} title="Custom Instructions" className="text-text-main hover:text-primary transition-colors">
                  <OrchestrationIcon />
              </button>
              {isRightPanelCollapsed && <button onClick={toggleRightPanel} title="Open AI Response Panel" className="text-text-main hover:text-primary transition-colors"><PanelLeftOpenIcon /></button>}
          </div>
        </header>
      <main className="grid gap-2.5 p-2.5 flex-grow overflow-hidden" style={{ gridTemplateColumns }}>
        <FileExplorer
          files={fileTree}
          activeFile={activeFile?.path ?? null}
          onFileSelect={handleFileSelect}
          onToggleCollapse={toggleLeftPanel}
          isCollapsed={isLeftPanelCollapsed}
          onOpenOverview={() => setIsOverviewModalOpen(true)}
        />
        {!isLeftPanelCollapsed && <ResizeHandle onMouseDown={(e) => startResize(e, 'left')} />}
        <CentralPanel
          activeFile={activeFile}
          editorContent={editorContent}
          onEditorChange={(value) => { setEditorContent(value); setIsEditorDirty(true); }}
          isEditorDirty={isEditorDirty}
          onCommit={handleCommit}
          prompt={promptInput}
          onPromptChange={setPromptInput}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          onSuggest={handleSuggest}
          isSuggesting={isSuggesting}
          examplePrompts={EXAMPLE_PROMPTS}
          onExamplePromptClick={handleExamplePromptClick}
          settings={settings}
          onSettingsChange={setSettings}
          history={history}
          onRestoreHistory={handleRestoreHistory}
          agent={agent}
          onAgentChange={setAgent}
          activeMainTab={activeMainTab}
          setActiveMainTab={setActiveMainTab}
          activeInferenceTab={activeInferenceTab}
          setActiveInferenceTab={setActiveInferenceTab}
        />
        {!isRightPanelCollapsed && <ResizeHandle onMouseDown={(e) => startResize(e, 'right')} />}
        <ResponsePanel response={aiResponse} hasResponse={hasResponse} activeTab={responseActiveTab} onTabChange={setResponseActiveTab} isLoading={isLoading} error={error} onToggleCollapse={toggleRightPanel} isCollapsed={isRightPanelCollapsed} suggestedPrompts={suggestedPrompts} onExamplePromptClick={handleExamplePromptClick} aiHint={aiHint} />
      </main>
      {quickNavRoot && ReactDOM.createPortal(
        <QuickNav 
            onToggleLeftPanel={toggleLeftPanel}
            onToggleRightPanel={toggleRightPanel}
            onFocusPrompt={handleFocusPrompt}
            onShowActivityLog={handleShowActivityLog}
        />,
        quickNavRoot
      )}
      <CustomInstructionPanel
        isOpen={isInstructionPanelOpen}
        onClose={() => setIsInstructionPanelOpen(false)}
        aiInstruction={aiSupervisorInstruction}
        onAiInstructionChange={setAiSupervisorInstruction}
        systemInstruction={systemOrchestratorInstruction}
        onSystemInstructionChange={setSystemOrchestratorInstruction}
      />
      <CodebaseOverviewModal
        isOpen={isOverviewModalOpen}
        onClose={() => setIsOverviewModalOpen(false)}
        githubToken={githubToken}
        repo={repo}
        fileTree={fileTree}
      />
    </div>
  );
}

export default App;
