import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import packageJson from "../../../package.json";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("Cloudflare development runtime", () => {
    it("prebundles the picomatch instance used by Astro internal helpers", () => {
        const astroConfig = readFileSync(path.join(rootDir, "astro.config.mjs"), "utf8");

        expect(packageJson.devDependencies.picomatch).toBe("4.0.5");
        expect(astroConfig).toContain('include: ["picomatch"]');
        expect(astroConfig).not.toContain("@whatwg-node/fetch/dist/esm-ponyfill.js");
        expect(astroConfig).not.toContain("graphql-yoga");
    });
});
