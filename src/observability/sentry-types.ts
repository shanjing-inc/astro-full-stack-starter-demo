export type SentryRuntime =
    | "astro-server"
    | "graphql"
    | "queue-scheduler"
    | "queue-worker"
    | "websocket";

export interface SentryRequestContext {
    data?: unknown;
    headers?: Record<string, string>;
    method?: string;
    query_string?: string;
    url?: string;
}

export interface SentryReportParams {
    context?: unknown;
    extra?: Record<string, unknown>;
    tags?: Record<string, string | number | boolean>;
    group?: string | string[];
    request?: SentryRequestContext;
}

export interface ReportableError {
    getReportParams?: () => SentryReportParams;
}

export type SentryReportLevel = "error" | "warning";
