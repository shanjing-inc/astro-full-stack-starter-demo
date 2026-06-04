"use client";

import { useStore } from "@nanostores/react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { $siteTheme, toggleSiteTheme } from "@/stores/site-theme";

export function SiteThemeToggle() {
    const theme = useStore($siteTheme);
    const isDark = theme === "dark";
    const label = isDark ? "切换到亮色模式" : "切换到暗色模式";
    const Icon = isDark ? SunIcon : MoonIcon;

    useEffect(() => {
        const root = document.documentElement;

        root.classList.toggle("dark", isDark);
        root.style.colorScheme = theme;
    }, [isDark, theme]);

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            title={label}
            onClick={toggleSiteTheme}
        >
            <Icon className="size-4" />
        </Button>
    );
}
