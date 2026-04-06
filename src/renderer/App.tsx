import React, { useState, useEffect, useCallback } from 'react';
import Leads from './screens/Leads';
import Search from './screens/Search';
import LeadDetail from './screens/LeadDetail';
import Queue from './screens/Queue';
import Runs from './screens/Runs';
import Studio from './screens/Studio';
import CommandPalette from './components/CommandPalette';
import {
  MailScreen,
  SettingsScreen,
} from './screens/Placeholder';

type Screen = 'leads' | 'search' | 'queue' | 'studio' | 'mail' | 'runs' | 'settings';

interface NavItem {
  id: Screen;
  label: string;
  icon: string;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'leads', label: 'Leads', icon: '📊' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'queue', label: 'Queue', icon: '📋' },
  { id: 'studio', label: 'Studio', icon: '🎨' },
  { id: 'mail', label: 'Mail', icon: '✉️' },
  { id: 'runs', label: 'Runs', icon: '▶️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

function ScreenContent({
  screen,
  leadDetailId,
  onCloseLeadDetail,
}: {
  screen: Screen;
  leadDetailId: string | null;
  onCloseLeadDetail: () => void;
}) {
  // Lead detail overlay takes priority
  if (leadDetailId) {
    return <LeadDetail businessId={leadDetailId} onBack={onCloseLeadDetail} />;
  }

  switch (screen) {
    case 'leads':
      return <Leads onSelectLead={(id) => setLeadDetailId(id)} />;
    case 'search':
      return <Search onLeadSelected={(id) => { setLeadDetailId(id); setActiveScreen('search'); }} />;
    case 'queue':
      return <Queue />;
    case 'studio':
      return <Studio />;
    case 'mail':
      return <MailScreen />;
    case 'runs':
      return <Runs />;
    case 'settings':
      return <SettingsScreen />;
  }
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('leads');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [leadDetailId, setLeadDetailId] = useState<string | null>(null);

  // Cmd+K to open command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Navigate from command palette
  const handleNavigate = useCallback((screen: string) => {
    if (NAV_ITEMS.some((item) => item.id === screen)) {
      setActiveScreen(screen as Screen);
    }
  }, []);

  // Close lead detail and go back to leads
  const handleCloseLeadDetail = useCallback(() => {
    setLeadDetailId(null);
    setActiveScreen('leads');
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarCollapsed ? 'w-14' : 'w-48'
        } flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200`}
      >
        {/* Brand */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'px-4'} h-12 border-b border-slate-800`}>
          {!sidebarCollapsed && (
            <span className="text-sm font-semibold text-white tracking-tight">DaisyReach</span>
          )}
          {sidebarCollapsed && (
            <span className="text-sm font-semibold text-white">D</span>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveScreen(item.id);
                setLeadDetailId(null);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                sidebarCollapsed ? 'justify-center' : ''
              } ${
                activeScreen === item.id && !leadDetailId
                  ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
              title={item.label}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Command palette hint + collapse toggle */}
        <div>
          {!sidebarCollapsed && (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            >
              <span className="text-base flex-shrink-0">⌘</span>
              <span>Command...</span>
              <span className="ml-auto text-xs text-slate-600">⌘K</span>
            </button>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center h-10 border-t border-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-6">
        <ScreenContent
          screen={activeScreen}
          leadDetailId={leadDetailId}
          onCloseLeadDetail={handleCloseLeadDetail}
        />
      </main>

      {/* Status bar */}
      <footer className="fixed bottom-0 right-0 left-0 flex items-center justify-between px-4 h-6 bg-slate-900 border-t border-slate-800 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
            Python
          </span>
          <span className="text-slate-600">⌘K</span>
        </div>
        <span>DaisyReach Desktop v0.1.0</span>
      </footer>

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
