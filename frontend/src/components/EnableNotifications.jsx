import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Bell, BellOff, BellRing, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { API_URL } from "../constants/leads.js";
import { NOTIFY_NEW_LEADS_EVENT } from "./NewLeadNotifier.jsx";

const buttonTap = { scale: 0.97 };
const buttonHover = { y: -1 };
const RECENT_LEADS_LIMIT = 5;

function getPermission() {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

function getAssigneeId(lead) {
  return lead?.assignedTo?._id ?? lead?.assignedTo ?? null;
}

function EnableNotifications() {
  const { authHeaders, user, isAdmin } = useAuth();
  const [permission, setPermission] = useState(getPermission);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const currentUserId = user?.id ?? user?._id;

  useEffect(() => {
    setPermission(getPermission());

    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return undefined;
    }

    let statusRef = null;

    navigator.permissions
      .query({ name: "notifications" })
      .then((status) => {
        statusRef = status;
        setPermission(status.state === "prompt" ? "default" : status.state);

        status.onchange = () => {
          setPermission(status.state === "prompt" ? "default" : status.state);
          setMessage("");
        };
      })
      .catch(() => {
        // Permissions API not available for notifications in this browser.
      });

    return () => {
      if (statusRef) {
        statusRef.onchange = null;
      }
    };
  }, []);

  const clearMessageSoon = useCallback(() => {
    window.setTimeout(() => setMessage(""), 6000);
  }, []);

  /** Fetch recent leads and show them as in-app + browser notifications. */
  const showRecentNewLeads = useCallback(async () => {
    const response = await fetch(
      `${API_URL}?page=1&limit=${RECENT_LEADS_LIMIT}`,
      { headers: authHeaders() }
    );
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load recent leads");
    }

    let leads = result.data || [];

    // Agents only get notified for leads assigned to them.
    if (!isAdmin && currentUserId) {
      leads = leads.filter(
        (lead) => String(getAssigneeId(lead) || "") === String(currentUserId)
      );
    }

    window.dispatchEvent(
      new CustomEvent(NOTIFY_NEW_LEADS_EVENT, {
        detail: { leads, force: true },
      })
    );

    return leads.length;
  }, [authHeaders, currentUserId, isAdmin]);

  const handleClick = async () => {
    if (permission === "unsupported") {
      setMessage("This browser does not support desktop notifications.");
      clearMessageSoon();
      return;
    }

    if (permission === "denied") {
      setMessage(
        "Notifications are blocked. Click the lock icon in the address bar → Notifications → Allow, then refresh."
      );
      clearMessageSoon();
      return;
    }

    try {
      setBusy(true);
      setMessage("");

      let nextPermission = permission;

      if (permission !== "granted") {
        nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
      }

      if (nextPermission !== "granted") {
        setMessage(
          nextPermission === "denied"
            ? "Permission denied. Enable notifications from the browser site settings."
            : "Permission was not granted yet."
        );
        clearMessageSoon();
        return;
      }

      const count = await showRecentNewLeads();

      if (count === 0) {
        setMessage("Notifications enabled. No recent new leads right now — you'll be alerted when one arrives.");
      } else if (count === 1) {
        setMessage("Showing 1 recent new lead notification.");
      } else {
        setMessage(`Showing ${count} recent new lead notifications.`);
      }

      clearMessageSoon();
    } catch (error) {
      setMessage(error.message || "Unable to enable lead notifications.");
      clearMessageSoon();
    } finally {
      setBusy(false);
    }
  };

  if (permission === "unsupported") {
    return null;
  }

  const isGranted = permission === "granted";
  const isDenied = permission === "denied";

  const label = busy
    ? "Loading leads..."
    : isGranted
      ? "New lead alerts"
      : isDenied
        ? "Notifications blocked"
        : "Enable notifications";

  const Icon = isGranted ? BellRing : isDenied ? BellOff : Bell;

  return (
    <div className="relative flex flex-col items-stretch sm:items-end">
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={busy}
        title={
          isDenied
            ? "Notifications are blocked in browser settings"
            : isGranted
              ? "Show recent new lead notifications"
              : "Enable browser notifications and show recent new leads"
        }
        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isGranted
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
            : isDenied
              ? "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"
              : "border-slate-700 text-slate-300 hover:border-slate-600 hover:bg-slate-900"
        }`}
        whileHover={busy ? undefined : buttonHover}
        whileTap={busy ? undefined : buttonTap}
      >
        {isGranted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        <span className="whitespace-nowrap">{label}</span>
      </motion.button>

      {message && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-2 max-w-xs text-xs leading-relaxed sm:text-right ${
            isDenied || permission === "denied"
              ? "text-amber-300/90"
              : isGranted || permission === "granted"
                ? "text-emerald-300/90"
                : "text-slate-400"
          }`}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

export default EnableNotifications;
