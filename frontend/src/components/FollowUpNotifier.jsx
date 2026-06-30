import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
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

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        leads.forEach((lead) => {
          if (notifiedIdsRef.current.has(lead._id)) {
            return;
          }

          notifiedIdsRef.current.add(lead._id);

          const body = lead.followUpNote
            ? `${lead.followUpNote} (${formatFollowUpDate(lead.followUpAt)})`
            : `Scheduled for ${formatFollowUpDate(lead.followUpAt)}`;

          new Notification(`Follow-up: ${lead.name}`, {
            body,
            tag: `followup-${lead._id}`,
          });
        });
      }
    } catch {
      // Ignore polling errors; the next interval will retry.
    }
  }, [authHeaders, isAuthenticated, logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    fetchDueFollowUps();
    const intervalId = window.setInterval(fetchDueFollowUps, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
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

  if (!isAuthenticated || dueFollowUps.length === 0) {
    return null;
  }

  return (
    <div className="relative z-20 border-b border-amber-500/30 bg-amber-500/10 backdrop-blur">
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
              {dueFollowUps.map((lead) => (
                <div
                  key={lead._id}
                  className="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-slate-950/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
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
                  <button
                    type="button"
                    onClick={() => dismissFollowUp(lead._id)}
                    disabled={dismissingId === lead._id}
                    className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-4 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />
                    {dismissingId === lead._id ? "Dismissing..." : "Dismiss"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FollowUpNotifier;