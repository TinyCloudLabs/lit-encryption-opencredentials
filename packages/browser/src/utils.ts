// Browser-compatible utilities for lit-encryption

export const getEnv = (name: string): string => {
  // Browser environment (Vite)
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    // Use import.meta.env for Vite, with defaults to prevent errors
    const envMap: Record<string, string | undefined> = {
      'TRUSTED_ISSUERS': import.meta.env?.VITE_TRUSTED_ISSUERS || 'did:web:rebasedemokey.pages.dev,did:web:issuer.tinycloud.xyz',
      'LIT_CAPACITY_CREDIT_TOKEN_ID': import.meta.env?.VITE_LIT_CAPACITY_CREDIT_TOKEN_ID || '',
    };
    const env = envMap[name];
    if (env === undefined) {
      console.warn(`Browser: ${name} ENV is not defined, using default value`);
      return envMap[name] || '';
    }
    return env;
  }
  
  // Node environment fallback
  if (typeof process !== 'undefined' && process.env) {
    const env = process.env[name];
    if (env === undefined || env === "")
      throw new Error(
        `Node: ${name} ENV is not defined, please define it in the .env file`
      );
    return env;
  }
  
  // Fallback with defaults
  const defaults: Record<string, string> = {
    'TRUSTED_ISSUERS': 'did:web:rebasedemokey.pages.dev,did:web:issuer.tinycloud.xyz',
    'LIT_CAPACITY_CREDIT_TOKEN_ID': '',
  };
  
  console.warn(`Environment not fully supported, using default for ${name}`);
  return defaults[name] || '';
};

export const getTrustedIssuers = (): string[] => {
  const trustedIssuersEnv = getEnv("TRUSTED_ISSUERS");
  return trustedIssuersEnv.split(',').map(issuer => issuer.trim()).filter(issuer => issuer.length > 0);
};

export const validateTrustedIssuer = (issuer: string): boolean => {
  const trustedIssuers = getTrustedIssuers();
  return trustedIssuers.includes(issuer);
};

export const validateGithubCredentialRequirements = (requirements: CredentialRequirements): void => {
  // Check if issuer is trusted
  if (!validateTrustedIssuer(requirements.issuer)) {
    const trustedIssuers = getTrustedIssuers();
    throw new Error(`Untrusted issuer: ${requirements.issuer}. Trusted issuers: ${trustedIssuers.join(', ')}`);
  }

  // Check if credential type is GitHub verification
  if (requirements.credentialType !== "GitHubVerification") {
    throw new Error(`Invalid credential type: ${requirements.credentialType}. Only GitHubVerification is supported.`);
  }

  // Validate that GitHub handle claims are present (if specified)
  if (requirements.claims?.githubHandle !== undefined) {
    const handles = Array.isArray(requirements.claims.githubHandle) 
      ? requirements.claims.githubHandle 
      : [requirements.claims.githubHandle];
    
    for (const handle of handles) {
      if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
        throw new Error(`Invalid GitHub handle: ${handle}. GitHub handles must be non-empty strings.`);
      }
    }
  }
};

export interface CredentialRequirements {
  issuer: string;
  credentialType: string;
  claims?: {
    githubHandle?: string | string[];
    minIssuanceAge?: number;
    requiredEvidence?: string[];
  };
}

export interface ParsedCredential {
  jwt: string;
  issuer: string;
  subject: string;
  credentialSubject: any;
  evidence?: any;
  issuanceDate: string;
  handle?: string;
}

// Browser-compatible credential loading - accepts credentials from external source
export const loadCredentials = (credentials: ParsedCredential[]): ParsedCredential[] => {
  // In browser, we expect credentials to be passed in rather than loaded from filesystem
  return credentials || [];
};

export const findMatchingCredential = (
  credentials: ParsedCredential[], 
  requirements: CredentialRequirements,
  userAddress: string
): ParsedCredential | null => {
  return credentials.find(cred => {
    // Check issuer
    if (cred.issuer !== requirements.issuer) return false;
    
    // Check credential type
    if (!cred.credentialSubject || 
        !cred.credentialSubject.id || 
        !cred.credentialSubject.id.includes(userAddress.toLowerCase())) {
      return false;
    }
    
    // Check GitHub handle if specified
    if (requirements.claims?.githubHandle) {
      const requiredHandles = Array.isArray(requirements.claims.githubHandle) 
        ? requirements.claims.githubHandle 
        : [requirements.claims.githubHandle];
      
      if (!cred.handle || !requiredHandles.includes(cred.handle)) return false;
    }
    
    // Check issuance age if specified
    if (requirements.claims?.minIssuanceAge) {
      const issuanceTime = new Date(cred.issuanceDate).getTime();
      const minTime = Date.now() - (requirements.claims.minIssuanceAge * 1000);
      if (issuanceTime < minTime) return false;
    }
    
    return true;
  }) || null;
};