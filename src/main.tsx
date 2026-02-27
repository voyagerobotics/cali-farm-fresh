import "./lib/supabase-proxy"; // Must be first - intercepts fetch for ISP bypass
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
