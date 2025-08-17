import { Flow } from '../types';

// Basic flows configuration for the app
export const flows: Flow[] = [
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
];