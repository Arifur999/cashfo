// Notification templates use {{name}} placeholders the backend fills in at
// send time. A typo'd placeholder would reach users verbatim, so edits are
// checked against the template's declared variables (unit-tested).

const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

// Every distinct placeholder name, in first-seen order.
export const extractPlaceholders = (text: string): string[] => [...new Set([...text.matchAll(PLACEHOLDER_PATTERN)].map((match) => match[1]))];

export const findUnknownPlaceholders = (text: string, allowed: readonly string[]): string[] =>
  extractPlaceholders(text).filter((name) => !allowed.includes(name));

// The text with each {{placeholder}} replaced by its sample, as a preview
// reads; a placeholder with no sample stays as it is.
export const fillPlaceholders = (text: string, values: Record<string, string>): string =>
  text.replace(PLACEHOLDER_PATTERN, (match, name: string) => values[name] ?? match);

// The error for a field, or undefined when every placeholder is declared.
export const getPlaceholderError = (text: string, allowed: readonly string[]): string | undefined => {
  const unknown = findUnknownPlaceholders(text, allowed);
  if (unknown.length === 0) {
    return undefined;
  }
  const listed = unknown.map((name) => `{{${name}}}`).join(", ");
  return `Not a variable of this template: ${listed}`;
};
