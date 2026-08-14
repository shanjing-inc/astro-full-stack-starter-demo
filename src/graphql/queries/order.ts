import {
    buildOrderOrderBy,
    buildOrderRelationWhere,
    parseOrderListArgs,
    parseOrderRequiredWhereInput,
} from "@/graphql/types/order";

import type { PothosBuilder } from "@/graphql/builder";
import type { OrderTypes } from "@/graphql/types/order";

export function registerGetOrderQuery(builder: PothosBuilder, orderTypes: OrderTypes) {
    builder.queryField("getOrder", (t) =>
        t.drizzleField({
            type: orderTypes.orderItem,
            nullable: true,
            args: {
                where: t.arg({
                    type: orderTypes.orderFilters,
                    required: true,
                }),
            },
            resolve: (query, _root, args, context) => {
                const parsedWhere = parseOrderRequiredWhereInput(args.where);
                const relationWhere = buildOrderRelationWhere(parsedWhere);

                return context.db.query.order.findFirst({
                    ...query(),
                    where: relationWhere as never,
                });
            },
        })
    );
}

export function registerListOrdersQuery(builder: PothosBuilder, orderTypes: OrderTypes) {
    builder.queryField("listOrders", (t) =>
        t.drizzleField({
            type: [orderTypes.orderItem],
            args: {
                where: t.arg({
                    type: orderTypes.orderFilters,
                }),
                orderBy: t.arg({
                    type: orderTypes.orderOrderBy,
                }),
                limit: t.arg.int(),
                offset: t.arg.int(),
            },
            resolve: (query, _root, args, context) => {
                const parsedArgs = parseOrderListArgs(args);
                const relationWhere = buildOrderRelationWhere(parsedArgs.where);

                return context.db.query.order.findMany({
                    ...query(),
                    limit: parsedArgs.limit,
                    offset: parsedArgs.offset,
                    orderBy: buildOrderOrderBy(parsedArgs.orderBy),
                    where: relationWhere as never,
                });
            },
        })
    );
}
