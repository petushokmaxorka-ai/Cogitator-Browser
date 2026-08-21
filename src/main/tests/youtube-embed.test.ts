import { describe, expect, it } from 'vitest';
import { buildYoutubeEmbedUrl } from '../../shared/youtube-embed';

describe('buildYoutubeEmbedUrl', () => {
  it('includes video id, start, and origin params', () => {
    const url = buildYoutubeEmbedUrl('dQw4w9WgXcQ', 42);
    expect(url).toContain('youtube.com/embed/dQw4w9WgXcQ');
    expect(url).toContain('autoplay=1');
    expect(url).toContain('start=42');
    expect(url).toContain('origin=');
    expect(url).toContain('widget_referrer=');
  });

  it('floors negative start to zero', () => {
    const url = buildYoutubeEmbedUrl('abc12345678', -5);
    expect(url).toContain('start=0');
  });
});
