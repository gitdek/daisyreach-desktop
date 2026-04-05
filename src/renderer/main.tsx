import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Expose bridge type on window
declare global {
  interface Window {
    bridge: import('../main/preload').DaisyBridge
  }
}
