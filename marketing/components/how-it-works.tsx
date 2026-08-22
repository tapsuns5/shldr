const steps = [
  {
    number: "01",
    title: "Connect your inbox",
    description:
      "Link your Gmail account or forward confirmation emails to your Shldr address. We handle the rest.",
  },
  {
    number: "02",
    title: "We extract the details",
    description:
      "Our parser pulls out flights, hotels, rentals, and activities from your emails — no manual entry needed.",
  },
  {
    number: "03",
    title: "Track and share",
    description:
      "View your full itinerary on a timeline and map. Invite companions to collaborate on shared trips.",
  },
];

export function HowItWorksSection() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <section id="how-it-works" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Three steps from inbox chaos to organized itinerary.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              <div className="text-5xl font-bold text-primary/20">{step.number}</div>
              <h3 className="mt-4 text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-base text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href={`${appUrl}/signup`}
            className="inline-flex rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Get started now
          </a>
        </div>
      </div>
    </section>
  );
}
