import { forwardToBetterAuth } from "@/lib/betterAuthProxy";

// Google sign-in, its callback, session checks and the Better Auth
// dashboard -- see lib/betterAuthProxy.ts.
export const GET = forwardToBetterAuth;
export const POST = forwardToBetterAuth;
