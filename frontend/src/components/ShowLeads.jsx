import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Pencil,
  PlusCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Layout from "./Layout.jsx";
import { API_URL } from "../constants/leads.js";
import { useAuth } from "../context/AuthContext.jsx";

const PAGE_SIZE = 10;

function ShowLeads() {
  const { authHeaders, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [leadStats, setLeadStats] = useState({
    total: 0,
    quoted: 0,
    ordered: 0,
  });

  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const pageSummary = useMemo(() => {
    if (pagination.total === 0) {
      return "No leads to show";
    }

    const firstLead = (pagination.page - 1) * pagination.limit + 1;
    const lastLead = Math.min(pagination.page * pagination.limit, pagination.total);

    return `Showing ${firstLead}-${lastLead} of ${pagination.total} leads`;
  }, [pagination]);

  useEffect(() => {
    let isMounted = true;

    const loadLeads = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });
        const response = await fetch(`${API_URL}?${params.toString()}`, {
          headers: authHeaders(),
        });
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
          const returnedLeads = result.data || [];
          const apiPagination = result.pagination;
          const visibleLeads = apiPagination
            ? returnedLeads
            : returnedLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
          const total = apiPagination?.total ?? returnedLeads.length;

          setLeads(visibleLeads);
          setPagination(
            apiPagination || {
              page,
              limit: PAGE_SIZE,
              total,
              totalPages: Math.ceil(total / PAGE_SIZE) || 1,
              hasNextPage: page * PAGE_SIZE < total,
              hasPreviousPage: page > 1,
            }
          );
          setLeadStats(
            result.stats || {
              total,
              quoted: returnedLeads.filter((lead) => lead.disposition === "Quoted").length,
              ordered: returnedLeads.filter((lead) => lead.disposition === "Ordered").length,
            }
          );
          setError("");
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
  }, [authHeaders, logout, navigate, page]);

  const startEditingNote = (lead) => {
    setEditingLeadId(lead._id);
    setEditNote(lead.notes || "");
    setError("");
  };

  const cancelEditingNote = () => {
    setEditingLeadId(null);
    setEditNote("");
  };

  const saveNote = async (leadId) => {
    if (isUpdating) return;

    setIsUpdating(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/${leadId}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notes: editNote }),
      });

      const result = await response.json();

      if (response.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to update note");
      }

      // Update the lead in local state
      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead._id === leadId ? { ...lead, notes: result.data.notes } : lead
        )
      );

      cancelEditingNote();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage === page) {
      return;
    }

    cancelEditingNote();
    setError("");
    setLoading(true);
    setPage(nextPage);
  };

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
              Recent leads first. Use Older to see the previous leads.
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

        {!loading && leads.length > 0 && (
          <PaginationControls
            className="border-b border-slate-800 px-5 py-4 sm:px-6"
            pageSummary={pageSummary}
            pagination={pagination}
            onNewer={() => goToPage(page - 1)}
            onOlder={() => goToPage(page + 1)}
          />
        )}

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
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/90">
                  <tr>
                    {["Lead", "Phone", "Zip", "Vehicle", "Part", "Disposition", "Notes"].map((heading) => (
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
                      <td className="px-5 py-4 text-sm text-slate-300">{lead.zip || "—"}</td>
                      <td className="px-5 py-4 text-sm text-slate-300">
                        {[lead.year, lead.make, lead.model].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="max-w-xs px-5 py-4 text-sm text-slate-300">
                        {lead.partRequested || "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                          {lead.disposition}
                        </span>
                      </td>
                      <td className="max-w-md px-5 py-4 text-sm text-slate-400">
                        {editingLeadId === lead._id ? (
                          <div className="flex flex-col gap-2">
                            <textarea
                              className="min-h-[60px] w-full resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="Add a note..."
                              disabled={isUpdating}
                              rows={2}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => saveNote(lead._id)}
                                disabled={isUpdating}
                                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isUpdating ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditingNote}
                                disabled={isUpdating}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <span
                              className="block flex-1 break-words text-slate-300 line-clamp-2"
                              title={lead.notes || undefined}
                            >
                              {lead.notes ? lead.notes : "No notes"}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditingNote(lead)}
                              className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-300"
                              title="Edit note"
                              aria-label="Edit note"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <PaginationControls
              className="border-t border-slate-800 px-5 py-4 sm:px-6"
              pageSummary={pageSummary}
              pagination={pagination}
              onNewer={() => goToPage(page - 1)}
              onOlder={() => goToPage(page + 1)}
            />
          </>
        )}
      </div>
    </Layout>
  );
}

function PaginationControls({ className, pageSummary, pagination, onNewer, onOlder }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className="text-sm font-medium text-slate-400">{pageSummary}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={onNewer}
          disabled={!pagination.hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4" />
          Newer
        </button>
        <span className="min-w-20 text-center text-sm font-semibold text-slate-400">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={onOlder}
          disabled={!pagination.hasNextPage}
        >
          Older
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
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


