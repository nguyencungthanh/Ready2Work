import { ScrollFadeIn } from "./scroll-fade-in";

const COURSES = [
  {
    org: "Stanford University",
    title: "Machine Learning Fundamentals",
    desc: "A foundational course on AI and Machine learning algorithms and statistical models.",
    href: "https://online.stanford.edu/courses",
  },
  {
    org: "Google",
    title: "Data Analytics Professional Certificate",
    desc: "Learn how to analyze and process data to gain key business insights.",
    href: "https://grow.google/certificates/",
  },
  {
    org: "Harvard University",
    title: "CS50: Introduction to Computer Science",
    desc: "The essential introduction to the intellectual enterprises of computer science.",
    href: "https://learning.edx.org/course/course-v1:HarvardX+CS50",
  },
  {
    org: "Microsoft",
    title: "Azure Cloud Developer Simulation",
    desc: "Experience a real-world task building and deploying scalable web apps on Azure.",
    href: "https://www.microsoft.com/en-us/learning",
  },
];

export function PartnerCourses() {
  return (
    <section className="bg-surface py-24">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <ScrollFadeIn className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
            Top <span className="text-primary">Courses & Programs</span>
          </h2>
          <p className="mt-4 text-lg text-muted">
            Explore verified courses and simulations directly from our educational partners and top
            tech companies.
          </p>
        </ScrollFadeIn>

        <div className="grid gap-8 sm:grid-cols-2">
          {COURSES.map((course, index) => (
            <ScrollFadeIn key={course.title} delayMs={index * 100}>
              <a
                href={course.href}
                target="_blank"
                rel="noopener"
                className="block h-full rounded-2xl border border-border bg-background p-8 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
              >
                <div className="text-sm font-bold uppercase tracking-wide text-primary-active">
                  {course.org}
                </div>
                <h3 className="mt-2 text-xl font-semibold text-foreground">{course.title}</h3>
                <p className="mt-3 text-sm text-muted">{course.desc}</p>
                <span className="mt-6 inline-block text-sm font-semibold text-primary transition-all duration-200 group-hover:pl-1">
                  View Course →
                </span>
              </a>
            </ScrollFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
