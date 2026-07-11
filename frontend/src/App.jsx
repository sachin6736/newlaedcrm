import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { AnimatePresence } from "motion/react";
import { Toaster } from "react-hot-toast";
import { useLocation } from "react-router-dom";
import Login from "./components/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ShowLeads from "./components/ShowLeads.jsx";
import CreateLead from "./components/CreateLead.jsx";
import CreateUser from "./components/CreateUser.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import NewLeadNotifier from "./components/NewLeadNotifier.jsx";

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/leads" replace />;
  }

  return children;
}

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
    <Routes location={location} key={location.pathname}>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <ShowLeads />
          </ProtectedRoute>
        }
      />

      <Route
        path="/leads/create"
        element={
          <ProtectedRoute>
            <CreateLead />
          </ProtectedRoute>
        }
      />

      <Route
        path="/users/create"
        element={
          <AdminRoute>
            <CreateUser />
          </AdminRoute>
        }
      />

      <Route path="/" element={<Navigate to="/leads" replace />} />
      <Route path="*" element={<Navigate to="/leads" replace />} />
    </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster />
        <NewLeadNotifier />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
