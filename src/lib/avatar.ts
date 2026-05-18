/**
 * Resolve the correct avatar URL to display.
 * - Pro users: animated GIF allowed (returns avatar_url)
 * - Non-Pro users: static first-frame only (returns avatar_static_url)
 *   Falls back to avatar_url for non-GIF images, or null (→ initials) for GIFs with no static.
 */
export function resolveAvatar(
  avatar_url: string | null | undefined,
  avatar_static_url: string | null | undefined,
  is_pro?: boolean | null,
): string | null {
  if (is_pro && avatar_url) return avatar_url;
  if (avatar_static_url) return avatar_static_url;
  if (avatar_url?.toLowerCase().endsWith(".gif")) return null;
  return avatar_url ?? null;
}
