import { persistentAtom } from "@nanostores/persistent";

export type SuperAdminTheme = "light" | "dark";

export const superAdminThemeStorageKey = "super-admin:theme";

export const $superAdminTheme = persistentAtom<SuperAdminTheme>(
    superAdminThemeStorageKey,
    "light",
    {
        encode: (theme) => theme,
        decode: (theme) => (theme === "dark" ? "dark" : "light"),
    }
);

export function setSuperAdminTheme(theme: SuperAdminTheme): void {
    $superAdminTheme.set(theme);
}

export function toggleSuperAdminTheme(): void {
    setSuperAdminTheme($superAdminTheme.get() === "dark" ? "light" : "dark");
}
