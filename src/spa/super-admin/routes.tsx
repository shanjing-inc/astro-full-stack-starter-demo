import { PackageIcon, ReceiptTextIcon, StoreIcon } from "lucide-react";

import { defineSuperAdminRoutes } from "@shanjing/astro-full-stack-starter/super-admin/client";

import { DashboardPage } from "@/spa/super-admin/pages/dashboard";
import { OrderListPage } from "@/spa/super-admin/pages/order-list";
import { ProductListPage } from "@/spa/super-admin/pages/product-list";
import { ShopListPage } from "@/spa/super-admin/pages/shop-list";

/**
 * Project-owned super-admin business routes.
 */
export const projectSuperAdminRoutes = defineSuperAdminRoutes([
    {
        id: "project.dashboard",
        path: "/",
        title: "Dashboard",
        component: DashboardPage,
        permission: {
            superAdmin: ["access"],
        },
    },
    {
        id: "shop.list",
        path: "/shop/list",
        title: "店铺",
        component: ShopListPage,
        permission: {
            shop: ["list"],
        },
        nav: {
            group: "business",
            icon: StoreIcon,
            order: 10,
        },
    },
    {
        id: "product.list",
        path: "/product/list",
        title: "商品",
        component: ProductListPage,
        permission: {
            product: ["list"],
        },
        nav: {
            group: "business",
            icon: PackageIcon,
            order: 20,
        },
    },
    {
        id: "order.list",
        path: "/order/list",
        title: "订单",
        component: OrderListPage,
        permission: {
            order: ["list"],
        },
        nav: {
            group: "business",
            icon: ReceiptTextIcon,
            order: 30,
        },
    },
]);
