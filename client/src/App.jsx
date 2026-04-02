import { Route, Routes } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import CharitiesPage from "./pages/CharitiesPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import SubscribePage from "./pages/SubscribePage";
import DashboardPage from "./pages/DashboardPage";
import AdminOverviewPage from "./pages/AdminOverviewPage";
import AdminMembersPage from "./pages/AdminMembersPage";
import AdminCharitiesPage from "./pages/AdminCharitiesPage";
import AdminDrawsPage from "./pages/AdminDrawsPage";
import AdminProofsPage from "./pages/AdminProofsPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import CharityProfilePage from "./pages/CharityProfilePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

export default function App() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/charities" element={<CharitiesPage />} />
        <Route path="/charities/:charityId" element={<CharityProfilePage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Route>
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/members" element={<AdminMembersPage />} />
          <Route path="/admin/charities" element={<AdminCharitiesPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/draws" element={<AdminDrawsPage />} />
          <Route path="/admin/proofs" element={<AdminProofsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
