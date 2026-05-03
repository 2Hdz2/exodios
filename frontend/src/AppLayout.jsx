import { Outlet, NavLink } from "react-router-dom";
import logo from "../assets/logo.png";

export default function AppLayout() {
  return (
    <div className="space-bg">
      <div className="stars" />
      <div className="shooting-star" />
      <div className="shooting-star" />
      <div className="shooting-star" />
      <div className="shooting-star" />

      {/* Header */}
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-group">
            <a
              href="/"
              rel="noopener noreferrer"
              style={{ display: "flex", alignItems: "center", textDecoration: "none" }}
            >
              <img src={logo} alt="logo" className="app-logo" style={{ height: 32 }} />
            </a>
            <div>
              <div className="logo-title">EXO<span className="accent">SYNERGY</span></div>
              <div className="logo-sub">AI HYBRID EXOPLANET DETECTION FRAMEWORK</div>
            </div>
          </div>

          <nav className="main-nav">
            <NavLink to="/direct-imaging" className="nav-item">
              ◎ Direct Imaging
            </NavLink>
            <NavLink to="/transit" className="nav-item">
              ⌇ Transit
            </NavLink>
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="site-main">
        <Outlet />
      </main>
    </div>
  );
}