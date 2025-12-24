import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Simple Circuit Breaker implementation
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime?: number;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private resetTimeoutMs: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  isOpen(): boolean {
    if (this.state === 'OPEN' && this.lastFailureTime) {
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return false;
      }
      return true;
    }
    return false;
  }

  recordSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

/**
 * Simple Bulkhead implementation using a Semaphore-like counter
 */
export class Bulkhead {
  private activeCount: number = 0;

  constructor(private maxConcurrent: number = 5) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.activeCount >= this.maxConcurrent) {
      throw new McpError(
        ErrorCode.InternalError,
        'Resource limit reached for this connector (Bulkhead full)'
      );
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
    }
  }
}

/**
 * Timeout utility
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new McpError(ErrorCode.InternalError, errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Registry to manage per-connector resilience instances
 */
export class ResilienceRegistry {
  private breakers = new Map<string, CircuitBreaker>();
  private bulkheads = new Map<string, Bulkhead>();

  getBreaker(connectorId: string): CircuitBreaker {
    if (!this.breakers.has(connectorId)) {
      this.breakers.set(connectorId, new CircuitBreaker());
    }
    return this.breakers.get(connectorId)!;
  }

  getBulkhead(connectorId: string): Bulkhead {
    if (!this.bulkheads.has(connectorId)) {
      this.bulkheads.set(connectorId, new Bulkhead());
    }
    return this.bulkheads.get(connectorId)!;
  }
}

