import React from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

export default function Service() {
  const navigate = useNavigate();

  return (
    <div className="service-links" style={{ color: "#ffffff" }}>
      <button className="service-button" onClick={() => navigate("/direct-imaging")}>Direct Imaging</button>
      <button className="service-button" onClick={() => navigate("/transit")}>Transit</button>
    </div>
  );
}
