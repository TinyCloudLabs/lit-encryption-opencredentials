// @ts-nocheck

const _litActionCodeWithES256K = async () => {
  try {
    // ES256K JWT verification functions for Lit Action environment
    
    function base64urlDecode(data) {
      const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
      const binary = atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }
    
    function keccak256(data) {
      return ethers.utils.keccak256(data);
    }
    
    function recoverAddress(messageHash, signature) {
      return ethers.utils.recoverAddress(messageHash, signature);
    }
    
    async function verifyES256KJWT(jwt, expectedAddress) {
      const [encodedHeader, encodedPayload, encodedSignature] = jwt.split('.');
      
      if (!encodedHeader || !encodedPayload || !encodedSignature) {
        throw new Error('Invalid JWT format');
      }
      
      // Decode components
      const headerBytes = base64urlDecode(encodedHeader);
      const payloadBytes = base64urlDecode(encodedPayload);
      
      const header = JSON.parse(new TextDecoder().decode(headerBytes));
      const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
      
      // Verify algorithm
      if (header.alg !== 'ES256K') {
        throw new Error(`Unsupported algorithm: ${header.alg}`);
      }
      
      // Verify DID format
      if (!payload.iss.startsWith('did:pkh:eip155:') || payload.iss !== payload.sub) {
        throw new Error('Invalid DID format in JWT');
      }
      
      // Extract and verify address
      const signerAddress = payload.iss.split(':').pop();
      if (signerAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
        throw new Error('JWT signer does not match expected address');
      }
      
      // Verify expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        throw new Error('JWT expired');
      }
      
      // Verify signature
      const signingInput = `${encodedHeader}.${encodedPayload}`;
      const messageHash = keccak256(ethers.utils.toUtf8Bytes(signingInput));
      
      const rawSignature = base64urlDecode(encodedSignature);
      if (rawSignature.length !== 64) {
        throw new Error('Invalid signature length');
      }
      
      // Extract r and s values
      const rHex = Array.from(rawSignature.slice(0, 32)).map(b => b.toString(16).padStart(2, '0')).join('');
      const sHex = Array.from(rawSignature.slice(32, 64)).map(b => b.toString(16).padStart(2, '0')).join('');
      const r = '0x' + rHex;
      const s = '0x' + sHex;
      
      // Try recovery IDs
      let validSignature = false;
      for (const v of [27, 28]) {
        try {
          const signature = { r, s, v };
          const recovered = recoverAddress(messageHash, signature);
          if (recovered.toLowerCase() === expectedAddress.toLowerCase()) {
            validSignature = true;
            break;
          }
        } catch {
          continue;
        }
      }
      
      if (!validSignature) {
        throw new Error('Invalid JWT signature');
      }
      
      return { header, payload, valid: true };
    }
    
    // Helper function to decode base64url for EdDSA
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

    // Main JWT verification function for GitHub credentials (EdDSA)
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

    // Main execution logic - Enhanced with dual JWT verification
    console.log("Starting enhanced dual-factor credential verification...");

    // 1. Verify ES256K JWT signature (User's Ethereum key proof)
    console.log("Verifying ES256K JWT signature...");
    const es256kResult = await verifyES256KJWT(userSignedJWT, userAddress);
    
    // 2. Verify JWT purpose matches operation
    if (es256kResult.payload.purpose !== operationPurpose) {
      throw new Error(`JWT purpose mismatch. Expected: ${operationPurpose}, Got: ${es256kResult.payload.purpose}`);
    }
    
    // 3. Verify credential requirements match between user JWT and operation
    const jwtCredReqs = es256kResult.payload.credential_requirements;
    if (JSON.stringify(jwtCredReqs) !== JSON.stringify(credentialRequirements)) {
      throw new Error('JWT credential requirements do not match operation requirements');
    }
    
    // 4. Verify JWT audience is correct
    if (es256kResult.payload.aud !== "lit-protocol-encryption") {
      throw new Error(`Invalid JWT audience: ${es256kResult.payload.aud}`);
    }
    
    console.log("✅ ES256K JWT verified successfully - User proved control of Ethereum address");

    // 5. Verify GitHub credential JWT signature and get payload (EdDSA)
    console.log("Verifying GitHub credential JWT signature...");
    const verificationResult = await verifyJWTWithEdDSA(credentialJWT, credentialRequirements.issuer);
    console.log("✅ GitHub credential JWT signature verified successfully");

    // 6. Validate credential claims against requirements
    validateCredentialClaims(verificationResult.payload, credentialRequirements, userAddress);
    console.log("✅ Credential claims validated successfully");

    // 7. If all verification passes, decrypt the secret
    console.log("All verifications passed - proceeding with decryption...");
    const secret = await Lit.Actions.decryptAndCombine({
      accessControlConditions,
      ciphertext,
      dataToEncryptHash,
      chain: "ethereum",
    });

    console.log("✅ Secret decrypted successfully with dual-factor authentication");

    // 8. Return the decrypted secret along with verification details
    Lit.Actions.setResponse({ 
      response: {
        success: true,
        secret: secret,
        verifiedCredential: {
          issuer: verificationResult.payload.iss,
          subject: verificationResult.payload.sub,
          githubHandle: verificationResult.payload.vc.evidence?.handle,
          issuanceDate: verificationResult.payload.vc.issuanceDate
        },
        verifiedUserJWT: {
          userDID: es256kResult.payload.iss,
          purpose: es256kResult.payload.purpose,
          issuedAt: new Date(es256kResult.payload.iat * 1000).toISOString(),
          expiresAt: new Date(es256kResult.payload.exp * 1000).toISOString(),
          nonce: es256kResult.payload.nonce
        },
        authenticationFactors: [
          "GitHub credential from trusted issuer",
          "Ethereum key ownership proof"
        ]
      }
    });

  } catch (e) {
    console.error("Enhanced dual-factor credential verification failed:", e.message);
    Lit.Actions.setResponse({ 
      response: {
        success: false,
        error: e.message,
        errorType: e.message.includes('ES256K') ? 'user_jwt_verification' : 
                  e.message.includes('GitHub') ? 'github_credential_verification' :
                  e.message.includes('decrypt') ? 'decryption_error' : 'general_error'
      }
    });
  }
};

// Use original working approach - function.toString()
export const litActionCodeWithES256K = `(${_litActionCodeWithES256K.toString()})();`;