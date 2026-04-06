import React from 'react';

// Placeholder screens for future phases
// Screens implemented in Phase 0-2 are: Leads, Search, LeadDetail, Queue, Runs, CommandPalette

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full text-slate-500">
      <div className="text-center">
        <div className="text-4xl mb-2">🏗️</div>
        <p className="text-lg font-medium">{name}</p>
        <p className="text-sm text-slate-600 mt-1">Coming in a future phase</p>
      </div>
    </div>
  );
}

function MailScreen() { return <PlaceholderScreen name="Mail" />; }
function SettingsScreen() { return <PlaceholderScreen name="Settings" />; }

export { MailScreen, SettingsScreen };
