import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// Application-level field encryption for sensitive Student CMS columns.
// node:sqlite cannot use SQLCipher, so the most sensitive free-text columns are
// encrypted here, inside the repository layer, before they reach the database.
// See docs/student-cms-plan.md (section 4.2).
//
// Stored format: "v1:<iv_b64>:<authTag_b64>:<ciphertext_b64>". The version
// prefix lets us detect legacy plaintext (e.g. demo data seeded before
// encryption) and rotate the scheme later. Empty strings are left as-is: most
// optional fields default to "" and whether a field is empty is not sensitive.

const version = "v1";
const algorithm = "aes-256-gcm";
const keyLength = 32;
const ivLength = 12;

// Stable, derived key for local development only. Production must set a real key.
const devKeyMaterial = "classpilot-local-dev-data-key-do-not-use-in-production";

let cachedKey: Buffer | undefined;

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function resolveKey(): Buffer {
  if (cachedKey) {
    return cachedKey;
  }

  const raw = process.env.CLASSPILOT_DATA_KEY;

  if (raw) {
    const key = Buffer.from(raw, "base64");

    if (key.length !== keyLength) {
      throw new Error(
        "CLASSPILOT_DATA_KEY must be 32 bytes encoded as base64 (e.g. `openssl rand -base64 32`).",
      );
    }

    cachedKey = key;
    return key;
  }

  if (isProduction()) {
    throw new Error("CLASSPILOT_DATA_KEY must be set in production.");
  }

  cachedKey = createHash("sha256").update(devKeyMaterial).digest();
  return cachedKey;
}

// Exposed for tests that need to reset the memoized key after changing env.
export function resetFieldCipherKeyCache(): void {
  cachedKey = undefined;
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${version}:`);
}

export function encryptField(plaintext: string): string {
  if (plaintext === "") {
    return "";
  }

  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, resolveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    version,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptField(value: string): string {
  if (value === "" || !isEncrypted(value)) {
    // Empty, or legacy plaintext written before encryption was introduced.
    return value;
  }

  const parts = value.split(":");

  if (parts.length !== 4) {
    return value;
  }

  const [, ivB64, authTagB64, ciphertextB64] = parts;
  const decipher = createDecipheriv(
    algorithm,
    resolveKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
