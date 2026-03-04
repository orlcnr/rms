import { ZodError } from 'zod';

export function getValidationMessage(error: unknown): string {
  if (error instanceof ZodError) {
    const issue = error.issues[0];

    if (!issue) {
      return 'Validation failed';
    }

    if (issue.path.length > 0) {
      return `${humanizePath(issue.path.join('.'))}: ${issue.message}`;
    }

    return issue.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Validation failed';
}

function humanizePath(path: string) {
  return path
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
