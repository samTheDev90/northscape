import { HashRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import { AdminRoute, AuthenticatedRoute } from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ItineraryPage from "./pages/ItineraryPage";
import BudgetPage from "./pages/BudgetPage";
import ParticipantsPage from "./pages/ParticipantsPage";
import ParticipantProfilePage from "./pages/ParticipantProfilePage";
import DestinationsPage from "./pages/DestinationsPage";
import DestinationArticlePage from "./pages/DestinationArticlePage";
import DocumentsPage from "./pages/DocumentsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import SignInPage from "./pages/SignInPage";
import MyProfilePage from "./pages/MyProfilePage";
import WeatherPage from "./pages/WeatherPage";
import ImportPage from "./pages/ImportPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<LandingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/participants" element={<ParticipantsPage />} />
          <Route
            path="/participants/:id"
            element={<ParticipantProfilePage />}
          />
          <Route path="/destinations" element={<DestinationsPage />} />
          <Route
            path="/destinations/:id"
            element={<DestinationArticlePage />}
          />
          <Route path="/weather" element={<WeatherPage />} />
          <Route path="/stats" element={<ProfilePage />} />

          <Route element={<AuthenticatedRoute />}>
            <Route path="/me" element={<MyProfilePage />} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/import" element={<ImportPage />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
}
