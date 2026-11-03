export function firstFieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
