import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { apiUrl } from "../config/api.js";

const DUE_FOLLOWUPS_URL = apiUrl("/api/leads/followups/due");
const POLL_INTERVAL_MS = 30000;

function formatFollowUpDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function FollowUpNotifier() {
  const { authHeaders, logout, isAuthenticated } = useAuth();
  const [dueFollowUps, setDueFollowUps] = useState([]);
  const notifiedIdsRef = useRef(new Set());
  const [dismissingId, setDismissingId] = useState(null);

  const fetchDueFollowUps = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await fetch(DUE_FOLLOWUPS_URL, {
        headers: authHeaders(),
      });
      const result = await response.json();

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        return;
      }

      const leads = result.data || [];
      setDueFollowUps(leads);

      leads.forEach((lead) => {
        if (notifiedIdsRef.current.has(lead._id)) {
          return;
        }

        notifiedIdsRef.current.add(lead._id);

        const description = lead.followUpNote
          ? `${lead.followUpNote} (${formatFollowUpDate(lead.followUpAt)})`
          : `Scheduled for ${formatFollowUpDate(lead.followUpAt)}`;

        toast(
          <div>
            <p>Follow-up due: {lead.name}</p>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>,
          {
            id: `followup-${lead._id}`,
            duration: 10000,
            position: "top-right",
            icon: "🔔",
          }
        );
      });
    } catch {
      // Ignore polling errors; the next interval will retry.
    }
  }, [authHeaders, isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const initialFetchId = window.setTimeout(fetchDueFollowUps, 0);
    const intervalId = window.setInterval(fetchDueFollowUps, POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialFetchId);
      window.clearInterval(intervalId);
    };
  }, [fetchDueFollowUps, isAuthenticated]);

  const dismissFollowUp = async (leadId) => {
    try {
      setDismissingId(leadId);

      const response = await fetch(apiUrl(`/api/leads/${leadId}/followup/dismiss`), {
        method: "PATCH",
        headers: authHeaders(),
      });
      const result = await response.json();

      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || "Unable to dismiss follow-up");
      }

      setDueFollowUps((current) => current.filter((lead) => lead._id !== leadId));
      notifiedIdsRef.current.delete(leadId);
    } catch {
      // Keep the reminder visible if dismiss fails.
    } finally {
      setDismissingId(null);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AnimatePresence>
      {dueFollowUps.length > 0 && (
        <motion.div
          className="relative z-20 border-b border-amber-500/30 bg-amber-500/10 backdrop-blur"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
      <div className="mx-auto max-w-7xl px-5 py-4 sm:px-8">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-200">
              {dueFollowUps.length === 1
                ? "1 follow-up is due now"
                : `${dueFollowUps.length} follow-ups are due now`}
            </p>
            <div className="mt-3 space-y-2">
              {dueFollowUps.map((lead, index) => (
                <motion.div
                  key={lead._id}
                  className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-slate-950/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.035, 0.18) }}
                  layout
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{lead.name}</p>
                    <p className="text-sm text-amber-100/90">
                      Due {formatFollowUpDate(lead.followUpAt)}
                      {lead.followUpNote ? ` — ${lead.followUpNote}` : ""}
                    </p>
                    {lead.phone && (
                      <p className="mt-1 text-xs text-slate-400">Phone: {lead.phone}</p>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => dismissFollowUp(lead._id)}
                    disabled={dismissingId === lead._id}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-4 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    whileHover={dismissingId === lead._id ? undefined : { y: -1 }}
                    whileTap={dismissingId === lead._id ? undefined : { scale: 0.97 }}
                  >
                    <X className="h-3.5 w-3.5" />
                    {dismissingId === lead._id ? "Dismissing..." : "Dismiss"}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default FollowUpNotifier;
