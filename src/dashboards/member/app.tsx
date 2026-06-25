import DashboardApp, {
    type DashboardAppProps,
} from "@shanjing/astro-full-stack-starter/dashboard/app";

import { memberEntries } from "@/dashboards/member/routes";

export default function MemberDashboardApp(props: DashboardAppProps) {
    return <DashboardApp {...props} entries={memberEntries} />;
}
