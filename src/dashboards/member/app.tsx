import DashboardApp, {
    type DashboardAppProps,
} from "@shanjing/astro-full-stack-starter/dashboard/app";

import { memberRoutes } from "@/dashboards/member/routes";

export default function MemberDashboardApp(props: DashboardAppProps) {
    return <DashboardApp {...props} routes={memberRoutes} />;
}
