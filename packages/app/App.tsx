import { useState, useEffect } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { FlowSelection } from './components/FlowSelection';
import { CredentialAccess } from './components/CredentialAccess';
import { UnlockedContent } from './components/UnlockedContent';
import { Settings } from './components/Settings';
import { useWallet } from './hooks/useWallet';
import { useSettings } from './hooks/useSettings';
import { useTinyCloud } from './contexts/TinyCloudContext';
import { Flow } from './types';
import { flows } from './data/flows';
import { Toaster } from './components/ui/sonner';

type AppState = 'connecting' | 'flows' | 'access' | 'content' | 'settings';

export default function App() {
  const { walletState, connectWallet, disconnectWallet, signMessage } = useWallet();
  const { settings, loading: settingsLoading, updateSettings } = useSettings();
  const { isConnected: isTinyCloudConnected } = useTinyCloud();
  const [appState, setAppState] = useState<AppState>('connecting');
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);

  // Check if user is fully connected (wallet + TinyCloud)
  const isFullyConnected = walletState.isConnected && isTinyCloudConnected;

  // Update app state based on full connection status
  useEffect(() => {
    if (isFullyConnected) {
      if (appState === 'connecting') {
        setAppState('flows');
      }
    } else {
      setAppState('connecting');
      setSelectedFlow(null);
    }
  }, [isFullyConnected, appState]);

  // Store wallet address in localStorage for caching
  useEffect(() => {
    if (walletState.address) {
      localStorage.setItem('walletAddress', walletState.address);
    } else {
      localStorage.removeItem('walletAddress');
    }
  }, [walletState.address]);

  const handleSelectFlow = (flow: Flow) => {
    setSelectedFlow(flow);
    setAppState('access');
  };

  const handleViewContent = (flow: Flow) => {
    setSelectedFlow(flow);
    setAppState('content');
  };

  const handleContentSuccess = (flow: Flow) => {
    setSelectedFlow(flow);
    setAppState('content');
  };

  const handleBackToFlows = () => {
    setSelectedFlow(null);
    setAppState('flows');
  };

  const handleShowSettings = () => {
    setAppState('settings');
  };

  const handleBackFromSettings = () => {
    setAppState('flows');
  };

  const handleDisconnect = () => {
    disconnectWallet();
    // Clear any cached content when disconnecting
    localStorage.removeItem('contentCache');
  };

  // Show loading state while settings are loading
  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="text-center fade-in">
          <div className="relative">
            <div className="animate-spin h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full mx-auto mb-6 glow"></div>
            <div className="absolute inset-0 animate-ping h-12 w-12 border-4 border-primary/40 rounded-full mx-auto"></div>
          </div>
          <p className="text-lg text-gradient animate-pulse">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Render current state
  if (!isFullyConnected || appState === 'connecting') {
    return (
      <>
        <WalletConnect
          onConnect={connectWallet}
          isConnecting={walletState.isConnecting}
          error={walletState.error}
        />
        <Toaster />
      </>
    );
  }

  if (appState === 'settings') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background">
          <header className="glass-card border-0 border-b backdrop-blur-md">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <h1 className="text-gradient">Settings</h1>
                <button
                  onClick={handleBackFromSettings}
                  className="text-primary hover:text-primary/80 transition-colors duration-200 flex items-center gap-2 hover-lift px-3 py-2 rounded-lg hover:bg-primary/10"
                >
                  ← Back to Flows
                </button>
              </div>
            </div>
          </header>
          
          <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="fade-in">
              <Settings
                settings={settings}
                onSettingsChange={updateSettings}
              />
            </div>
          </main>
        </div>
        <Toaster />
      </>
    );
  }

  if (appState === 'flows') {
    return (
      <>
        <FlowSelection
          flows={flows}
          onSelectFlow={handleSelectFlow}
          onViewContent={handleViewContent}
          onShowSettings={handleShowSettings}
          walletAddress={walletState.address!}
          onDisconnect={handleDisconnect}
        />
        <Toaster />
      </>
    );
  }

  if (appState === 'access' && selectedFlow) {
    return (
      <>
        <CredentialAccess
          flow={selectedFlow}
          onBack={handleBackToFlows}
          onContentSuccess={handleContentSuccess}
          walletAddress={walletState.address!}
          signMessage={signMessage}
          settings={settings}
        />
        <Toaster />
      </>
    );
  }

  if (appState === 'content' && selectedFlow) {
    return (
      <>
        <UnlockedContent
          flow={selectedFlow}
          onBack={handleBackToFlows}
          onViewRequirements={handleSelectFlow}
          walletAddress={walletState.address!}
        />
        <Toaster />
      </>
    );
  }

  return null;
}