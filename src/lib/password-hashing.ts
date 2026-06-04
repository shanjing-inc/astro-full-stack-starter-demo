const PASSWORD_HASH_SCHEME = "pbkdf2-sha256";
const PASSWORD_HASH_ITERATIONS = 100_000;
const PASSWORD_HASH_BITS = 256;
const PASSWORD_SALT_BYTES = 16;

const textEncoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function fromBase64Url(value: string) {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
    if (left.length !== right.length) {
        return false;
    }

    let diff = 0;

    for (let index = 0; index < left.length; index += 1) {
        diff |= left[index] ^ right[index];
    }

    return diff === 0;
}

function toArrayBufferSource(bytes: Uint8Array) {
    const copy = new Uint8Array(bytes.length);

    copy.set(bytes);

    return copy;
}

async function derivePasswordKey(password: string, salt: Uint8Array, iterations: number) {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        textEncoder.encode(password.normalize("NFKC")),
        "PBKDF2",
        false,
        ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: "PBKDF2",
            hash: "SHA-256",
            salt: toArrayBufferSource(salt),
            iterations,
        },
        keyMaterial,
        PASSWORD_HASH_BITS
    );

    return new Uint8Array(bits);
}

export async function hashPassword(password: string) {
    const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
    const digest = await derivePasswordKey(password, salt, PASSWORD_HASH_ITERATIONS);

    return [
        PASSWORD_HASH_SCHEME,
        String(PASSWORD_HASH_ITERATIONS),
        toBase64Url(salt),
        toBase64Url(digest),
    ].join("$");
}

export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
    const [scheme, iterationsText, saltText, digestText] = hash.split("$");

    if (scheme !== PASSWORD_HASH_SCHEME || !iterationsText || !saltText || !digestText) {
        return false;
    }

    const iterations = Number(iterationsText);

    if (!Number.isSafeInteger(iterations) || iterations < 1) {
        return false;
    }

    const salt = fromBase64Url(saltText);
    const expectedDigest = fromBase64Url(digestText);
    const actualDigest = await derivePasswordKey(password, salt, iterations);

    return timingSafeEqual(actualDigest, expectedDigest);
}
