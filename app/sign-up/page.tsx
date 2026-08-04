import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthForm } from "../AuthForm";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return <AuthForm mode="sign-up" />;
}
