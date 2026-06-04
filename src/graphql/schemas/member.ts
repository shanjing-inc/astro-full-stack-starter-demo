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
import { registerGetOrderQuery, registerListOrdersQuery } from "@/graphql/queries/order";
import { registerGetProductQuery, registerListProductsQuery } from "@/graphql/queries/product";
import { registerGetShopQuery, registerListShopsQuery } from "@/graphql/queries/shop";
import { registerCommonTypes } from "@/graphql/types/common";
import { registerOrderTypes } from "@/graphql/types/order";
import { registerProductTypes } from "@/graphql/types/product";
import { registerShopTypes } from "@/graphql/types/shop";

const builder = createBuilder();

const commonTypes = registerCommonTypes(builder);
const orderTypes = registerOrderTypes(builder, commonTypes);
const productTypes = registerProductTypes(builder, commonTypes);
const shopTypes = registerShopTypes(builder, commonTypes);

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

export const memberSchema = builder.toSchema({});

export default memberSchema;
