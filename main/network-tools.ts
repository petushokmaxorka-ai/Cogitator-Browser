// Network tools — port scan, LAN discovery, Wake-on-LAN

import { createSocket } from 'dgram';
import { createConnection as netConnect } from 'net';
import si from 'systeminformation';
import { runCommand } from './exec-util';

export type PortState = 'open' | 'closed' | 'filtered';

export interface PortScanResult {
  port: number;
  status: PortState;
  service?: string;
}

export interface NetworkDevice {
  ip: string;
  mac: string;
  hostname: string;
  vendor: string;
  status: 'online' | 'offline';
}

const COMMON_SERVICES: Record<number, string> = {
  22: 'ssh',
  80: 'http',
  443: 'https',
  3306: 'mysql',
  5432: 'postgres',
  6379: 'redis',
  8000: 'http-alt',
  8080: 'http-proxy',
  11434: 'ollama',
  11436: 'llama-server',
};

function scanPort(host: string, port: number, timeoutMs = 800): Promise<PortState> {
  return new Promise((resolve) => {
    const socket = netConnect({ host, port, timeout: timeoutMs });
    let settled = false;
    const finish = (state: PortState) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(state);
    };
    socket.on('connect', () => finish('open'));
    socket.on('timeout', () => finish('filtered'));
    socket.on('error', (err: NodeJS.ErrnoException) => {
      finish(err.code === 'ECONNREFUSED' ? 'closed' : 'filtered');
    });
  });
}

export async function scanPortRange(
  host: string,
  fromPort: number,
  toPort: number,
  onProgress?: (done: number, total: number) => void,
): Promise<PortScanResult[]> {
  const results: PortScanResult[] = [];
  const total = toPort - fromPort + 1;
  let done = 0;
  const batchSize = 50;

  for (let start = fromPort; start <= toPort; start += batchSize) {
    const end = Math.min(start + batchSize - 1, toPort);
    const batch = [];
    for (let port = start; port <= end; port++) {
      batch.push(
        scanPort(host, port).then((status) => {
          done++;
          onProgress?.(done, total);
          if (status === 'open') {
            results.push({ port, status, service: COMMON_SERVICES[port] });
          }
        }),
      );
    }
    await Promise.all(batch);
  }

  return results.sort((a, b) => a.port - b.port);
}

export async function scanLan(_cidr?: string): Promise<NetworkDevice[]> {
  const ifaces = await si.networkInterfaces();

  const devices: NetworkDevice[] = [];
  const seen = new Set<string>();

  for (const iface of ifaces) {
    if (!iface.ip4 || iface.internal) continue;
    const ip = iface.ip4;
    if (seen.has(ip)) continue;
    seen.add(ip);
    devices.push({
      ip,
      mac: iface.mac ?? '—',
      hostname: iface.iface ?? ip,
      vendor: iface.type ?? 'interface',
      status: 'online',
    });
  }

  const primary = ifaces.find((i) => i.ip4 && !i.internal);
  if (primary?.ip4) {
    const parts = primary.ip4.split('.');
    if (parts.length === 4) {
      const base = `${parts[0]}.${parts[1]}.${parts[2]}`;
      const probes: Promise<void>[] = [];
      for (let i = 1; i <= 254; i++) {
        const target = `${base}.${i}`;
        if (seen.has(target)) continue;
        probes.push(
          runCommand('ping', ['-c', '1', '-W', '1', target], { timeoutMs: 2_000 })
            .then(() => {
              if (!seen.has(target)) {
                seen.add(target);
                devices.push({
                  ip: target,
                  mac: '—',
                  hostname: target,
                  vendor: 'discovered',
                  status: 'online',
                });
              }
            })
            .catch(() => undefined),
        );
        if (probes.length >= 32) {
          await Promise.all(probes.splice(0, 32));
        }
      }
      await Promise.all(probes);
    }
  }

  return devices;
}

export function sendWakeOnLan(mac: string, broadcast = '255.255.255.255', port = 9): Promise<void> {
  const clean = mac.replace(/[^a-fA-F0-9]/g, '');
  if (clean.length !== 12) {
    return Promise.reject(new Error('Invalid MAC address'));
  }
  const macBytes = Buffer.from(clean.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
  const packet = Buffer.alloc(6 + 16 * 6);
  packet.fill(0xff, 0, 6);
  for (let i = 0; i < 16; i++) {
    macBytes.copy(packet, 6 + i * 6);
  }

  return new Promise((resolve, reject) => {
    const socket = createSocket('udp4');
    socket.on('error', reject);
    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, port, broadcast, (err) => {
        socket.close();
        if (err) reject(err);
        else resolve();
      });
    });
  });
}
