import { persistentAtom } from "@nanostores/persistent";

export type SiteTheme = "light" | "dark";

export const siteThemeStorageKey = "site:theme";

export const $siteTheme = persistentAtom<SiteTheme>(siteThemeStorageKey, "light", {
    encode: (theme) => theme,
    decode: (theme) => (theme === "dark" ? "dark" : "light"),
});

export function setSiteTheme(theme: SiteTheme): void {
    $siteTheme.set(theme);
}

export function toggleSiteTheme(): void {
    setSiteTheme($siteTheme.get() === "dark" ? "light" : "dark");
}
