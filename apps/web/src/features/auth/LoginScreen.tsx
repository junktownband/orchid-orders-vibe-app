import { motion, useReducedMotion } from "framer-motion";
import { type FormEvent, useState } from "react";

import type { AuthResponse } from "@orchid/shared";

import { request } from "../../app/app-core";
import { Background, PrimaryButton, TextField } from "../../app/ui";

export function LoginScreen({ onLogin }: { onLogin: (response: AuthResponse) => void }) {
  const [email, setEmail] = useState("sasha@orchid.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await request<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onLogin(response);
    } catch {
      setError("Не удалось войти. Проверьте почту и пароль.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Background>
      <section className="relative mx-auto grid min-h-screen w-full max-w-md content-center px-5 py-10">
        <motion.form
          initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.28, ease: "easeOut" }}
          onSubmit={handleSubmit}
          className="rounded-lg border border-white/[0.08] bg-panel/95 p-6 shadow-glass backdrop-blur-xl"
        >
          <div className="mb-8">
            <p className="text-sm text-white/55">Вход в мастерскую</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal">Orchid Control</h1>
          </div>

          <TextField
            autoComplete="email"
            label="Email"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />

          <TextField
            autoComplete="current-password"
            className="mt-2"
            label="Пароль"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />

          {import.meta.env.DEV ? (
            <p className="mt-3 text-xs text-white/45">Dev пароль после seed: orchid12345</p>
          ) : null}

          {error ? (
            <p aria-live="polite" className="mt-4 text-sm text-coral">
              {error}
            </p>
          ) : null}

          <PrimaryButton className="mt-7 w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Входим..." : "Войти"}
          </PrimaryButton>
        </motion.form>
      </section>
    </Background>
  );
}
