import { LayoutDashboardIcon, PackageIcon, ReceiptTextIcon, StoreIcon } from "lucide-react";

import { defineDashboardRoutes } from "@shanjing/astro-full-stack-starter/dashboard/client";

import { MemberDashboardPage } from "@/dashboards/member/pages/dashboard";
import { MemberOrderListPage } from "@/dashboards/member/pages/order-list";
import { MemberProductListPage } from "@/dashboards/member/pages/product-list";
import { MemberShopListPage } from "@/dashboards/member/pages/shop-list";

/**
 * Project-owned member dashboard routes.
 */
export const memberRoutes = defineDashboardRoutes([
    {
        id: "member.dashboard",
        path: "/",
        title: "Dashboard",
        component: MemberDashboardPage,
        permission: {
            dashboard: ["access:member"],
        },
        nav: {
            group: "overview",
            icon: LayoutDashboardIcon,
            order: 0,
        },
    },
    {
        id: "member.shop.list",
        path: "/shop/list",
        title: "店铺",
        component: MemberShopListPage,
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
        id: "member.product.list",
        path: "/product/list",
        title: "商品",
        component: MemberProductListPage,
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
        id: "member.order.list",
        path: "/order/list",
        title: "订单",
        component: MemberOrderListPage,
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
