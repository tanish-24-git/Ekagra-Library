import { isUsingMockData } from "@/lib/students";

export function MockNotice() {
  if (!isUsingMockData()) return null;
  return (
    <p className="mb-8 border-l-2 border-due bg-linen px-4 py-3 text-caption text-ink-soft">
      Showing sample data. Changes last until the server restarts. Add <code className="text-ink">DATABASE_URL</code> to{" "}
      <code className="text-ink">.env</code> to connect Neon.
    </p>
  );
}
