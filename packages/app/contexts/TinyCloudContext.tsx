import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { TinyCloudWeb } from '@tinycloudlabs/web-sdk';
import { useAccount, useWalletClient } from 'wagmi';

interface TinyCloudContextType {
  tcw: TinyCloudWeb | null;
  isConnected: boolean;
  isConnecting: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  error: string | null;
}

const TinyCloudContext = createContext<TinyCloudContextType | null>(null);

interface TinyCloudProviderProps {
  children: ReactNode;
}

export const TinyCloudProvider: React.FC<TinyCloudProviderProps> = ({ children }) => {
  const [tcw, setTcw] = useState<TinyCloudWeb | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isConnected: isWalletConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  const isConnected = !!tcw && !!tcw.session();

  // Helper function to convert wallet client to ethers signer
  const walletClientToEthers5Signer = (walletClient: any) => {
    const { account, chain, transport } = walletClient;
    const network = {
      chainId: chain.id,
      name: chain.name,
      ensAddress: chain.contracts?.ensRegistry?.address,
    };
    
    // Create a provider compatible with ethers v5
    const provider = {
      request: async ({ method, params }: { method: string; params?: unknown[] }) => {
        return transport.request({ method, params });
      },
      getNetwork: () => Promise.resolve(network),
      getSigner: () => ({
        getAddress: () => Promise.resolve(account.address),
        signMessage: (message: string) => transport.request({
          method: 'personal_sign',
          params: [message, account.address],
        }),
        provider: this,
      }),
    };

    return provider.getSigner();
  };

  const signIn = async () => {
    if (!isWalletConnected || !walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const signer = walletClientToEthers5Signer(walletClient);
      
      const tcwConfig = {
        provider: {
          web3: {
            driver: signer.provider
          }
        },
        modules: {
          storage: {
            prefix: 'litapp'
          }
        }
      };

      const tinyCloudWeb = new TinyCloudWeb(tcwConfig);
      await tinyCloudWeb.signIn();
      
      setTcw(tinyCloudWeb);
      
    } catch (err) {
      console.error('TinyCloud sign-in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in to TinyCloud');
    } finally {
      setIsConnecting(false);
    }
  };

  const signOut = () => {
    if (tcw) {
      tcw.signOut?.();
      setTcw(null);
      setError(null);
    }
  };

  // Auto sign-out when wallet disconnects
  useEffect(() => {
    if (!isWalletConnected && tcw) {
      signOut();
    }
  }, [isWalletConnected, tcw]);

  const value: TinyCloudContextType = {
    tcw,
    isConnected,
    isConnecting,
    signIn,
    signOut,
    error,
  };

  return (
    <TinyCloudContext.Provider value={value}>
      {children}
    </TinyCloudContext.Provider>
  );
};

export const useTinyCloud = (): TinyCloudContextType => {
  const context = useContext(TinyCloudContext);
  if (!context) {
    throw new Error('useTinyCloud must be used within a TinyCloudProvider');
  }
  return context;
};