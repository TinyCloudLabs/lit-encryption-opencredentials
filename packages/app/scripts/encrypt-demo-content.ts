#!/usr/bin/env node

/**
 * Script to encrypt demo content for flows and store in public JSON file
 * This script creates encrypted content that the app can fetch and decrypt
 */

import { Wallet, JsonRpcProvider } from 'ethers';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import from the browser package workspace dependency
import { 
  encryptToCredentialWithJWT,
  CredentialRequirements 
} from '@lit-encryption/browser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Demo content to encrypt
const DEMO_CONTENT = {
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

// Flow configurations with credential requirements
const FLOWS = [
  {
    id: "premium-research-access",
    title: "Premium Research Content",
    credentialRequirements: {
      issuer: "did:web:rebasedemokey.pages.dev",
      credentialType: "GitHubVerification",
      claims: {}
    }
  },
  {
    id: "developer-resources", 
    title: "Developer Resources",
    credentialRequirements: {
      issuer: "did:web:rebasedemokey.pages.dev",
      credentialType: "GitHubVerification", 
      claims: {}
    }
  }
];

async function encryptDemoContent() {
  console.log('🔐 Starting demo content encryption...');
  
  // Create a demo wallet for encryption
  // In production, this would be a proper wallet, but for demo purposes we use a hardcoded key
  const demoPrivateKey = process.env.DEMO_PRIVATE_KEY || '0x' + 'a'.repeat(64);
  
  // Connect to DatilTest network (Lit Protocol testnet)
  const provider = new JsonRpcProvider('https://chain-rpc.litprotocol.com/http');
  const demoWallet = new Wallet(demoPrivateKey, provider);
  
  console.log(`📝 Using demo wallet: ${demoWallet.address}`);
  
  const encryptedContent = {};
  
  for (const flow of FLOWS) {
    console.log(`\n🔄 Encrypting content for flow: ${flow.id}`);
    
    try {
      const content = DEMO_CONTENT[flow.id];
      if (!content) {
        console.warn(`⚠️  No content found for flow: ${flow.id}`);
        continue;
      }
      
      console.log(`📄 Content length: ${content.length} characters`);
      console.log(`🔑 Credential requirements: ${flow.credentialRequirements.credentialType} from ${flow.credentialRequirements.issuer}`);
      
      // Encrypt the content using the browser package
      const encrypted = await encryptToCredentialWithJWT(
        content,
        flow.credentialRequirements,
        demoWallet
      );
      
      // Store encrypted data with metadata
      encryptedContent[flow.id] = {
        ...encrypted,
        metadata: {
          flowId: flow.id,
          flowTitle: flow.title,
          encryptedAt: new Date().toISOString(),
          contentLength: content.length
        }
      };
      
      console.log(`✅ Successfully encrypted content for: ${flow.id}`);
      
    } catch (error) {
      console.error(`❌ Failed to encrypt content for ${flow.id}:`, error.message);
      
      // Store error info for debugging
      encryptedContent[flow.id] = {
        error: error.message,
        metadata: {
          flowId: flow.id,
          flowTitle: flow.title,
          encryptedAt: new Date().toISOString(),
          failed: true
        }
      };
    }
  }
  
  // Save encrypted content to public JSON file
  const outputPath = join(__dirname, '../public/encrypted-content.json');
  const output = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    walletAddress: demoWallet.address,
    flows: encryptedContent
  };
  
  try {
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Encrypted content saved to: ${outputPath}`);
    console.log(`📊 Total flows processed: ${FLOWS.length}`);
    console.log(`✅ Encryption complete!`);
    
    // Print summary
    console.log('\n📋 Summary:');
    for (const [flowId, data] of Object.entries(encryptedContent)) {
      if (data.error) {
        console.log(`  ❌ ${flowId}: Failed - ${data.error}`);
      } else {
        console.log(`  ✅ ${flowId}: Success (${data.metadata.contentLength} chars)`);
      }
    }
    
  } catch (error) {
    console.error(`❌ Failed to save encrypted content:`, error.message);
    process.exit(1);
  }
}

// Run the encryption
encryptDemoContent().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});