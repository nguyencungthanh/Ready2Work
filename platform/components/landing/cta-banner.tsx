import Link from "next/link";
import { ScrollFadeIn } from "./scroll-fade-in";

export function CtaBanner() {
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <ScrollFadeIn>
          <div className="rounded-2xl border border-border bg-background p-12 text-center shadow-sm sm:p-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Ready to plan your next career move?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Create a free account to take the Career Discovery assessment, generate an AI roadmap,
              and start practicing today.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="rounded-md bg-primary px-8 py-3 text-base font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md"
              >
                Create free account
              </Link>
              <Link
                href="/signin"
                className="rounded-md border-2 border-border px-8 py-3 text-base font-semibold text-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
              >
                Sign in
              </Link>
            </div>
          </div>
        </ScrollFadeIn>
      </div>
    </section>
  );
}
