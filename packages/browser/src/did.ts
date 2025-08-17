import { isAddress, getAddress } from "ethers";

export interface DIDPKHAddress {
  did: string;
  address: string;
  chainId: number;
}

/**
 * Creates a DID:PKH identifier from an Ethereum address
 * Format: did:pkh:eip155:1:0x{address}
 */
export function createDIDPKH(address: string, chainId: number = 1): string {
  if (!isAddress(address)) {
    throw new Error(`Invalid Ethereum address: ${address}`);
  }
  
  const checksumAddress = getAddress(address);
  return `did:pkh:eip155:${chainId}:${checksumAddress}`;
}

/**
 * Parses a DID:PKH identifier to extract address and chain information
 */
export function parseDIDPKH(did: string): DIDPKHAddress {
  const didPattern = /^did:pkh:eip155:(\d+):(0x[a-fA-F0-9]{40})$/;
  const match = did.match(didPattern);
  
  if (!match) {
    throw new Error(`Invalid DID:PKH format: ${did}`);
  }
  
  const [, chainIdStr, address] = match;
  const chainId = parseInt(chainIdStr, 10);
  
  if (!isAddress(address)) {
    throw new Error(`Invalid address in DID:PKH: ${address}`);
  }
  
  return {
    did,
    address: getAddress(address),
    chainId
  };
}

/**
 * Validates that a DID:PKH matches the expected address
 */
export function validateDIDPKHAddress(did: string, expectedAddress: string): boolean {
  try {
    const parsed = parseDIDPKH(did);
    return parsed.address.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Extracts the Ethereum address from a DID:PKH identifier
 */
export function extractAddressFromDID(did: string): string {
  const parsed = parseDIDPKH(did);
  return parsed.address;
}

/**
 * Validates DID:PKH format without throwing errors
 */
export function isValidDIDPKH(did: string): boolean {
  const didPattern = /^did:pkh:eip155:(\d+):(0x[a-fA-F0-9]{40})$/;
  const match = did.match(didPattern);
  
  if (!match) {
    return false;
  }
  
  const [, , address] = match;
  return isAddress(address);
}