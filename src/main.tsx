import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";

// main is the only place allowed to know every module: it wires core ports to
// their implementations (vim/storage) and boots the UI (ADR-0005).
const root = document.getElementById("root");
if (!root) throw new Error("#root not found in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
