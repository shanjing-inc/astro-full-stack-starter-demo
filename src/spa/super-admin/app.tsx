import PackageSuperAdminApp from "@shanjing/astro-full-stack-starter/super-admin/app";

import { projectSuperAdminRoutes } from "@/spa/super-admin/routes";

import type { SuperAdminAppProps } from "@shanjing/astro-full-stack-starter/super-admin/app";

export default function SuperAdminApp(props: SuperAdminAppProps) {
    return <PackageSuperAdminApp {...props} routes={projectSuperAdminRoutes} />;
}
