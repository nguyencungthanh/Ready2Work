"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/career-discovery", label: "Career Discovery" },
  { href: "#roadmap", label: "AI Roadmap" },
  { href: "#simulations", label: "Job Simulations" },
  { href: "#features", label: "Features" },
];

export function Navbar({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 z-50 h-20 w-full border-b transition-all duration-300 ${
          scrolled
            ? "border-border bg-background/90 shadow-sm backdrop-blur-md"
            : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-foreground">
            <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-primary to-accent" />
            Ready<span className="text-primary">2</span>Work
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted transition-colors duration-200 hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden items-center gap-4 md:flex">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  className="rounded-md border-2 border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:border-primary hover:text-primary"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-md"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          <button
            aria-label="Toggle Menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="relative z-50 h-5 w-8 md:hidden"
          >
            <span
              className={`absolute left-0 top-0 block h-0.5 w-full bg-foreground transition-transform duration-300 ${
                menuOpen ? "translate-y-[9px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[9px] block h-0.5 w-full bg-foreground transition-opacity duration-300 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 block h-0.5 w-full bg-foreground transition-transform duration-300 ${
                menuOpen ? "-translate-y-[9px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 flex items-center justify-center bg-background transition-opacity duration-300 md:hidden ${
          menuOpen ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="text-2xl font-semibold text-foreground"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-4 flex w-full flex-col gap-4">
            {signedIn ? (
              <Link
                href="/dashboard"
                onClick={closeMenu}
                className="rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/signin"
                  onClick={closeMenu}
                  className="rounded-md border-2 border-border px-4 py-3 text-center text-sm font-semibold text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMenu}
                  className="rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
