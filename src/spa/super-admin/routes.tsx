import { ListChecksIcon, PackageIcon, ReceiptTextIcon, StoreIcon } from "lucide-react";

import {
    defineSuperAdminRoutes,
    QueuePage,
} from "@shanjing/astro-full-stack-starter/super-admin/client";

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
    {
        id: "queue.dashboard",
        path: "/queues",
        title: "控制台",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            icon: ListChecksIcon,
            order: 99,
            title: "队列",
        },
    },
    {
        id: "queue.schedules",
        path: "/queues/schedules",
        title: "队列计划",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            order: 21,
            parentId: "queue.dashboard",
        },
    },
    {
        id: "queue.jobs.recent",
        path: "/queues/jobs/recent",
        title: "最近任务",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            order: 22,
            parentId: "queue.dashboard",
        },
    },
    {
        id: "queue.jobs.active",
        path: "/queues/jobs/active",
        title: "运行中任务",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            order: 23,
            parentId: "queue.dashboard",
        },
    },
    {
        id: "queue.jobs.completed",
        path: "/queues/jobs/completed",
        title: "已完成任务",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            order: 24,
            parentId: "queue.dashboard",
        },
    },
    {
        id: "queue.jobs.failed",
        path: "/queues/jobs/failed",
        title: "失败任务",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            order: 25,
            parentId: "queue.dashboard",
        },
    },
    {
        id: "queue.jobs.waiting",
        path: "/queues/jobs/waiting",
        title: "等待任务",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
        nav: {
            group: "system",
            order: 26,
            parentId: "queue.dashboard",
        },
    },
    {
        id: "queue.jobs.status",
        path: "/queues/jobs/:status",
        title: "队列任务",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
    },
    {
        id: "queue.jobs.detail",
        path: "/queues/jobs/:status/:recordId",
        title: "任务详情",
        component: QueuePage,
        permission: {
            queue: ["read"],
        },
    },
]);
