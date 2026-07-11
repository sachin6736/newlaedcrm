import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, HelpCircle, LogOut } from "lucide-react";

const ICONS = {
  warning: AlertTriangle,
  question: HelpCircle,
  logout: LogOut,
};

/**
 * Reusable confirmation modal rendered into document.body so it always
 * appears above page chrome (header, stacking contexts, etc.).
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
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, isLoading, onCancel]);

  if (typeof document === "undefined") {
    return null;
  }

  const Icon = ICONS[icon] || HelpCircle;
  const isDanger = confirmVariant === "danger";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          onClick={() => {
            if (!isLoading) {
              onCancel();
            }
          }}
          role="presentation"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="max-h-[calc(100vh-3rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/40"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isDanger
                ? "bg-red-500/15 text-red-300"
                : "bg-emerald-500/15 text-emerald-300"
            }`}
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
          <motion.button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 px-5 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            whileHover={isLoading ? undefined : { y: -1 }}
            whileTap={isLoading ? undefined : { scale: 0.97 }}
          >
            {cancelLabel}
          </motion.button>
          <motion.button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? "bg-red-500 text-white hover:bg-red-400"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            }`}
            whileHover={isLoading ? undefined : { y: -1 }}
            whileTap={isLoading ? undefined : { scale: 0.97 }}
          >
            {isLoading ? "Please wait..." : confirmLabel}
          </motion.button>
        </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default ConfirmModal;
