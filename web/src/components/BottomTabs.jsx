import { useNavigate, useLocation } from "react-router-dom";
import "./BottomTabs.css";

export default function BottomTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: "/matches", label: "Matches" },
    // { path: "/apartments", label: "Apartments" }, // Hidden until API is set up
    { path: "/messages", label: "Messages" },
    { path: "/profile", label: "Profile" },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="bottom-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={`tab-button ${isActive(tab.path) ? "active" : ""}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

