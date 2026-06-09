import { mysqlTable, int, timestamp, varchar } from "drizzle-orm/mysql-core";
import { describe, expect, it } from "vitest";

import {
    buildDateTimeFilterConditions,
    buildIntFilterConditions,
    buildRelationDateTimeFilters,
    buildRelationIntFilters,
    buildRelationStringFilters,
    buildStringFilterConditions,
} from "@shanjing/astro-full-stack-starter/graphql/helpers/filters";

const filterTestTable = mysqlTable("filter_test", {
    createdAt: timestamp("created_at"),
    id: int("id"),
    name: varchar("name", {
        length: 255,
    }),
});

describe("GraphQL filter helpers", () => {
    it("returns empty condition lists for missing filters", () => {
        expect(buildIntFilterConditions(filterTestTable.id)).toEqual([]);
        expect(buildStringFilterConditions(filterTestTable.name)).toEqual([]);
        expect(buildDateTimeFilterConditions(filterTestTable.createdAt)).toEqual([]);
        expect(buildRelationIntFilters()).toBeUndefined();
        expect(buildRelationStringFilters()).toBeUndefined();
        expect(buildRelationDateTimeFilters()).toBeUndefined();
    });

    it("builds every integer condition and relation filter", () => {
        const filters = {
            eq: 1,
            gt: 0,
            gte: 1,
            inArray: [1, 2],
            isNotNull: true,
            isNull: true,
            lt: 10,
            lte: 9,
            ne: 3,
            notInArray: [4, 5],
        };

        expect(buildIntFilterConditions(filterTestTable.id, filters)).toHaveLength(10);
        expect(buildRelationIntFilters(filters)).toEqual(filters);
        expect(buildIntFilterConditions(filterTestTable.id, {})).toEqual([]);
        expect(buildRelationIntFilters({})).toBeUndefined();
    });

    it("builds every string condition and relation filter", () => {
        const filters = {
            eq: "a",
            gt: "a",
            gte: "b",
            ilike: "%demo%",
            inArray: ["a", "b"],
            isNotNull: true,
            isNull: true,
            like: "%Demo%",
            lt: "z",
            lte: "y",
            ne: "c",
            notIlike: "%old%",
            notInArray: ["x", "y"],
            notLike: "%Legacy%",
        };

        expect(buildStringFilterConditions(filterTestTable.name, filters)).toHaveLength(14);
        expect(buildRelationStringFilters(filters)).toEqual(filters);
        expect(buildStringFilterConditions(filterTestTable.name, {})).toEqual([]);
        expect(buildRelationStringFilters({})).toBeUndefined();
        expect(
            buildStringFilterConditions(filterTestTable.name, {
                isNotNull: false,
                isNull: false,
            })
        ).toEqual([]);
    });

    it("builds every DateTime condition and relation filter", () => {
        const filters = {
            eq: new Date("2026-06-08T00:00:00.000Z"),
            gt: new Date("2026-06-01T00:00:00.000Z"),
            gte: new Date("2026-06-02T00:00:00.000Z"),
            lt: new Date("2026-06-09T00:00:00.000Z"),
            lte: new Date("2026-06-10T00:00:00.000Z"),
        };

        expect(buildDateTimeFilterConditions(filterTestTable.createdAt, filters)).toHaveLength(5);
        expect(buildRelationDateTimeFilters(filters)).toEqual(filters);
        expect(buildDateTimeFilterConditions(filterTestTable.createdAt, {})).toEqual([]);
        expect(buildRelationDateTimeFilters({})).toBeUndefined();
    });
});
