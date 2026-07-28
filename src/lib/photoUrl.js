/**
 * Google Drive share links are viewer *pages*, not images — pasting one into an
 * `<img src>` renders nothing. Rewrite the three shapes Drive hands out into the
 * direct-image endpoint so an admin can paste whatever Drive gave them.
 *
 *   https://drive.google.com/file/d/<ID>/view?usp=sharing
 *   https://drive.google.com/open?id=<ID>
 *   https://drive.google.com/uc?export=view&id=<ID>
 *     → https://drive.google.com/thumbnail?id=<ID>&sz=w1000
 *
 * Anything that isn't a Drive link is returned untouched.
 *
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeGoogleDrivePhotoUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^https?:\/\/(drive|docs)\.google\.com\//i.test(raw)) return raw;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  // Already the direct-image endpoint — leave it alone.
  if (url.pathname === '/thumbnail') return raw;

  const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ?? url.searchParams.get('id');
  if (!fileId) return raw;

  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
}

/** @param {unknown} value */
export function isGoogleDriveUrl(value) {
  return /^https?:\/\/(drive|docs)\.google\.com\//i.test(String(value ?? '').trim());
}
