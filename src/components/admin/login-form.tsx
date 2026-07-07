import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LoginFormProps = React.ComponentProps<"div"> & {
    action?: string;
    defaultEmail?: string;
    description?: string;
    errorMessage?: string;
    returnTo?: string;
    title?: string;
};

export function LoginForm({
    action = "/replace-with-your-admin-path/login",
    className,
    defaultEmail = "",
    description = "使用管理员账号登录",
    errorMessage = "",
    returnTo = "",
    title = "Admin",
    ...props
}: LoginFormProps) {
    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form method="post" action={action} className="p-6 md:p-8">
                        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">{title}</h1>
                                <p className="text-balance text-muted-foreground">{description}</p>
                            </div>
                            {errorMessage ? (
                                <div
                                    role="alert"
                                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                                >
                                    {errorMessage}
                                </div>
                            ) : null}
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="m@example.com"
                                    defaultValue={defaultEmail}
                                    autoComplete="email"
                                    aria-invalid={Boolean(errorMessage)}
                                    required
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">Password</FieldLabel>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    aria-invalid={Boolean(errorMessage)}
                                    required
                                />
                            </Field>
                            <Field>
                                <Button type="submit" size="lg">
                                    Login
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                    <div className="relative hidden bg-muted md:block">
                        <img
                            src="/placeholder.svg"
                            alt="Decorative placeholder"
                            className="absolute inset-0 size-full object-cover dark:brightness-[0.2] dark:grayscale"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
