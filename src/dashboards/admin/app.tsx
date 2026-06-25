import DashboardApp, {
    type DashboardAppProps,
} from "@shanjing/astro-full-stack-starter/dashboard/app";

import { adminEntries } from "@/dashboards/admin/routes";

export default function AdminDashboardApp(props: DashboardAppProps) {
    return <DashboardApp {...props} entries={adminEntries} />;
}
