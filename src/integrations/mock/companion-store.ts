import type { Receipt } from "@/domain/companion";

// The mock Companion API's memory of approvals. In memory only, so
// restarting the server resets it.

// What an idempotency key was first used for, so a reuse can be recognised
export type UsedKey = {
  suggestionId: string;
  receipt: Receipt;
};

type CompanionStore = {
  usedKeys: Map<string, UsedKey>; // idempotencyKey -> first successful result
  nextReceiptNumber: number;
};

function createStore(): CompanionStore {
  return {
    usedKeys: new Map(),
    nextReceiptNumber: 1,
  };
}

// On globalThis so all the routes share one store
const serverMemory = globalThis as typeof globalThis & {
  companionStore?: CompanionStore;
};

export function getStore(): CompanionStore {
  if (!serverMemory.companionStore) {
    serverMemory.companionStore = createStore();
  }
  return serverMemory.companionStore;
}

export function resetStore() {
  serverMemory.companionStore = createStore();
}
