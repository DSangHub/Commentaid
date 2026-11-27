import { headers } from "next/headers";
import { LocaleProvider } from "../../components/Locale";
import Dashboard from "../../components/Dashboard";

export const metadata = { title: "Dashboard — Commentaid" };

export default async function DashboardPage() {
  const country = (await headers()).get("x-vercel-ip-country") || "";
  return <LocaleProvider country={country}><Dashboard /></LocaleProvider>;
}
