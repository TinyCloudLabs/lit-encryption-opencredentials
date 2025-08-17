// Mock data for development and demonstration
import { Credential, Flow } from "../types";

// Mock credentials for demonstration
export const mockCredentials: Credential[] = [
  {
    id: "github-verification-1",
    issuer: "did:web:rebasedemokey.pages.dev",
    credentialType: "GitHubVerification",
    claims: {
      githubHandle: "verified-developer",
    },
    issuedAt: "2024-01-15T00:00:00Z",
    expiresAt: "2026-01-15T00:00:00Z",
    signature: "mock-signature-1",
    status: "valid",
  },
  {
    id: "premium-subscription-1",
    issuer: "did:web:issuer.tinycloud.xyz",
    credentialType: "PremiumSubscription",
    claims: {
      tier: "pro",
      validUntil: "2025-06-01",
      features: ["advanced-analytics", "priority-support"],
    },
    issuedAt: "2024-06-01T00:00:00Z",
    expiresAt: "2026-06-01T00:00:00Z",
    signature: "mock-signature-2",
    status: "valid",
  },
  {
    id: "identity-verification-1",
    issuer: "did:web:identity.example.com",
    credentialType: "IdentityVerification",
    claims: {
      verificationType: "KYC",
      level: "basic",
      verifiedAt: "2024-03-10",
    },
    issuedAt: "2024-03-10T00:00:00Z",
    expiresAt: "2026-03-10T00:00:00Z", // Extended expiration to make it valid
    signature: "mock-signature-3",
    status: "valid", // Changed from 'expiring' to 'valid'
  },
  {
    id: "enterprise-subscription-1",
    issuer: "did:web:issuer.tinycloud.xyz",
    credentialType: "PremiumSubscription",
    claims: {
      tier: "enterprise",
      validUntil: "2026-12-01",
      features: [
        "enterprise-analytics",
        "priority-support",
        "custom-reports",
        "dedicated-support",
      ],
    },
    issuedAt: "2024-01-01T00:00:00Z",
    expiresAt: "2026-12-01T00:00:00Z",
    signature: "mock-signature-5",
    status: "valid",
  },
  {
    id: "expiring-credential-1",
    issuer: "did:web:identity.example.com",
    credentialType: "IdentityVerification",
    claims: {
      verificationType: "KYC",
      level: "basic",
      verifiedAt: "2024-01-10",
    },
    issuedAt: "2024-01-10T00:00:00Z",
    expiresAt: "2024-08-25T00:00:00Z", // Soon to expire for demo
    signature: "mock-signature-6",
    status: "expiring",
  },
  {
    id: "expired-credential-1",
    issuer: "did:web:old-issuer.example.com",
    credentialType: "OldSubscription",
    claims: {
      tier: "basic",
    },
    issuedAt: "2023-01-01T00:00:00Z",
    expiresAt: "2024-01-01T00:00:00Z",
    signature: "mock-signature-4",
    status: "invalid",
  },
];

// Mock flows configuration
export const mockFlows: Flow[] = [
  {
    id: "premium-research-access",
    title: "Premium Research Content",
    description:
      "Access to exclusive blockchain research reports and market analysis including weekly market insights, technical analysis, and investment recommendations.",
    contentRef: "encrypted://content/research-bundle-2024",
    credentialRequirements: [
      {
        issuer: "did:web:rebasedemokey.pages.dev",
        credentialType: "GitHubVerification",
        claims: {
          githubHandle: "verified-developer",
        },
      },
      {
        issuer: "did:web:issuer.tinycloud.xyz",
        credentialType: "PremiumSubscription",
        claims: {
          tier: "pro",
        },
      },
    ],
    accessLevel: "premium",
    estimatedUnlockTime: "30 seconds",
  },
  {
    id: "developer-resources",
    title: "Developer Resources",
    description:
      "Technical documentation, code samples, and developer tools for building on our platform.",
    contentRef: "encrypted://content/dev-resources-2024",
    credentialRequirements: [
      {
        issuer: "did:web:rebasedemokey.pages.dev",
        credentialType: "GitHubVerification",
        claims: {
          githubHandle: "verified-developer",
        },
      },
    ],
    accessLevel: "basic",
    estimatedUnlockTime: "15 seconds",
  },
  {
    id: "kyc-required-content",
    title: "Verified User Content",
    description:
      "Content that requires identity verification for compliance purposes.",
    contentRef: "encrypted://content/kyc-content-2024",
    credentialRequirements: [
      {
        issuer: "did:web:identity.example.com",
        credentialType: "IdentityVerification",
        claims: {
          verificationType: "KYC",
        },
      },
    ],
    accessLevel: "basic",
    estimatedUnlockTime: "20 seconds",
  },
  {
    id: "enterprise-analytics",
    title: "Enterprise Analytics Dashboard",
    description:
      "Advanced analytics and reporting tools for enterprise customers with real-time data feeds and custom reporting capabilities.",
    contentRef: "encrypted://content/enterprise-analytics-2024",
    credentialRequirements: [
      {
        issuer: "did:web:issuer.tinycloud.xyz",
        credentialType: "PremiumSubscription",
        claims: {
          tier: "enterprise",
        },
      },
      {
        issuer: "did:web:identity.example.com",
        credentialType: "IdentityVerification",
        claims: {
          verificationType: "KYC",
        },
      },
    ],
    accessLevel: "enterprise",
    estimatedUnlockTime: "45 seconds",
  },
];

// Mock decrypted content for demonstration
export const mockDecryptedContent: Record<string, string> = {
  "premium-research-access": `# Premium Research Report - Q4 2024

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

  "developer-resources": `# Developer Documentation

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
Here are some common integration patterns...`,

  "kyc-required-content": `# Verified User Content

This content is only available to users who have completed identity verification.

## Important Notice
This content may contain sensitive information that requires compliance with regulatory requirements.

## Content Guidelines
- All users must maintain valid KYC status
- Content access is logged for audit purposes
- Distribution of this content is restricted`,

  "enterprise-analytics": `# Enterprise Analytics Dashboard

## Overview
Advanced analytics platform with real-time data processing and custom reporting capabilities.

## Features
- Real-time data streams
- Custom dashboard creation
- Advanced filtering and segmentation
- API access for data export

## Getting Started
Your enterprise dashboard provides access to...`,
};