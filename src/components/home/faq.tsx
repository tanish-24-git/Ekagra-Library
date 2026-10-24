import { faqs } from "@/content/site";

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="mx-auto max-w-[1440px] px-5 pb-28 md:px-10 md:pb-36">
      <div className="grid gap-12 md:grid-cols-12 md:gap-6">
        <h2 id="faq-title" className="font-display text-h2 tracking-[-0.015em] md:col-span-4">
          Questions
        </h2>
        <div className="md:col-span-7 md:col-start-6">
          {faqs.map((item) => (
            <details key={item.q} className="group border-t border-rule last:border-b">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-6 py-6 font-display text-[1.375rem] leading-snug [&::-webkit-details-marker]:hidden">
                {item.q}
                <span aria-hidden className="relative h-3 w-3 shrink-0 self-center">
                  <span className="absolute top-1/2 left-0 h-px w-3 bg-ink" />
                  <span className="absolute top-0 left-1/2 h-3 w-px bg-ink transition-transform duration-300 ease-quiet group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-[60ch] pb-7 text-ink-soft">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
