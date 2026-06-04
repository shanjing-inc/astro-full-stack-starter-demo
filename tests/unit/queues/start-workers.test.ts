import { beforeEach, describe, expect, it, vi } from "vitest";

const { startRegisteredWorkersMock } = vi.hoisted(() => ({
    startRegisteredWorkersMock: vi.fn(),
}));

vi.mock("@shanjing/astro-full-stack-starter/queue/adapters/bullmq", () => ({
    createBullMqQueueAdapter: () => ({
        dispatch: vi.fn(),
    }),
    startRegisteredWorkers: startRegisteredWorkersMock,
}));

describe("start-workers", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.doUnmock("@/queues/jobs/manifest.generated");
        vi.doUnmock("@shanjing/astro-full-stack-starter/queue/jobs");
        startRegisteredWorkersMock.mockReset();
        startRegisteredWorkersMock.mockReturnValue([]);
    });

    it("registers all built-in jobs before starting workers", async () => {
        const { startQueueWorkers } = await import("@/queues/start-workers");

        startQueueWorkers();

        expect(startRegisteredWorkersMock).toHaveBeenCalledTimes(1);
        const [registry, options] = startRegisteredWorkersMock.mock.calls[0];

        expect(options).toEqual({
            queueNames: ["critical", "default", "low"],
        });
        expect(registry.get("default", "demo-page-visit")).toBeDefined();
        expect(registry.get("critical", "system-health-check")).toBeDefined();
        expect(registry.get("default", "queue-metrics-snapshot")).toBeDefined();
        expect(registry.get("critical", "failed-jobs-audit")).toBeDefined();
        expect(registry.get("low", "execution-record-cleanup")).toBeDefined();
        expect(registry.get("critical", "dynamic-queue-test-critical")).toBeDefined();
        expect(registry.get("default", "dynamic-queue-test-default")).toBeDefined();
        expect(registry.get("low", "dynamic-queue-test-low")).toBeDefined();
    });

    it("starts only requested queues that have registered jobs", async () => {
        const { startQueueWorkers } = await import("@/queues/start-workers");

        startQueueWorkers({
            queueNames: ["low"],
        });

        expect(startRegisteredWorkersMock).toHaveBeenCalledWith(expect.anything(), {
            queueNames: ["low"],
        });
    });

    it("rejects startup when the manifest registers no workers", async () => {
        vi.doMock("@shanjing/astro-full-stack-starter/queue/jobs", () => ({
            registerBuiltinQueueJobs: vi.fn(),
        }));
        vi.doMock("@/queues/jobs/manifest.generated", () => ({
            registerAllJobs: vi.fn(),
        }));
        const { startQueueWorkers } = await import("@/queues/start-workers");

        expect(() => startQueueWorkers()).toThrow("No queue workers are registered.");
        expect(startRegisteredWorkersMock).not.toHaveBeenCalled();
    });

    it("rejects requested queues without registered workers", async () => {
        vi.doMock("@shanjing/astro-full-stack-starter/queue/jobs", () => ({
            registerBuiltinQueueJobs: vi.fn(),
        }));
        vi.doMock("@/queues/jobs/manifest.generated", () => ({
            registerAllJobs: (registry: {
                register: (definition: unknown, handler: unknown) => void;
            }) => {
                registry.register(
                    {
                        name: "critical-only",
                        params: {
                            parse: (value: unknown) => value,
                        },
                        queueName: "critical",
                    },
                    vi.fn()
                );
            },
        }));
        const { startQueueWorkers } = await import("@/queues/start-workers");

        expect(() =>
            startQueueWorkers({
                queueNames: ["critical", "low"],
            })
        ).toThrow("No registered workers found for queues: low.");
        expect(startRegisteredWorkersMock).not.toHaveBeenCalled();
    });
});
