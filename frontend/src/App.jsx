import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5000/api/leads";

const dispositions = [
  "Quoted",
  "No Response",
  "Wrong Number",
  "Not Interested",
  "Price too high",
  "Part not available",
  "Ordered",
];

const initialForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  disposition: "Quoted",
  notes: "",
};

function App() {
  const [leads, setLeads] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const leadStats = useMemo(() => {
    return {
      total: leads.length,
      ordered: leads.filter((lead) => lead.disposition === "Ordered").length,
      quoted: leads.filter((lead) => lead.disposition === "Quoted").length,
    };
  }, [leads]);

  useEffect(() => {
    let isMounted = true;

    const loadLeads = async () => {
      try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load leads");
        }

        if (isMounted) {
          setLeads(result.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLeads();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create lead");
      }

      setLeads((current) => [result.data, ...current]);
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Lead management
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Created Leads
            </h1>
            <p className="mt-3 max-w-2xl text-base text-slate-600">
              Review customer enquiries, track dispositions, and add new sales
              opportunities from one clean dashboard.
            </p>
          </div>

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
            type="button"
            onClick={() => setShowForm((current) => !current)}
            aria-label={showForm ? "Close lead form" : "Add lead"}
            title={showForm ? "Close lead form" : "Add lead"}
          >
            <span className="text-xl leading-none">{showForm ? "x" : "+"}</span>
            {showForm ? "Close" : "Add Lead"}
          </button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Total leads" value={leadStats.total} />
          <Stat label="Quoted" value={leadStats.quoted} />
          <Stat label="Ordered" value={leadStats.ordered} />
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {showForm && (
          <form
            className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" name="name" value={form.name} onChange={handleChange} required />
              <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
              <Field label="Phone number" name="phone" value={form.phone} onChange={handleChange} required />
              <Field label="Address" name="address" value={form.address} onChange={handleChange} required />

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
                Disposition
                <select
                  className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
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

              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                Notes
                <textarea
                  className="min-h-28 rounded-lg border border-slate-200 bg-white px-3 py-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Add any follow-up details"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="h-11 rounded-lg border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button
                className="h-11 rounded-lg bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Submit Lead"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-xl font-bold text-slate-950">No leads yet</h2>
              <p className="mt-2 text-slate-500">
                Click the add button to create your first lead.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {["Lead", "Phone", "Address", "Disposition", "Notes"].map((heading) => (
                      <th
                        className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        key={heading}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {leads.map((lead) => (
                    <tr className="transition hover:bg-slate-50" key={lead._id}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-950">{lead.name}</div>
                        <div className="mt-1 text-sm text-slate-500">{lead.email}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">{lead.phone}</td>
                      <td className="max-w-xs px-5 py-4 text-sm text-slate-700">{lead.address}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                          {lead.disposition}
                        </span>
                      </td>
                      <td className="max-w-xs px-5 py-4 text-sm text-slate-600">
                        {lead.notes || "No notes"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Field({ label, name, type = "text", value, onChange, required = false }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700">
      {label}
      <input
        className="h-12 rounded-lg border border-slate-200 bg-white px-3 text-slate-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
      />
    </label>
  );
}

export default App;

