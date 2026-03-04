export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [rawKey, ...rest] = cookie.trim().split('=');

    if (rawKey === name) {
      return decodeURIComponent(rest.join('='));
    }
  }

  return undefined;
}
