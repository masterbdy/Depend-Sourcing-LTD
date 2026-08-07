export function bufferToBase64URL(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function base64URLToBuffer(base64URL: string): ArrayBuffer {
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const padded = base64.padEnd(base64.length + padLen, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return buffer;
}

export async function registerBiometrics(username: string, displayName: string): Promise<string> {
  if (!window.isSecureContext) {
    throw new Error("Biometrics requires a secure context (HTTPS).");
  }
  if (!window.PublicKeyCredential || !navigator.credentials || !navigator.credentials.create) {
    throw new Error("Biometrics is not supported by your browser or is blocked by the current environment (try opening the app in a new tab).");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);
  
  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Ispa Dashboard", id: window.location.hostname },
      user: {
        id: userId,
        name: username,
        displayName: displayName
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { 
        authenticatorAttachment: "platform",
        userVerification: "required" 
      },
      timeout: 60000,
      attestation: "none"
    }
  });

  if (!credential) {
    throw new Error("Credential creation failed or cancelled");
  }

  return bufferToBase64URL((credential as PublicKeyCredential).rawId);
}

export async function authenticateBiometrics(credentialIdBase64: string): Promise<boolean> {
  if (!window.isSecureContext) {
    throw new Error("Biometrics requires a secure context (HTTPS).");
  }
  if (!window.PublicKeyCredential || !navigator.credentials || !navigator.credentials.get) {
    throw new Error("Biometrics is not supported by your browser or is blocked by the current environment (try opening the app in a new tab).");
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge,
      rpId: window.location.hostname,
      allowCredentials: [{
        type: "public-key",
        id: base64URLToBuffer(credentialIdBase64)
      }],
      userVerification: "required",
      timeout: 60000
    }
  });

  if (!assertion) {
    return false;
  }
  
  return true;
}
