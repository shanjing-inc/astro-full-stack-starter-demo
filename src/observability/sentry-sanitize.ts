const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 50;
const REDACTED = "[Filtered]";

const sensitiveKeyPattern =
    /authorization|cookie|csrf|credential|passwd|password|secret|session|set-cookie|token|api[-_]?key/i;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }

    if (typeof value === "bigint") {
        return value.toString();
    }

    if (typeof value === "symbol" || typeof value === "function") {
        return String(value);
    }

    if (value instanceof Date) {
        return value.toISOString();
    }

    if (value instanceof Error) {
        return {
            message: value.message,
            name: value.name,
            stack: value.stack,
        };
    }

    if (value instanceof Headers) {
        return sanitizeObject(Object.fromEntries(value.entries()), depth + 1, seen);
    }

    if (value instanceof URLSearchParams) {
        return sanitizeObject(Object.fromEntries(value.entries()), depth + 1, seen);
    }

    if (Array.isArray(value)) {
        if (depth >= MAX_DEPTH) {
            return "[MaxDepth]";
        }

        return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeValue(item, depth + 1, seen));
    }

    if (isRecord(value)) {
        return sanitizeObject(value, depth + 1, seen);
    }

    return String(value);
}

function sanitizeObject(
    value: Record<string, unknown>,
    depth: number,
    seen: WeakSet<object>
): Record<string, unknown> {
    if (depth >= MAX_DEPTH) {
        return {
            value: "[MaxDepth]",
        };
    }

    if (seen.has(value)) {
        return {
            value: "[Circular]",
        };
    }

    seen.add(value);

    return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
            key,
            sensitiveKeyPattern.test(key) ? REDACTED : sanitizeValue(item, depth + 1, seen),
        ])
    );
}

export function sanitizeSentryValue(value: unknown) {
    return sanitizeValue(value, 0, new WeakSet<object>());
}

export function sanitizeSentryExtra(extra: Record<string, unknown> = {}) {
    return sanitizeObject(extra, 0, new WeakSet<object>());
}
