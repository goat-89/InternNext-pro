import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

import App from './App'
import AppErrorBoundary from './components/AppErrorBoundary'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { PlatformSettingsProvider } from './context/PlatformSettingsContext';
import { MaintenanceGate } from './components/MaintenanceGate';
import {
  installGlobalErrorReporting,
} from './lib/operationalEventsApi'

import './index.css'

installGlobalErrorReporting()

ReactDOM.createRoot(
document.getElementById('root')
).render(
<React.StrictMode>
<AppErrorBoundary>
<BrowserRouter>
<AuthProvider>
<PlatformSettingsProvider>
<AppProvider>
<MaintenanceGate>
<App />
</MaintenanceGate>
</AppProvider>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
    </PlatformSettingsProvider>
  </AuthProvider>
</BrowserRouter>
</AppErrorBoundary>

</React.StrictMode>
);
