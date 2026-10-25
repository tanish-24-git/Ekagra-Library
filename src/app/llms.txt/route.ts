import { amenities, faqs, site } from "@/content/site";
import { absoluteUrl } from "@/lib/site-url";

// /llms.txt: a plain-text summary for AI assistants and answer engines
// (see llmstxt.org). Built from the same content as the site, at build time.
export function GET() {
  const body = `# ${site.name} (${site.marathiName})

> ${site.description}

${site.name} is a study library (abhyasika) in ${site.area}, ${site.city}, Maharashtra, India, for students preparing for UPSC, MPSC, NEET, JEE and every other competitive exam.

## Key facts

- Address: ${site.address.join(", ")}
- Phone and WhatsApp: ${site.phone}
- Hours: every day, ${site.hours}. ${site.days}
- Map: ${site.mapsUrl}
${amenities.map((a) => `- ${a.title}: ${a.body}`).join("\n")}

## Questions

${faqs.map((f) => `### ${f.q}\n\n${f.a}`).join("\n\n")}

## Pages

- [Home](${absoluteUrl("/")}): facilities, a day at the library, questions, address and enquiry form
- [Gallery](${absoluteUrl("/gallery")}): photos and a walkthrough video of the reading hall
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
