import { createRoot } from "react-dom/client";
import { installResilientFetch } from "./lib/supabaseFetch";
import App from "./App.tsx";
import "./index.css";

// Install resilient fetch before any Supabase calls
installResilientFetch();

createRoot(document.getElementById("root")!).render(<App />);
