import { useState, useEffect, useCallback } from 'react';
import { Credential, CredentialRequirement } from '../types';
import { storageManager } from '../lib/storage';
import { useTinyCloud } from '../contexts/TinyCloudContext';

export function useCredentials() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { tcw, isConnected } = useTinyCloud();

  // Load credentials from TinyCloud storage
  const loadCredentials = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Only load if TinyCloud is connected
      if (!isConnected) {
        setCredentials([]);
        return;
      }

      // Load from TinyCloud storage
      const loadedCredentials = await storageManager.loadCredentials();
      
      // Validate and process credentials
      const validatedCredentials = loadedCredentials.map(cred => ({
        ...cred,
        status: validateCredentialStatus(cred) as any
      }));
      
      setCredentials(validatedCredentials);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError('Failed to load credentials from TinyCloud');
      // Fallback to empty array on error
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  // Validate credential status
  const validateCredentialStatus = (credential: Credential): Credential['status'] => {
    const now = new Date();
    const expiresAt = new Date(credential.expiresAt);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    if (expiresAt < now) {
      return 'invalid';
    } else if (expiresAt < sevenDaysFromNow) {
      return 'expiring';
    }
    
    // Check if signature is valid (mock implementation)
    if (!credential.signature || credential.signature.includes('invalid')) {
      return 'invalid';
    }
    
    return 'valid';
  };

  // Check if credentials meet flow requirements
  const checkCredentialMatch = useCallback((
    credential: Credential, 
    requirement: CredentialRequirement
  ): boolean => {
    if (credential.issuer !== requirement.issuer) return false;
    if (credential.credentialType !== requirement.credentialType) return false;
    if (credential.status !== 'valid') return false;
    
    // Check claims match
    for (const [key, value] of Object.entries(requirement.claims)) {
      if (credential.claims[key] !== value) return false;
    }
    
    return true;
  }, []);

  // Find credentials that match requirements
  const findMatchingCredentials = useCallback((
    requirements: CredentialRequirement[]
  ): Credential[] => {
    return requirements.map(requirement => {
      const match = credentials.find(cred => 
        checkCredentialMatch(cred, requirement)
      );
      return match;
    }).filter(Boolean) as Credential[];
  }, [credentials, checkCredentialMatch]);

  // Auto-select credentials for requirements
  const autoSelectCredentials = useCallback((
    requirements: CredentialRequirement[]
  ): string[] => {
    const selected: string[] = [];
    
    requirements.forEach(requirement => {
      const match = credentials.find(cred => 
        checkCredentialMatch(cred, requirement)
      );
      
      if (match && !selected.includes(match.id)) {
        selected.push(match.id);
      }
    });
    
    return selected;
  }, [credentials, checkCredentialMatch]);

  // Validate if selected credentials meet all requirements
  const validateSelectedCredentials = useCallback((
    selectedIds: string[],
    requirements: CredentialRequirement[]
  ): { isValid: boolean; missingRequirements: CredentialRequirement[] } => {
    const selectedCredentials = credentials.filter(cred => selectedIds.includes(cred.id));
    const missingRequirements: CredentialRequirement[] = [];
    
    requirements.forEach(requirement => {
      const hasMatch = selectedCredentials.some(cred => 
        checkCredentialMatch(cred, requirement)
      );
      
      if (!hasMatch) {
        missingRequirements.push(requirement);
      }
    });
    
    return {
      isValid: missingRequirements.length === 0,
      missingRequirements
    };
  }, [credentials, checkCredentialMatch]);

  // Update storage manager when TinyCloud connects
  useEffect(() => {
    if (tcw && isConnected) {
      storageManager.setTinyCloudWeb(tcw);
      loadCredentials();
    } else {
      // Clear credentials when disconnected
      setCredentials([]);
      setLoading(false);
    }
  }, [tcw, isConnected, loadCredentials]);

  return {
    credentials,
    loading,
    error,
    loadCredentials,
    findMatchingCredentials,
    autoSelectCredentials,
    validateSelectedCredentials,
    checkCredentialMatch
  };
}