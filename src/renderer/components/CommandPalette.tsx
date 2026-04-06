import React, { useState, useEffect, useRef, useCallback } from 'react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (screen: string) => void;
}

interface HistoryEntry {
  input: string;
  timestamp: number;
  result?: string;
}

const MAX_HISTORY = 50;

function useHistory() {
  const key = 'daisyreach-command-history';
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const addEntry = useCallback((input: string, result?: string) => {
    setHistory((prev) => {
      const entry: HistoryEntry = { input, timestamp: Date.now(), result };
      const next = [entry, ...prev.filter((e) => e.input !== input)].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch { /* storage full */ }
      return next;
    });
  }, []);

  return { history, addEntry };
}

export default function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, addEntry } = useHistory();

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setInput('');
      setOutput(null);
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard: Escape to close, Enter to run, Up/Down for history
  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, history.length - 1));
        if (history[Math.min(selectedIndex + 1, history.length - 1)]) {
          setInput(history[Math.min(selectedIndex + 1, history.length - 1)].input);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, -1));
        if (selectedIndex - 1 < 0) setInput('');
        else if (history[selectedIndex - 1]) {
          setInput(history[selectedIndex - 1].input);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, history, selectedIndex]);

  // Quick commands
  const quickCommands = [
    { prefix: '/leads', action: () => onNavigate?.('leads') },
    { prefix: '/search', action: () => onNavigate?.('search') },
    { prefix: '/queue', action: () => onNavigate?.('queue') },
    { prefix: '/studio', action: () => onNavigate?.('studio') },
    { prefix: '/mail', action: () => onNavigate?.('mail') },
    { prefix: '/runs', action: () => onNavigate?.('runs') },
    { prefix: '/settings', action: () => onNavigate?.('settings') },
  ];

  const execute = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    // Check quick commands
    const cmd = quickCommands.find((c) => trimmed === c.prefix || trimmed.startsWith(c.prefix + ' '));
    if (cmd) {
      cmd.action();
      onClose();
      return;
    }

    // Raw CLI dispatch
    setRunning(true);
    setOutput(null);
    try {
      const parts = trimmed.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);
      const result = await window.bridge.cliRaw(command, args);
      const outputText = [
        result.stdout ? `stdout:\n${result.stdout}` : '',
        result.stderr ? `stderr:\n${result.stderr}` : '',
        `exit code: ${result.exit_code}`,
      ]
        .filter(Boolean)
        .join('\n\n');
      setOutput(outputText || 'No output');
      addEntry(trimmed, outputText);
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
      addEntry(trimmed, `Error: ${err.message}`);
    } finally {
      setRunning(false);
    }
  }, [input, quickCommands, onClose, onNavigate, addEntry]);

  if (!open) return null;

  // Filter history for autocomplete
  const filteredHistory = input
    ? history.filter((h) => h.input.includes(input)).slice(0, 5)
    : history.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
          <span className="text-slate-500 text-lg">⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') execute();
            }}
            placeholder='Type a command (e.g. "warehouse stats") or /navigate...'
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          {running && <span className="animate-spin text-blue-400">⟳</span>}
        </div>

        {/* Suggestions */}
        {(filteredHistory.length > 0 || !input) && !output && (
          <div className="max-h-60 overflow-auto">
            {quickCommands.map((cmd) => (
              <button
                key={cmd.prefix}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 flex items-center gap-2"
              >
                <span className="text-slate-600">→</span>
                {cmd.prefix}
              </button>
            ))}
            {filteredHistory.map((entry, i) => (
              <button
                key={`${entry.input}-${entry.timestamp}`}
                onClick={() => setInput(entry.input)}
                className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 flex items-center gap-2"
              >
                <span className="text-slate-600">↺</span>
                <span className="flex-1 truncate">{entry.input}</span>
                <span className="text-xs text-slate-600">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="max-h-60 overflow-auto p-4">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{output}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
