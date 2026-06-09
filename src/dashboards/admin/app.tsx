import DashboardApp, {
    type DashboardAppProps,
} from "@shanjing/astro-full-stack-starter/dashboard/app";

import { adminRoutes } from "@/dashboards/admin/routes";

export default function AdminDashboardApp(props: DashboardAppProps) {
    return <DashboardApp {...props} routes={adminRoutes} />;
}
