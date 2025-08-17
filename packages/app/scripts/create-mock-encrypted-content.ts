#!/usr/bin/env node

/**
 * Script to create mock encrypted content for testing the flow
 * This creates properly formatted encrypted data structure without actual Lit Protocol encryption
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Demo content to "encrypt"
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

function createMockEncryptedData(content: string, requirements: any) {
  // Create mock encrypted data that matches the expected structure
  return {
    ciphertext: btoa(content), // Base64 encode the content for "encryption"
    dataToEncryptHash: "0x" + Array(64).fill('0').map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
    accessControlConditions: [
      {
        contractAddress: "",
        standardContractType: "timestamp",
        chain: "ethereum",
        method: "",
        parameters: [":currentActionIpfsId"],
        returnValueTest: {
          comparator: ">=",
          value: "0",
        },
      },
    ],
    accsResourceString: `lit-accesscontrolcondition://0x${'a'.repeat(64)}`,
    credentialRequirements: requirements,
    userSignedJWT: "mock.jwt.token",
    userAddress: "0x8fd379246834eac74B8419FfdA202CF8051F7A03"
  };
}

async function createMockContent() {
  console.log('🔐 Creating mock encrypted content for testing...');
  
  const demoWalletAddress = "0x8fd379246834eac74B8419FfdA202CF8051F7A03";
  console.log(`📝 Using demo wallet: ${demoWalletAddress}`);
  
  const encryptedContent: Record<string, any> = {};
  
  for (const flow of FLOWS) {
    console.log(`\n🔄 Creating mock encrypted content for flow: ${flow.id}`);
    
    const content = DEMO_CONTENT[flow.id];
    if (!content) {
      console.warn(`⚠️  No content found for flow: ${flow.id}`);
      continue;
    }
    
    console.log(`📄 Content length: ${content.length} characters`);
    console.log(`🔑 Credential requirements: ${flow.credentialRequirements.credentialType} from ${flow.credentialRequirements.issuer}`);
    
    // Create mock encrypted data
    const encrypted = createMockEncryptedData(content, flow.credentialRequirements);
    
    // Store encrypted data with metadata
    encryptedContent[flow.id] = {
      ...encrypted,
      metadata: {
        flowId: flow.id,
        flowTitle: flow.title,
        encryptedAt: new Date().toISOString(),
        contentLength: content.length,
        mock: true // Indicate this is mock data
      }
    };
    
    console.log(`✅ Successfully created mock encrypted content for: ${flow.id}`);
  }
  
  // Save encrypted content to public JSON file
  const outputPath = join(__dirname, '../public/encrypted-content.json');
  const output = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    walletAddress: demoWalletAddress,
    mock: true, // Indicate this is mock data
    flows: encryptedContent
  };
  
  try {
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Mock encrypted content saved to: ${outputPath}`);
    console.log(`📊 Total flows processed: ${FLOWS.length}`);
    console.log(`✅ Mock content creation complete!`);
    
    // Print summary
    console.log('\n📋 Summary:');
    for (const [flowId, data] of Object.entries(encryptedContent)) {
      console.log(`  ✅ ${flowId}: Success (${data.metadata.contentLength} chars) [MOCK]`);
    }
    
    console.log('\n⚠️  Note: This is mock encrypted content for testing the flow.');
    console.log('   The app will load this content but decryption will use mock logic.');
    console.log('   For real Lit Protocol encryption, resolve the ethers version compatibility issues.');
    
  } catch (error) {
    console.error(`❌ Failed to save mock encrypted content:`, error.message);
    process.exit(1);
  }
}

// Run the mock content creation
createMockContent().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});