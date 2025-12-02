# Flight Deck Agent Demo

This is a minimal implementation of an LLM Agent-driven flight cockpit auxiliary decision screen.

## Project Structure

- **frontend/** (Simulated in `src`): React + Tailwind CSS application.
- **backend/** (Reference in `backend_reference.py`): Python FastAPI implementation.

## How to Run (Browser Demo)

This web container runs the Frontend application. 
The "Backend Agent" logic is currently simulated inside `services/geminiService.ts` using the Client-Side Gemini SDK to allow this demo to function immediately without needing a local Python server.

1.  Enter your Gemini API Key in the environment variables (or it will prompt you/fail gracefully).
2.  The app will load mock flight data.
3.  Supported Natural Language Commands:
Layout:
"Move fuel to the top" (Change Zone)
"Put RPM first" (Reorder)
"Hide fuel level" (Visibility - only works for non-core items)
Appearance:
"Make altitude red" (Text Color)
"Change fuel background to blue" (Background Color)
"Make airspeed larger" (Scale)
"Switch to light mode" / "Dark mode" (Global Theme)
Visualization Style:
"Show fuel as a bar chart"
"Display RPM as a gauge" (or ring)
"Show altitude as text"


## How to Run (Full Stack for Thesis)

To implement the full architecture as described in your thesis proposal:

1.  **Backend Setup**:
    - Save the content of `backend_reference.py` to `main.py`.
    - Install dependencies: `pip install fastapi uvicorn google-generativeai pydantic python-dotenv`.
    - Run the server: `uvicorn main:app --reload`.

2.  **Frontend Setup**:
    - Modify `services/geminiService.ts` to use `fetch('http://localhost:8000/api/adjust-ui', ...)` instead of `GoogleGenAI`.
    - Run the React app.
