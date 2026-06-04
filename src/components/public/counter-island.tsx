import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { $counter, decrementCounter, incrementCounter, resetCounter } from "@/stores/counter";

function useHydrationStableCounter() {
    return useSyncExternalStore(
        (listener) => $counter.listen(listener),
        () => $counter.get(),
        () => 0
    );
}

export default function CounterIsland() {
    const counter = useHydrationStableCounter();

    return (
        <Card>
            <CardContent className="space-y-5">
                <div className="space-y-2">
                    <p className="text-sm font-medium tracking-[0.3em] text-muted-foreground uppercase">
                        Persistent Store Demo
                    </p>
                    <h2 className="text-2xl font-semibold text-card-foreground">
                        Nano Stores 持久化计数器
                    </h2>
                    <p className="text-sm/7 text-muted-foreground">
                        这个示例会把状态写入浏览器本地存储，用来确认 Cloudflare demo 的 React
                        island、Nano Stores 和 Tailwind 样式链路都已经打通。
                    </p>
                </div>
                <div className="rounded-xl border bg-muted p-6">
                    <div className="text-sm text-muted-foreground">当前值</div>
                    <div className="mt-2 text-6xl font-semibold tracking-tight text-foreground">
                        {counter}
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Button type="button" onClick={incrementCounter}>
                        +1
                    </Button>
                    <Button type="button" variant="outline" onClick={decrementCounter}>
                        -1
                    </Button>
                    <Button type="button" variant="secondary" onClick={resetCounter}>
                        重置
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
