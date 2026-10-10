import "server-only";
import { cookies } from "next/headers";

const isProd = process.env.NODE_ENV === "production";

// httpOnly because the browser never needs to read these -- every backend
// call goes through this Next.js server. `lax` (not `strict`) so a top-level
// navigation from an emailed /admin link still carries the session.
export const setCookie = async (name: string, value: string, maxAgeInSeconds: number) => {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeInSeconds,
  });
};

export const getCookie = async (name: string) => {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value;
};

export const deleteCookie = async (name: string) => {
  const cookieStore = await cookies();
  cookieStore.delete(name);
};
