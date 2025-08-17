# Product Requirements Document: Credential-Based Content Access Interface

## Overview
A single-page application that enables users to authenticate with their Ethereum wallet, select verifiable credentials, and access encrypted content through credential-gated flows.

## Core Architecture

### Application Type
- Single-page application (SPA) with multiple views
- Three main pages: Login, Flow Selection, Credential Presentation + Access Flow
- Browser-based with client-side decryption and caching

### Technology Integration
- WalletConnect for wallet connectivity
- Sign-in with Ethereum (SIWE) for authentication
- ES256K JWT signing for content access
- Lit Protocol for content decryption
- Browser storage for content caching

## User Authentication Flow

### 1. Initial Connection
- User visits application
- "Connect Wallet" button triggers WalletConnect modal
- User selects wallet (MetaMask, Rainbow, etc.)
- Wallet connection established

### 2. Sign-in with Ethereum
- Application generates SIWE message
- User signs authentication message in wallet
- Signature validates user control of Ethereum address
- Authentication persists across browser session

### 3. Credential Loading
- Application loads `credentials.json` from user's stored credentials
- Credentials parsed and validated for:
  - Expiration status
  - Signature validity
  - Issuer trust status
- Credential metadata extracted for UI display

## Flow Configuration Structure

### Static Flow Definition
```json
{
  "flows": [
    {
      "id": "premium-research-access",
      "title": "Premium Research Content",
      "description": "Access to exclusive blockchain research reports and market analysis",
      "contentRef": "encrypted://content/research-bundle-2024",
      "credentialRequirements": [
        {
          "issuer": "did:web:rebasedemokey.pages.dev",
          "credentialType": "GitHubVerification",
          "claims": {
            "githubHandle": "verified-developer"
          }
        },
        {
          "issuer": "did:web:issuer.tinycloud.xyz",
          "credentialType": "PremiumSubscription",
          "claims": {
            "tier": "pro"
          }
        }
      ],
      "accessLevel": "premium",
      "estimatedUnlockTime": "30 seconds"
    }
  ]
}
```

### Flow Properties
- **ID**: Unique identifier for the flow
- **Title**: User-facing name
- **Description**: Detailed explanation of content/benefits
- **Content Reference**: Pointer to encrypted content
- **Credential Requirements**: Array of required credentials
- **Access Level**: Classification for UI presentation
- **Estimated Unlock Time**: User expectation setting

## Credential Management

