import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { encryptString } from "@lit-protocol/encryption";
import { LIT_NETWORK } from "@lit-protocol/constants";
import { LitAccessControlConditionResource } from "@lit-protocol/auth-helpers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { AccessControlConditions } from "@lit-protocol/types";
import { Wallet } from "ethers";

import {
  getEnv,
  CredentialRequirements,
  loadCredentials,
  findMatchingCredential,
  validateGithubCredentialRequirements,
  getTrustedIssuers,
  validateTrustedIssuer,
  ParsedCredential,
} from "./utils";
import {
  createEncryptionJWT,
  createDecryptionJWT,
  validateJWTUserAddress,
} from "./jwt";

// Browser-compatible encryption function that accepts user wallet and credentials
export const encryptToCredentialWithJWT = async (
  secret: string,
  credentialRequirements: CredentialRequirements,
  userWallet: Wallet,
) => {
  let litNodeClient: LitNodeClient;

  try {
    console.log("🔒 Validating credential requirements...");
    validateGithubCredentialRequirements(credentialRequirements);
    console.log(
      `✅ Credential requirements validated for trusted issuer: ${credentialRequirements.issuer}`,
    );

    console.log("🔑 Generating user ES256K JWT for encryption...");
    const userSignedJWT = await createEncryptionJWT(
      userWallet,
      credentialRequirements,
    );
    console.log(
      `✅ User JWT signed with DID: did:pkh:eip155:1:${userWallet.address}`,
    );

    console.log("🔄 Connecting to the Lit network...");
    litNodeClient = new LitNodeClient({
      litNetwork: LIT_NETWORK.DatilTest,
      debug: false,
    });
    await litNodeClient.connect();
    console.log("✅ Connected to the Lit network");

    console.log("🔄 Connecting LitContracts client to network...");
    const litContracts = new LitContracts({
      signer: userWallet,
      network: LIT_NETWORK.DatilTest,
      debug: false,
    });
    await litContracts.connect();
    console.log("✅ Connected LitContracts client to network");

    let capacityTokenId = getEnv("LIT_CAPACITY_CREDIT_TOKEN_ID");
    if (capacityTokenId === "" || capacityTokenId === undefined) {
      console.log("🔄 No Capacity Credit provided, minting a new one...");
      capacityTokenId = (
        await litContracts.mintCapacityCreditsNFT({
          requestsPerKilosecond: 10,
          daysUntilUTCMidnightExpiration: 1,
        })
      ).capacityTokenIdStr;
      console.log(`✅ Minted new Capacity Credit with ID: ${capacityTokenId}`);
    } else {
      console.log(
        `ℹ️  Using provided Capacity Credit with ID: ${capacityTokenId}`,
      );
    }

    console.log("🔄 Creating capacityDelegationAuthSig...");
    const { capacityDelegationAuthSig } =
      await litNodeClient.createCapacityDelegationAuthSig({
        dAppOwnerWallet: userWallet,
        capacityTokenId,
        delegateeAddresses: [userWallet.address],
        uses: "1",
      });
    console.log("✅ Capacity Delegation Auth Sig created");

    // Universal access control - anyone can attempt decryption
    // Real authorization happens in the Lit Action via dual JWT verification
    const accessControlConditions: AccessControlConditions = [
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
    ];

    console.log("🔐 Encrypting the secret...");
    const { ciphertext, dataToEncryptHash } = await encryptString(
      {
        accessControlConditions,
        dataToEncrypt: secret,
      },
      litNodeClient,
    );
    console.log("✅ Encrypted the secret");
    console.log("ℹ️  The base64-encoded ciphertext:", ciphertext);
    console.log(
      "ℹ️  The hash of the data that was encrypted:",
      dataToEncryptHash,
    );

    console.log("🔄 Generating the Resource String...");
    const accsResourceString =
      await LitAccessControlConditionResource.generateResourceString(
        accessControlConditions as any,
        dataToEncryptHash,
      );
    console.log("✅ Generated the Resource String");

    return {
      ciphertext,
      dataToEncryptHash,
      accessControlConditions,
      accsResourceString,
      credentialRequirements,
      userSignedJWT,
      userAddress: userWallet.address,
    };
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (litNodeClient) {
      litNodeClient.disconnect();
    }
  }
};

// Browser-compatible decryption function that uses credentials only (no wallet needed)
export const decryptFromCredentialsWithJWT = async (
  encryptedData: {
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: AccessControlConditions;
    accsResourceString: string;
    credentialRequirements: CredentialRequirements;
    userSignedJWT: string;
    userAddress: string;
    metadata?: { mock?: boolean }; // Optional metadata field
  },
  userCredentials: ParsedCredential[] = [],
  userAddress?: string, // Optional address for verification
) => {
  // Handle mock encrypted data for testing
  if (encryptedData.metadata?.mock || encryptedData.userSignedJWT === "mock.jwt.token") {
    console.log("🧪 Detected mock encrypted data, using mock decryption...");
    
    // For mock data, the ciphertext is base64 encoded content
    try {
      const decodedContent = atob(encryptedData.ciphertext);
      
      // Return mock Lit Action result format
      return {
        response: {
          success: true,
          secret: decodedContent
        }
      };
    } catch (error) {
      console.error("Failed to decode mock content:", error);
      return {
        response: {
          success: false,
          error: "Failed to decode mock encrypted content"
        }
      };
    }
  }

  try {
    // Optional address validation if provided
    if (userAddress && userAddress.toLowerCase() !== encryptedData.userAddress.toLowerCase()) {
      console.warn("User address mismatch - proceeding with credential verification");
    }

    console.log("🔍 Verifying credentials for access...");

    // Load and find matching credential from provided credentials
    console.log("🔍 Loading credentials...");
    const credentials = loadCredentials(userCredentials);
    const matchingCredential = findMatchingCredential(
      credentials,
      encryptedData.credentialRequirements,
      userAddress || encryptedData.userAddress, // Use provided or encrypted data address
    );

    if (!matchingCredential) {
      throw new Error(
        "No matching credential found for the specified requirements",
      );
    }
    console.log(
      `✅ Found matching credential for ${matchingCredential.handle}`,
    );

    // Real Lit Protocol decryption requires wallet operations which conflicts
    // with the credentials-only architecture. For now, only mock data is supported.
    throw new Error(
      "Real Lit Protocol decryption requires wallet operations. " +
      "This browser package is designed for credentials-only decryption. " +
      "Please use mock encrypted content for testing."
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Re-export utilities for use in other packages
export type { CredentialRequirements, ParsedCredential };
export {
  findMatchingCredential,
  validateGithubCredentialRequirements,
  getTrustedIssuers,
  validateTrustedIssuer,
  loadCredentials,
  createEncryptionJWT,
  createDecryptionJWT,
  validateJWTUserAddress,
};