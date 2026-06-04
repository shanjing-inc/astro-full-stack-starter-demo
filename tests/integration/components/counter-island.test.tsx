// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CounterIsland from "@/components/public/counter-island";
import { $counter, resetCounter } from "@/stores/counter";

describe("CounterIsland", () => {
    beforeEach(() => {
        resetCounter();
    });

    afterEach(() => {
        cleanup();
        localStorage.clear();
    });

    it("renders the current count and updates the persistent store from button clicks", async () => {
        $counter.set(2);

        render(<CounterIsland />);

        expect(await screen.findByText("2")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "+1" }));
        expect(screen.getByText("3")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "-1" }));
        expect(screen.getByText("2")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "重置" }));
        expect(screen.getByText("0")).toBeInTheDocument();
        expect($counter.get()).toBe(0);
    });

    it("decodes persisted counter values from localStorage", async () => {
        vi.resetModules();
        localStorage.setItem("demo:counter", "7");

        const { $counter: persistedCounter } = await import("@/stores/counter");

        expect(persistedCounter.get()).toBe(7);
    });

    it("hydrates with stable server text before showing the persisted counter", async () => {
        vi.resetModules();
        localStorage.setItem("demo:counter", "7");
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const { default: HydratedCounterIsland } =
            await import("@/components/public/counter-island");
        const serverHtml = renderToString(<HydratedCounterIsland />);
        const container = document.createElement("div");

        container.innerHTML = serverHtml;
        document.body.append(container);
        expect(container).toHaveTextContent("0");

        const root = hydrateRoot(container, <HydratedCounterIsland />);

        expect(await screen.findByText("7")).toBeInTheDocument();
        expect(
            errorSpy.mock.calls.some((call) =>
                call.some(
                    (message) => typeof message === "string" && message.includes("Hydration failed")
                )
            )
        ).toBe(false);

        root.unmount();
    });
});
