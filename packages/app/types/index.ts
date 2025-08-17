// Core types for the credential access application

export interface Credential {
  id: string;
  issuer: string;
  credentialType: string;
  claims: Record<string, any>;
  issuedAt: string;
  expiresAt: string;
  signature: string;
  status: 'valid' | 'expiring' | 'invalid' | 'not-valid-for-use';
}

export interface CredentialRequirement {
  issuer: string;
  credentialType: string;
  claims: Record<string, any>;
}

export interface Flow {
  id: string;
  title: string;
  description: string;
  contentRef: string;
  credentialRequirements: CredentialRequirement[];
  accessLevel: 'basic' | 'premium' | 'enterprise';
  estimatedUnlockTime: string;
}

export interface AccessStep {
  id: string;
  label: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  error: string | null;
}

export interface ContentCache {
  [walletAddress: string]: {
    [flowId: string]: {
      content: string;
      timestamp: number;
      expiresAt: number;
    };
  };
}

export interface AppSettings {
  autoSelectCredentials: boolean;
  cacheDuration: number; // in hours
  defaultWallet: string | null;
  notificationPreferences: {
    showSuccess: boolean;
    showErrors: boolean;
  };
}