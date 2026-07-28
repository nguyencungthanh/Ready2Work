import { hasAuthenticatedSession } from "@/lib/auth/session";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { LogoTicker } from "@/components/landing/logo-ticker";
import { PartnerCourses } from "@/components/landing/partner-courses";
import { FeaturesGrid } from "@/components/landing/features-grid";
import { HighlightSection } from "@/components/landing/highlight-section";
import { CtaBanner } from "@/components/landing/cta-banner";
import { Footer } from "@/components/landing/footer";

export default async function HomePage() {
  const signedIn = await hasAuthenticatedSession();

  return (
    <>
      <Navbar signedIn={signedIn} />
      <main>
        <Hero />
        <LogoTicker />
        <PartnerCourses />
        <FeaturesGrid />
        <HighlightSection
          id="roadmap"
          badge="Personalized AI Roadmap"
          title="Your unique path to"
          highlight="success"
          description="Our AI analyzes your Career Discovery results, current skills, and career goals to generate a comprehensive roadmap. Track your learning progress, discover recommended resources, and identify skill gaps automatically."
          points={[
            "Learning roadmap by stage",
            "CV vs Job Description gap analysis",
            "Direct access to simulations & mentors",
          ]}
          ctaLabel="Generate Roadmap"
          ctaHref="/roadmap/new"
          ctaVariant="outline"
          image="/landing-roadmap.jpg"
          imageAlt="Personalized AI Roadmap"
          glow="teal"
        />
        <HighlightSection
          id="simulations"
          badge="Job Simulations"
          title="Practice the job before you"
          highlight="get the job"
          description="Complete realistic work tasks drawn from real roles and get instant, rubric-based AI feedback on your performance — no waiting for a hiring manager to reply."
          points={[
            "Real-world task briefs by industry",
            "Instant AI-scored feedback per criterion",
            "Build a portfolio of completed simulations",
          ]}
          ctaLabel="Try a Simulation"
          ctaHref="/simulations"
          ctaVariant="primary"
          image="/landing-mentor.jpg"
          imageAlt="Job simulation feedback"
          reverse
          glow="gold"
        />
        <CtaBanner />
      </main>
      <Footer />
    </>
  );
}
