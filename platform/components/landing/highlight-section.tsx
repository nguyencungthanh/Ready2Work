import Image from "next/image";
import Link from "next/link";
import { ScrollFadeIn } from "./scroll-fade-in";

export function HighlightSection({
  id,
  badge,
  title,
  highlight,
  description,
  points,
  ctaLabel,
  ctaHref,
  ctaVariant = "outline",
  image,
  imageAlt,
  reverse = false,
  glow = "teal",
}: {
  id?: string;
  badge: string;
  title: string;
  highlight: string;
  description: string;
  points: string[];
  ctaLabel: string;
  ctaHref: string;
  ctaVariant?: "outline" | "primary";
  image: string;
  imageAlt: string;
  reverse?: boolean;
  glow?: "teal" | "gold";
}) {
  const ctaClasses =
    ctaVariant === "primary"
      ? "bg-primary text-white hover:bg-primary-hover"
      : "border-2 border-border text-foreground hover:border-primary hover:text-primary";

  return (
    <section id={id} className="py-24">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2 lg:px-8 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <ScrollFadeIn direction={reverse ? "right" : "left"}>
          <div className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary">
            {badge}
          </div>
          <h2 className="mt-6 text-3xl font-bold text-foreground sm:text-4xl">
            {title} <span className="text-primary">{highlight}</span>
          </h2>
          <p className="mt-6 text-lg text-muted">{description}</p>
          <ul className="mt-8 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-3 text-base font-medium text-foreground">
                <span className="font-bold text-primary">✓</span>
                {point}
              </li>
            ))}
          </ul>
          <Link
            href={ctaHref}
            className={`mt-8 inline-flex items-center rounded-md px-6 py-3 text-base font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${ctaClasses}`}
          >
            {ctaLabel}
          </Link>
        </ScrollFadeIn>

        <ScrollFadeIn direction={reverse ? "left" : "right"} delayMs={150}>
          <div className="relative">
            <div
              className={`absolute inset-0 -z-10 rounded-full opacity-20 blur-3xl ${
                glow === "gold" ? "bg-accent" : "bg-primary"
              }`}
            />
            <Image
              src={image}
              alt={imageAlt}
              width={800}
              height={800}
              className="animate-float rounded-2xl border border-border shadow-2xl"
            />
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
