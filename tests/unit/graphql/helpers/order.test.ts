import { describe, expect, it } from "vitest";

import {
    buildOrderByObject,
    sortOrderEntriesByPriority,
} from "@shanjing/astro-full-stack-starter/graphql/helpers/order";

describe("order helpers", () => {
    it("sorts configured fields by priority", () => {
        const result = sortOrderEntriesByPriority({
            createdAt: {
                direction: "desc",
                priority: 3,
            },
            id: {
                direction: "asc",
                priority: 1,
            },
            name: {
                direction: "asc",
                priority: 2,
            },
        });

        expect(result).toEqual([
            [
                "id",
                {
                    direction: "asc",
                    priority: 1,
                },
            ],
            [
                "name",
                {
                    direction: "asc",
                    priority: 2,
                },
            ],
            [
                "createdAt",
                {
                    direction: "desc",
                    priority: 3,
                },
            ],
        ]);
    });

    it("falls back to descending id when no order is provided", () => {
        expect(buildOrderByObject(undefined, "id")).toEqual({
            id: "desc",
        });
    });

    it("keeps explicit fallback ordering when the field is already configured", () => {
        expect(
            buildOrderByObject(
                {
                    id: {
                        direction: "asc",
                        priority: 1,
                    },
                    name: {
                        direction: "desc",
                        priority: 2,
                    },
                },
                "id"
            )
        ).toEqual({
            id: "asc",
            name: "desc",
        });
    });
});
