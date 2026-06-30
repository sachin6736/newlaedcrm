import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Filter,
  Pencil,
  PlusCircle,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Bell,
  StickyNote,
  X,
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
const NOTE_PREVIEW_LENGTH = 15;

const YEAR_OPTIONS = getYearOptions();

function truncateNote(note, maxLength = NOTE_PREVIEW_LENGTH) {
  if (!note) {
    return "";
  }

  return note.length > maxLength ? note.slice(0, maxLength) : note;
}

function isNoteTruncated(note, maxLength = NOTE_PREVIEW_LENGTH) {
  return Boolean(note && note.length > maxLength);
}

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

function getAssignedUserId(lead) {
  return lead.assignedTo?._id ?? lead.assignedTo ?? null;
}

function formatFollowUpDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function toDatetimeLocalValue(date = new Date()) {
  const value = new Date(date);
  const pad = (part) => String(part).padStart(2, "0");

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function getDefaultFollowUpDatetime() {
  const nextHour = new Date();
  nextHour.setMinutes(0, 0, 0);
  nextHour.setHours(nextHour.getHours() + 1);
  return toDatetimeLocalValue(nextHour);
}

function isFollowUpDue(lead) {
  if (!lead.followUpAt || lead.followUpRemindedAt) {
    return false;
  }

  return new Date(lead.followUpAt) <= new Date();
}

function ShowLeads() {
  const { authHeaders, logout, user, isAdmin } = useAuth();
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
  const [viewingNote, setViewingNote] = useState(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [followUpLead, setFollowUpLead] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    datetime: getDefaultFollowUpDatetime(),
    note: "",
  });
  const [savingFollowUp, setSavingFollowUp] = useState(false);

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

  const openNoteViewer = (lead) => {
    if (!isNoteTruncated(lead.notes)) {
      return;
    }

    setViewingNote({
      leadId: lead._id,
      leadName: lead.name,
      notes: lead.notes,
    });
  };

  const closeNoteViewer = () => {
    setViewingNote(null);
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

  const openFollowUpModal = (lead) => {
    setFollowUpLead(lead);
    setFollowUpForm({
      datetime: lead.followUpAt
        ? toDatetimeLocalValue(lead.followUpAt)
        : getDefaultFollowUpDatetime(),
      note: lead.followUpNote || "",
    });
    setError("");
    setSuccess("");
  };

  const closeFollowUpModal = () => {
    if (savingFollowUp) {
      return;
    }

    setFollowUpLead(null);
  };

  const saveFollowUp = async () => {
    if (!followUpLead || savingFollowUp) {
      return;
    }

    const scheduledDate = new Date(followUpForm.datetime);

    if (Number.isNaN(scheduledDate.getTime())) {
      setError("Please choose a valid follow-up date and time.");
      return;
    }

    if (scheduledDate <= new Date()) {
      setError("Follow-up time must be in the future.");
      return;
    }

    setSavingFollowUp(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/${followUpLead._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          followUpAt: scheduledDate.toISOString(),
          followUpNote: followUpForm.note.trim(),
        }),
      });
      const result = await response.json();

      if (response.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to schedule follow-up");
      }

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead._id === followUpLead._id
            ? {
                ...lead,
                followUpAt: result.data.followUpAt,
                followUpNote: result.data.followUpNote,
                followUpSetBy: result.data.followUpSetBy,
                followUpRemindedAt: null,
              }
            : lead
        )
      );

      setSuccess(`Follow-up scheduled for ${followUpLead.name}.`);
      setFollowUpLead(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFollowUp(false);
    }
  };

  const clearFollowUp = async () => {
    if (!followUpLead || savingFollowUp) {
      return;
    }

    setSavingFollowUp(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/${followUpLead._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ clearFollowUp: true }),
      });
      const result = await response.json();

      if (response.status === 401) {
        logout();
        navigate("/login", { replace: true });
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Failed to clear follow-up");
      }

      setLeads((prevLeads) =>
        prevLeads.map((lead) =>
          lead._id === followUpLead._id
            ? {
                ...lead,
                followUpAt: null,
                followUpNote: "",
                followUpSetBy: null,
                followUpRemindedAt: null,
              }
            : lead
        )
      );

      setSuccess(`Follow-up cleared for ${followUpLead.name}.`);
      setFollowUpLead(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingFollowUp(false);
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
      <div className="grid gap-3 sm:grid-cols-3">
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

      {!isAdmin && (
        <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <span className="font-semibold text-emerald-300">Your leads</span> are highlighted in
          green so you can spot them quickly among all team leads.
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur">
        <div className="border-b border-slate-800 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Lead directory</h2>
              <p className="mt-1 text-sm text-slate-400">
                {isAdmin
                  ? "View every lead and who it is assigned to across your team."
                  : "All team leads are listed below. Your assigned leads appear highlighted in green."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setFiltersExpanded((current) => !current)}
                aria-expanded={filtersExpanded}
                aria-controls="lead-filters-panel"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 text-sm font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-800 hover:text-white"
              >
                <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
                Search & filters
                {hasActiveFilters && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                    Active
                  </span>
                )}
                {filtersExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
              </button>
              <Link
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                to="/leads/create"
              >
                <PlusCircle className="h-4 w-4" />
                Create Lead
              </Link>
            </div>
          </div>

          {!filtersExpanded && hasActiveFilters && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-emerald-300">Filters applied.</span>{" "}
                {pageSummary}
              </p>
              <button
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 px-4 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                type="button"
                onClick={handleClearFilters}
              >
                Clear filters
              </button>
            </div>
          )}

          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
              filtersExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden" id="lead-filters-panel">
              <div className="space-y-4 pt-4">
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
                Matches name, email, phone, make, model, year, part requested, and notes.
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
            </div>
          </div>
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
                    {[
                      "Lead",
                      ...(isAdmin ? ["Assigned To"] : []),
                      "Phone",
                      "Zip",
                      "Make",
                      "Model",
                      "Year",
                      "Part",
                      "Disposition",
                      "Follow-up",
                      "Notes",
                    ].map((heading) => (
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
                      isAdmin={isAdmin}
                      isOwnLead={
                        !isAdmin &&
                        String(getAssignedUserId(lead)) === String(user?.id)
                      }
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
                      onViewNote={openNoteViewer}
                      onOpenFollowUp={openFollowUpModal}
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

      {viewingNote && (
        <NotesViewModal
          leadName={viewingNote.leadName}
          notes={viewingNote.notes}
          onClose={closeNoteViewer}
        />
      )}

      {followUpLead && (
        <FollowUpModal
          lead={followUpLead}
          form={followUpForm}
          isSaving={savingFollowUp}
          onChange={setFollowUpForm}
          onSave={saveFollowUp}
          onClear={clearFollowUp}
          onClose={closeFollowUpModal}
        />
      )}
    </Layout>
  );
}

function LeadTableRow({
  lead,
  isAdmin,
  isOwnLead,
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
  onViewNote,
  onOpenFollowUp,
}) {
  const followUpDue = isFollowUpDue(lead);
  const rowClassName = followUpDue
    ? "bg-amber-500/15 transition hover:bg-amber-500/25 ring-1 ring-inset ring-amber-500/40"
    : isOwnLead
      ? "bg-emerald-500/15 transition hover:bg-emerald-500/25 ring-1 ring-inset ring-emerald-500/30"
      : "transition hover:bg-slate-800/40";

  return (
    <tr className={rowClassName}>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-white">{lead.name}</div>
          {isOwnLead && (
            <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-950">
              Yours
            </span>
          )}
        </div>
        <div className="mt-1 text-sm text-slate-400">{lead.email}</div>
      </td>
      {isAdmin && (
        <td className="px-5 py-4 text-sm text-slate-300">
          {lead.assignedTo?.name || "Unassigned"}
        </td>
      )}
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
      <td className="min-w-[11rem] px-5 py-4 text-sm text-slate-300">
        {lead.followUpAt ? (
          <div>
            <p className={`font-semibold ${followUpDue ? "text-amber-300" : "text-slate-200"}`}>
              {formatFollowUpDate(lead.followUpAt)}
            </p>
            {lead.followUpNote && (
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">{lead.followUpNote}</p>
            )}
            {followUpDue && (
              <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-300">
                Due now
              </p>
            )}
          </div>
        ) : (
          <span className="text-slate-500">Not scheduled</span>
        )}
        <button
          type="button"
          onClick={() => onOpenFollowUp(lead)}
          className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-300"
        >
          <Bell className="h-3.5 w-3.5" />
          {lead.followUpAt ? "Edit" : "Schedule"}
        </button>
      </td>
      <td className="w-36 max-w-[9rem] px-5 py-4 text-sm text-slate-400">
        {editingLeadId === lead._id ? (
          <div className="flex min-w-[12rem] flex-col gap-2">
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
            <div className="min-w-0 flex-1">
              {lead.notes ? (
                isNoteTruncated(lead.notes) ? (
                  <button
                    type="button"
                    onClick={() => onViewNote(lead)}
                    className="group w-full text-left"
                    aria-label={`View full note for ${lead.name}`}
                  >
                    <span className="block truncate font-medium text-slate-300">
                      {truncateNote(lead.notes)}
                      <span className="text-emerald-400">…</span>
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-emerald-400/80 transition group-hover:text-emerald-300">
                      View full note
                    </span>
                  </button>
                ) : (
                  <span className="block truncate text-slate-300">{lead.notes}</span>
                )
              ) : (
                <span className="block text-slate-500">No notes</span>
              )}
            </div>
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
function NotesViewModal({ leadName, notes, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notes-view-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                <StickyNote className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-white" id="notes-view-title">
                Lead notes
              </h3>
            </div>
            <p className="mt-2 truncate text-sm text-slate-400">{leadName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            aria-label="Close notes"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[min(60vh,24rem)] overflow-y-auto px-6 py-5">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
            {notes}
          </p>
        </div>

        <div className="flex justify-end border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function FollowUpModal({ lead, form, isSaving, onChange, onSave, onClear, onClose }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/30"
        role="dialog"
        aria-modal="true"
        aria-labelledby="followup-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white" id="followup-modal-title">
              Schedule follow-up
            </h3>
            <p className="mt-1 truncate text-sm text-slate-400">{lead.name}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
            Date & time
            <input
              className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
              type="datetime-local"
              value={form.datetime}
              onChange={(event) =>
                onChange((current) => ({ ...current, datetime: event.target.value }))
              }
              disabled={isSaving}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
            Reminder note
            <textarea
              className="min-h-[88px] resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
              value={form.note}
              onChange={(event) =>
                onChange((current) => ({ ...current, note: event.target.value }))
              }
              placeholder="e.g. Call back about pricing"
              disabled={isSaving}
              rows={3}
            />
          </label>

          <p className="text-xs leading-relaxed text-slate-500">
            The assigned user will be reminded at this time with an in-app alert and browser
            notification.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {lead.followUpAt && (
            <button
              type="button"
              onClick={onClear}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/30 px-5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Clear follow-up
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save follow-up"}
          </button>
        </div>
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <p className="text-xl font-bold leading-tight text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default ShowLeads;


