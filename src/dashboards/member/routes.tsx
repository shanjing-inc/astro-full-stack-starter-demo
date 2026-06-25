import { LayoutDashboardIcon, PackageIcon, ReceiptTextIcon, StoreIcon } from "lucide-react";

import { defineDashboardEntries } from "@shanjing/astro-full-stack-starter/dashboard/client";

import { MemberDashboardPage } from "@/dashboards/member/pages/dashboard";
import { MemberOrderListPage } from "@/dashboards/member/pages/order-list";
import { MemberProductListPage } from "@/dashboards/member/pages/product-list";
import { MemberShopListPage } from "@/dashboards/member/pages/shop-list";

/**
 * Project-owned member dashboard entries.
 */
export const memberEntries = defineDashboardEntries([
    {
        id: "member.dashboard",
        nav: {
            label: "Dashboard",
            icon: LayoutDashboardIcon,
            order: 0,
        },
        page: {
            title: "Dashboard",
            path: "/",
            component: MemberDashboardPage,
        },
        permission: {
            dashboard: ["access:member"],
        },
    },
    {
        id: "member.shop.list",
        nav: {
            label: "店铺",
            icon: StoreIcon,
            order: 10,
        },
        page: {
            title: "店铺",
            path: "/shop/list",
            component: MemberShopListPage,
        },
        permission: {
            shop: ["list"],
        },
    },
    {
        id: "member.product.list",
        nav: {
            label: "商品",
            icon: PackageIcon,
            order: 20,
        },
        page: {
            title: "商品",
            path: "/product/list",
            component: MemberProductListPage,
        },
        permission: {
            product: ["list"],
        },
    },
    {
        id: "member.order.list",
        nav: {
            label: "订单",
            icon: ReceiptTextIcon,
            order: 30,
        },
        page: {
            title: "订单",
            path: "/order/list",
            component: MemberOrderListPage,
        },
        permission: {
            order: ["list"],
        },
    },
]);
