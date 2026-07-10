import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, LogOut } from "lucide-react";

const ICONS = {
  warning: AlertTriangle,
  question: HelpCircle,
  logout: LogOut,
};

/** Keep the modal mounted long enough for the exit animation to finish. */
const ANIMATION_MS = 200;

/**
 * Reusable confirmation modal rendered into document.body so it always
 * appears above page chrome (header, stacking contexts, etc.).
 * Includes enter/exit fade + scale transitions.
 */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  icon = "question",
  isLoading = false,
  onConfirm,
  onCancel,
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  // Mount when open; unmount after exit animation when closed.
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Double rAF so the browser paints the "from" styles before transitioning.
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeoutId = window.setTimeout(() => setMounted(false), ANIMATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [open]);

  useEffect(() => {
    if (!mounted) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoading && open) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mounted, open, isLoading, onCancel]);

  if (!mounted || typeof document === "undefined") {
    return null;
  }

  const Icon = ICONS[icon] || HelpCircle;
  const isDanger = confirmVariant === "danger";

  return createPortal(
    <div
<<<<<<< HEAD
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-all duration-200 ease-out ${
        visible
          ? "bg-slate-950/70 opacity-100 backdrop-blur-sm"
          : "bg-slate-950/0 opacity-0 backdrop-blur-none"
      }`}
=======
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
>>>>>>> 6e0a47456c7d6e780c57782586fe237f60185b63
      onClick={() => {
        if (!isLoading && open) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
<<<<<<< HEAD
        className={`w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40 transition-all duration-200 ease-out ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-3 scale-95 opacity-0"
        }`}
=======
        className="max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40"
>>>>>>> 6e0a47456c7d6e780c57782586fe237f60185b63
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 ease-out ${
              isDanger
                ? "bg-red-500/15 text-red-300"
                : "bg-emerald-500/15 text-emerald-300"
            } ${visible ? "scale-100" : "scale-75"}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white" id="confirm-modal-title">
              {title}
            </h3>
            {typeof message === "string" ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>
            ) : (
              <div className="mt-2 text-sm leading-relaxed text-slate-400">{message}</div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            }`}
          >
            {isLoading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default ConfirmModal;
