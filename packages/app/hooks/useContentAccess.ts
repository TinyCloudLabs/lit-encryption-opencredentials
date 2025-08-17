import { useState, useCallback } from 'react';
import { AccessStep, Flow } from '../types';
import { mockDecryptedContent } from '../data/content';

export function useContentAccess(signMessage: (message: string) => Promise<string>) {
  const [accessSteps, setAccessSteps] = useState<AccessStep[]>([
    { id: 'signature', label: 'Awaiting signature', status: 'pending' },
    { id: 'verification', label: 'Verifying credentials', status: 'pending' },
    { id: 'decryption', label: 'Decrypting content', status: 'pending' },
    { id: 'complete', label: 'Content unlocked', status: 'pending' }
  ]);

  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isAccessing, setIsAccessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStepStatus = (stepId: string, status: AccessStep['status']) => {
    setAccessSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status } : step
    ));
  };

  const resetAccess = useCallback(() => {
    setAccessSteps([
      { id: 'signature', label: 'Awaiting signature', status: 'pending' },
      { id: 'verification', label: 'Verifying credentials', status: 'pending' },
      { id: 'decryption', label: 'Decrypting content', status: 'pending' },
      { id: 'complete', label: 'Content unlocked', status: 'pending' }
    ]);
    setDecryptedContent(null);
    setIsAccessing(false);
    setError(null);
  }, []);

  const accessContent = useCallback(async (
    flow: Flow,
    selectedCredentialIds: string[]
  ): Promise<void> => {
    setIsAccessing(true);
    setError(null);
    
    // Reset steps at the beginning
    const initialSteps = [
      { id: 'signature', label: 'Awaiting signature', status: 'pending' as const },
      { id: 'verification', label: 'Verifying credentials', status: 'pending' as const },
      { id: 'decryption', label: 'Decrypting content', status: 'pending' as const },
      { id: 'complete', label: 'Content unlocked', status: 'pending' as const }
    ];
    setAccessSteps(initialSteps);

    try {
      // Step 1: Get user signature
      setAccessSteps(prev => prev.map(step => 
        step.id === 'signature' ? { ...step, status: 'loading' } : step
      ));
      
      console.log('Starting signature process...');
      const message = `Access request for: ${flow.title}\nTimestamp: ${Date.now()}`;
      const signature = await signMessage(message);
      console.log('Signature received:', signature);
      
      setAccessSteps(prev => prev.map(step => 
        step.id === 'signature' ? { ...step, status: 'completed' } : step
      ));
      
      // Step 2: Verify credentials
      setAccessSteps(prev => prev.map(step => 
        step.id === 'verification' ? { ...step, status: 'loading' } : step
      ));
      
      console.log('Starting verification process...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock credential verification
      if (selectedCredentialIds.length === 0) {
        throw new Error('No credentials selected');
      }
      
      setAccessSteps(prev => prev.map(step => 
        step.id === 'verification' ? { ...step, status: 'completed' } : step
      ));
      
      // Step 3: Decrypt content
      setAccessSteps(prev => prev.map(step => 
        step.id === 'decryption' ? { ...step, status: 'loading' } : step
      ));
      
      console.log('Starting decryption process...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock content decryption
      const content = mockDecryptedContent[flow.id];
      if (!content) {
        throw new Error('Content not found');
      }
      
      setAccessSteps(prev => prev.map(step => 
        step.id === 'decryption' ? { ...step, status: 'completed' } : step
      ));
      setAccessSteps(prev => prev.map(step => 
        step.id === 'complete' ? { ...step, status: 'completed' } : step
      ));
      
      // Cache content
      cacheContent(flow.id, content);
      setDecryptedContent(content);
      
    } catch (err) {
      console.error('Access error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Access failed';
      setError(errorMessage);
      
      // Mark the step that was loading as error
      setAccessSteps(prev => prev.map(step => 
        step.status === 'loading' ? { ...step, status: 'error' } : step
      ));
    } finally {
      setIsAccessing(false);
    }
  }, [signMessage]);

  const cacheContent = (flowId: string, content: string) => {
    try {
      const cache = JSON.parse(localStorage.getItem('contentCache') || '{}');
      const walletAddress = localStorage.getItem('walletAddress');
      
      if (walletAddress) {
        if (!cache[walletAddress]) {
          cache[walletAddress] = {};
        }
        
        cache[walletAddress][flowId] = {
          content,
          timestamp: Date.now(),
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        localStorage.setItem('contentCache', JSON.stringify(cache));
      }
    } catch (error) {
      console.warn('Failed to cache content:', error);
    }
  };

  const getCachedContent = useCallback((flowId: string): string | null => {
    try {
      const cache = JSON.parse(localStorage.getItem('contentCache') || '{}');
      const walletAddress = localStorage.getItem('walletAddress');
      
      if (walletAddress && cache[walletAddress] && cache[walletAddress][flowId]) {
        const cachedItem = cache[walletAddress][flowId];
        
        // Check if cache is still valid
        if (cachedItem.expiresAt > Date.now()) {
          return cachedItem.content;
        }
      }
    } catch (error) {
      console.warn('Failed to retrieve cached content:', error);
    }
    
    return null;
  }, []);

  const retryCurrentStep = useCallback(() => {
    const currentStep = accessSteps.find(step => step.status === 'error');
    if (currentStep) {
      updateStepStatus(currentStep.id, 'pending');
      setError(null);
    }
  }, [accessSteps]);

  return {
    accessSteps,
    decryptedContent,
    isAccessing,
    error,
    accessContent,
    getCachedContent,
    resetAccess,
    retryCurrentStep
  };
}