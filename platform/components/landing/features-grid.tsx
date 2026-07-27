import { ScrollFadeIn } from "./scroll-fade-in";

const FEATURES = [
  {
    title: "Career Discovery",
    desc: "Identify suitable career paths based on your personality, interests, and strengths using our advanced AI assessments.",
    icon: (
      <path d="M12 12l4-4m-8 8 4-4M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
    ),
  },
  {
    title: "AI Roadmap",
    desc: "Get a personalized learning and career preparation roadmap tailored to your specific profile and career goals.",
    icon: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10" />,
  },
  {
    title: "Job Simulation",
    desc: "Experience realistic work tasks directly from partner companies and receive AI evaluation on your performance.",
    icon: <path d="M2 3h20v14H2zM8 21h8M12 17v4" />,
  },
  {
    title: "Interview Practice",
    desc: "Prepare for interviews using unbiased AI evaluation or schedule one-on-one sessions with experienced mentors.",
    icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
  {
    title: "Mentor Community",
    desc: "Connect with industry professionals for career guidance, interview preparation, and long-term networking.",
    icon: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  },
  {
    title: "Certification",
    desc: "Earn verified digital certificates upon completing your personalized roadmap and job simulations.",
    icon: (
      <>
        <circle cx="12" cy="8" r="7" />
        <path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.11" />
      </>
    ),
  },
];

export function FeaturesGrid() {
  return (
    <section id="features" className="py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <ScrollFadeIn className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Your Complete <span className="text-primary">Career Journey</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            Everything you need to discover, prepare, and land your dream job in one platform.
          </p>
        </ScrollFadeIn>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <ScrollFadeIn key={feature.title} delayMs={(index % 3) * 100}>
              <div className="h-full rounded-2xl border border-border bg-background p-10 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7 text-primary"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm text-muted">{feature.desc}</p>
              </div>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
