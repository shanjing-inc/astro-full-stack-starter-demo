import { HomeIcon, LogInIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LogoutActions() {
    return (
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <a href="/">
                    <HomeIcon className="size-4" />
                    网站首页
                </a>
            </Button>
            <Button asChild className="w-full sm:w-auto">
                <a href="/super-admin/login">
                    <LogInIcon className="size-4" />
                    重新登录
                </a>
            </Button>
        </div>
    );
}
