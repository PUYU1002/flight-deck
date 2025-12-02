import React, { useState } from 'react';

interface CommandInputProps {
  onCommand: (cmd: string) => Promise<void>;
  isProcessing: boolean;
  theme: 'dark' | 'light';
}

export const CommandInput: React.FC<CommandInputProps> = ({ onCommand, isProcessing, theme }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onCommand(input);
      setInput('');
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`p-4 border-t ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder={isProcessing ? "Agent is thinking..." : "Ask Cockpit Agent (e.g., 'Move fuel to top', 'Hide fuel', 'Make altitude red')"}
            className={`
              w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all font-mono
              ${isDark ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-slate-100 text-slate-900 placeholder-slate-400'}
              ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          />
        </div>
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className={`
            px-6 py-2 rounded-lg font-bold uppercase tracking-wider text-sm transition-all
            ${isProcessing 
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
              : 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg hover:shadow-sky-500/25 active:scale-95'}
          `}
        >
          {isProcessing ? 'Adjusting...' : 'Execute'}
        </button>
      </form>
    </div>
  );
};