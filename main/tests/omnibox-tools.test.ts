import { describe, expect, it } from 'vitest';
import { getLocalIp, getLocalTimeInZone, sanitizeDomain } from '../omnibox-tools';

describe('omnibox-tools', () => {
  it('sanitizeDomain accepts bare domains and strips scheme/path', () => {
    expect(sanitizeDomain('example.com')).toBe('example.com');
    expect(sanitizeDomain('https://Example.COM/path')).toBe('example.com');
  });

  it('sanitizeDomain rejects invalid hostnames', () => {
    expect(() => sanitizeDomain('not a domain')).toThrow('Invalid domain');
    expect(() => sanitizeDomain('')).toThrow('Invalid domain');
  });

  it('getLocalIp returns an IPv4 string', () => {
    const ip = getLocalIp();
    expect(ip).toMatch(/^(\d{1,3}\.){3}\d{1,3}$/);
  });

  it('getLocalTimeInZone resolves known cities', () => {
    const moscow = getLocalTimeInZone('Moscow');
    expect(moscow.zone).toBe('Europe/Moscow');
    expect(moscow.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    expect(moscow.date.length).toBeGreaterThan(5);
  });

  it('getLocalTimeInZone accepts IANA zones', () => {
    const utc = getLocalTimeInZone('UTC');
    expect(utc.zone).toBe('UTC');
  });

  it('getLocalTimeInZone rejects unknown cities', () => {
    expect(() => getLocalTimeInZone('NotACityXYZ')).toThrow('Unknown city/timezone');
  });
});
