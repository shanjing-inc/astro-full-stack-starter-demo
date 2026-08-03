import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import eslintConfigPrettier from "eslint-config-prettier";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import checkFile from "eslint-plugin-check-file";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import { fileURLToPath } from "node:url";

const tailwindEntryPoint = fileURLToPath(new URL("./src/styles/global.css", import.meta.url));

export default [
    {
        ignores: [
            ".astro/**",
            ".history/**",
            ".husky/**",
            ".tmp/**",
            ".trae/**",
            "coverage/**",
            "dist/**",
            "drizzle/**",
            "node_modules/**",
            "test-results/**",
            "playwright-report/**",
            "src/graphql/generated/*",
            "src/queues/jobs/manifest.generated.ts",
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...eslintPluginAstro.configs["flat/recommended"],
    {
        languageOptions: {
            parserOptions: {
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        files: ["public/**/*.*", "src/content/**/*.*", "src/styles/**/*.css"],
        plugins: {
            "check-file": checkFile,
        },
        processor: "check-file/eslint-processor-check-file",
    },
    {
        files: ["**/*.{js,jsx,ts,tsx,mjs,cjs,astro}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                process: "readonly",
            },
        },
    },
    {
        files: ["**/*.cjs"],
        languageOptions: {
            sourceType: "commonjs",
        },
        rules: {
            "@typescript-eslint/no-require-imports": "off",
        },
    },
    {
        files: [
            "src/components/**/*.{js,jsx,ts,tsx}",
            "src/dashboards/**/*.{js,jsx,ts,tsx}",
            "src/hooks/**/*.{js,jsx,ts,tsx}",
            "src/stores/**/*.{js,jsx,ts,tsx}",
        ],
        languageOptions: {
            globals: {
                ...globals.browser,
            },
        },
    },
    {
        files: ["src/**/*.{astro,js,jsx,ts,tsx}", "tests/**/*.{js,jsx,ts,tsx}"],
        plugins: betterTailwindcss.configs.recommended.plugins,
        settings: {
            "better-tailwindcss": {
                entryPoint: tailwindEntryPoint,
            },
        },
        rules: {
            ...betterTailwindcss.configs.recommended.rules,
            "better-tailwindcss/no-unknown-classes": [
                "error",
                {
                    ignore: [
                        "^(?:.*:)?(?:animate-in|animate-out|fade-in-0|fade-out-0|zoom-in-95|zoom-out-95|slide-in-from-(?:top|right|bottom|left)-(?:2|10)|slide-out-to-(?:top|right|bottom|left)-10)$",
                    ],
                },
            ],
            "better-tailwindcss/enforce-consistent-line-wrapping": [
                "warn",
                {
                    printWidth: 0,
                    group: "never",
                    preferSingleLine: true,
                },
            ],
        },
    },
    {
        files: ["tests/**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.vitest,
            },
        },
    },
    {
        files: ["**/*.{jsx,tsx}"],
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
            "jsx-a11y": jsxA11yPlugin,
        },
        settings: {
            react: {
                version: "detect",
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            ...jsxA11yPlugin.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
        },
    },
    {
        files: [
            "src/**/*.{js,jsx,ts,tsx,astro}",
            "src/styles/**/*.css",
            "scripts/**/*.{js,jsx,ts,tsx,mjs,cjs}",
            "public/**/*.*",
            "src/content/**/*.*",
        ],
        plugins: {
            "check-file": checkFile,
        },
        rules: {
            "check-file/folder-naming-convention": [
                "error",
                {
                    "src/**/": "KEBAB_CASE",
                    "scripts/**/": "KEBAB_CASE",
                    "public/**/": "KEBAB_CASE",
                },
            ],
            "check-file/filename-naming-convention": [
                "error",
                {
                    "src/pages/**/!(\\[*\\]).astro": "KEBAB_CASE",
                    "src/content/**/*.*": "KEBAB_CASE",
                    "public/**/*.*": "KEBAB_CASE",
                    "src/components/**/*.{astro,jsx,tsx}": "KEBAB_CASE",
                    "src/dashboards/**/*.{jsx,tsx}": "KEBAB_CASE",
                    "src/hooks/**/*.{js,jsx,ts,tsx}": "KEBAB_CASE",
                    "src/layouts/**/*.astro": "KEBAB_CASE",
                    "src/db/**/*.{js,jsx,ts,tsx}": "KEBAB_CASE",
                    "src/graphql/**/*.{js,jsx,ts,tsx}": "KEBAB_CASE",
                    "src/queues/core/**/*.{js,jsx,ts,tsx}": "KEBAB_CASE",
                    "src/stores/**/*.{js,jsx,ts,tsx}": "KEBAB_CASE",
                    "src/styles/**/*.css": "KEBAB_CASE",
                    "scripts/**/*.{js,jsx,ts,tsx,mjs,cjs}": "KEBAB_CASE",
                },
                {
                    ignoreMiddleExtensions: true,
                },
            ],
        },
    },
    {
        files: ["src/queues/jobs/**/*.ts"],
        plugins: {
            "check-file": checkFile,
        },
        rules: {
            "check-file/filename-blocklist": [
                "error",
                {
                    "src/queues/jobs/**/!(*.job|index).ts": "*.job.ts",
                },
            ],
            "check-file/folder-match-with-fex": [
                "error",
                {
                    "*.job.ts": "**/jobs/",
                },
            ],
            "check-file/filename-naming-convention": [
                "error",
                {
                    "src/queues/jobs/**/*.job.ts": "KEBAB_CASE",
                },
                {
                    ignoreMiddleExtensions: true,
                },
            ],
        },
    },
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
        },
    },
    eslintConfigPrettier,
];
