import { useState, useEffect } from 'react'
import Leads from './screens/Leads'

type Screen = 'search' | 'queue' | 'leads' | 'studio' | 'mail' | 'runs' | 'settings'

const navItems: { id: Screen; label: string; icon: string }[] = [
  { id: 'search', label: 'Search', icon: '⌕' },
  { id: 'queue', label: 'Queue', icon: '☰' },
  { id: 'leads', label: 'Leads', icon: '◉' },
  { id: 'studio', label: 'Studio', icon: '◈' },
  { id: 'mail', label: 'Mail', icon: '✉' },
  { id: 'runs', label: 'Runs', icon: '▹' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('leads')
  const [bridgeReady, setBridgeReady] = useState(false)
  const [bridgeLoading, setBridgeLoading] = useState(true)

  useEffect(() => {
    // Check bridge status
    window.bridge.bridgeStatus().then((status) => {
      setBridgeReady(status.ready)
      setBridgeLoading(false)
    }).catch(() => {
      setBridgeLoading(false)
    })
  }, [])

  const renderScreen = () => {
    switch (screen) {
      case 'leads': return <Leads />
      default: return <PlaceholderScreen name={screen} />
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-48 bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-neutral-800">
          <h1 className="text-lg font-bold tracking-tight text-white">DaisyReach</h1>
          <p className="text-xs text-neutral-500 mt-0.5">v0.1.0</p>
        </div>

        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setScreen(item.id)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
                screen === item.id
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Bridge status */}
        <div className="p-4 border-t border-neutral-800">
          <button
            onClick={() => setScreen('settings')}
            className="w-full text-left text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            ⚙ Settings
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Status bar */}
        <div className="h-7 bg-neutral-900 border-b border-neutral-800 flex items-center px-4 text-xs text-neutral-500 gap-4 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${bridgeReady ? 'bg-green-500' : bridgeLoading ? 'bg-yellow-500' : 'bg-red-500'}`} />
            Python {bridgeReady ? '●' : bridgeLoading ? '◌' : '✗'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
            Brave —
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
            MiniMax —
          </span>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-auto">
          {renderScreen()}
        </div>
      </main>
    </div>
  )
}

function PlaceholderScreen({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-full text-neutral-500">
      <div className="text-center">
        <p className="text-4xl mb-2">{name === 'search' ? '⌕' : name === 'queue' ? '☰' : name === 'studio' ? '◈' : name === 'mail' ? '✉' : name === 'runs' ? '▹' : '⚙'}</p>
        <p className="text-sm">{name.charAt(0).toUpperCase() + name.slice(1)} — coming soon</p>
      </div>
    </div>
  )
}
