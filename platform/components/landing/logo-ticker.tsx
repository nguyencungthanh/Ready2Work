const COMPANIES = [
  "Deloitte Vietnam",
  "PwC Vietnam",
  "EY Vietnam",
  "KPMG Vietnam",
  "Vietcombank",
  "Techcombank",
  "MB Bank",
  "VPBank",
  "FPT Software",
  "Viettel Solutions",
  "VNG Corporation",
  "KMS Technology",
  "Unilever Vietnam",
  "Nestlé Vietnam",
  "Shopee Vietnam",
  "Masan Consumer",
  "DHL Supply Chain",
  "Maersk Vietnam",
  "Gemadept",
  "Viettel Post",
];

export function LogoTicker() {
  const items = [...COMPANIES, ...COMPANIES];

  return (
    <section className="border-y border-border bg-surface py-12">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-widest text-muted">
          Trusted by leading educational institutions and top employers
        </p>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-surface to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-surface to-transparent" />
          <div className="animate-ticker flex w-max gap-16 whitespace-nowrap">
            {items.map((company, index) => (
              <span
                key={`${company}-${index}`}
                className="text-2xl font-bold text-muted opacity-50 transition-opacity duration-200 hover:text-foreground hover:opacity-100"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
