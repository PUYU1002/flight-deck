import json
import os
import time
from langchain_openai import ChatOpenAI

use_official = os.getenv("USE_OFFICIAL_OPENAI", "0").lower() in {"1", "true", "yes"}

if use_official:
    api_key = os.getenv("OPENAI_API_KEY_OFFICIAL") or os.getenv("OPENAI_API_KEY")
    base_url = "https://api.openai.com/v1"
    model = os.getenv("OPENAI_MODEL_OFFICIAL", "gpt-4o-mini")
else:
    api_key = os.getenv("OPENAI_API_KEY")
    base_url = os.getenv("OPENAI_BASE_URL")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

if not api_key:
    raise RuntimeError("OPENAI_API_KEY 未设置")

llm = ChatOpenAI(
    model=model,
    temperature=0,
    api_key=api_key,
    base_url=base_url,
    max_retries=0,
)

SYSTEM_INSTRUCTION = """
You are a Flight Cockpit Interface Agent. You control the layout and styling of a flight display based on pilot natural language commands.

**Safety Constraints (Strict Enforcement):**
1. **Core Parameters**: 'altitude', 'airspeed', 'rpm', 'phase'.
   - MUST ALWAYS be visible (visible: true).
   - MUST be in the 'primary' zone (top half).
   - CANNOT be hidden. If user asks to hide, REJECT the request.
2. **Aux Parameters**: 'fuel'.
   - Can be hidden, moved to 'secondary' zone, or resized.

**Capabilities:**
- Change 'zone' ('primary' or 'secondary').
- Change 'order' (lower number = first in zone).
- Change 'color' (text color) or 'bgColor' (background color).
- Change 'scale' (1.0 is default, up to 2.0).
- Change 'theme' ('dark' or 'light').
- Change 'visualizationType' ('text', 'bar', 'ring').

**Output Format:**
Return JSON strictly adhering to the schema.
If the request is unsafe (e.g., "Hide altitude"), return success: false and an explanation in 'message'.
Otherwise, return success: true and the *complete* modified list of components in 'updatedConfig'.

Response Rules:
1. Always respond with valid JSON (UTF-8), no code fences, no comments, no trailing commas.
2. Schema includes success/message/updatedConfig.theme/components etc.
3. Always include the complete component list.
""".strip()

current_ui = {
    "theme": "dark",
    "components": [
        {
            "id": "altitude",
            "label": "Altitude (ft)",
            "visible": True,
            "zone": "primary",
            "order": 1,
            "isCore": True,
            "scale": 1,
            "visualizationType": "text",
        },
        {
            "id": "airspeed",
            "label": "Airspeed (mph)",
            "visible": True,
            "zone": "primary",
            "order": 2,
            "isCore": True,
            "scale": 1,
            "visualizationType": "text",
        },
        {
            "id": "rpm",
            "label": "Engine RPM",
            "visible": True,
            "zone": "primary",
            "order": 3,
            "isCore": True,
            "scale": 1,
            "visualizationType": "ring",
        },
        {
            "id": "phase",
            "label": "Flight Phase",
            "visible": True,
            "zone": "primary",
            "order": 4,
            "isCore": True,
            "scale": 1,
            "visualizationType": "text",
        },
        {
            "id": "fuel",
            "label": "Fuel Level (%)",
            "visible": True,
            "zone": "secondary",
            "order": 5,
            "isCore": False,
            "scale": 1,
            "visualizationType": "bar",
        },
    ],
}

command = "Move fuel to the top"

prompt = (
    SYSTEM_INSTRUCTION
    + "\n\nCurrent UI State:\n"
    + json.dumps(current_ui, ensure_ascii=False, indent=2)
    + f'\n\nUser Command: "{command}"\n\n'
    + "Return only the JSON object described above (no prose, no code fences)."
)

start = time.perf_counter()
resp = llm.invoke(prompt)
duration = time.perf_counter() - start

print(f"LLM 调用耗时: {duration:.2f} 秒")
print("raw response:", repr(resp))
print("content:", repr(resp.content))

try:
    data = json.loads(resp.content)
    print("parsed:", json.dumps(data, ensure_ascii=False, indent=2))
except Exception as e:
    print("json error:", e)
