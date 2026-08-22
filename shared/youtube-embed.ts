/** YouTube embed URL for PiP — origin params required for autoplay outside youtube.com. */
export function buildYoutubeEmbedUrl(videoId: string, startSec = 0): string {
  const id = encodeURIComponent(videoId);
  const start = Math.max(0, Math.floor(startSec));
  const origin = encodeURIComponent('https://www.youtube.com');
  return (
    `https://www.youtube.com/embed/${id}` +
    `?autoplay=1&start=${start}&rel=0&modestbranding=1&playsinline=1` +
    `&enablejsapi=1&origin=${origin}&widget_referrer=${origin}`
  );
}
