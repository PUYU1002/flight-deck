
import { UIState } from "../types";

const DEFAULT_BACKEND_URL = "http://localhost:8000";
const RAW_BACKEND_URL = process.env.REACT_APP_BACKEND_URL || DEFAULT_BACKEND_URL;
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/$/, "");

export const processCommandWithAgent = async (
  command: string,
  currentUI: UIState
): Promise<{ success: boolean; message?: string; newState?: UIState }> => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/adjust-ui`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, current_ui: currentUI }),
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      return {
        success: false,
        message: `Backend error (${response.status}): ${errorMessage || "Unknown error"}`,
      };
    }

    return await response.json();
  } catch (error) {
    console.error("Backend Agent Error:", error);
    return { success: false, message: "Unable to reach backend. Is it running?" };
  }
};
