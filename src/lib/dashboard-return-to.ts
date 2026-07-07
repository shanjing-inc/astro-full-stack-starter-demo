const localReturnToOrigin = "https://dashboard.local";

function normalizeDashboardPath(dashboardPath: string) {
    const normalizedPath = dashboardPath.trim().replace(/\/+$/u, "");

    if (!normalizedPath) {
        return "/";
    }

    return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
}

export function resolveDashboardReturnTo(
    returnTo: string | null | undefined,
    dashboardPath: string
) {
    const normalizedDashboardPath = normalizeDashboardPath(dashboardPath);
    const fallbackPath = normalizedDashboardPath;
    const input = returnTo?.trim() ?? "";

    if (!input || !input.startsWith("/") || input.startsWith("//")) {
        return fallbackPath;
    }

    try {
        const url = new URL(input, localReturnToOrigin);
        const loginPath = `${normalizedDashboardPath}/login`;
        const isDashboardRoot = url.pathname === normalizedDashboardPath;
        const isDashboardChild = url.pathname.startsWith(`${normalizedDashboardPath}/`);

        if (url.origin !== localReturnToOrigin || (!isDashboardRoot && !isDashboardChild)) {
            return fallbackPath;
        }

        if (url.pathname === loginPath || url.pathname.startsWith(`${loginPath}/`)) {
            return fallbackPath;
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return fallbackPath;
    }
}
