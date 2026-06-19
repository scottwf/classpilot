import { afterEach, describe, expect, it } from "vitest";
import {
  decryptField,
  encryptField,
  isEncrypted,
  resetFieldCipherKeyCache,
} from "./field-cipher";

afterEach(() => {
  delete process.env.CLASSPILOT_DATA_KEY;
  resetFieldCipherKeyCache();
});

describe("field cipher", () => {
  it("round-trips a value through encryption and decryption", () => {
    const ciphertext = encryptField("Sensitive note about a student.");

    expect(isEncrypted(ciphertext)).toBe(true);
    expect(ciphertext).not.toContain("Sensitive");
    expect(decryptField(ciphertext)).toBe("Sensitive note about a student.");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptField("same value")).not.toBe(encryptField("same value"));
  });

  it("leaves empty strings untouched", () => {
    expect(encryptField("")).toBe("");
    expect(decryptField("")).toBe("");
  });

  it("returns legacy plaintext unchanged when decrypting", () => {
    expect(decryptField("plain legacy text")).toBe("plain legacy text");
  });

  it("uses a configured 32-byte base64 key", () => {
    process.env.CLASSPILOT_DATA_KEY = Buffer.alloc(32, 7).toString("base64");
    resetFieldCipherKeyCache();

    const ciphertext = encryptField("keyed value");
    expect(decryptField(ciphertext)).toBe("keyed value");
  });

  it("rejects a key that is not 32 bytes", () => {
    process.env.CLASSPILOT_DATA_KEY = Buffer.alloc(8, 1).toString("base64");
    resetFieldCipherKeyCache();

    expect(() => encryptField("value")).toThrow(/32 bytes/);
  });
});
