import type { Thread } from "../script/state.ts";

const CALL_SHOP_WAIT_ID = "callshop";

export type ShopSessionRuntime = {
  readonly stock: () => readonly string[];
  readonly setStock: (sources: readonly string[]) => boolean;
  readonly close: () => void;
  readonly reset: () => void;
};

/** Engine-owned bridge between saveable CallShop waits and the live menu session. */
export function createShopSessionRuntime(threads: () => readonly Thread[]): ShopSessionRuntime {
  let activeStock: string[] = [];
  const callShopWaiters = (): Thread[] => threads().filter((thread) => thread.wait?.kind === "menu.screen" && thread.wait.id === CALL_SHOP_WAIT_ID);
  return {
    stock() {
      const waiters = callShopWaiters();
      if (waiters.length === 0) return activeStock;
      if (waiters.length !== 1) return [];
      const wait = waiters[0]?.wait;
      if (wait?.kind !== "menu.screen" || wait.id !== CALL_SHOP_WAIT_ID) return [];
      const payload = wait.payload[0];
      if (!Array.isArray(payload) || payload.some((source) => typeof source !== "string")) return [];
      return payload as string[];
    },
    setStock(sources) {
      if (sources.length > 0 && callShopWaiters().length > 0) return false;
      activeStock = [...sources];
      return true;
    },
    close() {
      activeStock = [];
      for (const waiter of callShopWaiters()) {
        if (waiter.wait?.kind === "menu.screen") waiter.wait.payload = [];
      }
    },
    reset() {
      activeStock = [];
    },
  };
}
