import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Pencil,
  PlusCircle,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import Layout from "./Layout.jsx";
import {
  ALL_DAYS,
  ALL_DISPOSITIONS,
  ALL_MONTHS,
  ALL_YEARS,
  API_URL,
  DAYS,
  MONTHS,
  dispositions,
  getYearOptions,
  SEARCH_PLACEHOLDER,
} from "../constants/leads.js";
import { useAuth } from "../context/AuthContext.jsx";

const PAGE_SIZE = 10;

const YEAR_OPTIONS = getYearOptions();

function formatDateFilterLabel(year, month, day) {
  const parts = [];

  if (month !== ALL_MONTHS) {
    const monthLabel = MONTHS.find((entry) => entry.value === month)?.label ?? month;
    parts.push(monthLabel);
  }

  if (day !== ALL_DAYS) {
    parts.push(`Day ${day}`);
  }

  if (year !== ALL_YEARS) {
    parts.push(year);
  }

  return parts.join(" ");
}

function ShowLeads() {
  const { authHeaders, logout } = useAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
  const [yearFilter, setYearFilter] = useState(ALL_YEARS);
  const [monthFilter, setMonthFilter] = useState(ALL_MONTHS);
  const [dayFilter, setDayFilter] = useState(ALL_DAYS);
  const [dispositionFilter, setDispositionFilter] = useState(ALL_DISPOSITIONS);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [editingLeadId, setEditingLeadId] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingDispositionId, setUpdatingDispositionId] = useState(null);
  const [pendingDispositionChange, setPendingDispositionChange] = useState(null);

  const hasActiveDateFilter = useMemo(() => {
    return yearFilter !== ALL_YEARS || monthFilter !== ALL_MONTHS || dayFilter !== ALL_DAYS;
  }, [yearFilter, monthFilter, dayFilter]);

  const hasActiveFilters = useMemo(() => {
    return (
      hasActiveDateFilter ||
      dispositionFilter !== ALL_DISPOSITIONS ||
      Boolean(appliedSearch)
    );
  }, [hasActiveDateFilter, dispositionFilter, appliedSearch]);

  const pageSummary = useMemo(() => {
    if (pagination.total === 0) {
      return hasActiveFilters ? "No leads match the selected filters" : "No leads to show";
    }

    const firstLead = (pagination.page - 1) * pagination.limit + 1;
    const lastLead = Math.min(pagination.page * pagination.limit, pagination.total);
    const activeFilters = [];

    if (hasActiveDateFilter) {
      activeFilters.push(formatDateFilterLabel(yearFilter, monthFilter, dayFilter));
    }
    if (dispositionFilter !== ALL_DISPOSITIONS) {
      activeFilters.push(dispositionFilter);
    }
    if (appliedSearch) {
      activeFilters.push(`"${appliedSearch}"`);
    }

    const filterLabel = activeFilters.length ? ` (${activeFilters.join(" · ")})` : "";

    return `Showing ${firstLead}-${lastLead} of ${pagination.total} leads${filterLabel}`;
  }, [pagination, yearFilter, monthFilter, dayFilter, dispositionFilter, appliedSearch, hasActiveFilters, hasActiveDateFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadLeads = async () => {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        if (yearFilter !== ALL_YEARS) {
          params.set("year", yearFilter);
        }

        if (monthFilter !== ALL_MONTHS) {
          params.set("month", monthFilter);
        }

        if (dayFilter !== ALL_DAYS) {
          params.set("day", dayFilter);
        }

        if (dispositionFilter !== ALL_DISPOSITIONS) {
          params.set("disposition", dispositionFilter);
        }

        if (appliedSearch) {
          params.set("search", appliedSearch);
        }

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
          setLeadStats({
            total: result.stats?.total ?? total,
            quoted:
              result.stats?.quoted ??
              returnedLeads.filter((lead) => lead.disposition === "Quoted").length,
            ordered:
              result.stats?.ordered ??
              returnedLeads.filter((lead) => lead.disposition === "Ordered").length,
          });
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
  }, [authHeaders, logout, navigate, page, yearFilter, monthFilter, dayFilter, dispositionFilter, appliedSearch, refreshCounter]);

  const startEditingNote = (lead) => {
    setEditingLeadId(lead._id);
    setEditNote(lead.notes || "");
    setError("");
  };

  const cancelEditingNote = () => {
    setEditingLeadId(null);
    setEditNote("");
  };

  const requestDispositionChange = (lead, nextDisposition) => {
    if (updatingDispositionId || nextDisposition === lead.disposition) {
      return;
    }

    setPendingDispositionChange({
      leadId: lead._id,
      leadName: lead.name,
      previousDisposition: lead.disposition,
      nextDisposition,
    });
    setError("");
  };

  const cancelDispositionChange = () => {
    setPendingDispositionChange(null);
  };

  const confirmDispositionChange = async () => {
    if (!pendingDispositionChange || updatingDispositionId) {
      return;
    }

    const saved = await updateDisposition(
      pendingDispositionChange.leadId,
      pendingDispositionChange.previousDisposition,
      pendingDispositionChange.nextDisposition,
      pendingDispositionChange.leadName
    );

    if (saved) {
      setPendingDispositionChange(null);
    }
  };

  const updateDisposition = async (
    leadId,
    previousDisposition,
    nextDisposition,
    leadName = "Lead"
  ) => {
    if (updatingDispositionId || previousDisposition === nextDisposition) {
      return false;
    }

    setUpdatingDispositionId(leadId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/${leadId}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ disposition: nextDisposition }),
      });

      const result = await response.json();

      if (response.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return false;
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to update disposition");
      }

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead._id === leadId ? { ...lead, disposition: result.data.disposition } : lead
        )
      );

      setLeadStats((prevStats) => {
        const nextStats = { ...prevStats };

        if (previousDisposition === "Quoted") {
          nextStats.quoted = Math.max(nextStats.quoted - 1, 0);
        }
        if (previousDisposition === "Ordered") {
          nextStats.ordered = Math.max(nextStats.ordered - 1, 0);
        }
        if (nextDisposition === "Quoted") {
          nextStats.quoted += 1;
        }
        if (nextDisposition === "Ordered") {
          nextStats.ordered += 1;
        }

        return nextStats;
      });

      setSuccess(`${leadName}'s status was saved to the database.`);
      setRefreshCounter((current) => current + 1);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setUpdatingDispositionId(null);
    }
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

  const applyFilters = ({
    year = yearFilter,
    month = monthFilter,
    day = dayFilter,
    disposition = dispositionFilter,
  } = {}) => {
    cancelEditingNote();
    cancelDispositionChange();
    setError("");
    setSuccess("");
    setLoading(true);
    setPage(1);
    setYearFilter(year);
    setMonthFilter(month);
    setDayFilter(day);
    setDispositionFilter(disposition);
  };

  const handleYearFilterChange = (event) => {
    applyFilters({ year: event.target.value });
  };

  const handleMonthFilterChange = (event) => {
    applyFilters({ month: event.target.value });
  };

  const handleDayFilterChange = (event) => {
    applyFilters({ day: event.target.value });
  };

  const handleDispositionFilterChange = (event) => {
    applyFilters({ disposition: event.target.value });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    cancelEditingNote();
    cancelDispositionChange();
    setError("");
    setSuccess("");
    setLoading(true);
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setAppliedSearch("");
    applyFilters({
      year: ALL_YEARS,
      month: ALL_MONTHS,
      day: ALL_DAYS,
      disposition: ALL_DISPOSITIONS,
    });
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage === page) {
      return;
    }

    cancelEditingNote();
    cancelDispositionChange();
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
          label={hasActiveFilters ? "Filtered leads" : "Total leads"}
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

      {success && (
        <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300">
          {success}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Lead directory</h2>
              <p className="mt-1 text-sm text-slate-400">
                All leads are shown with pagination by default. Search, filter by date, or filter by
                disposition.
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

          <div className="space-y-4">
            <form className="space-y-2" onSubmit={handleSearchSubmit}>
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-300" />
                  Search leads
                </span>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    className="h-11 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    type="search"
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    placeholder={SEARCH_PLACEHOLDER}
                  />
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                    type="submit"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </div>
              </label>
              <p className="text-xs text-slate-500">
                Matches name, email, phone, make, model, year, and part requested.
              </p>
            </form>

            <div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Calendar className="h-4 w-4 text-emerald-300" />
                Filter by date
              </span>
              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                  Year
                  <select
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    value={yearFilter}
                    onChange={handleYearFilterChange}
                  >
                    <option value={ALL_YEARS}>All years</option>
                    {YEAR_OPTIONS.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                  Month
                  <select
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    value={monthFilter}
                    onChange={handleMonthFilterChange}
                  >
                    <option value={ALL_MONTHS}>All months</option>
                    {MONTHS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
                  Day
                  <select
                    className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                    value={dayFilter}
                    onChange={handleDayFilterChange}
                  >
                    <option value={ALL_DAYS}>All days</option>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <label className="flex max-w-md flex-col gap-2 text-sm font-semibold text-slate-300">
              <span className="inline-flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-300" />
                Filter by disposition
              </span>
              <select
                className="h-11 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
                value={dispositionFilter}
                onChange={handleDispositionFilterChange}
              >
                <option value={ALL_DISPOSITIONS}>All dispositions</option>
                {dispositions.map((disposition) => (
                  <option key={disposition} value={disposition}>
                    {disposition}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {hasActiveFilters && (
            <button
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
              type="button"
              onClick={handleClearFilters}
            >
              Clear filters
            </button>
          )}
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
            <h3 className="mt-5 text-xl font-bold text-white">
              {hasActiveFilters ? "No matching leads" : "No leads yet"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {hasActiveFilters
                ? "No leads match your search or filters. Try different keywords or filters."
                : "Create your first lead to start building your pipeline."}
            </p>
            {hasActiveFilters ? (
              <button
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                type="button"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            ) : (
              <Link
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                to="/leads/create"
              >
                <PlusCircle className="h-4 w-4" />
                Create Lead
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/90">
                  <tr>
                    {["Lead", "Phone", "Zip", "Make", "Model", "Year", "Part", "Disposition", "Notes"].map((heading) => (
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
                    <LeadTableRow
                      key={lead._id}
                      lead={lead}
                      editingLeadId={editingLeadId}
                      editNote={editNote}
                      isUpdating={isUpdating}
                      updatingDispositionId={updatingDispositionId}
                      pendingDispositionChange={pendingDispositionChange}
                      onEditNoteChange={setEditNote}
                      onStartEditingNote={startEditingNote}
                      onCancelEditingNote={cancelEditingNote}
                      onSaveNote={saveNote}
                      onRequestDispositionChange={requestDispositionChange}
                    />
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

      {pendingDispositionChange && (
        <DispositionConfirmModal
          leadName={pendingDispositionChange.leadName}
          previousDisposition={pendingDispositionChange.previousDisposition}
          nextDisposition={pendingDispositionChange.nextDisposition}
          isSaving={updatingDispositionId === pendingDispositionChange.leadId}
          onConfirm={confirmDispositionChange}
          onCancel={cancelDispositionChange}
        />
      )}
    </Layout>
  );
}

function LeadTableRow({
  lead,
  editingLeadId,
  editNote,
  isUpdating,
  updatingDispositionId,
  pendingDispositionChange,
  onEditNoteChange,
  onStartEditingNote,
  onCancelEditingNote,
  onSaveNote,
  onRequestDispositionChange,
}) {
  return (
    <tr className="transition hover:bg-slate-800/40">
      <td className="px-5 py-4">
        <div className="font-semibold text-white">{lead.name}</div>
        <div className="mt-1 text-sm text-slate-400">{lead.email}</div>
      </td>
      <td className="px-5 py-4 text-sm text-slate-300">{lead.phone}</td>
      <td className="px-5 py-4 text-sm text-slate-300">{lead.zip || "—"}</td>
      <td className="px-5 py-4 text-sm text-slate-300">{lead.make || "—"}</td>
      <td className="px-5 py-4 text-sm text-slate-300">{lead.model || "—"}</td>
      <td className="px-5 py-4 text-sm text-slate-300">{lead.year || "—"}</td>
      <td className="max-w-xs px-5 py-4 text-sm text-slate-300">
        {lead.partRequested || "—"}
      </td>
      <td className="px-5 py-4">
        <select
          className="min-w-[10rem] rounded-full border border-emerald-500/20 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          value={lead.disposition}
          onChange={(event) => onRequestDispositionChange(lead, event.target.value)}
          disabled={updatingDispositionId === lead._id || Boolean(pendingDispositionChange)}
          aria-label={`Disposition for ${lead.name}`}
        >
          {dispositions.map((disposition) => (
            <option key={disposition} value={disposition}>
              {disposition}
            </option>
          ))}
        </select>
      </td>
      <td className="max-w-md px-5 py-4 text-sm text-slate-400">
        {editingLeadId === lead._id ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="min-h-[60px] w-full resize-y rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              value={editNote}
              onChange={(event) => onEditNoteChange(event.target.value)}
              placeholder="Add a note..."
              disabled={isUpdating}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSaveNote(lead._id)}
                disabled={isUpdating}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={onCancelEditingNote}
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
              onClick={() => onStartEditingNote(lead)}
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
function DispositionConfirmModal({
  leadName,
  previousDisposition,
  nextDisposition,
  isSaving,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="disposition-confirm-title"
      >
        <h3 className="text-lg font-bold text-white" id="disposition-confirm-title">
          Change disposition?
        </h3>
        <p className="mt-3 text-sm text-slate-400">
          Save the status change for <span className="font-semibold text-white">{leadName}</span>{" "}
          from <span className="font-semibold text-emerald-300">{previousDisposition}</span> to{" "}
          <span className="font-semibold text-emerald-300">{nextDisposition}</span> in the database?
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Confirm change"}
          </button>
        </div>
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


