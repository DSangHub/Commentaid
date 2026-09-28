import AuthForm from "../../components/AuthForm";

export const metadata = { title: "Sign in — Commentaid" };

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const initialMode = params?.mode === "signup" ? "signup" : "signin";
  const nextPath = typeof params?.next === "string" ? params.next : "/dashboard";

  return <AuthForm initialMode={initialMode} nextPath={nextPath} />;
}
