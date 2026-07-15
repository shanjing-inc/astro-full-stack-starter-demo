import { describe, expect, it, vi } from "vitest";

import { serverServeSource } from "../../../scripts/deno-serve-template.mjs";

type RequestOriginHelpers = {
    createPublicRequest: (request: Request) => Request;
    getRequestOrigin: (request: Request) => string;
};

function loadRequestOriginHelpers(): RequestOriginHelpers {
    const helperStart = serverServeSource.indexOf("function getFirstHeaderValue");
    const helperEnd = serverServeSource.indexOf("function getSafeStaticFilePath");

    if (helperStart < 0 || helperEnd < 0) {
        throw new Error("Deno serve request origin helpers were not found.");
    }

    const helperSource = serverServeSource.slice(helperStart, helperEnd);
    const createHelpers = new Function(
        "isDenoWebSocketUpgradeRequest",
        `${helperSource}\nreturn { createPublicRequest, getRequestOrigin };`
    );

    return createHelpers(() => false) as RequestOriginHelpers;
}

describe("Deno serve request origin", () => {
    it("prefers same-host Origin over incorrect x-forwarded-proto=http after TLS termination", () => {
        vi.stubEnv("APP_ORIGIN", "");
        const { getRequestOrigin, createPublicRequest } = loadRequestOriginHelpers();
        const request = new Request(
            "http://astro-template.k12.ddcampus.cn/replace-with-your-admin-path/login",
            {
                method: "POST",
                headers: {
                    host: "astro-template.k12.ddcampus.cn",
                    origin: "https://astro-template.k12.ddcampus.cn",
                    "x-forwarded-proto": "http",
                },
            }
        );

        expect(getRequestOrigin(request)).toBe("https://astro-template.k12.ddcampus.cn");
        expect(new URL(createPublicRequest(request).url).origin).toBe(
            "https://astro-template.k12.ddcampus.cn"
        );
    });

    it("defaults public hosts to HTTPS when proxy protocol headers are absent", () => {
        vi.stubEnv("APP_ORIGIN", "");
        const { getRequestOrigin } = loadRequestOriginHelpers();
        const request = new Request("http://astro-template.k12.ddcampus.cn/replace-with-your-admin-path");

        expect(getRequestOrigin(request)).toBe("https://astro-template.k12.ddcampus.cn");
    });

    it("keeps HTTP for local development hosts", () => {
        vi.stubEnv("APP_ORIGIN", "");
        const { getRequestOrigin } = loadRequestOriginHelpers();
        const request = new Request("http://localhost:4321/replace-with-your-admin-path");

        expect(getRequestOrigin(request)).toBe("http://localhost:4321");
    });

    it("uses Host when the upstream request URL contains an internal address", () => {
        vi.stubEnv("APP_ORIGIN", "https://example.com");
        const { createPublicRequest } = loadRequestOriginHelpers();
        const request = new Request("http://127.0.0.1:8000/replace-with-your-admin-path", {
            headers: {
                host: "astro-template.k12.ddcampus.cn",
            },
        });

        const publicRequest = createPublicRequest(request);

        expect(publicRequest.url).toBe(
            "https://astro-template.k12.ddcampus.cn/replace-with-your-admin-path"
        );
    });
});
