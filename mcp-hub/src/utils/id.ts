import { createHash } from 'node:crypto';

/**
 * Generates a deterministic event ID from a source and a source-specific event ID.
 * deterministic_id = hash(source + ":" + source_event_id)
 */
export function generateEventId(source: string, sourceEventId: string): string {
  return createHash('sha256')
    .update(`${source}:${sourceEventId}`)
    .digest('hex');
}

