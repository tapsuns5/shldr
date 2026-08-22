import {
  GmailIcon,
  GoogleCalendarIcon,
  IcloudPhotosIcon,
  GoogleMapsIcon,
  TripitIcon,
  OutlookIcon,
} from "./logos";

const integrations = [
  { name: "Gmail", icon: GmailIcon },
  { name: "Google Calendar", icon: GoogleCalendarIcon },
  { name: "iCloud Photos", icon: IcloudPhotosIcon },
  { name: "Maps", icon: GoogleMapsIcon },
  { name: "TripIt Import", icon: TripitIcon },
  { name: "Outlook", icon: OutlookIcon },
];

export function IntegrationsSection() {
  return (
    <section className="border-y border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-0">
          <p className="shrink-0 text-xs font-semibold text-muted-foreground sm:pr-6">
            Works with the tools you love
          </p>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <div className="flex flex-wrap items-center justify-center gap-5 sm:justify-start sm:gap-8 sm:pl-6">
            {integrations.map(({ name, icon: Icon }) => (
              <div key={name} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
