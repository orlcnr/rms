export function normalizeFrontendUrl(frontendUrl: string): string {
  try {
    const parsedUrl = new URL(frontendUrl);

    if (parsedUrl.hostname === 'app.localhost') {
      parsedUrl.hostname = 'rms.localhost';
    }

    return parsedUrl.toString().replace(/\/$/, '');
  } catch {
    return frontendUrl
      .replace('://app.localhost', '://rms.localhost')
      .replace(/\/$/, '');
  }
}
