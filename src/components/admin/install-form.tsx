import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type InstallFormProps = React.ComponentProps<"div"> & {
    defaultEmail?: string;
    defaultName?: string;
    errorMessage?: string;
    fieldErrors?: {
        name?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
    };
};

export function InstallForm({
    className,
    defaultEmail = "",
    defaultName = "",
    errorMessage = "",
    fieldErrors = {},
    ...props
}: InstallFormProps) {
    const nameError = fieldErrors.name ?? "";
    const emailError = fieldErrors.email ?? "";
    const passwordError = fieldErrors.password ?? "";
    const confirmPasswordError = fieldErrors.confirmPassword ?? "";

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card className="overflow-hidden p-0">
                <CardContent className="grid p-0 md:grid-cols-2">
                    <form
                        method="post"
                        action="/replace-with-your-admin-path/install"
                        className="p-6 md:p-8"
                    >
                        <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <h1 className="text-2xl font-bold">Install Admin</h1>
                                <p className="text-balance text-muted-foreground">
                                    创建第一个管理员账号
                                </p>
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
                                <FieldLabel htmlFor="name">Name</FieldLabel>
                                <Input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="Admin"
                                    defaultValue={defaultName}
                                    autoComplete="name"
                                    aria-invalid={Boolean(nameError)}
                                    required
                                />
                                {nameError ? (
                                    <FieldDescription className="text-destructive">
                                        {nameError}
                                    </FieldDescription>
                                ) : null}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="email">Email</FieldLabel>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="admin@example.com"
                                    defaultValue={defaultEmail}
                                    autoComplete="email"
                                    aria-invalid={Boolean(emailError)}
                                    required
                                />
                                {emailError ? (
                                    <FieldDescription className="text-destructive">
                                        {emailError}
                                    </FieldDescription>
                                ) : null}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="password">Password</FieldLabel>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(passwordError)}
                                    required
                                />
                                {passwordError ? (
                                    <FieldDescription className="text-destructive">
                                        {passwordError}
                                    </FieldDescription>
                                ) : (
                                    <FieldDescription>至少 8 个字符。</FieldDescription>
                                )}
                            </Field>
                            <Field>
                                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
                                <Input
                                    id="confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    aria-invalid={Boolean(confirmPasswordError)}
                                    required
                                />
                                {confirmPasswordError ? (
                                    <FieldDescription className="text-destructive">
                                        {confirmPasswordError}
                                    </FieldDescription>
                                ) : null}
                            </Field>
                            <Field>
                                <Button type="submit" size="lg">
                                    Install
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
