import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/i18n";

// Initialize RTL based on saved language
const savedLang = localStorage.getItem('language') || 'en';
document.documentElement.dir = savedLang === 'fa' ? 'rtl' : 'ltr';
document.documentElement.lang = savedLang;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
