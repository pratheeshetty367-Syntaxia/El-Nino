import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Overview from "./pages/Overview.jsx";
import Predict from "./pages/Predict.jsx";
import Importance from "./pages/Importance.jsx";
import Events from "./pages/Events.jsx";
import Models from "./pages/Models.jsx";
import Dataset from "./pages/Dataset.jsx";
import History from "./pages/History.jsx";
import Methodology from "./pages/Methodology.jsx";
import Admin from "./pages/Admin.jsx";
 
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="overview" element={<Overview />} />
        <Route path="predict" element={<Predict />} />
        <Route path="importance" element={<Importance />} />
        <Route path="events" element={<Events />} />
        <Route path="models" element={<Models />} />
        <Route path="dataset" element={<Dataset />} />
        <Route path="history" element={<History />} />
        <Route path="methodology" element={<Methodology />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={["admin", "researcher"]}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
