import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Login from "./components/login.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ShowLeads from "./components/ShowLeads.jsx";
import CreateLead from "./components/CreateLead.jsx";

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/leads" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
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

      <Route path="/" element={<Navigate to="/leads" replace />} />
      <Route path="*" element={<Navigate to="/leads" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;