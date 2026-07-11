import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Clock } from "./core/ports";
import { openProgressStore } from "./storage/indexedDbProgressStore";
import { App } from "./ui/App";
import "./ui/index.css";

// main is the only place allowed to know every module: it wires core ports to
// their implementations (vim/storage) and boots the UI (ADR-0005).
const systemClock: Clock = { now: () => new Date() };

const root = document.getElementById("root");
if (!root) throw new Error("#root not found in index.html");

createRoot(root).render(
  <StrictMode>
    <App openStore={() => openProgressStore()} clock={systemClock} />
  </StrictMode>,
);
