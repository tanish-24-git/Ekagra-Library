// Structured data as a JSON-LD script. Indented so it reads cleanly in View
// Source; "<" is escaped so no string in it can close the script tag.
export function JsonLd({ id, data }: { id: string; data: object }) {
  return (
    <script
      type="application/ld+json"
      id={`schema-${id}`}
      dangerouslySetInnerHTML={{ __html: `\n${JSON.stringify(data, null, 2).replace(/</g, "\\u003c")}\n` }}
    />
  );
}
