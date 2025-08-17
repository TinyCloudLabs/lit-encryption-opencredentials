import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from './lib/wagmi'
import { TinyCloudProvider } from './contexts/TinyCloudContext'
import App from './App.tsx'
import './styles/globals.css'

// Create a client for react-query
const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TinyCloudProvider>
          <App />
        </TinyCloudProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)