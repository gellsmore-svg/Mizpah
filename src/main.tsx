import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// e-ink-friendly high-contrast theme by default (matches the family UIs)
document.documentElement.dataset.theme = localStorage.getItem('mizpah.theme') || 'eink'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
