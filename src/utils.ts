import fs from 'fs';
import path from 'path';

export const getEnv = (name: string): string => {
  // Browser environment
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    const envMap: Record<string, string | undefined> = {
      'ETHEREUM_PRIVATE_KEY': process.env.NEXT_PUBLIC_ETHEREUM_PRIVATE_KEY,
      'ALCHEMY_API_KEY': process.env.NEXT_PUBLIC_ALCHEMY_API_KEY,
      'LIT_CAPACITY_CREDIT_TOKEN_ID': process.env.NEXT_PUBLIC_LIT_CAPACITY_CREDIT_TOKEN_ID,
      'TRUSTED_ISSUERS': process.env.NEXT_PUBLIC_TRUSTED_ISSUERS,
    };
    const env = envMap[name];
    if (env === undefined || env === "")
      throw new Error(
        `Browser: ${name} ENV is not defined, please define it in the .env file`
      );
    return env;
  }
  
  // Node environment
  const env = process.env[name];
  if (env === undefined || env === "")
    throw new Error(
      `Node: ${name} ENV is not defined, please define it in the .env file`
    );
  return env;
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

export const loadCredentials = (): ParsedCredential[] => {
  try {
    const credentialsPath = path.join(process.cwd(), 'data', 'credentials.json');
    const credentialsData = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    
    return credentialsData.data.map((cred: any) => ({
      jwt: cred.jwt,
      issuer: cred.parsed.issuer,
      subject: cred.subject,
      credentialSubject: cred.parsed.credentialSubject,
      evidence: cred.parsed.evidence,
      issuanceDate: cred.parsed.issuanceDate,
      handle: cred.parsed.handle
    }));
  } catch (error) {
    throw new Error(`Failed to load credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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