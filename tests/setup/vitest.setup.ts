import "@testing-library/jest-dom/vitest";
import { setPersistentEngine } from "@nanostores/persistent";

function createMemoryStorage(): Storage {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear() {
            store.clear();
        },
        getItem(key: string) {
            return store.get(key) ?? null;
        },
        key(index: number) {
            return Array.from(store.keys())[index] ?? null;
        },
        removeItem(key: string) {
            store.delete(key);
        },
        setItem(key: string, value: string) {
            store.set(key, value);
        },
    };
}

function createPersistentStorageProxy(storage: Storage): Record<string, string> {
    return new Proxy(storage as Storage & Record<string, string>, {
        deleteProperty(target, property) {
            if (typeof property === "string" && !(property in target)) {
                target.removeItem(property);
                return true;
            }

            return Reflect.deleteProperty(target, property);
        },
        get(target, property, receiver) {
            if (typeof property === "string" && !(property in target)) {
                return target.getItem(property) ?? undefined;
            }

            return Reflect.get(target, property, receiver);
        },
        has(target, property) {
            if (typeof property === "string" && !(property in target)) {
                return target.getItem(property) !== null;
            }

            return Reflect.has(target, property);
        },
        set(target, property, value, receiver) {
            if (typeof property === "string" && !(property in target)) {
                target.setItem(property, String(value));
                return true;
            }

            return Reflect.set(target, property, value, receiver);
        },
    });
}

const localStorageFallback =
    typeof globalThis.localStorage === "object" &&
    globalThis.localStorage !== null &&
    typeof globalThis.localStorage.getItem === "function" &&
    typeof globalThis.localStorage.setItem === "function" &&
    typeof globalThis.localStorage.removeItem === "function" &&
    typeof globalThis.localStorage.clear === "function"
        ? globalThis.localStorage
        : createMemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: localStorageFallback,
});

setPersistentEngine(createPersistentStorageProxy(localStorageFallback), {
    addEventListener() {},
    removeEventListener() {},
});
