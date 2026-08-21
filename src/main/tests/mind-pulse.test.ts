import { describe, expect, it } from 'vitest';
import { readMindPulse } from '../mind-pulse';

describe('readMindPulse', () => {
  it('returns structured pulse when consciousness files exist', async () => {
    const pulse = await readMindPulse();
    if (!pulse.available) {
      expect(pulse.mood).toBe('unknown');
      return;
    }
    expect(typeof pulse.mood).toBe('string');
    expect(pulse.mood.length).toBeGreaterThan(0);
    if (pulse.energy !== null) {
      expect(pulse.energy).toBeGreaterThanOrEqual(0);
      expect(pulse.energy).toBeLessThanOrEqual(1.5);
    }
  });
});
