import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { encryptString } from "@lit-protocol/encryption";
import { LIT_NETWORK, LIT_RPC, LIT_ABILITY } from "@lit-protocol/constants";
import {
  createSiweMessage,
  LitAccessControlConditionResource,
  LitActionResource,
  generateAuthSig,
} from "@lit-protocol/auth-helpers";
import { LitContracts } from "@lit-protocol/contracts-sdk";
import { AccessControlConditions } from "@lit-protocol/types";
import { Wallet } from "ethers";

import { litActionCode } from "./litAction";
import {
  getEnv,
  CredentialRequirements,
  loadCredentials,
  findMatchingCredential,
  validateGithubCredentialRequirements,
  ParsedCredential,
} from "./utils";
import {
  createEncryptionJWT,
  createDecryptionJWT,
  validateJWTUserAddress,
} from "./jwt";
import { litActionCode as litActionCodeEnhanced } from "./litActionEnhanced";

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

// Browser-compatible decryption function that accepts user wallet and credentials
export const decryptFromCredentialsWithJWT = async (
  encryptedData: {
    ciphertext: string;
    dataToEncryptHash: string;
    accessControlConditions: AccessControlConditions;
    accsResourceString: string;
    credentialRequirements: CredentialRequirements;
    userSignedJWT: string;
    userAddress: string;
  },
  userWallet: Wallet,
  userCredentials: ParsedCredential[] = [],
) => {
  let litNodeClient: LitNodeClient;

  try {
    // Validate that the wallet matches the encrypted data's user
    if (
      userWallet.address.toLowerCase() !==
      encryptedData.userAddress.toLowerCase()
    ) {
      throw new Error("User wallet does not match the encrypted data owner");
    }

    // Validate the stored user JWT is for the correct address
    if (
      !validateJWTUserAddress(encryptedData.userSignedJWT, userWallet.address)
    ) {
      throw new Error("Stored user JWT does not match user address");
    }

    console.log("🔑 Generating fresh decryption JWT...");
    const decryptionJWT = await createDecryptionJWT(
      userWallet,
      encryptedData.credentialRequirements,
    );
    console.log(
      `✅ Decryption JWT signed with DID: did:pkh:eip155:1:${userWallet.address}`,
    );

    // Load and find matching credential from provided credentials
    console.log("🔍 Loading credentials...");
    const credentials = loadCredentials(userCredentials);
    const matchingCredential = findMatchingCredential(
      credentials,
      encryptedData.credentialRequirements,
      userWallet.address,
    );

    if (!matchingCredential) {
      throw new Error(
        "No matching credential found for the specified requirements",
      );
    }
    console.log(
      `✅ Found matching credential for ${matchingCredential.handle}`,
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

    console.log("🔄 Getting the Session Signatures...");
    const sessionSigs = await litNodeClient.getSessionSigs({
      chain: "ethereum",
      capabilityAuthSigs: [capacityDelegationAuthSig],
      expiration: new Date(Date.now() + 1000 * 60 * 10).toISOString(), // 10 minutes
      resourceAbilityRequests: [
        {
          resource: new LitAccessControlConditionResource(
            encryptedData.accsResourceString,
          ),
          ability: LIT_ABILITY.AccessControlConditionDecryption,
        },
        {
          resource: new LitActionResource("*"),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      authNeededCallback: async ({
        uri,
        expiration,
        resourceAbilityRequests,
      }) => {
        const toSign = await createSiweMessage({
          uri,
          expiration,
          resources: resourceAbilityRequests,
          walletAddress: userWallet.address,
          nonce: await litNodeClient.getLatestBlockhash(),
          litNodeClient,
        });

        console.log(toSign);
        return await generateAuthSig({
          signer: userWallet,
          toSign,
        });
      },
    });
    console.log("✅ Generated the Session Signatures");

    console.log(
      "🔄 Executing enhanced Lit Action with dual-factor authentication...",
    );
    const litActionResult = await litNodeClient.executeJs({
      sessionSigs,
      code: litActionCodeEnhanced,
      jsParams: {
        accessControlConditions: encryptedData.accessControlConditions,
        ciphertext: encryptedData.ciphertext,
        dataToEncryptHash: encryptedData.dataToEncryptHash,
        credentialJWT: matchingCredential.jwt,
        credentialRequirements: encryptedData.credentialRequirements,
        userAddress: userWallet.address,
        userSignedJWT: decryptionJWT, // Fresh JWT for decryption
        operationPurpose: "decrypt",
      },
    });
    console.log("✅ Executed enhanced Lit Action");

    return litActionResult;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (litNodeClient) {
      litNodeClient.disconnect();
    }
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