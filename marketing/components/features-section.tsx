import { Briefcase, Map, Wallet, Images, BarChart3, Bell } from "lucide-react";

const features = [
  {
    title: "Smart Itinerary",
    description:
      "We automatically import your reservations and build a beautiful itinerary.",
    icon: Briefcase,
  },
  {
    title: "Travel Map",
    description:
      "See everywhere you've been and where you're going next on an interactive map.",
    icon: Map,
  },
  {
    title: "Track Expenses",
    description:
      "Connect your cards and track trip spending in real time.",
    icon: Wallet,
  },
  {
    title: "Photo Albums",
    description:
      "Import from iCloud and organize your memories by trip.",
    icon: Images,
  },
  {
    title: "Rank & Review",
    description:
      "Rank your trips, countries, restaurants and share your favorites.",
    icon: BarChart3,
  },
  {
    title: "Flight Alerts",
    description:
      "Get real-time flight updates, gate changes, delays and baggage info.",
    icon: Bell,
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need for every trip
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex flex-col items-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white shadow-sm">
                  <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
