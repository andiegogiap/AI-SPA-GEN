import React from 'react';
import { XIcon, OrchestrationIcon, CreativeIcon } from './icons';

interface CustomInstructionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  aiInstruction: string;
  onAiInstructionChange: (value: string) => void;
  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;
}

const CustomInstructionPanel: React.FC<CustomInstructionPanelProps> = ({
  isOpen,
  onClose,
  aiInstruction,
  onAiInstructionChange,
  systemInstruction,
  onSystemInstructionChange,
}) => {
  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-lg bg-neon-panel backdrop-blur-xl border-l border-neon-border/30 shadow-2xl shadow-neon-purple/20 z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-instructions-title"
      >
        <header className="flex items-center justify-between p-4 border-b border-neon-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <OrchestrationIcon className="w-6 h-6 text-primary" />
            <h2 id="custom-instructions-title" className="text-xl font-bold text-primary" style={{ textShadow: '0 0 5px #00f6ff' }}>
              Custom Instructions
            </h2>
          </div>
          <button onClick={onClose} title="Close Panel" className="text-text-main hover:text-primary transition-colors">
            <XIcon className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-grow p-6 overflow-y-auto space-y-8">
          <div>
            <label htmlFor="system-instruction" className="flex items-center text-lg font-semibold text-neon-purple mb-3">
              <OrchestrationIcon className="w-5 h-5 mr-2" />
              System Orchestrator
            </label>
            <p className="text-sm text-text-main/70 mb-3">
              High-level instructions for how the entire system should process the request and coordinate AI agents.
            </p>
            <textarea
              id="system-instruction"
              value={systemInstruction}
              onChange={(e) => onSystemInstructionChange(e.target.value)}
              rows={8}
              className="w-full p-3 bg-neon-input border border-neon-border rounded-md text-text-input placeholder-text-main/50 outline-none focus:ring-2 focus:ring-neon-purple focus:border-transparent text-sm font-mono"
            />
          </div>

          <div>
            <label htmlFor="ai-instruction" className="flex items-center text-lg font-semibold text-neon-pink mb-3">
              <CreativeIcon className="w-5 h-5 mr-2" />
              AI Supervisor
            </label>
            <p className="text-sm text-text-main/70 mb-3">
              Specific instructions for the AI model's persona, behavior, and response format.
            </p>
            <textarea
              id="ai-instruction"
              value={aiInstruction}
              onChange={(e) => onAiInstructionChange(e.target.value)}
              rows={8}
              className="w-full p-3 bg-neon-input border border-neon-border rounded-md text-text-input placeholder-text-main/50 outline-none focus:ring-2 focus:ring-neon-pink focus:border-transparent text-sm font-mono"
            />
          </div>
        </div>
      </aside>
    </>
  );
};

export default CustomInstructionPanel;