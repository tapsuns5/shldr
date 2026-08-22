import { Play, Star } from "lucide-react";
import Image from "next/image";
import { HeroVisual } from "./hero-visual";

export function HeroSection() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const avatars = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=64&h=64&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=64&h=64&fit=crop&crop=face",
  ];

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pb-32 sm:pt-16 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              All your travel,{" "}
              <span className="text-primary">beautifully</span> organized.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Shldr is your smart travel organizer that pulls everything
              together—plans, reservations, expenses, photos, and more. So
              you can travel more and stress less.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={`${appUrl}/signup`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                Get Started Free
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-base font-semibold text-foreground hover:bg-muted transition-colors"
              >
                <Play className="h-4 w-4 fill-primary text-primary" />
                See It in Action
              </a>
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Trusted by travelers worldwide
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex -space-x-2">
                {avatars.map((src, i) => (
                  <Image
                    key={i}
                    src={src}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                    unoptimized
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground">
                  4.9/5 from 1,200+ travelers
                </p>
              </div>
            </div>
          </div>

          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
