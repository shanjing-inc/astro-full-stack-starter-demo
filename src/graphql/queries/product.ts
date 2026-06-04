import {
    buildProductOrderBy,
    buildProductRelationWhere,
    parseProductListArgs,
    parseProductRequiredWhereInput,
} from "@/graphql/types/product";

import type { PothosBuilder } from "@/graphql/builder";
import type { ProductTypes } from "@/graphql/types/product";

export function registerGetProductQuery(builder: PothosBuilder, productTypes: ProductTypes) {
    builder.queryField("getProduct", (t) =>
        t.drizzleField({
            type: productTypes.productItem,
            nullable: true,
            args: {
                where: t.arg({
                    type: productTypes.productFilters,
                    required: true,
                }),
            },
            resolve: (query, _root, args, context) => {
                const parsedWhere = parseProductRequiredWhereInput(args.where);
                const relationWhere = buildProductRelationWhere(parsedWhere);

                return context.db.query.product.findFirst({
                    ...query,
                    where: relationWhere as never,
                });
            },
        })
    );
}

export function registerListProductsQuery(builder: PothosBuilder, productTypes: ProductTypes) {
    builder.queryField("listProducts", (t) =>
        t.drizzleField({
            type: [productTypes.productItem],
            args: {
                where: t.arg({
                    type: productTypes.productFilters,
                }),
                orderBy: t.arg({
                    type: productTypes.productOrderBy,
                }),
                limit: t.arg.int(),
                offset: t.arg.int(),
            },
            resolve: (query, _root, args, context) => {
                const parsedArgs = parseProductListArgs(args);
                const relationWhere = buildProductRelationWhere(parsedArgs.where);

                return context.db.query.product.findMany({
                    ...query,
                    limit: parsedArgs.limit,
                    offset: parsedArgs.offset,
                    orderBy: buildProductOrderBy(parsedArgs.orderBy),
                    where: relationWhere as never,
                });
            },
        })
    );
}
