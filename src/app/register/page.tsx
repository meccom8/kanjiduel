"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (username.length < 3) { setError("Username must be at least 3 characters"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 relative z-10">
      <Link href="/" className="font-jp text-3xl mb-8 text-accent2 hover:opacity-70 transition-opacity">漢</Link>

      <div className="card-solid w-full max-w-sm p-6 slide-up">
        <h1 className="text-xl font-semibold mb-1">Create account</h1>
        <p className="text-white/40 text-sm mb-6">Start at Bronze I · 500 ELO</p>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Username</label>
            <input
              className="input-field"
              placeholder="e.g. samurai42"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-widest mb-1.5 block">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="6+ characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button className="btn-primary mt-2" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-accent2 hover:opacity-70">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
