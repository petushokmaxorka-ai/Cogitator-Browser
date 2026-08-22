// Docker CLI bridge — lists and controls containers/images/volumes/networks

import { runCommand, commandExists } from './exec-util';

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  ports: string;
  created: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
  created: string;
}

export interface DockerVolume {
  name: string;
  driver: string;
  mountpoint: string;
}

export interface DockerNetwork {
  id: string;
  name: string;
  driver: string;
  scope: string;
}

async function requireDocker(): Promise<void> {
  if (!(await commandExists('docker'))) {
    throw new Error('docker CLI not found — install Docker or add to PATH');
  }
}

function parseTableLines(output: string): string[][] {
  return output
    .split('\n')
    .filter((l) => l.trim())
    .map((line) => line.split('\t'));
}

export class DockerManager {
  async listContainers(all = true): Promise<DockerContainer[]> {
    await requireDocker();
    const args = ['ps', '--format', '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}\t{{.CreatedAt}}'];
    if (all) args.splice(1, 0, '-a');
    const out = await runCommand('docker', args);
    return parseTableLines(out).map((cols) => ({
      id: cols[0] ?? '',
      name: cols[1] ?? '',
      image: cols[2] ?? '',
      status: cols[3] ?? '',
      ports: cols[4] ?? '',
      created: cols[5] ?? '',
    }));
  }

  async listImages(): Promise<DockerImage[]> {
    await requireDocker();
    const out = await runCommand('docker', [
      'images',
      '--format',
      '{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}',
    ]);
    return parseTableLines(out).map((cols) => ({
      id: cols[0] ?? '',
      repository: cols[1] ?? '',
      tag: cols[2] ?? '',
      size: cols[3] ?? '',
      created: cols[4] ?? '',
    }));
  }

  async listVolumes(): Promise<DockerVolume[]> {
    await requireDocker();
    const out = await runCommand('docker', [
      'volume',
      'ls',
      '--format',
      '{{.Name}}\t{{.Driver}}\t{{.Mountpoint}}',
    ]);
    return parseTableLines(out).map((cols) => ({
      name: cols[0] ?? '',
      driver: cols[1] ?? '',
      mountpoint: cols[2] ?? '',
    }));
  }

  async listNetworks(): Promise<DockerNetwork[]> {
    await requireDocker();
    const out = await runCommand('docker', [
      'network',
      'ls',
      '--format',
      '{{.ID}}\t{{.Name}}\t{{.Driver}}\t{{.Scope}}',
    ]);
    return parseTableLines(out).map((cols) => ({
      id: cols[0] ?? '',
      name: cols[1] ?? '',
      driver: cols[2] ?? '',
      scope: cols[3] ?? '',
    }));
  }

  async startContainer(id: string): Promise<void> {
    await requireDocker();
    await runCommand('docker', ['start', id]);
  }

  async stopContainer(id: string): Promise<void> {
    await requireDocker();
    await runCommand('docker', ['stop', id]);
  }

  async restartContainer(id: string): Promise<void> {
    await requireDocker();
    await runCommand('docker', ['restart', id]);
  }

  async containerLogs(id: string, tail = 200): Promise<string> {
    await requireDocker();
    return runCommand('docker', ['logs', '--tail', String(tail), id]);
  }

  async removeContainer(id: string, force = false): Promise<void> {
    await requireDocker();
    const args = ['rm'];
    if (force) args.push('-f');
    args.push(id);
    await runCommand('docker', args);
  }
}

export default DockerManager;
