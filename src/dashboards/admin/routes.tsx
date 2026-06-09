import { LayoutDashboardIcon, PackageIcon, ReceiptTextIcon, StoreIcon } from "lucide-react";

import type { ComponentType } from "react";

import {
    defineDashboardRoutes,
    queueDashboardRoutes,
    userDashboardRoutes,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import { DashboardPage } from "@/dashboards/admin/pages/dashboard";
import { OrderListPage } from "@/dashboards/admin/pages/order-list";
import { ProductListPage } from "@/dashboards/admin/pages/product-list";
import { ShopListPage } from "@/dashboards/admin/pages/shop-list";

/**
 * Project-owned admin dashboard business routes.
 */
export const adminRoutes = defineDashboardRoutes<ComponentType>([
    {
        id: "project.dashboard",
        path: "/",
        title: "Dashboard",
        component: DashboardPage,
        permission: {
            dashboard: ["access:admin"],
        },
        nav: {
            group: "overview",
            icon: LayoutDashboardIcon,
            order: 0,
        },
    },
    ...userDashboardRoutes,
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
    ...queueDashboardRoutes,
]);
