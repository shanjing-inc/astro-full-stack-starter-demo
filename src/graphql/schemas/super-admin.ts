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
import { registerCommonTypes } from "@/graphql/types/common";
import { registerOrderTypes } from "@/graphql/types/order";
import { registerProductTypes } from "@/graphql/types/product";
import { registerShopTypes } from "@/graphql/types/shop";
import { registerSuperAdminGraphQLSchema } from "@shanjing/astro-full-stack-starter/graphql/schemas/super-admin";
import { createBullMqQueueDashboardBackend } from "@shanjing/astro-full-stack-starter/queue/dashboard";

const builder = createBuilder();

const commonTypes = registerCommonTypes(builder);
const orderTypes = registerOrderTypes(builder, commonTypes);
const productTypes = registerProductTypes(builder, commonTypes);
const shopTypes = registerShopTypes(builder, commonTypes);

registerSuperAdminGraphQLSchema(builder, {
    commonTypes,
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

export const superAdminSchema = builder.toSchema({});

export default superAdminSchema;
