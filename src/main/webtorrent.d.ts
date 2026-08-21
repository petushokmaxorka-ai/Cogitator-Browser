declare module 'webtorrent' {
  import { EventEmitter } from 'events';

  export interface TorrentFile {
    name: string;
    path: string;
    length: number;
    downloaded: number;
    progress: number;
    getBlobURL(cb: (err: Error | null, url: string) => void): void;
    createReadStream(opts?: { start?: number; end?: number }): NodeJS.ReadableStream;
    getBuffer(cb: (err: Error | null, buf: Buffer) => void): void;
  }

  export interface Torrent extends EventEmitter {
    infoHash: string;
    magnetURI: string;
    name: string;
    files: TorrentFile[];
    length: number;
    downloaded: number;
    uploaded: number;
    downloadSpeed: number;
    uploadSpeed: number;
    progress: number;
    numPeers: number;
    done: boolean;
    paused: boolean;
    timeRemaining: number;
    ready: boolean;
    destroyed: boolean;
    path: string;
    announce: string[];

    pause(): void;
    resume(): void;
    destroy(cb?: (err?: Error) => void): void;
    addPeer(peer: string): boolean;
    removePeer(peer: string): void;
    select(start: number, end: number, priority?: number): void;
    deselect(start: number, end: number, priority?: number): void;
    critical(start: number, end: number): void;
    createServer(): any;
  }

  export interface ClientOptions {
    dht?: boolean | Record<string, unknown>;
    maxConns?: number;
    tracker?: boolean | Record<string, unknown>;
    webSeeds?: boolean;
  }

  export interface Instance extends EventEmitter {
    on(event: 'error', listener: (err: Error) => void): this;
    add(
      torrentId: string | Buffer | File,
      opts?: { path?: string; name?: string; announce?: string[] } & ClientOptions,
      cb?: (torrent: Torrent) => void
    ): Torrent;
    remove(
      torrentId: string | Buffer | Torrent,
      opts?: { destroyStore?: boolean },
      cb?: (err?: Error) => void
    ): void;
    get(torrentId: string): Torrent | undefined;
    destroy(cb?: (err?: Error) => void): void;
    downloadSpeed: number;
    uploadSpeed: number;
    progress: number;
    ratio: number;
  }

  class WebTorrent extends EventEmitter implements Instance {
    constructor(opts?: ClientOptions);
    on(event: 'error', listener: (err: Error) => void): this;
    add(torrentId: string | Buffer | File, opts?: any, cb?: (torrent: Torrent) => void): Torrent;
    remove(torrentId: string | Buffer | Torrent, opts?: any, cb?: (err?: Error) => void): void;
    get(torrentId: string): Torrent | undefined;
    destroy(cb?: (err?: Error) => void): void;
    downloadSpeed: number;
    uploadSpeed: number;
    progress: number;
    ratio: number;
  }

  export default WebTorrent;
}
