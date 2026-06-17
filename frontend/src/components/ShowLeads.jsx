import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, PlusCircle, ShoppingBag, Sparkles } from "lucide-react";
import Layout from "./Layout.jsx";
import { API_URL } from "../constants/leads.js";
import { useAuth } from "../context/AuthContext.jsx";
 
function ShowLeads() {
  const { authHeaders, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
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
        const response = await fetch(API_URL, { headers: authHeaders() });
        const result = await response.json();
 
        if (response.status === 401) {
          logout();
          navigate("/login", { replace: true });
          return;
        }
 
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
  }, [authHeaders, logout, navigate]);
 
  return (
    <Layout
      title="Created Leads"
      subtitle="Review customer enquiries, track dispositions, and manage your sales pipeline."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={ClipboardList}
          label="Total leads"
          value={leadStats.total}
        />
        <StatCard icon={Sparkles} label="Quoted" value={leadStats.quoted} />
        <StatCard icon={ShoppingBag} label="Ordered" value={leadStats.ordered} />
      </div>
 
      {error && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      )}
 
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white">Lead directory</h2>
            <p className="mt-1 text-sm text-slate-400">
              All captured enquiries in one organized view.
            </p>
          </div>
          <Link
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            to="/leads/create"
          >
            <PlusCircle className="h-4 w-4" />
            Create Lead
          </Link>
        </div>
 
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-xl font-bold text-white">No leads yet</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create your first lead to start building your pipeline.
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              to="/leads/create"
            >
              <PlusCircle className="h-4 w-4" />
              Create Lead
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900/90">
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
              <tbody className="divide-y divide-slate-800/80">
                {leads.map((lead) => (
                  <tr className="transition hover:bg-slate-800/40" key={lead._id}>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{lead.name}</div>
                      <div className="mt-1 text-sm text-slate-400">{lead.email}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-300">{lead.phone}</td>
                    <td className="max-w-xs px-5 py-4 text-sm text-slate-300">{lead.address}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                        {lead.disposition}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-sm text-slate-400">
                      {lead.notes || "No notes"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
 
function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 backdrop-blur">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
        <Icon className="h-5 w-5" strokeWidth={2} />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
 
export default ShowLeads;