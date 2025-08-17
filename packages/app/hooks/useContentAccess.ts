import { useState, useCallback } from 'react';
import { AccessStep, Flow, Credential } from '../types';
import { useAccount, useWalletClient } from 'wagmi';
import { 
  decryptFromCredentialsWithJWT,
  CredentialRequirements,
  validateGithubCredentialRequirements,
  ParsedCredential
} from '../../browser/src/index';
import { storageManager } from '../lib/storage';
import { useTinyCloud } from '../contexts/TinyCloudContext';

export function useContentAccess(signMessage: (message: string) => Promise<string>) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { tcw } = useTinyCloud();
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
      
      // Real credential verification
      if (selectedCredentialIds.length === 0) {
        throw new Error('No credentials selected');
      }
      
      // Load user's credentials
      const userCredentials = await storageManager.loadCredentials();
      const selectedCredentials = userCredentials.filter(cred => 
        selectedCredentialIds.includes(cred.id)
      );
      
      // Verify credentials match flow requirements
      const validationErrors = await validateCredentialsForFlow(selectedCredentials, flow);
      if (validationErrors.length > 0) {
        throw new Error(`Credential validation failed: ${validationErrors.join(', ')}`);
      }
      
      console.log('Credentials verified successfully');
      
      setAccessSteps(prev => prev.map(step => 
        step.id === 'verification' ? { ...step, status: 'completed' } : step
      ));
      
      // Step 3: Decrypt content
      setAccessSteps(prev => prev.map(step => 
        step.id === 'decryption' ? { ...step, status: 'loading' } : step
      ));
      
      console.log('Starting decryption process...');
      
      // Load encrypted content for this flow
      const encryptedData = await loadEncryptedContent(flow.id);
      if (!encryptedData) {
        throw new Error('No encrypted content found for this flow. Content may not be initialized yet.');
      }
      
      // Convert credentials to ParsedCredential format for browser package
      const parsedCredentials: ParsedCredential[] = selectedCredentials.map(cred => ({
        jwt: cred.jwt || '',
        issuer: cred.parsed.issuer,
        subject: cred.parsed.credentialSubject?.id || cred.subject,
        credentialSubject: cred.parsed.credentialSubject,
        evidence: cred.parsed.evidence,
        issuanceDate: cred.parsed.issuanceDate || cred.issuedAt,
        handle: cred.parsed.evidence?.handle || cred.parsed.credentialSubject?.handle
      }));

      // Decrypt content using credentials only (no wallet needed)
      console.log('Decrypting with credentials...');
      const litActionResult = await decryptFromCredentialsWithJWT(
        encryptedData,
        parsedCredentials,
        address // Pass user address for optional verification
      );
      
      // Handle Lit Action response
      const response = litActionResult.response;
      if (typeof response === 'string') {
        throw new Error('Unexpected string response from Lit Action');
      }
      
      if (!response || typeof response !== 'object' || !('success' in response)) {
        throw new Error('Invalid response format from Lit Action');
      }
      
      const typedResponse = response as { success: boolean; error?: string; secret?: string };
      
      if (!typedResponse.success) {
        throw new Error(typedResponse.error || 'Decryption failed');
      }
      
      const content = typedResponse.secret;
      if (!content) {
        throw new Error('No secret returned from Lit Action');
      }
      console.log('Content decrypted successfully');
      
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
          expiresAt: Date.now() + (60 * 1000) // 60 seconds
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
        
        // Check if cache is still valid (60 seconds)
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

  // Helper function to validate credentials for flow requirements
  const validateCredentialsForFlow = async (
    credentials: Credential[], 
    flow: Flow
  ): Promise<string[]> => {
    const errors: string[] = [];
    
    try {
      for (const requirement of flow.credentialRequirements) {
        // Convert to core format for validation
        const coreRequirement: CredentialRequirements = {
          issuer: requirement.issuer,
          credentialType: requirement.credentialType,
          claims: requirement.claims
        };
        
        // Validate requirement format
        try {
          validateGithubCredentialRequirements(coreRequirement);
        } catch (error) {
          errors.push(`Invalid requirement: ${error instanceof Error ? error.message : 'Unknown error'}`);
          continue;
        }
        
        // Check if any credential matches this requirement
        const match = credentials.find(cred => {
          // Check issuer
          if (cred.parsed.issuer !== coreRequirement.issuer) return false;
          
          // Check credential type
          const credentialType = cred.parsed.type.find(t => t !== 'VerifiableCredential');
          if (credentialType !== coreRequirement.credentialType) return false;
          
          // Check if verified
          if (!cred.verified) return false;
          
          // Check claims match (if any)
          if (coreRequirement.claims && Object.keys(coreRequirement.claims).length > 0) {
            for (const [key, value] of Object.entries(coreRequirement.claims)) {
              // Check in credentialSubject
              if (cred.parsed.credentialSubject?.[key] !== value) {
                // Also check in evidence
                if (cred.parsed.evidence?.[key] !== value) {
                  return false;
                }
              }
            }
          }
          
          return true;
        });
        
        if (!match) {
          errors.push(`No valid credential found for requirement: ${requirement.credentialType} from ${requirement.issuer}`);
        }
      }
    } catch (error) {
      errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return errors;
  };

  // Helper function to load encrypted content from public JSON file
  const loadEncryptedContent = async (flowId: string) => {
    try {
      // First try to fetch from public encrypted content
      const response = await fetch('/encrypted-content.json');
      if (!response.ok) {
        throw new Error(`Failed to fetch encrypted content: ${response.status}`);
      }
      
      const encryptedData = await response.json();
      
      // Check if the flow exists in the encrypted content
      if (!encryptedData.flows || !encryptedData.flows[flowId]) {
        console.warn(`No encrypted content found for flow: ${flowId}`);
        return null;
      }
      
      const flowData = encryptedData.flows[flowId];
      
      // Check if there was an error during encryption
      if (flowData.error) {
        throw new Error(`Encrypted content has error: ${flowData.error}`);
      }
      
      // Return the encrypted content (excluding metadata)
      const { metadata, ...encryptedContent } = flowData;
      console.log(`✅ Loaded encrypted content for flow: ${flowId} (encrypted at: ${metadata?.encryptedAt})`);
      
      return encryptedContent;
      
    } catch (error) {
      console.warn('Failed to load encrypted content from public source:', error);
      
      // Fallback to localStorage for backwards compatibility
      try {
        const stored = localStorage.getItem(`encrypted_content_${flowId}`);
        if (stored) {
          console.log(`📁 Falling back to localStorage for flow: ${flowId}`);
          return JSON.parse(stored);
        }
      } catch (localError) {
        console.warn('LocalStorage fallback also failed:', localError);
      }
      
      return null;
    }
  };


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