import Image from "next/image";
import {
  Plane,
  Hotel,
  Utensils,
  Compass,
  Home,
  Map,
  FileText,
  Settings,
  Bell,
  User,
  Menu,
  ChevronRight,
  MoreHorizontal,
  MapPin,
} from "lucide-react";

function StatusTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-primary">
      {children}
    </span>
  );
}

function TimelineItem({
  time,
  tz,
  title,
  details,
  icon: Icon,
  color,
  isFirst,
  isLast,
  tag,
}: {
  time: string;
  tz?: string;
  title: string;
  details: string;
  icon: React.ElementType;
  color: string;
  isFirst?: boolean;
  isLast?: boolean;
  tag?: React.ReactNode;
}) {
  return (
    <div className="flex items-stretch">
      <div className="w-12 shrink-0 pr-2 pt-1 text-right sm:w-14">
        <p className="text-[10px] font-bold leading-none text-foreground sm:text-[11px]">
          {time}
        </p>
        {tz && (
          <p className="mt-0.5 text-[8px] text-muted-foreground sm:text-[9px]">{tz}</p>
        )}
      </div>

      <div className="flex w-7 shrink-0 flex-col items-center">
        <div
          className={`w-0.5 shrink-0 ${isFirst ? "h-2 bg-transparent" : "h-2 bg-border"}`}
        />
        <div
          className="z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
          style={{ backgroundColor: color }}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        </div>
        <div
          className={`w-0.5 min-h-[18px] flex-1 ${isLast ? "bg-transparent" : "bg-border"}`}
        />
      </div>

      <div className="min-w-0 flex-1 pb-3 pl-2.5 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold leading-snug text-primary sm:text-xs">
            {title}
          </p>
          {tag}
        </div>
        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
          {details}
        </p>
      </div>
    </div>
  );
}

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-2xl pb-16 lg:mx-0 lg:pb-10">
      {/* Desktop app window */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-background shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)]">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-border bg-card px-3 py-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex-1 rounded-md bg-muted px-3 py-1">
            <p className="text-center text-[10px] text-muted-foreground">
              app.shldr.com/tripdetails/japan-spring
            </p>
          </div>
        </div>

        <div className="flex min-h-[320px] sm:min-h-[360px]">
          {/* Collapsed app sidebar */}
          <aside className="hidden w-[52px] shrink-0 flex-col border-r border-border bg-background py-2 sm:flex">
            <div className="mb-2 flex justify-center px-1.5 pb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Plane className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center gap-1 px-1.5">
              {[
                { icon: Home, active: false },
                { icon: Plane, active: true },
                { icon: Map, active: false },
                { icon: FileText, active: false },
                { icon: Settings, active: false },
              ].map(({ icon: Icon, active }, i) => (
                <div
                  key={i}
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </div>
              ))}
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* App header */}
            <div className="flex items-center justify-between border-b border-border bg-background px-3 py-2">
              <div className="flex items-center gap-2">
                <Menu className="h-4 w-4 text-muted-foreground sm:hidden" />
                <Image
                  src="/shldr-light.svg"
                  alt="Shldr"
                  width={72}
                  height={28}
                  className="h-5 w-auto"
                  unoptimized
                />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground">
                  <Bell className="h-3.5 w-3.5" />
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Trip detail body */}
            <div className="bg-background p-3 sm:p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground sm:text-base">
                    Japan Spring Adventure
                  </h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                    Mar 15 – Mar 25, 2026 · Tokyo, Japan
                  </p>
                  <div className="mt-1.5 flex -space-x-1.5">
                    {[
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48&h=48&fit=crop&crop=face",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=48&h=48&fit=crop&crop=face",
                      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=48&h=48&fit=crop&crop=face",
                    ].map((src, i) => (
                      <Image
                        key={i}
                        src={src}
                        alt=""
                        width={22}
                        height={22}
                        className="h-[22px] w-[22px] rounded-full border-2 border-background object-cover"
                        unoptimized
                      />
                    ))}
                  </div>
                </div>
                <div className="relative hidden h-16 w-24 overflow-hidden rounded-lg sm:block">
                  <Image
                    src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=200&h=120&fit=crop"
                    alt="Tokyo"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>

              {/* Day header */}
              <div className="mb-1 flex items-center justify-between border-b border-border bg-card py-1.5">
                <div className="flex items-center gap-0.5 pl-[4.5rem] sm:pl-[5.25rem]">
                  <span className="text-[10px] font-bold text-muted-foreground">
                    Sat, Mar 15
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <span className="text-[9px] font-semibold text-primary">+ Add</span>
              </div>

              <div className="mt-1">
                <TimelineItem
                  time="8:20 AM"
                  tz="EDT"
                  title="JFK → NRT"
                  details="AA 175 · American Airlines · 14h 30m"
                  icon={Plane}
                  color="#356a4c"
                  isFirst
                  tag={<StatusTag>On time</StatusTag>}
                />
                <TimelineItem
                  time="3:40 PM"
                  tz="JST"
                  title="Park Hotel Tokyu"
                  details="Check-in · Shibuya, Tokyo"
                  icon={Hotel}
                  color="#4a7fc0"
                />
                <TimelineItem
                  time="7:00 PM"
                  tz="JST"
                  title="Dinner · Sushi Saito"
                  details="Reservation for 2 · Tokyo, Japan"
                  icon={Utensils}
                  color="#c27a2e"
                />
                <TimelineItem
                  time="9:00 AM"
                  tz="JST"
                  title="Shibuya Food Tour"
                  details="Sun, Mar 16 · Guided activity"
                  icon={Compass}
                  color="#7c5cbf"
                  isLast
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Realistic iPhone frame */}
      <div className="absolute -bottom-4 -right-2 w-[148px] sm:-right-8 sm:w-[168px] lg:-right-6">
        <div className="relative rounded-[2.1rem] bg-[#1a1a1a] p-[7px] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.45)] ring-1 ring-black/20">
          {/* Side buttons */}
          <div className="absolute -left-[2px] top-20 h-6 w-[2px] rounded-l-sm bg-[#2a2a2a]" />
          <div className="absolute -left-[2px] top-28 h-10 w-[2px] rounded-l-sm bg-[#2a2a2a]" />
          <div className="absolute -left-[2px] top-40 h-10 w-[2px] rounded-l-sm bg-[#2a2a2a]" />
          <div className="absolute -right-[2px] top-32 h-14 w-[2px] rounded-r-sm bg-[#2a2a2a]" />

          {/* Screen */}
          <div className="relative overflow-hidden rounded-[1.7rem] bg-background">
            {/* Status bar + Dynamic Island */}
            <div className="relative flex h-8 items-end justify-between bg-background px-4 pb-1">
              <span className="text-[9px] font-semibold text-foreground">9:41</span>
              <div className="absolute left-1/2 top-1.5 h-[18px] w-[72px] -translate-x-1/2 rounded-full bg-black" />
              <div className="flex items-center gap-0.5">
                <svg className="h-2.5 w-3.5 text-foreground" viewBox="0 0 16 10" fill="currentColor">
                  <rect x="0" y="6" width="3" height="4" rx="0.5" />
                  <rect x="4.5" y="4" width="3" height="6" rx="0.5" />
                  <rect x="9" y="2" width="3" height="8" rx="0.5" />
                  <rect x="13.5" y="0" width="2.5" height="10" rx="0.5" opacity="0.3" />
                </svg>
                <svg className="h-2.5 w-3 text-foreground" viewBox="0 0 14 10" fill="currentColor">
                  <path d="M7 2.5C9.2 2.5 11.1 3.4 12.4 4.8L13.5 3.7C11.9 1.9 9.6 0.8 7 0.8S2.1 1.9 0.5 3.7L1.6 4.8C2.9 3.4 4.8 2.5 7 2.5Z" opacity="0.4" />
                  <path d="M7 5C8.3 5 9.5 5.5 10.3 6.3L11.4 5.2C10.3 4 8.7 3.3 7 3.3S3.7 4 2.6 5.2L3.7 6.3C4.5 5.5 5.7 5 7 5Z" opacity="0.7" />
                  <circle cx="7" cy="8.5" r="1.3" />
                </svg>
                <svg className="h-2.5 w-5 text-foreground" viewBox="0 0 22 10" fill="currentColor">
                  <rect x="0" y="1" width="18" height="8" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1" />
                  <rect x="1.5" y="2.5" width="12" height="5" rx="0.75" />
                  <rect x="18.5" y="3" width="1.5" height="4" rx="0.5" opacity="0.4" />
                </svg>
              </div>
            </div>

            {/* Mobile app content */}
            <div className="bg-background">
              {/* Mobile header */}
              <div className="flex items-center justify-between border-b border-border px-2.5 py-1.5">
                <Image
                  src="/shldr-light.svg"
                  alt="Shldr"
                  width={56}
                  height={22}
                  className="h-4 w-auto"
                  unoptimized
                />
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>

              {/* Trip hero image */}
              <div className="relative h-[72px] w-full">
                <Image
                  src="https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop"
                  alt="Tokyo skyline"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                <div className="absolute bottom-1.5 left-2 right-2">
                  <p className="text-[10px] font-bold text-white">Japan Spring Adventure</p>
                  <p className="text-[8px] text-white/85">Mar 15–25 · Tokyo</p>
                </div>
              </div>

              {/* Next up + itinerary cards */}
              <div className="space-y-1.5 p-2">
                <div className="rounded-lg border border-border bg-card p-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-[8px] font-medium uppercase tracking-wide text-muted-foreground">
                      Next up
                    </p>
                    <StatusTag>On time</StatusTag>
                  </div>
                  <div className="mt-1 flex items-start gap-1.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-white">
                      <Plane className="h-2.5 w-2.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-foreground">JFK → NRT</p>
                      <p className="text-[8px] text-muted-foreground">
                        AA 175 · Departs in 2h 15m
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4a7fc0] text-white">
                      <Hotel className="h-2 w-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-semibold text-foreground">
                        Park Hotel Tokyu
                      </p>
                      <p className="text-[7px] text-muted-foreground">3:40 PM · Check-in</p>
                    </div>
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card px-2 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#c27a2e] text-white">
                      <Utensils className="h-2 w-2" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-semibold text-foreground">
                        Sushi Saito
                      </p>
                      <p className="text-[7px] text-muted-foreground">7:00 PM · Dinner</p>
                    </div>
                    <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </div>

              {/* Bottom tab bar */}
              <div className="flex items-center justify-around border-t border-border bg-card px-1 pb-4 pt-1.5">
                {[
                  { icon: Home, active: false },
                  { icon: Plane, active: true },
                  { icon: MapPin, active: false },
                  { icon: FileText, active: false },
                  { icon: User, active: false },
                ].map(({ icon: Icon, active }, i) => (
                  <div
                    key={i}
                    className={`flex h-6 w-6 items-center justify-center rounded-md ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
                  </div>
                ))}
              </div>
            </div>

            {/* Home indicator */}
            <div className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-foreground/25" />
          </div>
        </div>
      </div>
    </div>
  );
}
