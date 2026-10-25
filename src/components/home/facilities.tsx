import { ParallaxImage } from "@/components/ui/parallax-image";
import { photos } from "@/content/images";
import { amenities } from "@/content/site";

export function Facilities() {
  return (
    <section id="facilities" aria-labelledby="facilities-title" className="mx-auto max-w-[1440px] px-5 pb-32 md:px-10 md:pb-48">
      <div className="grid gap-16 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-5">
          <div className="md:sticky md:top-28">
            <h2 id="facilities-title" className="font-display text-h2 tracking-[-0.015em]">
              Facilities at the library
            </h2>
            <p className="mt-5 max-w-[34ch] text-lead text-ink-soft">
              The basics, done properly, so nothing pulls you away from the page.
            </p>
            <ParallaxImage
              photo={photos.fountainPen}
              arch
              sizes="(min-width: 768px) 30vw, 80vw"
              className="mt-12 aspect-[3/4] w-[78%] max-w-[420px]"
            />
          </div>
        </div>

        <dl className="md:col-span-6 md:col-start-7 md:pt-3">
          {amenities.map((item) => (
            <div key={item.title} className="grid gap-1 border-t border-rule py-7 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-8">
              <dt className="font-display text-[1.5rem] leading-tight">{item.title}</dt>
              <dd className="text-ink-soft">{item.body}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ParallaxImage photo={photos.booksByWindow} sizes="100vw" drift={10} className="mt-24 aspect-[4/3] w-full md:mt-36 md:aspect-[21/9]" />
    </section>
  );
}
