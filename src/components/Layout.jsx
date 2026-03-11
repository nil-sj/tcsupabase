import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  return (
    <div style={{ fontFamily: "system-ui" }}>
      <Navbar />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: 16 }}>
        <Outlet />
      </div>
    </div>
  );
}