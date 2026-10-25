import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { NotFound } from "./components/crumb/not-found";
import { Workspace } from "./components/crumb/workspace";
import { isEditorPath } from "./lib/crumb/routes";
import "./fonts.css";
import "./styles.css";

function App() {
  if (!isEditorPath(window.location.pathname)) return <NotFound />;
  return <Workspace />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
