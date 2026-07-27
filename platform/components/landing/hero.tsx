import Image from "next/image";
import Link from "next/link";
import { ScrollFadeIn } from "./scroll-fade-in";

const STATS = [
  { number: "10k+", label: "Students" },
  { number: "50+", label: "Universities" },
  { number: "100+", label: "Top Employers" },
];

export function Hero() {
  return (
    <header className="relative overflow-hidden pt-36 pb-24">
      <div
        className="pointer-events-none absolute -top-1/5 -right-1/10 h-[800px] w-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(0,139,139,0.12) 0%, rgba(0,139,139,0) 70%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-6 lg:grid-cols-2 lg:px-8">
        <ScrollFadeIn>
          <div className="inline-block rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-primary">
            Next-Gen Career Prep
          </div>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight text-foreground sm:text-6xl">
            Get noticed.
            <br />
            <span className="text-primary">Get hired.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted">
            Explore careers and prepare for the job market with AI-driven roadmaps, real-world job
            simulations, and expert mentorship.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/career-discovery"
              className="inline-flex items-center rounded-md bg-primary px-8 py-3 text-lg font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg"
            >
              Start Assessment <span className="ml-2">→</span>
            </Link>
            <a
              href="#features"
              className="inline-flex items-center rounded-md border-2 border-border bg-surface px-8 py-3 text-lg font-semibold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:border-primary"
            >
              View Features
            </a>
          </div>
          <div className="mt-12 flex gap-10 border-t border-border pt-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{stat.number}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </ScrollFadeIn>

        <ScrollFadeIn direction="left" delayMs={150}>
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-primary opacity-20 blur-3xl" />
            <Image
              src="/landing-hero.jpg"
              alt="Student using educational technology"
              width={736}
              height={736}
              className="rounded-2xl border border-border shadow-2xl"
              priority
            />
          </div>
        </ScrollFadeIn>
      </div>
    </header>
  );
}
