import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="page-container">
        <Outlet />
      </div>
    </div>
  );
}
