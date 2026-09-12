import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import Logo from "@/components/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://picsum.photos/seed/voyage/1200/1600"
          alt="Travel destination"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Almost there
          </h1>
          <p className="text-lg text-white/80">
            Set a new password and get back to planning.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-background px-4">
        <div className="mb-6">
          <Logo height={40} />
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
