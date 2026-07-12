import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Filter,
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
import ConfirmModal from "./ConfirmModal.jsx";

const PAGE_SIZE = 10;
const NOTE_PREVIEW_LENGTH = 6;

const YEAR_OPTIONS = getYearOptions();
const MotionLink = motion.create(Link);

const buttonTap = { scale: 0.97 };
const buttonHover = { y: -1 };
const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: "easeOut" },
};

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
  if (!lead.followUpAt) {
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

  const cancelEditingNote = () => {
    setEditNote("");
  };

  const openNoteViewer = (lead) => {
    setViewingNote({
      leadId: lead._id,
      leadName: lead.name,
      notes: lead.notes || "",
    });
    setEditNote(lead.notes || "");
  };

  const closeNoteViewer = () => {
    if (isUpdating) {
      return;
    }

    setViewingNote(null);
    setEditNote("");
  };

  const requestDispositionChange = (lead, nextDisposition) => {
    if (updatingDispositionId || nextDisposition === lead.disposition) {
      return;
    }

    setError("");
    setPendingDispositionChange({
      leadId: lead._id,
      leadName: lead.name,
      previousDisposition: lead.disposition,
      nextDisposition,
    });
  };

  const cancelDispositionChange = () => {
    if (updatingDispositionId) {
      return;
    }

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

      setSuccess("");
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

      setViewingNote((current) =>
        current?.leadId === leadId ? { ...current, notes: result.data.notes } : current
      );
      setSuccess("Lead note was saved.");
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
    setError("");
    setLoading(true);
    setPage(nextPage);
  };

  return (
    <Layout
      title="Created Leads"
      subtitle="Review customer enquiries, track dispositions, and manage your sales pipeline."
    >
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            key="lead-error"
            {...fadeInUp}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            key="lead-success"
            {...fadeInUp}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-300"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        {...fadeInUp}
        className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20 backdrop-blur"
      >
        <div className="border-b border-slate-800 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <motion.div
              className="grid gap-2 sm:grid-cols-3 xl:min-w-[34rem]"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
            >
              <StatCard
                icon={ClipboardList}
                label={hasActiveFilters ? "Filtered leads" : "Total leads"}
                value={leadStats.total}
              />
              <StatCard icon={Sparkles} label="Quoted" value={leadStats.quoted} />
              <StatCard icon={ShoppingBag} label="Ordered" value={leadStats.ordered} />
            </motion.div>
            <div className="flex flex-wrap items-center gap-3">
              <motion.button
                type="button"
                onClick={() => setFiltersExpanded((current) => !current)}
                aria-expanded={filtersExpanded}
                aria-controls="lead-filters-panel"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/60 px-4 text-sm font-semibold text-slate-300 transition hover:border-emerald-500/40 hover:bg-slate-800 hover:text-white"
                whileHover={buttonHover}
                whileTap={buttonTap}
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
              </motion.button>
              <MotionLink
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                to="/leads/create"
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                <PlusCircle className="h-4 w-4" />
                Create Lead
              </MotionLink>
            </div>
          </div>

          {!filtersExpanded && hasActiveFilters && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-300">
                <span className="font-semibold text-emerald-300">Filters applied.</span>{" "}
                {pageSummary}
              </p>
              <motion.button
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 px-4 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                type="button"
                onClick={handleClearFilters}
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                Clear filters
              </motion.button>
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
                  <motion.button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                    type="submit"
                    whileHover={buttonHover}
                    whileTap={buttonTap}
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </motion.button>
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
                  <motion.button
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                    type="button"
                    onClick={handleClearFilters}
                    whileHover={buttonHover}
                    whileTap={buttonTap}
                  >
                    Clear filters
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
          <LeadTableLoading key="lead-table-loading" isAdmin={isAdmin} />
        ) : leads.length === 0 ? (
          <motion.div key="lead-empty" {...fadeInUp} className="p-12 text-center">
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
              <motion.button
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
                type="button"
                onClick={handleClearFilters}
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                Clear filters
              </motion.button>
            ) : (
              <MotionLink
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                to="/leads/create"
                whileHover={buttonHover}
                whileTap={buttonTap}
              >
                <PlusCircle className="h-4 w-4" />
                Create Lead
              </MotionLink>
            )}
          </motion.div>
        ) : (
          <motion.div key="lead-table" {...fadeInUp}>
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
                      "Notes",
                      "",
                    ].map((heading) => (
                      <th
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                        key={heading}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {leads.map((lead, index) => (
                    <LeadTableRow
                      key={lead._id}
                      lead={lead}
                      index={index}
                      isAdmin={isAdmin}
                      isOwnLead={
                        !isAdmin &&
                        String(getAssignedUserId(lead)) === String(user?.id)
                      }
                      isUpdating={isUpdating}
                      updatingDispositionId={updatingDispositionId}
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
          </motion.div>
        )}
        </AnimatePresence>
      </motion.div>

      <ConfirmModal
        open={Boolean(pendingDispositionChange)}
        title="Change disposition?"
        message={
          pendingDispositionChange ? (
            <p>
              Save the status change for{" "}
              <span className="font-semibold text-white">
                {pendingDispositionChange.leadName}
              </span>{" "}
              from{" "}
              <span className="font-semibold text-emerald-300">
                {pendingDispositionChange.previousDisposition}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-emerald-300">
                {pendingDispositionChange.nextDisposition}
              </span>{" "}
              in the database?
            </p>
          ) : null
        }
        confirmLabel="Confirm change"
        cancelLabel="Cancel"
        icon="question"
        isLoading={
          pendingDispositionChange
            ? updatingDispositionId === pendingDispositionChange.leadId
            : false
        }
        onConfirm={confirmDispositionChange}
        onCancel={cancelDispositionChange}
      />

      <AnimatePresence>
        {viewingNote && (
          <NotesViewModal
            leadId={viewingNote.leadId}
            leadName={viewingNote.leadName}
            editNote={editNote}
            isSaving={isUpdating}
            onEditNoteChange={setEditNote}
            onSaveNote={saveNote}
            onClose={closeNoteViewer}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
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
      </AnimatePresence>
    </Layout>
  );
}

function LeadTableLoading({ isAdmin }) {
  const columns = [
    "Lead",
    ...(isAdmin ? ["Assigned To"] : []),
    "Phone",
    "Zip",
    "Make",
    "Model",
    "Year",
    "Part",
    "Disposition",
    "Notes",
    "",
  ];

  return (
    <motion.div key="lead-table-loading" {...fadeInUp} className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-900/90">
          <tr>
            {columns.map((heading) => (
              <th
                className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500"
                key={heading}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <motion.tr
              key={rowIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: rowIndex * 0.04 }}
            >
              {columns.map((column, columnIndex) => (
                <td className="px-4 py-4" key={column}>
                  <motion.div
                    className={`h-3 rounded-full bg-slate-700/70 ${
                      columnIndex === 0 ? "w-36" : columnIndex > 7 ? "w-24" : "w-20"
                    }`}
                    animate={{ opacity: [0.35, 0.9, 0.35] }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      delay: (rowIndex + columnIndex) * 0.03,
                    }}
                  />
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

function LeadTableRow({
  lead,
  index,
  isAdmin,
  isOwnLead,
  updatingDispositionId,
  onRequestDispositionChange,
  onViewNote,
  onOpenFollowUp,
}) {
  const followUpDue = isFollowUpDue(lead);
  const followUpTitle = lead.followUpAt
    ? `${followUpDue ? "Follow-up due now" : "Edit follow-up"}: ${formatFollowUpDate(
        lead.followUpAt
      )}${lead.followUpNote ? ` - ${lead.followUpNote}` : ""}`
    : "Schedule follow-up";
  const notePreview = lead.notes ? truncateNote(lead.notes) : "No notes";
  const noteTitle = lead.notes ? "Click to enlarge or edit note" : "Click to add a note";
  const rowClassName = followUpDue
    ? "bg-amber-500/15 transition hover:bg-amber-500/25 ring-1 ring-inset ring-amber-500/40"
    : "transition hover:bg-slate-800/40";
  const followUpButtonClass = followUpDue
    ? "border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/25 hover:bg-red-400 hover:text-white"
    : lead.followUpAt
      ? "border-emerald-500 bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400"
      : "border-slate-700 text-slate-400 hover:border-emerald-500/60 hover:bg-emerald-500/10 hover:text-emerald-300";

  return (
    <motion.tr
      className={rowClassName}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, delay: Math.min(index * 0.025, 0.18) }}
      layout
    >
      <td className="px-4 py-3">
        <div className="flex min-w-[10rem] items-center gap-2">
          {isOwnLead && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.12)]"
              aria-label="Assigned to you"
              role="img"
              title="Assigned to you"
            />
          )}
          <div className="min-w-0 font-semibold text-white">{lead.name}</div>
        </div>
        <div className="mt-1 text-sm text-slate-400">{lead.email}</div>
      </td>
      {isAdmin && (
        <td className="px-4 py-3 text-sm text-slate-300">
          {lead.assignedTo?.name || "Unassigned"}
        </td>
      )}
      <td className="px-4 py-3 text-sm text-slate-300">{lead.phone}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{lead.zip || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{lead.make || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{lead.model || "—"}</td>
      <td className="px-4 py-3 text-sm text-slate-300">{lead.year || "—"}</td>
      <td className="max-w-xs px-4 py-3 text-sm text-slate-300">
        {lead.partRequested || "—"}
      </td>
      <td className="px-4 py-3">
        <select
          className="min-w-[10rem] rounded-full border border-emerald-500/40 bg-slate-950 px-3 py-1.5 text-xs font-bold text-white outline-none transition hover:border-emerald-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          value={lead.disposition}
          onChange={(event) => onRequestDispositionChange(lead, event.target.value)}
          disabled={updatingDispositionId === lead._id}
          aria-label={`Disposition for ${lead.name}`}
        >
          {dispositions.map((disposition) => (
            <option key={disposition} value={disposition}>
              {disposition}
            </option>
          ))}
        </select>
      </td>
      <td className="w-36 max-w-[9rem] px-4 py-3 text-sm text-slate-400">
        <motion.button
          type="button"
          onClick={() => onViewNote(lead)}
          className="block w-full truncate text-left font-medium text-slate-300 transition hover:text-emerald-300"
          aria-label={`Open note for ${lead.name}`}
          title={noteTitle}
          whileTap={buttonTap}
        >
          {notePreview}
          {lead.notes && isNoteTruncated(lead.notes) && (
            <span className="text-emerald-400">...</span>
          )}
        </motion.button>
      </td>
      <td className="px-4 py-3">
        <motion.button
          type="button"
          onClick={() => onOpenFollowUp(lead)}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${followUpButtonClass}`}
          aria-label={followUpTitle}
          title={followUpTitle}
          whileHover={buttonHover}
          whileTap={buttonTap}
        >
          <Bell className="h-4 w-4" />
        </motion.button>
      </td>
    </motion.tr>
  );
}

function PaginationControls({ className, pageSummary, pagination, onNewer, onOlder }) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className="text-sm font-medium text-slate-400">{pageSummary}</p>
      <div className="flex flex-wrap items-center gap-3">
        <motion.button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={onNewer}
          disabled={!pagination.hasPreviousPage}
          whileHover={pagination.hasPreviousPage ? buttonHover : undefined}
          whileTap={pagination.hasPreviousPage ? buttonTap : undefined}
        >
          <ChevronLeft className="h-4 w-4" />
          Newer
        </motion.button>
        <span className="min-w-20 text-center text-sm font-semibold text-slate-400">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <motion.button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
          type="button"
          onClick={onOlder}
          disabled={!pagination.hasNextPage}
          whileHover={pagination.hasNextPage ? buttonHover : undefined}
          whileTap={pagination.hasNextPage ? buttonTap : undefined}
        >
          Older
          <ChevronRight className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
function NotesViewModal({
  leadId,
  leadName,
  editNote,
  isSaving,
  onEditNoteChange,
  onSaveNote,
  onClose,
}) {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
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
          <motion.button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
            aria-label="Close notes"
            whileHover={buttonHover}
            whileTap={buttonTap}
          >
            <X className="h-4 w-4" />
          </motion.button>
        </div>

        <div className="px-6 py-5">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-300">
            Note
            <textarea
              className="min-h-[12rem] resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-relaxed text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              value={editNote}
              onChange={(event) => onEditNoteChange(event.target.value)}
              placeholder="Add notes for this lead..."
              disabled={isSaving}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-4 sm:flex-row sm:justify-end">
          <motion.button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800"
            whileHover={isSaving ? undefined : buttonHover}
            whileTap={isSaving ? undefined : buttonTap}
          >
            Close
          </motion.button>
          <motion.button
            type="button"
            onClick={() => onSaveNote(leadId)}
            disabled={isSaving}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            whileHover={isSaving ? undefined : buttonHover}
            whileTap={isSaving ? undefined : buttonTap}
          >
            {isSaving ? "Saving..." : "Save note"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/30"
        role="dialog"
        aria-modal="true"
        aria-label="Follow-up details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="space-y-4">
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
            Note
            <textarea
              className="min-h-[88px] resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20"
              value={form.note}
              onChange={(event) =>
                onChange((current) => ({ ...current, note: event.target.value }))
              }
              disabled={isSaving}
              rows={3}
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {lead.followUpAt && (
            <motion.button
              type="button"
              onClick={onClear}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-red-500/30 px-5 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              whileHover={isSaving ? undefined : buttonHover}
              whileTap={isSaving ? undefined : buttonTap}
            >
              Clear follow-up
            </motion.button>
          )}
          <motion.button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            whileHover={isSaving ? undefined : buttonHover}
            whileTap={isSaving ? undefined : buttonTap}
          >
            Cancel
          </motion.button>
          <motion.button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            whileHover={isSaving ? undefined : buttonHover}
            whileTap={isSaving ? undefined : buttonTap}
          >
            {isSaving ? "Saving..." : "Save follow-up"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <motion.div
      className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur"
      variants={{
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <p className="text-xl font-bold leading-tight text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default ShowLeads;


