import { vi } from "vitest";

type Handler = (...args: never[]) => void;

// Stands in for the socket.io client: tests emit server events with `emit`
class FakeSocket {
  connected = false;
  private handlers = new Map<string, Set<Handler>>();

  connect = vi.fn(() => {
    this.connected = true;
  });
  disconnect = vi.fn(() => {
    this.connected = false;
  });

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, ...args: unknown[]) {
    this.handlers.get(event)?.forEach((h) => (h as (...a: unknown[]) => void)(...args));
  }

  reset() {
    this.connected = false;
    this.handlers.clear();
    this.connect.mockClear();
    this.disconnect.mockClear();
  }
}

export const socket = new FakeSocket();
