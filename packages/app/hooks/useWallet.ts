import { useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { WalletState } from '../types';
import { useTinyCloud } from '../contexts/TinyCloudContext';

// Real wallet connection hook using wagmi
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { signIn, isConnecting: isTinyCloudConnecting, error: tinyCloudError } = useTinyCloud();

  // Create wallet state object compatible with existing interface
  const walletState: WalletState = {
    isConnected,
    address: address || null,
    isConnecting: isConnecting || isTinyCloudConnecting,
    error: connectError?.message || tinyCloudError || null
  };

  const connectWallet = useCallback(async (walletType?: string) => {
    try {
      // Step 1: Connect wallet if not already connected
      if (!isConnected) {
        const injectedConnector = connectors.find(c => c.type === 'injected');
        if (injectedConnector) {
          await connect({ connector: injectedConnector });
        }
      }
      
      // Step 2: Sign into TinyCloud
      await signIn();
    } catch (error) {
      console.error('Wallet connection failed:', error);
      throw error;
    }
  }, [isConnected, connect, connectors, signIn]);

  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const signature = await signMessageAsync({ message });
      return signature;
    } catch (error) {
      console.error('Message signing failed:', error);
      throw error;
    }
  }, [isConnected, address, signMessageAsync]);

  return {
    walletState,
    connectWallet,
    disconnectWallet,
    signMessage
  };
}