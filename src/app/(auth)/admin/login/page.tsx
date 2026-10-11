import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import GoogleSignInButton from "@/components/modules/Auth/GoogleSignInButton";
import LoginForm from "@/components/modules/Auth/LoginForm";
import OrDivider from "@/components/shared/OrDivider";
import { getSignInErrorMessage, SESSION_EXPIRED_REASON } from "@/lib/authUtils";

export const metadata: Metadata = {
  title: "Sign in",
};

const LoginPage = async ({ searchParams }: PageProps<"/admin/login">) => {
  const { redirect, reason, error } = await searchParams;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen items-center justify-center bg-[linear-gradient(to_bottom,var(--color-brand-dark)_0%,var(--color-brand-dark)_42%,var(--background)_42%)] px-4 outline-none"
    >
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center text-white">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-primary shadow-lg shadow-black/20">
            <Wallet className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold">Admin Panel</h1>
        </div>
        <div className="space-y-5 rounded-2xl bg-card p-8 shadow-xl shadow-black/10 ring-1 ring-foreground/5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue</p>
          </div>
          <LoginForm
            redirectTo={typeof redirect === "string" ? redirect : undefined}
            sessionExpired={reason === SESSION_EXPIRED_REASON}
            signInError={getSignInErrorMessage(typeof error === "string" ? error : undefined)}
          />
          <OrDivider />
          <GoogleSignInButton />
        </div>
      </div>
    </main>
  );
};

export default LoginPage;
