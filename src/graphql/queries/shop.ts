import {
    buildShopRelationWhere,
    buildShopOrderBy,
    parseShopListArgs,
    parseShopRequiredWhereInput,
} from "@/graphql/types/shop";

import type { PothosBuilder } from "@/graphql/builder";
import type { ShopTypes } from "@/graphql/types/shop";

export function registerGetShopQuery(builder: PothosBuilder, shopTypes: ShopTypes) {
    builder.queryField("getShop", (t) =>
        t.drizzleField({
            type: shopTypes.shopItem,
            nullable: true,
            args: {
                where: t.arg({
                    type: shopTypes.shopFilters,
                    required: true,
                }),
            },
            resolve: (query, _root, args, context) => {
                const parsedWhere = parseShopRequiredWhereInput(args.where);
                const relationWhere = buildShopRelationWhere(parsedWhere);

                return context.db.query.shop.findFirst({
                    ...query,
                    where: relationWhere as never,
                });
            },
        })
    );
}

export function registerListShopsQuery(builder: PothosBuilder, shopTypes: ShopTypes) {
    builder.queryField("listShops", (t) =>
        t.drizzleField({
            type: [shopTypes.shopItem],
            args: {
                where: t.arg({
                    type: shopTypes.shopFilters,
                }),
                orderBy: t.arg({
                    type: shopTypes.shopOrderBy,
                }),
                limit: t.arg.int(),
                offset: t.arg.int(),
            },
            resolve: (query, _root, args, context) => {
                const parsedArgs = parseShopListArgs(args);
                const relationWhere = buildShopRelationWhere(parsedArgs.where);

                return context.db.query.shop.findMany({
                    ...query,
                    limit: parsedArgs.limit,
                    offset: parsedArgs.offset,
                    orderBy: buildShopOrderBy(parsedArgs.orderBy),
                    where: relationWhere as never,
                });
            },
        })
    );
}
