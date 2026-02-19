/**
 * Minimal logger shim for the web build.
 * Matches the desktop logger's public API but uses console.
 */

type LogCategory = 'api' | 'store' | 'compute' | 'verification' | 'document' | 'ui';

const noop = (..._args: unknown[]) => {};

export const logger = {
  info: (category: string, message: string, data?: unknown) => console.info(`[${category}]`, message, data ?? ''),
  warn: (category: string, message: string, data?: unknown) => console.warn(`[${category}]`, message, data ?? ''),
  error: (category: string, message: string, data?: unknown) => console.error(`[${category}]`, message, data ?? ''),
  debug: noop,
  trace: noop,
  store: {
    action: (store: string, action: string, data?: unknown) => console.debug(`[${store}]`, action, data ?? ''),
  },
  document: {
    nodeAdded: (nodeId: string, type: string) => console.debug('[document] nodeAdded', nodeId, type),
    nodeUpdated: (nodeId: string, fields: string[]) => console.debug('[document] nodeUpdated', nodeId, fields),
    nodeDeleted: (nodeId: string) => console.debug('[document] nodeDeleted', nodeId),
  },
  verification: {
    started: (nodeId: string) => console.debug('[verification] started', nodeId),
    passed: (nodeId: string, gates: string[]) => console.debug('[verification] passed', nodeId, gates),
    failed: (nodeId: string, reason: string) => console.debug('[verification] failed', nodeId, reason),
  },
  api: {
    request: (endpoint: string, params?: unknown) => console.debug('[api]', endpoint, params ?? ''),
    response: noop,
    error: (_endpoint: string, _status: number, err?: unknown) => console.error('[api] error', err),
  },
  compute: {
    result: noop,
    error: noop,
  },
};

export class OperationTimer {
  private name: string;
  private start: number;

  constructor(name: string, _category: LogCategory = 'api') {
    this.name = name;
    this.start = performance.now();
  }

  complete(details?: Record<string, unknown>) {
    const elapsed = Math.round(performance.now() - this.start);
    console.debug(`[timer] ${this.name} completed in ${elapsed}ms`, details ?? '');
  }

  error(err: unknown) {
    const elapsed = Math.round(performance.now() - this.start);
    console.error(`[timer] ${this.name} failed after ${elapsed}ms`, err);
  }
}

export function startTimer(operation: string, category: LogCategory = 'api'): OperationTimer {
  return new OperationTimer(operation, category);
}

export function setLogLevel(_level: string): void {}
export function getCurrentLogLevel(): string { return 'info'; }
