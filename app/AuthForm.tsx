"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

type AuthFormProps = { mode: "sign-in" | "sign-up" };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const result = isSignUp
      ? await authClient.signUp.email({
          name: String(form.get("name") ?? "").trim(),
          email,
          password,
        })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Unable to continue. Please check your details.");
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <Link className="brand authBrand" href="/" aria-label="BucketBook home">
          <span className="brandMark">B</span><span>Bucket<span>Book</span></span>
        </Link>
        <p className="eyebrow">{isSignUp ? "Create your private workspace" : "Welcome back"}</p>
        <h1>{isSignUp ? "Start your BucketBook" : "Sign in"}</h1>
        <p className="authIntro">
          {isSignUp
            ? "Your buckets and purchases will be saved securely to your account."
            : "Use your email and password to open your buckets."}
        </p>
        <form className="authForm" onSubmit={submit}>
          {isSignUp && <label>Name<input name="name" autoComplete="name" maxLength={64} required /></label>}
          <label>Email<input name="email" type="email" autoComplete="email" required /></label>
          <label>Password<input name="password" type="password" minLength={8} maxLength={128} autoComplete={isSignUp ? "new-password" : "current-password"} required /></label>
          {error && <p className="formError" role="alert">{error}</p>}
          <button className="button primary authSubmit" type="submit" disabled={pending}>
            {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>
        <p className="authSwitch">
          {isSignUp ? "Already have an account?" : "New to BucketBook?"}{" "}
          <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create an account"}</Link>
        </p>
      </section>
    </main>
  );
}
