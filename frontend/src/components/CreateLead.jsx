import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import Layout from "./Layout.jsx";
import { API_URL, dispositions, initialLeadForm } from "../constants/leads.js";
import { useAuth } from "../context/AuthContext.jsx";
 
function CreateLead() {
  const { authHeaders, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialLeadForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
 
  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    if (error) {
      setError("");
    }
    if (success) {
      setSuccess("");
    }
  };
 
  const handleSubmit = async (event) => {
    event.preventDefault();
 
    try {
      setSubmitting(true);
      setError("");
      setSuccess("");
 
      const response = await fetch(API_URL, {
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
        throw new Error(result.message || "Unable to create lead");
      }
 
      setForm(initialLeadForm);
      setSuccess("Lead created successfully.");
      navigate("/leads", { replace: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
 
  return (
    <Layout
      title="Create Lead"
      subtitle="Add a new sales opportunity and capture customer details in one step."
    >
      <div className="mx-auto max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-emerald-300"
          to="/leads"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all leads
        </Link>
 
        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">New lead details</h2>
              <p className="mt-1 text-sm text-slate-400">
                Fill in the customer information below to add them to your pipeline.
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
            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Customer full name"
                required
              />
              <Field
                label="Email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="customer@email.com"
                required
              />
              <Field
                label="Phone number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 000 0000"
                required
              />
              <Field
                label="Zip"
                name="zip"
                value={form.zip}
                onChange={handleChange}
                placeholder="12345"
                required
              />
              <Field
                label="Make"
                name="make"
                value={form.make}
                onChange={handleChange}
                placeholder="Toyota"
                required
              />
              <Field
                label="Model"
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="Camry"
                required
              />
              <Field
                label="Year"
                name="year"
                value={form.year}
                onChange={handleChange}
                placeholder="2020"
              />
              <Field
                label="Part requested"
                name="partRequested"
                value={form.partRequested}
                onChange={handleChange}
                placeholder="Engine, bumper, etc."
              />
 
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300 md:col-span-2">
                Disposition
                <select
                  className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  name="disposition"
                  value={form.disposition}
                  onChange={handleChange}
                >
                  {dispositions.map((disposition) => (
                    <option key={disposition} value={disposition}>
                      {disposition}
                    </option>
                  ))}
                </select>
              </label>
 
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300 md:col-span-2">
                Notes
                <textarea
                  className="min-h-32 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Add follow-up details or context"
                />
              </label>
            </div>
 
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link
                className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
                to="/leads"
              >
                Cancel
              </Link>
              <button
                className="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-500 px-6 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-emerald-500/50"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving lead..." : "Submit Lead"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
 
function Field({ label, name, type = "text", value, onChange, placeholder, required = false }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
      {label}
      <input
        className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}
 
export default CreateLead;