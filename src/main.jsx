import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './lib/auth-context'
import { installChunkErrorRecovery } from './lib/chunkErrorRecovery'
import AppErrorBoundary from './components/AppErrorBoundary'

installChunkErrorRecovery()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
)
