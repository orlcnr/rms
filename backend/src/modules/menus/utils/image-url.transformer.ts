export function normalizeImageUrl(
  imageUrl?: string | null,
): string | undefined {
  if (!imageUrl) {
    return undefined;
  }

  const domain = process.env.FILE_DOMAIN || 'https://api.localhost';

  if (imageUrl.startsWith('http')) {
    if (imageUrl.includes('api.localhost') && !imageUrl.startsWith(domain)) {
      return imageUrl.replace(/https?:\/\/api\.localhost/, domain);
    }

    return imageUrl;
  }

  return `${domain}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
}
