// ═══════════════════════════════════════════════════════════
// VPN Bridge — Main Process
// ═══════════════════════════════════════════════════════════

import { net } from 'electron';
import type { VPNStatus } from '../shared/types';

export class VPNBridge {
  private readonly API_URL = 'http://localhost:9999';

  async getStatus(): Promise<VPNStatus> {
    try {
      const response = await fetch(`${this.API_URL}/status`);
      const data = await response.json();
      return { connected: data.connected, ip: data.ip };
    } catch {
      return { connected: false };
    }
  }

  async start(): Promise<void> {
    try {
      await fetch(`${this.API_URL}/start`, { method: 'POST' });
    } catch (error) {
      console.error('VPN start error:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await fetch(`${this.API_URL}/stop`, { method: 'POST' });
    } catch (error) {
      console.error('VPN stop error:', error);
      throw error;
    }
  }
}
