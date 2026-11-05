const DB_NAME = "lingo-messaging-keys";
const STORE_NAME = "devices";
const DEVICE_ID_KEY = "lingo:messaging-device-id";

export type StoredKeys = {
  deviceId: string;
  identityKey: CryptoKeyPair;
  signedPrekey: CryptoKeyPair;
  oneTimePrekeys: CryptoKeyPair[];
};

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function bufferSource(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local key storage."));
  });
}

async function saveKeys(keys: StoredKeys) {
  const database = await openKeyDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(keys, keys.deviceId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save device keys."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving device keys was interrupted."));
  });
  database.close();
}

export async function getOrCreateDeviceKeys() {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  const database = await openKeyDatabase();
  const saved = await new Promise<StoredKeys | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(deviceId);
    request.onsuccess = () => resolve(request.result as StoredKeys | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read local device keys."));
  });
  database.close();
  if (saved) return saved;

  const identityKey = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]
  ) as CryptoKeyPair;
  const signedPrekey = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]
  ) as CryptoKeyPair;
  const oneTimePrekeys = await Promise.all(Array.from({ length: 20 }, () =>
    crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]) as Promise<CryptoKeyPair>
  ));

  const keys = { deviceId, identityKey, signedPrekey, oneTimePrekeys };
  await saveKeys(keys);
  return keys;
}

export async function getPublicDeviceBundle(keys: StoredKeys) {
  const identityKey = await crypto.subtle.exportKey("jwk", keys.identityKey.publicKey);
  const signedPrekey = await crypto.subtle.exportKey("jwk", keys.signedPrekey.publicKey);
  const signedPrekeyBytes = new TextEncoder().encode(canonicalJson(signedPrekey));
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, keys.identityKey.privateKey, signedPrekeyBytes
  );
  const oneTimePrekeys = await Promise.all(keys.oneTimePrekeys.map(async (key, index) => ({
    keyId: index + 1,
    publicKey: await crypto.subtle.exportKey("jwk", key.publicKey),
  })));

  return {
    deviceId: keys.deviceId,
    identityKey,
    signedPrekey,
    signedPrekeySignature: toBase64(new Uint8Array(signature)),
    oneTimePrekeys,
  };
}

type ClaimedBundle = {
  user_id: string;
  device_id: string;
  identity_key: JsonWebKey;
  signed_prekey: JsonWebKey;
  signed_prekey_signature: string;
  one_time_prekey_id: number | null;
  one_time_prekey: JsonWebKey | null;
};

export type EncryptedMessage = {
  ephemeral_public_key: JsonWebKey;
  one_time_prekey_id: number | null;
  salt: string;
  nonce: string;
  ciphertext: string;
  signature: string;
};

async function deriveMessageKey(privateKey: CryptoKey, publicJwk: JsonWebKey, salt: Uint8Array, info: string) {
  const publicKey = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const sharedSecret = await crypto.subtle.deriveBits({ name: "ECDH", public: publicKey }, privateKey, 256);
  const material = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: bufferSource(salt), info: bufferSource(new TextEncoder().encode(info)) },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function messageSigningBytes(
  fields: Omit<EncryptedMessage, "signature"> & { conversationId: string; senderId: string; recipientId: string; senderDeviceId: string; recipientDeviceId: string }
) {
  return new TextEncoder().encode(canonicalJson(fields));
}

export async function encryptForDevice(
  keys: StoredKeys,
  bundle: ClaimedBundle,
  input: { conversationId: string; senderId: string; recipientId: string; text: string }
) {
  const verifiedIdentity = await crypto.subtle.importKey("jwk", bundle.identity_key, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const signedPrekeyBytes = new TextEncoder().encode(canonicalJson(bundle.signed_prekey));
  const validPrekey = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, verifiedIdentity,
    fromBase64(bundle.signed_prekey_signature), signedPrekeyBytes
  );
  if (!validPrekey) throw new Error("Recipient device signed prekey could not be verified. Compare identity keys before continuing.");

  const recipientKey = bundle.one_time_prekey ?? bundle.signed_prekey;
  const ephemeral = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]) as CryptoKeyPair;
  const ephemeralPublic = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const sentAt = new Date().toISOString();
  const key = await deriveMessageKey(ephemeral.privateKey, recipientKey, salt,
    `lingo-message-v1|${input.conversationId}|${input.senderId}|${input.recipientId}|${bundle.device_id}`);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: bufferSource(nonce) }, key, bufferSource(new TextEncoder().encode(input.text)));
  const withoutSignature = {
    conversationId: input.conversationId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    senderDeviceId: keys.deviceId,
    recipientDeviceId: bundle.device_id,
    ephemeral_public_key: ephemeralPublic,
    one_time_prekey_id: bundle.one_time_prekey_id,
    salt: toBase64(salt),
    nonce: toBase64(nonce),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keys.identityKey.privateKey, messageSigningBytes(withoutSignature));
  return {
    envelope: {
      ephemeral_public_key: ephemeralPublic,
      one_time_prekey_id: bundle.one_time_prekey_id,
      salt: withoutSignature.salt,
      nonce: withoutSignature.nonce,
      ciphertext: withoutSignature.ciphertext,
      signature: toBase64(new Uint8Array(signature)),
    } satisfies EncryptedMessage,
    sentAt,
  };
}

export async function decryptMessage(
  keys: StoredKeys,
  message: EncryptedMessage & { conversation_id: string; sender_id: string; recipient_id: string; sender_device_id: string; recipient_device_id: string; created_at: string },
  senderIdentityKey: JsonWebKey
) {
  if (message.recipient_device_id !== keys.deviceId) throw new Error("This message is addressed to another device.");
  const senderKey = await crypto.subtle.importKey("jwk", senderIdentityKey, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const signingFields = {
    conversationId: message.conversation_id,
    senderId: message.sender_id,
    recipientId: message.recipient_id,
    senderDeviceId: message.sender_device_id,
    recipientDeviceId: message.recipient_device_id,
    ephemeral_public_key: message.ephemeral_public_key,
    one_time_prekey_id: message.one_time_prekey_id,
    salt: message.salt,
    nonce: message.nonce,
    ciphertext: message.ciphertext,
  };
  const isAuthentic = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, senderKey,
    fromBase64(message.signature), messageSigningBytes(signingFields));
  if (!isAuthentic) throw new Error("Message signature is invalid.");

  const privateKey = message.one_time_prekey_id
    ? keys.oneTimePrekeys[message.one_time_prekey_id - 1]?.privateKey
    : keys.signedPrekey.privateKey;
  if (!privateKey) throw new Error("The private prekey for this message is missing on this browser.");
  const salt = fromBase64(message.salt);
  const key = await deriveMessageKey(privateKey, message.ephemeral_public_key, salt,
    `lingo-message-v1|${message.conversation_id}|${message.sender_id}|${message.recipient_id}|${keys.deviceId}`);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bufferSource(fromBase64(message.nonce)) }, key, bufferSource(fromBase64(message.ciphertext))
  );
  return new TextDecoder().decode(plaintext);
}
