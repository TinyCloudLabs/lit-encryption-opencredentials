import { Wallet } from 'ethers';
import { 
  encryptToCredentialWithJWT, 
  CredentialRequirements 
} from '../../browser/src/index';

export interface EncryptedContentData {
  ciphertext: string;
  dataToEncryptHash: string;
  accessControlConditions: any;
  accsResourceString: string;
  credentialRequirements: CredentialRequirements;
  userSignedJWT: string;
  userAddress: string;
}

/**
 * Encrypts content using Lit Protocol with credential requirements
 */
export async function encryptContent(
  content: string,
  credentialRequirements: CredentialRequirements,
  userWallet: Wallet
): Promise<EncryptedContentData> {
  try {
    console.log('Encrypting content with credential requirements...');
    
    const encryptedData = await encryptToCredentialWithJWT(
      content,
      credentialRequirements,
      userWallet
    );
    
    console.log('Content encrypted successfully');
    return encryptedData;
  } catch (error) {
    console.error('Content encryption failed:', error);
    throw error;
  }
}

/**
 * Demo content for the application
 */
export const DEMO_CONTENT = {
  'premium-research-access': `# Premium Research Report - Q4 2024

## Executive Summary
The blockchain market continues to show strong fundamentals with institutional adoption accelerating across multiple sectors.

## Key Findings
- DeFi TVL increased by 34% quarter-over-quarter
- Layer 2 solutions gained significant traction
- NFT markets stabilized with focus on utility

## Market Analysis
The current market cycle shows signs of maturation with increased regulatory clarity driving institutional confidence...

## Investment Recommendations
1. Focus on infrastructure plays
2. Consider layer 2 scaling solutions
3. Monitor regulatory developments

*This report contains confidential and proprietary information. Distribution is restricted to verified subscribers only.*`,

  'developer-resources': `# Developer Documentation

## Getting Started
Welcome to our developer platform! This guide will help you integrate with our APIs.

## Authentication
All API calls require authentication using your API key:

\`\`\`javascript
const response = await fetch('/api/data', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
\`\`\`

## Code Examples
Here are some common integration patterns...

## Lit Protocol Integration
This platform uses Lit Protocol for credential-gated content access. You'll need:
1. A GitHub verification credential
2. A connected wallet
3. Valid access permissions

## Support
For technical support, please contact our developer team.`
};

/**
 * Initialize demo content by encrypting it with proper credential requirements
 */
export async function initializeDemoContent(userWallet: Wallet): Promise<void> {
  try {
    console.log('Initializing demo content...');
    
    // Encrypt premium research content
    const premiumRequirements: CredentialRequirements = {
      issuer: "did:web:rebasedemokey.pages.dev",
      credentialType: "GitHubVerification",
      claims: {}
    };

    const premiumEncrypted = await encryptContent(
      DEMO_CONTENT['premium-research-access'],
      premiumRequirements,
      userWallet
    );

    // Store encrypted premium content
    localStorage.setItem(
      'encrypted_content_premium-research-access',
      JSON.stringify(premiumEncrypted)
    );

    // Encrypt developer resources content
    const devRequirements: CredentialRequirements = {
      issuer: "did:web:rebasedemokey.pages.dev",
      credentialType: "GitHubVerification",
      claims: {}
    };

    const devEncrypted = await encryptContent(
      DEMO_CONTENT['developer-resources'],
      devRequirements,
      userWallet
    );

    // Store encrypted developer content
    localStorage.setItem(
      'encrypted_content_developer-resources',
      JSON.stringify(devEncrypted)
    );

    console.log('Demo content initialized successfully');
  } catch (error) {
    console.error('Failed to initialize demo content:', error);
    throw error;
  }
}

/**
 * Check if encrypted content exists for a flow
 */
export function hasEncryptedContent(flowId: string): boolean {
  try {
    const stored = localStorage.getItem(`encrypted_content_${flowId}`);
    return !!stored;
  } catch (error) {
    return false;
  }
}

/**
 * Remove all encrypted content (for testing/reset)
 */
export function clearEncryptedContent(): void {
  try {
    localStorage.removeItem('encrypted_content_premium-research-access');
    localStorage.removeItem('encrypted_content_developer-resources');
    console.log('Encrypted content cleared');
  } catch (error) {
    console.warn('Failed to clear encrypted content:', error);
  }
}