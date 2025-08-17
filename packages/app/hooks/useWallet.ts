import { useState, useCallback } from 'react';
import { WalletState } from '../types';

// Mock wallet connection hook for demonstration
export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    isConnecting: false,
    error: null
  });

  const connectWallet = useCallback(async (walletType?: string) => {
    setWalletState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // Simulate wallet connection delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      const mockAddress = '0x1234567890123456789012345678901234567890';
      setWalletState({
        isConnected: true,
        address: mockAddress,
        isConnecting: false,
        error: null
      });
    } catch (error) {
      setWalletState(prev => ({
        ...prev,
        isConnecting: false,
        error: 'Failed to connect wallet'
      }));
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      isConnecting: false,
      error: null
    });
  }, []);

  const signMessage = useCallback(async (message: string) => {
    if (!walletState.isConnected) {
      throw new Error('Wallet not connected');
    }
    
    console.log('Simulating wallet signature for message:', message);
    
    // Simulate user reviewing and signing the message
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock signature (in real implementation, this would be from the wallet)
    const signature = 'mock-signature-' + Date.now() + Math.random().toString(36).substr(2, 9);
    console.log('Mock signature generated:', signature);
    
    return signature;
  }, [walletState.isConnected]);

  return {
    walletState,
    connectWallet,
    disconnectWallet,
    signMessage
  };
}