import { persistentAtom } from "@nanostores/persistent";

export const $counter = persistentAtom<number>("demo:counter", 0, {
    encode: (value) => value.toString(),
    decode: (value) => Number(value),
});

export function incrementCounter(): void {
    $counter.set($counter.get() + 1);
}

export function decrementCounter(): void {
    $counter.set($counter.get() - 1);
}

export function resetCounter(): void {
    $counter.set(0);
}
