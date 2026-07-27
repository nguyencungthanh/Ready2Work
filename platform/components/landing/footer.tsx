import Link from "next/link";

const PLATFORM_LINKS = [
  { href: "/career-discovery", label: "Career Discovery" },
  { href: "/roadmap", label: "AI Roadmap" },
  { href: "/simulations", label: "Job Simulations" },
  { href: "/interviews", label: "Interview Practice" },
];

export function Footer() {
  return (
    <footer className="border-t border-border py-16">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 md:grid-cols-[2fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-foreground">
              <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-primary to-accent" />
              Ready<span className="text-primary">2</span>Work
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted">
              Bridging the gap between education and employment through AI-driven career
              preparation.
            </p>
          </div>
          <div>
            <h4 className="text-base font-semibold text-foreground">Platform</h4>
            <div className="mt-4 flex flex-col gap-3">
              {PLATFORM_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted transition-colors duration-200 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8 text-sm text-muted">
          &copy; 2026 Ready2Work. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
