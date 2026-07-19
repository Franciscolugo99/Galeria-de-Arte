import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import "../app/globals.css";
import Home from "../app/page";

const root = document.getElementById("root");

if (root) {
  hydrateRoot(
    root,
    <StrictMode>
      <Home />
    </StrictMode>,
  );
}
