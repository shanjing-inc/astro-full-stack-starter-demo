import PackageDashboardApp from "@shanjing/astro-full-stack-starter/dashboard/app";

import { memberEntries } from "@/dashboards/member/routes";

import type { DashboardAppProps } from "@shanjing/astro-full-stack-starter/dashboard/app";

export default function MemberDashboardApp(props: DashboardAppProps) {
    return <PackageDashboardApp {...props} entries={memberEntries} />;
}
