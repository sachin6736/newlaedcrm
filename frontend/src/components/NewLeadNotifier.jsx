import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";
import { apiUrl } from "../config/api.js";

const TOAST_DURATION_MS = 10000;
const MAX_VISIBLE_TOASTS = 4;
export const NEW_LEAD_EVENT = "crm:new-lead";
/** Fired by Enable notifications to show recent / selected leads. */
export const NOTIFY_NEW_LEADS_EVENT = "crm:notify-new-leads";

function getAssigneeId(lead) {
  return lead?.assignedTo?._id ?? lead?.assignedTo ?? null;
}

function getCreatorId(lead) {
  return lead?.createdBy?._id ?? lead?.createdBy ?? null;
}

function formatSource(source) {
  if (!source) {
    return "New lead";
  }

  return source.charAt(0).toUpperCase() + source.slice(1);
}

function NewLeadNotifier() {
  const { token, user, isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState([]);
  const seenIdsRef = useRef(new Set());
  const timersRef = useRef(new Map());
  const currentUserId = user?.id ?? user?._id;

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    const timerId = timersRef.current.get(id);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    (lead, options = {}) => {
      const { force = false } = options;

      if (!lead?._id) {
        return;
      }

      // Live stream: skip duplicates and leads this user just created.
      if (!force) {
        if (seenIdsRef.current.has(lead._id)) {
          return;
        }

        const creatorId = getCreatorId(lead);
        if (creatorId && currentUserId && String(creatorId) === String(currentUserId)) {
          return;
        }
      }

      seenIdsRef.current.add(lead._id);

      // Reset auto-dismiss timer if this lead toast is re-shown via Enable.
      const existingTimer = timersRef.current.get(lead._id);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
        timersRef.current.delete(lead._id);
      }

      const toast = {
        id: lead._id,
        lead,
        createdAt: Date.now(),
      };

      setToasts((current) => {
        const without = current.filter((item) => item.id !== lead._id);
        return [toast, ...without].slice(0, MAX_VISIBLE_TOASTS);
      });

      const timerId = window.setTimeout(() => {
        dismissToast(lead._id);
      }, TOAST_DURATION_MS);
      timersRef.current.set(lead._id, timerId);

      if (!force) {
        window.dispatchEvent(new CustomEvent(NEW_LEAD_EVENT, { detail: lead }));
      }

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        const assigneeName = lead.assignedTo?.name;
        const bodyParts = [
          lead.phone ? `Phone: ${lead.phone}` : null,
          lead.partRequested ? `Part: ${lead.partRequested}` : null,
          assigneeName ? `Assigned to: ${assigneeName}` : null,
        ].filter(Boolean);

        new Notification(`New lead: ${lead.name}`, {
          body: bodyParts.join(" · ") || `${formatSource(lead.source)} lead received`,
          tag: `new-lead-${lead._id}`,
        });
      }
    },
    [dismissToast, currentUserId]
  );

  // Enable notifications button → show recent new lead toasts + desktop alerts.
  useEffect(() => {
    const handleNotifyBatch = (event) => {
      const leads = event.detail?.leads || [];
      const force = Boolean(event.detail?.force);

      leads.forEach((lead) => {
        pushToast(lead, { force });
      });
    };

    window.addEventListener(NOTIFY_NEW_LEADS_EVENT, handleNotifyBatch);
    return () => window.removeEventListener(NOTIFY_NEW_LEADS_EVENT, handleNotifyBatch);
  }, [pushToast]);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }

    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const socket = io(apiUrl(""), {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("lead:created", (lead) => {
      pushToast(lead);
    });

    return () => {
      socket.disconnect();
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, [isAuthenticated, token, pushToast]);

  // Clear state when the session ends.
  useEffect(() => {
    if (!isAuthenticated) {
      seenIdsRef.current.clear();
      setToasts([]);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-full max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const { lead } = toast;
          const assignee = lead.assignedTo?.name;
          const isMine =
            currentUserId &&
            String(getAssigneeId(lead) || "") === String(currentUserId);

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="pointer-events-auto overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950/95 shadow-2xl shadow-emerald-500/10 backdrop-blur"
            >
              <div className="flex items-start gap-3 px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    New lead{isMine ? " assigned to you" : ""}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-white">
                    {lead.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {[
                      lead.phone,
                      lead.partRequested,
                      formatSource(lead.source),
                      assignee ? `→ ${assignee}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                  aria-label="Dismiss notification"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-0.5 origin-left bg-emerald-500/80">
                <motion.div
                  className="h-full bg-emerald-400"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: TOAST_DURATION_MS / 1000, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default NewLeadNotifier;
