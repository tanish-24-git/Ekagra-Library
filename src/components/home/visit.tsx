import { site } from "@/content/site";
import { EnquiryForm } from "./enquiry-form";

export function Visit() {
  return (
    <section id="visit" aria-labelledby="visit-title" className="bg-linen">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-5 py-28 md:grid-cols-12 md:gap-6 md:px-10 md:py-40">
        <div className="md:col-span-4">
          <h2 id="visit-title" className="font-display text-h2 tracking-[-0.015em]">
            Visit the library in {site.area}
          </h2>
          <p className="mt-5 max-w-[32ch] text-lead text-ink-soft">
            Come and see the hall, or send an enquiry and we’ll call you back.
          </p>

          <dl className="mt-12 space-y-7">
            <div>
              <dt className="text-caption text-ink-soft">Address</dt>
              <dd className="mt-1">
                <address className="not-italic">
                  {site.address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <a href={site.directionsUrl} target="_blank" rel="noreferrer" className="link-quiet mt-2 inline-block">
                  Get directions
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-soft">Hours</dt>
              <dd className="mt-1">
                Every day, {site.hours}
                <span className="block text-ink-soft">{site.days}</span>
              </dd>
            </div>
            <div>
              <dt className="text-caption text-ink-soft">Talk to us</dt>
              <dd className="mt-1 flex flex-col items-start gap-1">
                <a href={site.phoneHref} className="link-quiet">
                  Call {site.phone}
                </a>
                <a href={site.whatsappHref} target="_blank" rel="noreferrer" className="link-quiet">
                  Message on WhatsApp
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <div id="enquiry" className="scroll-mt-28 md:col-span-7 md:col-start-6 md:pt-3">
          <h3 className="font-display text-h3">Send an enquiry</h3>
          <p className="mt-3 mb-10 max-w-[44ch] text-ink-soft">Tell us a little about yourself. Only your name and number are required.</p>
          <EnquiryForm />
        </div>

        {/* Google's keyless embed: free, no API key or billing account. */}
        <figure className="md:col-span-12 md:mt-14">
          <div className="overflow-hidden rounded-[1.5rem] border border-rule bg-sand">
            <iframe
              title={`Map showing ${site.name} in ${site.area}, ${site.city}`}
              src={site.mapEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="block h-[320px] w-full [filter:grayscale(0.25)_sepia(0.12)] md:h-[440px]"
            />
          </div>
          <figcaption className="mt-3 flex flex-col gap-1 text-caption text-ink-soft sm:flex-row sm:justify-between sm:gap-6">
            <span>{site.address.join(", ")}</span>
            <a href={site.mapsUrl} target="_blank" rel="noreferrer" className="link-quiet shrink-0 text-ink">
              Open in Google Maps
            </a>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
