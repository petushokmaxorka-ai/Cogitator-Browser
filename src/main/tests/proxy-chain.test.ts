import { describe, expect, it } from 'vitest';
import { buildProxyChain } from '../proxy-manager';

describe('buildProxyChain', () => {
  it('falls back to DIRECT when nothing was picked', () => {
    expect(buildProxyChain(null)).toBe('DIRECT');
  });

  it('keeps the http-mixed port as PROXY and the socks port as SOCKS', () => {
    expect(buildProxyChain({ rules: 'http=127.0.0.1:7890;socks5://127.0.0.1:7891' })).toBe(
      'PROXY 127.0.0.1:7890; SOCKS 127.0.0.1:7891; DIRECT',
    );
  });

  it('never tries a socks-only port as an HTTP proxy', () => {
    expect(buildProxyChain({ rules: 'socks5://127.0.0.1:10808' })).toBe(
      'SOCKS 127.0.0.1:10808; DIRECT',
    );
  });

  it('carries COGITATOR_PROXY rules over, including remote hosts', () => {
    expect(buildProxyChain({ rules: 'socks5://10.0.0.2:1080' })).toBe('SOCKS 10.0.0.2:1080; DIRECT');
    expect(buildProxyChain({ rules: 'proxy.example:3128' })).toBe('PROXY proxy.example:3128; DIRECT');
    expect(buildProxyChain({ rules: 'http://proxy.example:8080' })).toBe(
      'PROXY proxy.example:8080; DIRECT',
    );
  });
});
