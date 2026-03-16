import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Force HMR refresh — v3.0 Premium Clean
createRoot(document.getElementById("root")!).render(<App />);
