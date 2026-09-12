import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Image from "next/image";
import { auth } from "@/lib/auth";
import Logo from "@/components/Logo";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="https://picsum.photos/seed/journey/1200/1600"
          alt="Travel destination"
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            Back to your adventures
          </h1>
          <p className="text-lg text-white/80">
            We&apos;ll help you get back into your account.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-background px-4">
        <div className="mb-6">
          <Logo height={40} />
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
