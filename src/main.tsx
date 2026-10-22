import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { checkVersionAndUpdate, guardServiceWorkerInPreview } from "./lib/version-sync";
import { registerAppServiceWorker } from "./lib/register-sw";
import { registerBrandFooter } from "./lib/pdf-brand-footer";

registerBrandFooter();

// Guard SW in preview/iframe
guardServiceWorkerInPreview();
registerAppServiceWorker();

// Check for new version and force reload if needed
if (!checkVersionAndUpdate()) {
  createRoot(document.getElementById("root")!).render(<App />);
}
