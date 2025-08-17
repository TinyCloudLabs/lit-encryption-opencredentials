// @ts-nocheck

const _litActionCode = async () => {
  try {
    // Helper function to decode base64url
    function base64UrlDecode(str) {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    // Helper function to resolve DID:web to DID document
    async function resolveDIDWeb(did) {
      const domain = did.replace('did:web:', '');
      const url = `https://${domain}/.well-known/did.json`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch DID document: ${response.status}`);
      }
      return await response.json();
    }

    // Helper function to extract public key from DID document
    function extractPublicKey(didDocument, keyId) {
      const verificationMethods = didDocument.verificationMethod || [];
      
      for (const method of verificationMethods) {
        if (method.id === keyId || method.id.endsWith('#controller')) {
          if (method.type === 'Ed25519VerificationKey2018' && method.publicKeyJwk) {
            return method.publicKeyJwk;
          }
        }
      }
      
      throw new Error(`Key ${keyId} not found in DID document`);
    }

    // Main JWT verification function
    async function verifyJWTWithEdDSA(jwt, issuerDID) {
      // 1. Parse JWT
      const [headerB64, payloadB64, signatureB64] = jwt.split('.');
      
      // 2. Decode header and payload
      const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
      
      // 3. Verify algorithm
      if (header.alg !== 'EdDSA') {
        throw new Error('Unsupported algorithm');
      }
      
      // 4. Resolve DID document
      const didDocument = await resolveDIDWeb(issuerDID);
      
      // 5. Extract public key
      const keyId = header.kid || `${issuerDID}#controller`;
      const publicKeyJwk = extractPublicKey(didDocument, keyId);
      
      // 6. Import public key for verification
      const publicKey = await crypto.subtle.importKey(
        'jwk',
        publicKeyJwk,
        {
          name: 'Ed25519',
          namedCurve: 'Ed25519',
        },
        false,
        ['verify']
      );
      
      // 7. Prepare data to verify (header.payload)
      const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
      
      // 8. Decode signature from base64url
      const signature = base64UrlDecode(signatureB64);
      
      // 9. Verify signature
      const isValid = await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signature,
        dataToVerify
      );
      
      if (!isValid) {
        throw new Error('Invalid JWT signature');
      }
      
      // 10. Verify claims
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new Error('JWT expired');
      }
      if (payload.nbf && payload.nbf > now) {
        throw new Error('JWT not yet valid');
      }
      
      return {
        valid: true,
        payload,
        header,
        issuer: payload.iss
      };
    }

    // Function to validate credential claims against requirements
    function validateCredentialClaims(jwtPayload, requirements, userAddress) {
      const vc = jwtPayload.vc;
      if (!vc) {
        throw new Error('No verifiable credential found in JWT');
      }

      // Check credential type
      const credentialTypes = vc.type || [];
      if (!credentialTypes.includes(requirements.credentialType)) {
        throw new Error(`Required credential type ${requirements.credentialType} not found`);
      }

      // Check issuer matches requirements
      if (jwtPayload.iss !== requirements.issuer) {
        throw new Error('Credential issuer does not match requirements');
      }

      // Check subject matches user address
      const credentialSubject = vc.credentialSubject;
      if (!credentialSubject || !credentialSubject.id) {
        throw new Error('No credential subject found');
      }

      // Extract address from DID (did:pkh:eip155:1:0x...)
      const subjectAddress = credentialSubject.id.split(':').pop();
      if (subjectAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('Credential subject does not match user address');
      }

      // Check GitHub handle if specified
      if (requirements.claims && requirements.claims.githubHandle) {
        const requiredHandles = Array.isArray(requirements.claims.githubHandle) 
          ? requirements.claims.githubHandle 
          : [requirements.claims.githubHandle];
        
        const evidence = vc.evidence;
        const handle = evidence && evidence.handle;
        
        if (!handle || !requiredHandles.includes(handle)) {
          throw new Error(`GitHub handle requirement not met. Required: ${requirements.claims.githubHandle}, Found: ${handle}`);
        }
      }

      // Check minimum issuance age if specified
      if (requirements.claims && requirements.claims.minIssuanceAge) {
        const issuanceTime = new Date(vc.issuanceDate).getTime();
        const minTime = Date.now() - (requirements.claims.minIssuanceAge * 1000);
        if (issuanceTime < minTime) {
          throw new Error('Credential is too old');
        }
      }

      return true;
    }

    // Main execution logic
    console.log("Starting credential verification...");

    // 1. Verify JWT signature and get payload
    const verificationResult = await verifyJWTWithEdDSA(credentialJWT, credentialRequirements.issuer);
    console.log("JWT signature verified successfully");

    // 2. Validate credential claims against requirements
    validateCredentialClaims(verificationResult.payload, credentialRequirements, userAddress);
    console.log("Credential claims validated successfully");

    // 3. If verification passes, decrypt the secret
    const secret = await Lit.Actions.decryptAndCombine({
      accessControlConditions,
      ciphertext,
      dataToEncryptHash,
      chain: "ethereum",
    });

    console.log("Secret decrypted successfully");

    // 4. Return the decrypted secret along with verification details
    Lit.Actions.setResponse({ 
      response: {
        success: true,
        secret: secret,
        verifiedCredential: {
          issuer: verificationResult.payload.iss,
          subject: verificationResult.payload.sub,
          githubHandle: verificationResult.payload.vc.evidence?.handle,
          issuanceDate: verificationResult.payload.vc.issuanceDate
        }
      }
    });

  } catch (e) {
    console.error("Credential verification failed:", e.message);
    Lit.Actions.setResponse({ 
      response: {
        success: false,
        error: e.message
      }
    });
  }
};

// Use original working approach - function.toString()
export const litActionCode = `(${_litActionCode.toString()})();`;