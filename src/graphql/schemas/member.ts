import { createBuilder } from "@/graphql/builder";
import { registerGetOrderQuery, registerListOrdersQuery } from "@/graphql/queries/order";
import { registerGetProductQuery, registerListProductsQuery } from "@/graphql/queries/product";
import { registerGetShopQuery, registerListShopsQuery } from "@/graphql/queries/shop";
import { registerCommonTypes } from "@shanjing/astro-full-stack-starter/graphql/types/common";
import { registerOrderTypes } from "@/graphql/types/order";
import { registerProductTypes } from "@/graphql/types/product";
import { registerShopTypes } from "@/graphql/types/shop";
import { registerDashboardCurrentUserGraphQLSchema } from "@shanjing/astro-full-stack-starter/graphql/schemas/dashboard";

const builder = createBuilder();

const commonTypes = registerCommonTypes(builder);
const orderTypes = registerOrderTypes(builder, commonTypes);
const productTypes = registerProductTypes(builder, commonTypes);
const shopTypes = registerShopTypes(builder, commonTypes);

registerDashboardCurrentUserGraphQLSchema(builder, {
    commonTypes,
});
registerGetOrderQuery(builder, orderTypes);
registerListOrdersQuery(builder, orderTypes);
registerGetProductQuery(builder, productTypes);
registerListProductsQuery(builder, productTypes);
registerGetShopQuery(builder, shopTypes);
registerListShopsQuery(builder, shopTypes);

export const memberSchema = builder.toSchema({});

export default memberSchema;
