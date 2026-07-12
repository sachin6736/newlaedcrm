import { useCallback, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext.jsx";
import { apiUrl } from "../config/api.js";

const TOAST_DURATION_MS = 10000;

function getCreatorId(lead) {
  return lead?.createdBy?._id ?? lead?.createdBy ?? null;
}

function formatSource(source) {
  return source ? `${source.charAt(0).toUpperCase()}${source.slice(1)}` : "New";
}

function NewLeadNotifier() {
  const { token, user, isAuthenticated } = useAuth();
  const seenIdsRef = useRef(new Set());
  const currentUserId = user?.id ?? user?._id;

  const showLeadToast = useCallback(
    (lead) => {
      if (!lead?._id || seenIdsRef.current.has(lead._id)) {
        return;
      }

      const creatorId = getCreatorId(lead);
      if (creatorId && currentUserId && String(creatorId) === String(currentUserId)) {
        return;
      }

      seenIdsRef.current.add(lead._id);

      const details = [
        lead.phone,
        lead.partRequested,
        lead.assignedTo?.name ? `Assigned to ${lead.assignedTo.name}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      toast.success(
        <div>
          <p>New {formatSource(lead.source)} lead: {lead.name}</p>
          {details && <p className="mt-1 text-xs text-slate-500">{details}</p>}
        </div>,
        {
          id: `new-lead-${lead._id}`,
          duration: TOAST_DURATION_MS,
          position: "top-right",
        }
      );
    },
    [currentUserId]
  );

  useEffect(() => {
    if (!isAuthenticated || !token) {
      return undefined;
    }

    const socket = io(apiUrl(""), {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("lead:created", showLeadToast);

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token, showLeadToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      seenIdsRef.current.clear();
    }
  }, [isAuthenticated]);

  return null;
}

export default NewLeadNotifier;
