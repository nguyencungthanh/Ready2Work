"use client";

import { useEffect } from "react";

/** Restore fragment navigation after the async landing markup is committed. */
export function LandingHashScroll() {
  useEffect(() => {
    function scrollToSection() {
      if (!window.location.hash) return;
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (!target) return;
      const header = document.querySelector("header.app-navigation, .reference-landing > nav");
      const offset = (header?.getBoundingClientRect().height ?? 0) + 16;
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: "instant" });
    }

    const frame = requestAnimationFrame(scrollToSection);
    window.addEventListener("hashchange", scrollToSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", scrollToSection);
    };
  }, []);

  return null;
}
