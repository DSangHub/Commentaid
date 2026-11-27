import { headers } from "next/headers";
import { LocaleProvider } from "../../components/Locale";
import AuthForm from "../../components/AuthForm";

export const metadata = { title: "Sign in — Commentaid" };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const initialMode = params?.mode === "signup" ? "signup" : "signin";
  const nextPath = typeof params?.next === "string" ? params.next : "/dashboard";

  const country = (await headers()).get("x-vercel-ip-country") || "";
  return <LocaleProvider country={country}><AuthForm initialMode={initialMode} nextPath={nextPath} /></LocaleProvider>;
}
