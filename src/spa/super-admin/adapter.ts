import {
    betterAuthAdminPlugin,
    defineSuperAdminAdapter,
} from "@shanjing/astro-full-stack-starter/super-admin";

import { getAuth } from "@/lib/auth";

export default defineSuperAdminAdapter({
    auth: betterAuthAdminPlugin({
        auth: getAuth(),
    }),
    title: "Cloudflare D1 Super Admin",
});
