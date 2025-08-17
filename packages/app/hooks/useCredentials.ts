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
      
      // Credentials are already in the correct format from TinyCloud
      setCredentials(loadedCredentials);
    } catch (err) {
      console.error('Failed to load credentials:', err);
      setError('Failed to load credentials from TinyCloud');
      // Fallback to empty array on error
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  // Check if credentials meet flow requirements
  const checkCredentialMatch = useCallback((
    credential: Credential, 
    requirement: CredentialRequirement
  ): boolean => {
    // Check issuer
    if (credential.parsed.issuer !== requirement.issuer) return false;
    
    // Check credential type
    const credentialType = credential.parsed.type.find(t => t !== 'VerifiableCredential');
    if (credentialType !== requirement.credentialType) return false;
    
    // Check if verified
    if (!credential.verified) return false;
    
    // Check claims match
    for (const [key, value] of Object.entries(requirement.claims)) {
      // Check in credentialSubject
      if (credential.parsed.credentialSubject?.[key] !== value) {
        // Also check in evidence
        if (credential.parsed.evidence?.[key] !== value) {
          return false;
        }
      }
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