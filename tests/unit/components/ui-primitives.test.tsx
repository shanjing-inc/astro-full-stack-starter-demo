// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Button, buttonVariants } from "@/components/ui/button";
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

describe("UI primitives", () => {
    afterEach(cleanup);

    it("renders every card slot with slot metadata and custom classes", () => {
        render(
            <Card className="border-primary" size="sm">
                <CardHeader className="border-b">
                    <CardTitle>Orders</CardTitle>
                    <CardDescription>Recent order activity</CardDescription>
                    <CardAction>Action</CardAction>
                </CardHeader>
                <CardContent>Content</CardContent>
                <CardFooter>Footer</CardFooter>
            </Card>
        );

        expect(screen.getByText("Orders").closest("[data-slot='card-title']")).toBeTruthy();
        expect(
            screen.getByText("Recent order activity").closest("[data-slot='card-description']")
        ).toBeTruthy();
        expect(screen.getByText("Action").closest("[data-slot='card-action']")).toBeTruthy();
        expect(screen.getByText("Content").closest("[data-slot='card-content']")).toBeTruthy();
        expect(screen.getByText("Footer").closest("[data-slot='card-footer']")).toBeTruthy();
        expect(screen.getByText("Orders").closest("[data-slot='card']")).toHaveAttribute(
            "data-size",
            "sm"
        );
    });

    it("renders button variants and supports asChild slots", () => {
        render(
            <>
                <Button className="uppercase" size="lg" variant="secondary">
                    Save
                </Button>
                <Button asChild size="icon" variant="ghost">
                    <a href="/dashboard">Dashboard</a>
                </Button>
            </>
        );

        expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
            "data-variant",
            "secondary"
        );
        expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
            "data-slot",
            "button"
        );
        expect(buttonVariants({ size: "xs", variant: "destructive" })).toContain("bg-destructive");
    });
});
