import type { GraphQLError } from "graphql";
import type { ExecutionResult } from "graphql";
import type { Plugin } from "graphql-yoga";
import type { GraphQLParams } from "graphql-yoga";

import { reportException } from "@/observability/sentry";
import {
    captureSentryRequestContext,
    getRequestFromReportContext,
} from "@/observability/sentry-context";
import { sanitizeSentryExtra } from "@/observability/sentry-sanitize";

type GraphQLEndpoint = "member" | "super-admin";

function isAsyncIterable(value: unknown): value is AsyncIterable<ExecutionResult> {
    return typeof value === "object" && value !== null && Symbol.asyncIterator in value;
}

function getRequestPathname(request: Request | undefined) {
    if (!request) {
        return undefined;
    }

    try {
        return new URL(request.url).pathname;
    } catch {
        return undefined;
    }
}

function createGraphQLRequestData(params: GraphQLParams, operationName: string | undefined) {
    return sanitizeSentryExtra({
        extensions: params.extensions,
        operationName: params.operationName ?? operationName,
        query: params.query,
        variables: params.variables,
    });
}

function getOriginalGraphQLError(error: GraphQLError) {
    return error.originalError ?? error.extensions?.originalError ?? error;
}

function reportGraphQLError(
    error: GraphQLError,
    endpoint: GraphQLEndpoint,
    operationName: string | undefined,
    context: unknown
) {
    reportException(getOriginalGraphQLError(error), {
        context,
        extra: {
            extensions: error.extensions,
            graphQLErrorName: error.name,
            graphQLErrorMessage: error.message,
            operationName,
            path: error.path,
        },
        tags: {
            endpoint,
            runtime: "graphql",
        },
    });
}

function reportExecutionResult(
    result: ExecutionResult,
    endpoint: GraphQLEndpoint,
    operationName: string | undefined,
    context: unknown
) {
    for (const error of result.errors ?? []) {
        reportGraphQLError(error, endpoint, operationName, context);
    }
}

export function useSentryGraphQL(endpoint: GraphQLEndpoint): Plugin {
    return {
        onParams({ params, request }) {
            captureSentryRequestContext(
                request,
                createGraphQLRequestData(params, params.operationName ?? undefined)
            );
        },
        onExecute({ args }) {
            return {
                onExecuteDone({ result }) {
                    if (isAsyncIterable(result)) {
                        return {
                            onNext({ result: nextResult }) {
                                reportExecutionResult(
                                    nextResult,
                                    endpoint,
                                    args.operationName ?? undefined,
                                    args.contextValue
                                );
                            },
                        };
                    }

                    reportExecutionResult(
                        result as ExecutionResult,
                        endpoint,
                        args.operationName ?? undefined,
                        args.contextValue
                    );
                },
            };
        },
        onPluginInit({ registerContextErrorHandler }) {
            registerContextErrorHandler(({ context, error }) => {
                const request = getRequestFromReportContext(context);

                reportException(error, {
                    context,
                    extra: {
                        pathname: getRequestPathname(request),
                    },
                    tags: {
                        endpoint,
                        phase: "context",
                        runtime: "graphql",
                    },
                });
            });
        },
    };
}
