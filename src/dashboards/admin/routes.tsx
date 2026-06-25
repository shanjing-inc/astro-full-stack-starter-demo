import { LayoutDashboardIcon, PackageIcon, ReceiptTextIcon, StoreIcon } from "lucide-react";

import {
    defineDashboardEntries,
    queueDashboardEntries,
    userDashboardEntries,
} from "@shanjing/astro-full-stack-starter/dashboard/client";

import { DashboardPage } from "@/dashboards/admin/pages/dashboard";
import { OrderListPage } from "@/dashboards/admin/pages/order-list";
import { ProductListPage } from "@/dashboards/admin/pages/product-list";
import { ShopListPage } from "@/dashboards/admin/pages/shop-list";

import type { ComponentType } from "react";

/**
 * Project-owned admin dashboard entries.
 */
export const adminEntries = defineDashboardEntries<ComponentType>([
    {
        id: "project.dashboard",
        nav: {
            label: "Dashboard",
            icon: LayoutDashboardIcon,
            order: 0,
        },
        page: {
            title: "Dashboard",
            path: "/",
            component: DashboardPage,
        },
        permission: {
            dashboard: ["access:admin"],
        },
    },
    ...userDashboardEntries,
    {
        id: "shop.list",
        nav: {
            label: "店铺管理",
            icon: StoreIcon,
            order: 10,
        },
        page: {
            title: "店铺管理",
            path: "/shop/list",
            component: ShopListPage,
        },
        permission: {
            shop: ["list"],
        },
    },
    {
        id: "product.list",
        nav: {
            label: "商品管理",
            icon: PackageIcon,
            order: 20,
        },
        page: {
            title: "商品管理",
            path: "/product/list",
            component: ProductListPage,
        },
        permission: {
            product: ["list"],
        },
    },
    {
        id: "order.list",
        nav: {
            label: "订单管理",
            icon: ReceiptTextIcon,
            order: 30,
        },
        page: {
            title: "订单管理",
            path: "/order/list",
            component: OrderListPage,
        },
        permission: {
            order: ["list"],
        },
    },

    ...queueDashboardEntries,
]);
