import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
const API_URL = "http://localhost:5000/api/auth/login";
 
function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
 
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) {
      setError("");
    }
  };
 
  const handleSubmit = async (event) => {
    event.preventDefault();
 
    try {
      setSubmitting(true);
      setError("");
 
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
 
      if (!response.ok) {
        throw new Error(result.message || "Unable to sign in");
      }
 
       login(result.token, result.data);
      navigate("/leads", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
 
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-linier-to-br from-emerald-600 via-emerald-700 to-slate-900" />
          <div className="absolute -left-16 top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
 
          <div className="relative z-10 flex flex-1 flex-col justify-center px-12 xl:px-16">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
              CRM Platform
            </p>
            <h1 className="mt-4 max-w-lg text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              Manage leads with clarity and confidence.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-emerald-50/90">
              Track enquiries, monitor dispositions, and keep your sales pipeline
              organized in one secure workspace.
            </p>
 
            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                 { label: "Secure access", icon: ShieldCheck },
                { label: "Real-time data", icon: Activity },
                { label: "Team ready", icon: Users },
              ].map((item) => {
                const Icon = item.icon;
 
                return (
                  <div
                    className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm"
                    key={item.label}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-emerald-50">
                      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-emerald-100">
                      {item.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
 
          <p className="relative z-10 px-12 pb-10 text-sm text-emerald-100/80 xl:px-16">
            Professional lead management for growing teams.
          </p>
        </aside>
 
        <main className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
                CRM Platform
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-slate-400">
                Sign in to access your lead dashboard.
              </p>
            </div>
 
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
              <div className="hidden lg:block">
                <h2 className="text-2xl font-bold tracking-tight text-white">
                  Sign in
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Enter your credentials to continue.
                </p>
              </div>
 
              {error && (
                <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                  {error}
                </div>
              )}
 
              <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                  Email address
                  <input
                    className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </label>
 
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                  Password
                  <div className="relative">
                    <input
                      className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-slate-400 transition hover:text-emerald-400"
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
 
                <button
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-emerald-500/50"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
 
              <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
                New accounts are created by an administrator via the signup API.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
 
export default Login;