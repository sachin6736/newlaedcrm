import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LayoutDashboard, LogOut, PlusCircle, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import ConfirmModal from "./ConfirmModal.jsx";
import FollowUpNotifier from "./FollowUpNotifier.jsx";

const baseNavItems = [
  { to: "/leads", label: "All Leads", icon: LayoutDashboard },
  { to: "/leads/create", label: "Create Lead", icon: PlusCircle },
];

const adminNavItems = [
  { to: "/users/create", label: "Manage Users", icon: Users },
];

const MotionNavLink = motion.create(NavLink);
const buttonTap = { scale: 0.97 };
const buttonHover = { y: -1 };

function Layout({ children, title, subtitle }) {
  const { user, logout, isAdmin } = useAuth();
  const navItems = isAdmin ? [...baseNavItems, ...adminNavItems] : baseNavItems;
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-x-0 top-0 h-72 bg-linear-to-br from-emerald-600/30 via-emerald-700/10 to-transparent blur-3xl" />

      <motion.header
        className="relative z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              CRM Platform
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {user && (
              <p className="text-sm font-medium text-slate-400">
                Signed in as{" "}
                <span className="text-emerald-300">{user.name}</span>
                {user.role && (
                  <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-slate-300">
                    {user.role}
                  </span>
                )}
              </p>
            )}
            <motion.button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-900"
              type="button"
              onClick={handleLogoutClick}
              whileHover={buttonHover}
              whileTap={buttonTap}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </motion.button>
          </div>
        </div>

        <nav className="mx-auto max-w-7xl px-5 pb-4 sm:px-8">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <MotionNavLink
                  className={({ isActive }) =>
                    `inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                      isActive
                        ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                        : "border border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white"
                    }`
                  }
                  key={item.to}
                  to={item.to}
                  whileHover={buttonHover}
                  whileTap={buttonTap}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </MotionNavLink>
              );
            })}
          </div>
        </nav>
      </motion.header>

      <FollowUpNotifier />

      <motion.main
        className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {children}
      </motion.main>

      <ConfirmModal
        open={showLogoutConfirm}
        title="Sign out?"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign out"
        cancelLabel="Stay signed in"
        confirmVariant="danger"
        icon="logout"
        onConfirm={handleLogoutConfirm}
        onCancel={handleLogoutCancel}
      />
    </div>
  );
}

export default Layout;
