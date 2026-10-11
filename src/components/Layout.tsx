import { Outlet, useLocation } from "react-router-dom";
import TopBar from "./TopBar";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-midnight">
      <TopBar />
      <main className="flex-1">
        <div key={location.pathname} className="pv-page-enter">
          <Outlet />
        </div>
      </main>
      <footer className="border-t border-purpleDark/60 px-6 py-6 text-center text-xs text-textSecondary no-print">
        Northscape — Kanchanjanga Dawn Theme · Synced via Firebase
      </footer>
    </div>
  );
}
