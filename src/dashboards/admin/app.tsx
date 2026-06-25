import PackageDashboardApp from "@shanjing/astro-full-stack-starter/dashboard/app";

import { adminEntries } from "@/dashboards/admin/routes";

import type { DashboardAppProps } from "@shanjing/astro-full-stack-starter/dashboard/app";

export default function AdminDashboardApp(props: DashboardAppProps) {
    return <PackageDashboardApp {...props} entries={adminEntries} />;
}
