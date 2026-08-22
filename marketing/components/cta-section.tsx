function AppStoreBadge({ type }: { type: "apple" | "google" }) {
  return (
    <div className="flex h-11 cursor-pointer items-center gap-2 rounded-md bg-foreground px-3 py-1.5 text-primary-foreground transition-colors hover:bg-foreground/90">
      {type === "apple" ? (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.84-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ) : (
        <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M3.18 23.04c.08.04.17.06.26.06.16 0 .32-.06.44-.18l7.28-7.28-2.12-2.12-5.86 9.52zm8.1-9.88 2.12 2.12 4.9-4.9c.24-.24.24-.63 0-.87l-2.12-2.12-4.9 5.77zM3.09.9C2.9.98 2.78 1.16 2.78 1.37v21.26c0 .21.12.39.31.47l6.1-9.9L3.09.9zm17.36 9.58-2.95-2.95-5.05 5.05 2.12 2.12 5.88-3.35c.3-.17.3-.6 0-.87z" />
        </svg>
      )}
      <div className="leading-none">
        <p className="text-[9px] font-medium uppercase tracking-wide opacity-90">
          {type === "apple" ? "Download on the" : "Get it on"}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold tracking-tight">
          {type === "apple" ? "App Store" : "Google Play"}
        </p>
      </div>
    </div>
  );
}

export function CTASection() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <section className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-[#c7dff8] bg-[#eef6ff] px-6 py-8 sm:px-10 sm:py-10 lg:px-12">
          <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
            <div className="max-w-xl">
              <h2 className="text-[1.75rem] font-bold leading-tight tracking-tight text-foreground sm:text-[2rem]">
                Ready for your next adventure?
              </h2>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                Join thousands of travelers and start organizing your trips with
                Shldr today.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <AppStoreBadge type="apple" />
                <AppStoreBadge type="google" />
                <a
                  href={`${appUrl}/signup`}
                  className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  Get Started Free
                </a>
              </div>
            </div>

            <div className="relative hidden h-40 lg:block">
              <svg
                viewBox="0 0 460 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                {/* Mountain range outline */}
                <path
                  d="M12 150 C 55 95, 90 105, 125 128 L 175 78 L 230 128 L 285 88 L 350 148"
                  stroke="#7eb0ef"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Smaller peaks */}
                <path
                  d="M70 150 L 105 112 L 140 150 M 210 150 L 250 110 L 290 150 M 310 150 L 340 124 L 365 150"
                  stroke="#a4c8f5"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Clouds */}
                <path
                  d="M40 58 C 52 44, 72 44, 84 58 C 96 46, 118 50, 122 68 H 36 C 34 64, 35 60, 40 58Z"
                  stroke="#a4c8f5"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M300 42 C 316 28, 338 32, 348 48 C 364 38, 386 44, 390 62 H 294 C 292 54, 294 46, 300 42Z"
                  stroke="#a4c8f5"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                {/* Dashed flight path */}
                <path
                  d="M95 142 C 160 78, 245 48, 340 62"
                  stroke="#5b8fd4"
                  strokeWidth="1.75"
                  strokeDasharray="6 6"
                  strokeLinecap="round"
                />
                {/* Soft halo near plane */}
                <circle cx="340" cy="62" r="12" fill="#7eb0ef" fillOpacity="0.18" />
                {/* Plane */}
                <g transform="translate(328 48) rotate(18)">
                  <path
                    d="M0 7 L18 3 L36 6.5 L18 10 L0 7 Z M16 6.5 L16 -2 L21 6.5 L16 15 Z"
                    fill="#4a7fc0"
                  />
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
