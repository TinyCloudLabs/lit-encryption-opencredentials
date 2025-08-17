import { Wallet, keccak256, toUtf8Bytes, getBytes, isAddress, recoverAddress } from "ethers";
import { createDIDPKH, validateDIDPKHAddress } from "./did";
import { CredentialRequirements } from "./utils";

export interface ES256KJWTHeader {
  alg: "ES256K";
  typ: "JWT";
  kid: string;
}

export interface ES256KJWTPayload {
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;
  nonce: string;
  purpose: "encrypt" | "decrypt";
  resource: string;
  credential_requirements?: CredentialRequirements;
}

/**
 * Base64URL encode (without padding)
 */
function base64urlEncode(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64urlDecode(data: string): Uint8Array {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a cryptographically secure random nonce
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64urlEncode(bytes);
}

/**
 * Sign a JWT using ES256K (ECDSA with secp256k1)
 */
export async function signES256KJWT(
  wallet: Wallet,
  payload: Omit<ES256KJWTPayload, 'iss' | 'sub' | 'iat' | 'nonce'>,
  expirationMinutes: number = 5
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const userDID = createDIDPKH(wallet.address);
  
  // Create header
  const header: ES256KJWTHeader = {
    alg: "ES256K",
    typ: "JWT",
    kid: `${userDID}#controller`
  };
  
  // Create complete payload
  const completePayload: ES256KJWTPayload = {
    ...payload,
    iss: userDID,
    sub: userDID,
    iat: now,
    exp: now + (expirationMinutes * 60),
    nonce: generateNonce()
  };
  
  // Encode header and payload
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(completePayload));
  
  // Create signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const messageHash = keccak256(toUtf8Bytes(signingInput));
  
  // Sign with wallet using raw message hash (for ES256K we want direct signature)
  const signature = wallet.signingKey.sign(messageHash);
  
  // Create 64-byte signature (32 bytes r + 32 bytes s)
  const rBytes = getBytes(signature.r);
  const sBytes = getBytes(signature.s);
  const rawSignature = new Uint8Array(64);
  rawSignature.set(rBytes, 0);
  rawSignature.set(sBytes, 32);
  
  const encodedSignature = base64urlEncode(rawSignature);
  
  return `${signingInput}.${encodedSignature}`;
}

/**
 * Verify an ES256K JWT signature
 */
export async function verifyES256KJWT(jwt: string): Promise<{
  header: ES256KJWTHeader;
  payload: ES256KJWTPayload;
  valid: boolean;
}> {
  const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');
  
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error('Invalid JWT format');
  }
  
  // Decode components
  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedHeader))) as ES256KJWTHeader;
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedPayload))) as ES256KJWTPayload;
  
  // Verify algorithm
  if (header.alg !== 'ES256K') {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }
  
  // Verify DID format and consistency
  if (!payload.iss.startsWith('did:pkh:eip155:') || payload.iss !== payload.sub) {
    throw new Error('Invalid DID format in JWT');
  }
  
  // Extract address from DID
  const signerAddress = payload.iss.split(':').pop();
  if (!signerAddress || !isAddress(signerAddress)) {
    throw new Error('Invalid address in JWT DID');
  }
  
  // Verify expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { header, payload, valid: false };
  }
  
  // Recreate signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const messageHash = keccak256(toUtf8Bytes(signingInput));
  
  // Decode signature
  const rawSignature = base64urlDecode(encodedSignature);
  if (rawSignature.length !== 64) {
    throw new Error('Invalid signature length');
  }
  
  // Extract r and s values
  const r = '0x' + Array.from(rawSignature.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
  const s = '0x' + Array.from(rawSignature.slice(32, 64)).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Try both recovery IDs (0 and 1, then convert to 27 and 28)
  let recoveredAddress: string | null = null;
  
  for (const recoveryParam of [0, 1]) {
    try {
      const v = recoveryParam + 27;
      const signature = { r, s, v };
      const recovered = recoverAddress(messageHash, signature);
      if (recovered.toLowerCase() === signerAddress.toLowerCase()) {
        recoveredAddress = recovered;
        break;
      }
    } catch {
      // Continue to next recovery ID
    }
  }
  
  const valid = recoveredAddress !== null;
  
  return { header, payload, valid };
}

/**
 * Create a JWT for encryption operations
 */
export async function createEncryptionJWT(
  wallet: Wallet,
  credentialRequirements: CredentialRequirements
): Promise<string> {
  return signES256KJWT(wallet, {
    aud: "lit-protocol-encryption",
    purpose: "encrypt",
    resource: "credential-gated-secret",
    credential_requirements: credentialRequirements
  });
}

/**
 * Create a JWT for decryption operations
 */
export async function createDecryptionJWT(
  wallet: Wallet,
  credentialRequirements: CredentialRequirements
): Promise<string> {
  return signES256KJWT(wallet, {
    aud: "lit-protocol-encryption",
    purpose: "decrypt",
    resource: "credential-gated-secret",
    credential_requirements: credentialRequirements
  });
}

/**
 * Parse a JWT without verification (for inspection)
 */
export function parseJWT(jwt: string): {
  header: ES256KJWTHeader;
  payload: ES256KJWTPayload;
} {
  const [encodedHeader, encodedPayload] = jwt.split('.');
  
  if (!encodedHeader || !encodedPayload) {
    throw new Error('Invalid JWT format');
  }
  
  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedHeader))) as ES256KJWTHeader;
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedPayload))) as ES256KJWTPayload;
  
  return { header, payload };
}

/**
 * Validate JWT matches expected user address
 */
export function validateJWTUserAddress(jwt: string, expectedAddress: string): boolean {
  try {
    const { payload } = parseJWT(jwt);
    return validateDIDPKHAddress(payload.iss, expectedAddress);
  } catch {
    return false;
  }
}