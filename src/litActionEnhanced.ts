// @ts-nocheck

const _litActionCode = async () => {
  try {
    // ES256K JWT verification functions for Lit Action environment

    function base64urlDecode(data) {
      var base64 = data.replace(/-/g, "+").replace(/_/g, "/");
      var padded = base64 + "====".substring(0, (4 - (base64.length % 4)) % 4);
      var binary = atob(padded);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
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

    function verifyES256KJWT(jwt, expectedAddress) {
      return new Promise(function (resolve, reject) {
        try {
          var parts = jwt.split(".");
          var encodedHeader = parts[0];
          var encodedPayload = parts[1];
          var encodedSignature = parts[2];

          if (!encodedHeader || !encodedPayload || !encodedSignature) {
            throw new Error("Invalid JWT format");
          }

          // Decode components
          var headerBytes = base64urlDecode(encodedHeader);
          var payloadBytes = base64urlDecode(encodedPayload);

          var header = JSON.parse(new TextDecoder().decode(headerBytes));
          var payload = JSON.parse(new TextDecoder().decode(payloadBytes));

          // Verify algorithm
          if (header.alg !== "ES256K") {
            throw new Error("Unsupported algorithm: " + header.alg);
          }

          // Verify DID format
          if (
            !payload.iss.startsWith("did:pkh:eip155:") ||
            payload.iss !== payload.sub
          ) {
            throw new Error("Invalid DID format in JWT");
          }

          // Extract and verify address
          var signerAddress = payload.iss.split(":").pop();
          if (signerAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
            throw new Error("JWT signer does not match expected address");
          }

          // Verify expiration
          var now = Math.floor(Date.now() / 1000);
          if (payload.exp < now) {
            throw new Error("JWT expired");
          }

          // Verify signature
          var signingInput = encodedHeader + "." + encodedPayload;
          var messageHash = keccak256(ethers.utils.toUtf8Bytes(signingInput));

          var rawSignature = base64urlDecode(encodedSignature);
          if (rawSignature.length !== 64) {
            throw new Error("Invalid signature length");
          }

          // Extract r and s values
          var rHex = "";
          var sHex = "";
          for (var i = 0; i < 32; i++) {
            rHex += rawSignature[i].toString(16).padStart(2, "0");
          }
          for (var i = 32; i < 64; i++) {
            sHex += rawSignature[i].toString(16).padStart(2, "0");
          }
          var r = "0x" + rHex;
          var s = "0x" + sHex;

          // Try recovery IDs
          var validSignature = false;
          var recoveryIds = [27, 28];
          for (var j = 0; j < recoveryIds.length; j++) {
            try {
              var v = recoveryIds[j];
              var signature = { r: r, s: s, v: v };
              var recovered = recoverAddress(messageHash, signature);
              if (recovered.toLowerCase() === expectedAddress.toLowerCase()) {
                validSignature = true;
                break;
              }
            } catch (err) {
              continue;
            }
          }

          if (!validSignature) {
            throw new Error("Invalid JWT signature");
          }

          resolve({ header: header, payload: payload, valid: true });
        } catch (error) {
          reject(error);
        }
      });
    }

    // Helper function to decode base64url for EdDSA
    function base64UrlDecode(str) {
      var base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      var padded = base64 + "====".substring(0, (4 - (base64.length % 4)) % 4);
      var binary = atob(padded);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    // Helper function to resolve DID:web to DID document
    function resolveDIDWeb(did) {
      return new Promise(function (resolve, reject) {
        var domain = did.replace("did:web:", "");
        var url = "https://" + domain + "/.well-known/did.json";

        fetch(url)
          .then(function (response) {
            if (!response.ok) {
              throw new Error(
                "Failed to fetch DID document: " + response.status,
              );
            }
            return response.json();
          })
          .then(resolve)
          .catch(reject);
      });
    }

    // Helper function to extract public key from DID document
    function extractPublicKey(didDocument, keyId) {
      var verificationMethods = didDocument.verificationMethod || [];

      for (var i = 0; i < verificationMethods.length; i++) {
        var method = verificationMethods[i];
        if (method.id === keyId || method.id.indexOf("#controller") !== -1) {
          if (
            method.type === "Ed25519VerificationKey2018" &&
            method.publicKeyJwk
          ) {
            return method.publicKeyJwk;
          }
        }
      }

      throw new Error("Key " + keyId + " not found in DID document");
    }

    // Main JWT verification function for GitHub credentials (EdDSA)
    function verifyJWTWithEdDSA(jwt, issuerDID) {
      return new Promise(function (resolve, reject) {
        try {
          // 1. Parse JWT
          var parts = jwt.split(".");
          var headerB64 = parts[0];
          var payloadB64 = parts[1];
          var signatureB64 = parts[2];

          // 2. Decode header and payload
          var header = JSON.parse(
            atob(headerB64.replace(/-/g, "+").replace(/_/g, "/")),
          );
          var payload = JSON.parse(
            atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/")),
          );

          // 3. Verify algorithm
          if (header.alg !== "EdDSA") {
            throw new Error("Unsupported algorithm");
          }

          // 4. Resolve DID document
          resolveDIDWeb(issuerDID)
            .then(function (didDocument) {
              // 5. Extract public key
              var keyId = header.kid || issuerDID + "#controller";
              var publicKeyJwk = extractPublicKey(didDocument, keyId);

              // 6. Import public key for verification
              return crypto.subtle.importKey(
                "jwk",
                publicKeyJwk,
                {
                  name: "Ed25519",
                  namedCurve: "Ed25519",
                },
                false,
                ["verify"],
              );
            })
            .then(function (publicKey) {
              // 7. Prepare data to verify (header.payload)
              var dataToVerify = new TextEncoder().encode(
                headerB64 + "." + payloadB64,
              );

              // 8. Decode signature from base64url
              var signature = base64UrlDecode(signatureB64);

              // 9. Verify signature
              return crypto.subtle.verify(
                "Ed25519",
                publicKey,
                signature,
                dataToVerify,
              );
            })
            .then(function (isValid) {
              if (!isValid) {
                throw new Error("Invalid JWT signature");
              }

              // 10. Verify claims
              var now = Math.floor(Date.now() / 1000);
              if (payload.exp && payload.exp < now) {
                throw new Error("JWT expired");
              }
              if (payload.nbf && payload.nbf > now) {
                throw new Error("JWT not yet valid");
              }

              resolve({
                valid: true,
                payload: payload,
                header: header,
                issuer: payload.iss,
              });
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    }

    // Function to validate credential claims against requirements
    function validateCredentialClaims(jwtPayload, requirements, userAddress) {
      var vc = jwtPayload.vc;
      if (!vc) {
        throw new Error("No verifiable credential found in JWT");
      }

      // Check credential type
      var credentialTypes = vc.type || [];
      var hasRequiredType = false;
      for (var i = 0; i < credentialTypes.length; i++) {
        if (credentialTypes[i] === requirements.credentialType) {
          hasRequiredType = true;
          break;
        }
      }
      if (!hasRequiredType) {
        throw new Error(
          "Required credential type " +
            requirements.credentialType +
            " not found",
        );
      }

      // Check issuer matches requirements
      if (jwtPayload.iss !== requirements.issuer) {
        throw new Error("Credential issuer does not match requirements");
      }

      // Check subject matches user address
      var credentialSubject = vc.credentialSubject;
      if (!credentialSubject || !credentialSubject.id) {
        throw new Error("No credential subject found");
      }

      // Extract address from DID (did:pkh:eip155:1:0x...)
      var subjectAddress = credentialSubject.id.split(":").pop();
      if (subjectAddress.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error("Credential subject does not match user address");
      }

      // Check GitHub handle if specified
      if (requirements.claims && requirements.claims.githubHandle) {
        var requiredHandles = Array.isArray(requirements.claims.githubHandle)
          ? requirements.claims.githubHandle
          : [requirements.claims.githubHandle];

        var evidence = vc.evidence;
        var handle = evidence && evidence.handle;

        var handleMatches = false;
        if (handle) {
          for (var i = 0; i < requiredHandles.length; i++) {
            if (requiredHandles[i] === handle) {
              handleMatches = true;
              break;
            }
          }
        }

        if (!handleMatches) {
          throw new Error(
            "GitHub handle requirement not met. Required: " +
              requirements.claims.githubHandle +
              ", Found: " +
              handle,
          );
        }
      }

      // Check minimum issuance age if specified
      if (requirements.claims && requirements.claims.minIssuanceAge) {
        var issuanceTime = new Date(vc.issuanceDate).getTime();
        var minTime = Date.now() - requirements.claims.minIssuanceAge * 1000;
        if (issuanceTime < minTime) {
          throw new Error("Credential is too old");
        }
      }

      return true;
    }

    // Main execution logic - Enhanced with dual JWT verification
    console.log("Starting enhanced dual-factor credential verification...");

    // 1. Verify ES256K JWT signature (User's Ethereum key proof)
    console.log("Verifying ES256K JWT signature...");
    var es256kResult = await verifyES256KJWT(userSignedJWT, userAddress);

    // 2. Verify JWT purpose matches operation
    if (es256kResult.payload.purpose !== operationPurpose) {
      throw new Error(
        "JWT purpose mismatch. Expected: " +
          operationPurpose +
          ", Got: " +
          es256kResult.payload.purpose,
      );
    }

    // 3. Verify credential requirements match between user JWT and operation
    var jwtCredReqs = es256kResult.payload.credential_requirements;
    if (
      JSON.stringify(jwtCredReqs) !== JSON.stringify(credentialRequirements)
    ) {
      throw new Error(
        "JWT credential requirements do not match operation requirements",
      );
    }

    // 4. Verify JWT audience is correct
    if (es256kResult.payload.aud !== "lit-protocol-encryption") {
      throw new Error("Invalid JWT audience: " + es256kResult.payload.aud);
    }

    console.log(
      "✅ ES256K JWT verified successfully - User proved control of Ethereum address",
    );

    // 5. Verify GitHub credential JWT signature and get payload (EdDSA)
    console.log("Verifying GitHub credential JWT signature...");
    var verificationResult = await verifyJWTWithEdDSA(
      credentialJWT,
      credentialRequirements.issuer,
    );
    console.log("✅ GitHub credential JWT signature verified successfully");

    // 6. Validate credential claims against requirements
    validateCredentialClaims(
      verificationResult.payload,
      credentialRequirements,
      userAddress,
    );
    console.log("✅ Credential claims validated successfully");

    // 7. If all verification passes, decrypt the secret
    console.log("All verifications passed - proceeding with decryption...");
    var secret = await Lit.Actions.decryptAndCombine({
      accessControlConditions: accessControlConditions,
      ciphertext: ciphertext,
      dataToEncryptHash: dataToEncryptHash,
      chain: "ethereum",
    });

    console.log(
      "✅ Secret decrypted successfully with dual-factor authentication",
    );

    // 8. Return the decrypted secret along with verification details
    Lit.Actions.setResponse({
      response: {
        success: true,
        secret: secret,
        verifiedCredential: {
          issuer: verificationResult.payload.iss,
          subject: verificationResult.payload.sub,
          githubHandle:
            verificationResult.payload.vc.evidence &&
            verificationResult.payload.vc.evidence.handle,
          issuanceDate: verificationResult.payload.vc.issuanceDate,
        },
        verifiedUserJWT: {
          userDID: es256kResult.payload.iss,
          purpose: es256kResult.payload.purpose,
          issuedAt: new Date(es256kResult.payload.iat * 1000).toISOString(),
          expiresAt: new Date(es256kResult.payload.exp * 1000).toISOString(),
          nonce: es256kResult.payload.nonce,
        },
        authenticationFactors: [
          "GitHub credential from trusted issuer",
          "Ethereum key ownership proof",
        ],
      },
    });
  } catch (e) {
    console.error(
      "Enhanced dual-factor credential verification failed:",
      e.message,
    );
    Lit.Actions.setResponse({
      response: {
        success: false,
        error: e.message,
        errorType:
          e.message.indexOf("ES256K") !== -1
            ? "user_jwt_verification"
            : e.message.indexOf("GitHub") !== -1
              ? "github_credential_verification"
              : e.message.indexOf("decrypt") !== -1
                ? "decryption_error"
                : "general_error",
      },
    });
  }
};

export const litActionCode = `(${_litActionCode.toString()})()`;
