import { createBuilder } from "@/graphql/builder";
import {
    registerCreateOrderMutation,
    registerDeleteOrderMutation,
    registerUpdateOrderMutation,
} from "@/graphql/mutations/order";
import {
    registerCreateProductMutation,
    registerDeleteProductMutation,
    registerUpdateProductMutation,
} from "@/graphql/mutations/product";
import {
    registerCreateShopMutation,
    registerDeleteShopMutation,
    registerUpdateShopMutation,
} from "@/graphql/mutations/shop";
import { registerGetOrderQuery, registerListOrdersQuery } from "@/graphql/queries/order";
import { registerGetProductQuery, registerListProductsQuery } from "@/graphql/queries/product";
import { registerGetShopQuery, registerListShopsQuery } from "@/graphql/queries/shop";
import "@/queues/config";
import { createQueueKernel } from "@/queues/kernel";
import { databaseProvider } from "@/db/client";
import { registerCommonTypes } from "@shanjing/astro-full-stack-starter/graphql/types/common";
import { registerOrderTypes } from "@/graphql/types/order";
import { registerProductTypes } from "@/graphql/types/product";
import { registerShopTypes } from "@/graphql/types/shop";
import { registerDashboardGraphQLSchema } from "@shanjing/astro-full-stack-starter/graphql/schemas/dashboard";
import { createBullMqQueueDashboardBackend } from "@shanjing/astro-full-stack-starter/queue/dashboard";

import type { GraphQLContext } from "@/graphql/context";

const builder = createBuilder();

const commonTypes = registerCommonTypes(builder);
const orderTypes = registerOrderTypes(builder, commonTypes);
const productTypes = registerProductTypes(builder, commonTypes);
const shopTypes = registerShopTypes(builder, commonTypes);

registerDashboardGraphQLSchema(builder, {
    commonTypes,
    createUser: (input, context: GraphQLContext) => context.createDashboardUser(input),
    getQueueDashboardBackend: () =>
        createBullMqQueueDashboardBackend({
            createQueueKernel,
        }),
    userTable: databaseProvider.schema.user,
});

registerGetOrderQuery(builder, orderTypes);
registerListOrdersQuery(builder, orderTypes);
registerGetProductQuery(builder, productTypes);
registerListProductsQuery(builder, productTypes);
registerGetShopQuery(builder, shopTypes);
registerListShopsQuery(builder, shopTypes);
registerCreateOrderMutation(builder, orderTypes);
registerDeleteOrderMutation(builder, orderTypes);
registerUpdateOrderMutation(builder, orderTypes);
registerCreateProductMutation(builder, productTypes);
registerDeleteProductMutation(builder, productTypes);
registerUpdateProductMutation(builder, productTypes);
registerCreateShopMutation(builder, shopTypes);
registerDeleteShopMutation(builder, shopTypes);
registerUpdateShopMutation(builder, shopTypes);

export const adminSchema = builder.toSchema({});

export default adminSchema;
