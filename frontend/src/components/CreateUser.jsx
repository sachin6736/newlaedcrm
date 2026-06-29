import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, UserPlus, Users } from "lucide-react";
import Layout from "./Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { apiUrl } from "../config/api.js";

const USERS_API_URL = apiUrl("/api/users");

const initialUserForm = {
  name: "",
  email: "",
  password: "",
  role: "user",
};

function CreateUser() {
  const { authHeaders, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialUserForm);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch(USERS_API_URL, { headers: authHeaders() });
        const result = await response.json();

        if (response.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }

        if (!response.ok) {
          throw new Error(result.message || "Unable to load users");
        }

        setUsers(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [authHeaders, logout, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) setError("");
    if (success) setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const response = await fetch(USERS_API_URL, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (response.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to create user");
      }

      setForm(initialUserForm);
      setSuccess("User created successfully.");
      setUsers((current) => [result.data, ...current]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout
      title="Manage Users"
      subtitle="Create team accounts and assign roles. New leads are distributed to users one by one."
    >
      <div className="mx-auto max-w-5xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-emerald-300"
          to="/leads"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all leads
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <UserPlus className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create user</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Add a new admin or user account for your team.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
                {success}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                Full name
                <input
                  className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Jane Smith"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                Email address
                <input
                  className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="jane@company.com"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                Password
                <input
                  className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  minLength={6}
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                Role
                <select
                  className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <button
                className="flex h-12 w-full items-center justify-center rounded-xl bg-emerald-500 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-emerald-500/50"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create user"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Team members</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Leads rotate across users with the &quot;user&quot; role.
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {loadingUsers ? (
                <p className="text-sm text-slate-400">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-slate-400">No users yet.</p>
              ) : (
                users.map((teamUser) => (
                  <div
                    key={teamUser._id || teamUser.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">{teamUser.name}</p>
                      <p className="text-sm text-slate-400">{teamUser.email}</p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                        teamUser.role === "admin"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-emerald-500/15 text-emerald-300"
                      }`}
                    >
                      {teamUser.role === "admin" && <Shield className="h-3 w-3" />}
                      {teamUser.role}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default CreateUser;