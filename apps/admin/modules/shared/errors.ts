export function formatAdminErrorMessage(input: unknown): string {
  if (!input) {
    return 'Request failed';
  }

  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof Error) {
    return formatAdminErrorMessage(input.message);
  }

  if (Array.isArray(input)) {
    return input.map((item) => formatAdminErrorMessage(item)).join(', ');
  }

  if (typeof input === 'object') {
    const candidate = input as Record<string, unknown>;

    if ('message' in candidate) {
      return formatAdminErrorMessage(candidate.message);
    }

    if ('errors' in candidate) {
      return formatAdminErrorMessage(candidate.errors);
    }

    const entries = Object.entries(candidate);

    if (entries.length === 0) {
      return 'Request failed';
    }

    return entries
      .map(([key, value]) => `${key}: ${formatAdminErrorMessage(value)}`)
      .join(', ');
  }

  return String(input);
}
