import { betterAuthAdminPlugin } from "@shanjing/astro-full-stack-starter/dashboard/auth";

import { getAuth } from "@/lib/auth";

export default betterAuthAdminPlugin({
    auth: getAuth(),
});
