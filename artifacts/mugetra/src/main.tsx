import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { API_ORIGIN, installApiFetch } from "./lib/config";
import "./index.css";

installApiFetch();
if (API_ORIGIN) setBaseUrl(API_ORIGIN);

createRoot(document.getElementById("root")!).render(<App />);
