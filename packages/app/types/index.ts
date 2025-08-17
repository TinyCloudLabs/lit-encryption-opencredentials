// Core types for the credential access application

export interface Credential {
  id: string;
  subject: string; // did:pkh:eip155:1:0x{address}
  jwt: string;
  issuedAt: string;
  verified: boolean;
  parsed: {
    type: string[];
    issuer: string;
    credentialSubject: any;
    evidence?: any;
    issuanceDate: string;
    handle?: string; // For social media credentials
  };
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

// Additional types needed for TinyCloud integration
export interface StorageProvider {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface UserProfile {
  did: string;
  walletAddress: string;
  credentials: Credential[];
  createdAt: string;
  lastUpdated: string;
  settings: {
    defaultStorage: string;
    autoSync: boolean;
    notifications: boolean;
  };
}