### Credential Display Format
Each credential shows:
- **Issuer**: Human-readable issuer name (extracted from DID)
- **Type**: Credential type (GitHubVerification, PremiumSubscription, etc.)
- **Verification Status**: 
  - ✅ Valid (not expired, signature verified, trusted issuer)
  - ⚠️ Expiring Soon (expires within 7 days)
  - ❌ Invalid (expired, invalid signature, untrusted issuer)
  - 🚫 Not Valid for This Use (valid credential, doesn't meet flow requirements)

### Automatic Credential Matching

#### Default Behavior (Auto-select ON)
```javascript
function autoSelectCredentials(flowRequirements, userCredentials) {
  const selected = [];
  
  for (const requirement of flowRequirements) {
    // Find first valid credential that meets requirement
    const match = userCredentials.find(cred => 
      cred.issuer === requirement.issuer &&
      cred.credentialType === requirement.credentialType &&
      validateCredentialClaims(cred, requirement.claims) &&
      isCredentialValid(cred)
    );
    
    if (match) {
      selected.push(match);
      break; // Stop searching for this requirement
    }
  }
  
  return selected;
}
```

#### User Settings Override
- Settings page allows users to disable auto-selection
- When disabled, no credentials are pre-selected
- Users must manually check each required credential

### Selection Validation
- Continue button disabled until ALL requirements met
- Real-time validation as user selects/deselects credentials
- Clear indicators for missing requirements

## Content Access Process

### 1. Flow Selection Page
- Grid layout of available flows
- Each flow card shows:
  - Title and description
  - Required credential count
  - Access level indicator
  - "View Requirements" action

### 2. Credential Presentation Page
- List of user's credentials with status indicators
- Flow requirements clearly displayed
- Checkbox selection for each credential
- Auto-selection based on user settings
- Continue button state management

### 3. Access Initiation
- "Unlock Content" button triggers access flow
- User signs ES256K JWT for content access
- Progress indicators for each step:
  - ⏳ Pending signature
  - 🔄 Verifying credentials
  - 🔓 Decrypting content
  - ✅ Content unlocked

### 4. Content Display
- Decrypted text content rendered in readable format
- Content cached in browser storage
- Cache key tied to wallet address for security

## User Interface Design

### Page Structure

#### 1. Login Page
- Wallet connection interface
- Supported wallet logos
- Clear call-to-action

#### 2. Flow Selection Page
- Header with connected wallet info
- Grid of flow cards (responsive: 1-3 columns)
- Settings access in navigation
- Search/filter capabilities

#### 3. Credential Access Page
- Flow details at top
- Credential list with selection interface
- Progress section for access process
- Content display area post-unlock

### Component States

#### Loading States
- Wallet connection: "Connecting to [Wallet Name]..."
- Credential loading: "Loading your credentials..."
- Content decryption: "Decrypting content..."

#### Error States
- Connection failed: Retry connection option
- Signature rejected: "Signature required to continue" with retry
- Credential verification failed: Specific error with retry option
- Decryption failed: Technical error with support contact

#### Success States
- Wallet connected: Green indicator with address
- Content unlocked: Success message with access timestamp
- Requirements met: Clear visual confirmation

## Technical Implementation

### Browser Storage Strategy
```javascript
// Content caching structure
const contentCache = {
  [walletAddress]: {
    [flowId]: {
      content: "decrypted text content",
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }
  }
};
```

### Wallet Session Management
- Authentication persists until browser session ends
- Multiple flow access without re-authentication
- Clear cache when different wallet connects

### Progress Tracking
```javascript
const accessSteps = [
  { id: 'signature', label: 'Awaiting signature', status: 'pending' },
  { id: 'verification', label: 'Verifying credentials', status: 'pending' },
  { id: 'decryption', label: 'Decrypting content', status: 'pending' },
  { id: 'complete', label: 'Content unlocked', status: 'pending' }
];
```

## Error Handling & Recovery

### Error Categories

#### 1. Connection Errors
- Wallet connection failed
- Network connectivity issues
- **Recovery**: Retry connection with same wallet

#### 2. Authentication Errors
- SIWE signature rejected
- Invalid signature format
- **Recovery**: Re-initiate signing process

#### 3. Credential Errors
- Invalid credential format
- Expired credentials
- Untrusted issuer
- **Recovery**: Display specific error, suggest credential refresh

#### 4. Access Errors
- JWT signing rejected
- Lit Protocol decryption failed
- Content not found
- **Recovery**: Step-specific retry with detailed error context

### Retry Mechanisms
- Granular retry at each step
- Maximum 3 retry attempts per step
- Progressive timeout (2s, 5s, 10s)
- Clear feedback on retry attempts

## Security Considerations

### Content Isolation
- Cache tied to specific wallet address
- No cross-wallet content access
- Automatic cache clearing on wallet change

### Credential Privacy
- Credentials processed client-side only
- No credential data sent to servers
- Local validation before access attempts

### Session Security
- Authentication timeout after inactivity
- Secure storage of temporary tokens
- Clear session data on logout

## User Settings

### Available Settings
- **Auto-select credentials**: Enable/disable automatic credential matching
- **Cache duration**: How long to cache decrypted content (1-24 hours)
- **Default wallet**: Remember preferred wallet for auto-connection
- **Notification preferences**: Success/error notification styles

## Success Metrics

### User Experience
- Time from wallet connection to content access < 60 seconds
- Error rate < 5% for valid credential combinations
- User retention for multi-flow access > 80%

### Technical Performance
- Content decryption time < 10 seconds
- Cache hit rate > 90% for repeat access
- UI responsiveness across devices

## Future Enhancements

### Phase 2 Features
- Credential sharing between trusted users
- Bulk content access for multiple flows
- Advanced filtering and search
- Credential expiration notifications

### Phase 3 Features
- Mobile application
- Offline content access
- Credential marketplace integration
- Advanced analytics dashboard

---

## Implementation Priority

1. **Core Authentication** (Week 1)
   - WalletConnect integration
   - SIWE implementation
   - Basic credential loading

2. **Flow Management** (Week 2)
   - Static flow configuration
   - Flow selection interface
   - Basic credential matching

3. **Access Flow** (Week 3)
   - JWT signing integration
   - Content decryption
   - Progress indicators

4. **Polish & Error Handling** (Week 4)
   - Comprehensive error handling
   - UI/UX refinements
   - Performance optimization

This PRD provides a comprehensive foundation for building a credential-based content access interface that integrates seamlessly with your existing dual-factor authentication system.