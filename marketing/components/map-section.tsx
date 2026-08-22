import Image from "next/image";

const destinations = [
  {
    alt: "Golden Gate Bridge",
    src: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=200&h=200&fit=crop",
    left: "11%",
    top: "52%",
    size: "lg",
  },
  {
    alt: "Eiffel Tower",
    src: "https://images.unsplash.com/photo-1511739001486-6bfe10ce7859?w=200&h=200&fit=crop",
    left: "47%",
    top: "28%",
    size: "md",
  },
  {
    alt: "Colosseum",
    src: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=200&h=200&fit=crop",
    left: "55%",
    top: "40%",
    size: "md",
  },
  {
    alt: "Mountain destination",
    src: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=200&fit=crop",
    left: "68%",
    top: "24%",
    size: "lg",
  },
] as const;

export function MapSection() {
  const mapMask = "url(/world-map.svg)";

  return (
    <section className="relative overflow-hidden border-t border-border bg-[#f5f9fd]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)] lg:gap-14">
          <div className="relative aspect-[16/11] w-full overflow-hidden bg-[#eaf3fb] sm:rounded-2xl">
            <div
              className="pointer-events-none absolute inset-[-2%] bg-[#9bb8d4]/45"
              style={{
                maskImage: mapMask,
                WebkitMaskImage: mapMask,
                maskSize: "92% auto",
                WebkitMaskSize: "92% auto",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center 42%",
                WebkitMaskPosition: "center 42%",
              }}
            />
            <div
              className="pointer-events-none absolute inset-[-2%] bg-[#c5d9ec]/35"
              style={{
                maskImage: mapMask,
                WebkitMaskImage: mapMask,
                maskSize: "92% auto",
                WebkitMaskSize: "92% auto",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center 42%",
                WebkitMaskPosition: "center 42%",
              }}
            />

            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 800 550"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M95 300 C 180 270, 250 160, 370 175 C 430 185, 455 210, 490 235 C 530 170, 590 140, 660 150"
                stroke="#5b8fd4"
                strokeWidth="2"
                strokeDasharray="7 6"
                strokeLinecap="round"
                opacity="0.85"
              />
              <g transform="translate(655 138) rotate(8)">
                <path
                  d="M0 6 L14 2 L28 5 L14 8 L0 6 Z M12 5 L12 -2 L16 5 L12 12 Z"
                  fill="#4a7fc0"
                />
              </g>
            </svg>

            {destinations.map((dest) => (
              <div
                key={dest.alt}
                className={`absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-[3px] border-white shadow-[0_8px_24px_rgba(15,40,80,0.18)] ${
                  dest.size === "lg"
                    ? "h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem]"
                    : "h-14 w-14 sm:h-16 sm:w-16"
                }`}
                style={{ left: dest.left, top: dest.top }}
              >
                <Image
                  src={dest.src}
                  alt={dest.alt}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ))}
          </div>

          <div className="max-w-md lg:pl-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#4a7fc0]">
              See your journey
            </p>
            <h2 className="mt-3 text-[2rem] font-bold leading-[1.15] tracking-tight text-foreground sm:text-[2.35rem]">
              A map of your adventures.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              From weekend getaways to around-the-world trips, Shldr helps you
              visualize your journey and relive every moment.
            </p>
            <a
              href="#features"
              className="mt-7 inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            >
              Explore Your Map
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
