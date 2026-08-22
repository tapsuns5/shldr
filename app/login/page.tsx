import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  const resolvedSearchParams = await searchParams;
  const redirectTo = typeof resolvedSearchParams.redirect === 'string' ? resolvedSearchParams.redirect : '/trips';
  const defaultToSignup = resolvedSearchParams.mode === "signup";

  if (session) {
    redirect(redirectTo);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://picsum.photos/seed/travel/1200/1600"
          alt="Travel destination"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Plan your trips with ease
          </h1>
          <p className="text-lg text-white/80">
            Organize flights, hotels, and activities all in one place.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-background px-4">
        <LoginForm defaultToSignup={defaultToSignup} />
      </div>
    </div>
  );
}
