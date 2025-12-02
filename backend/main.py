import json
import os
from typing import List, Literal, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, validator


load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_KEY_OFFICIAL = os.getenv("OPENAI_API_KEY_OFFICIAL")
print(OPENAI_API_KEY_OFFICIAL)
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

llm: Optional[ChatOpenAI] = None

if OPENAI_API_KEY:
    llm = ChatOpenAI(
        model=OPENAI_MODEL,
        temperature=0,
        # api_key=OPENAI_API_KEY,
        # base_url=OPENAI_BASE_URL,
        api_key=OPENAI_API_KEY_OFFICIAL,
        base_url="https://api.openai.com/v1",
        max_retries=2,
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
    - 'ring' is good for RPM or Speed.
    - 'bar' is good for Fuel or Levels.
    - 'text' is default.

**Output Format:**
Return JSON strictly adhering to the schema.
If the request is unsafe (e.g., "Hide altitude"), return success: false and an explanation in 'message'.
Otherwise, return success: true and the *complete* modified list of components in 'updatedConfig'.

Response Rules:
1. Always respond with valid JSON (UTF-8), no code fences, no comments, no trailing commas.
2. Schema:
   {
     "success": boolean,
     "message": string,
     "updatedConfig": {
       "theme": "dark" | "light",
       "components": [
         {
           "id": "rpm" | "altitude" | "airspeed" | "phase" | "fuel",
           "visible": boolean,
           "zone": "primary" | "secondary",
           "order": number,
           "color"?: string,
           "bgColor"?: string,
           "scale"?: number,
           "visualizationType"?: "text" | "bar" | "ring",
           "label"?: string
         }
       ]
     }
   }
3. Always include the complete component list.
""".strip()


COMPONENT_METADATA = {
    "altitude": {"label": "Altitude (ft)", "isCore": True},
    "airspeed": {"label": "Airspeed (mph)", "isCore": True},
    "rpm": {"label": "Engine RPM", "isCore": True},
    "phase": {"label": "Flight Phase", "isCore": True},
    "fuel": {"label": "Fuel Level (%)", "isCore": False},
}


class ComponentConfig(BaseModel):
    id: Literal["rpm", "altitude", "airspeed", "phase", "fuel"]
    label: Optional[str] = None
    visible: bool
    zone: Literal["primary", "secondary"]
    order: int
    color: Optional[str] = None
    bgColor: Optional[str] = None
    scale: Optional[float] = Field(default=1.0, ge=0.5, le=2.0)
    isCore: Optional[bool] = None
    visualizationType: Optional[Literal["text", "bar", "ring"]] = None

    @validator("isCore", always=True)
    def set_is_core(cls, value, values):
        if value is not None:
            return value
        component_id = values.get("id")
        return COMPONENT_METADATA.get(component_id, {}).get("isCore", False)

    @validator("label", always=True)
    def set_label(cls, value, values):
        if value:
            return value
        component_id = values.get("id")
        return COMPONENT_METADATA.get(component_id, {}).get("label", component_id)


class UIState(BaseModel):
    theme: Literal["dark", "light"]
    components: List[ComponentConfig]


class AdjustUIRequest(BaseModel):
    command: str = Field(..., min_length=1)
    current_ui: UIState


class AgentResult(BaseModel):
    success: bool
    message: Optional[str] = None
    updatedConfig: Optional[UIState] = None


app = FastAPI(title="Flight Deck Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _merge_ui_state(current_ui: UIState, updated_config: Optional[UIState]) -> UIState:
    if not updated_config:
        return current_ui

    existing_components = {c.id: c for c in current_ui.components}
    merged_components = []

    for comp in updated_config.components:
        source = comp.dict()
        fallback = existing_components.get(comp.id)

        if fallback:
            merged_components.append(ComponentConfig(**{**fallback.dict(), **source}))
        else:
            merged_components.append(comp)

    # Preserve components not mentioned by the agent
    updated_ids = {comp.id for comp in updated_config.components}
    for comp_id, comp in existing_components.items():
        if comp_id not in updated_ids:
            merged_components.append(comp)

    return UIState(
        theme=updated_config.theme or current_ui.theme, components=merged_components
    )


def _call_agent(command: str, current_ui: UIState) -> AgentResult:
    if llm is None:
        raise HTTPException(
            status_code=500,
            detail="OPENAI_API_KEY 未配置，无法调用代理。",
        )

    prompt = (
        SYSTEM_INSTRUCTION
        + "\n\nCurrent UI State:\n"
        + json.dumps(current_ui.dict(), ensure_ascii=False, indent=2)
        + f'\n\nUser Command: "{command}"\n\n'
        + "Return only the JSON object described above (no prose, no code fences)."
    )

    try:
        print("调用代理输入:", prompt)
        response = llm.invoke(prompt)
    except Exception as exc:
        print("代理调用异常:", repr(exc))
        raise HTTPException(
            status_code=502, detail=f"调用 LangChain 代理失败: {exc}"
        ) from exc

    raw_content = response.content
    if not isinstance(raw_content, str) or not raw_content.strip():
        raise HTTPException(status_code=502, detail="代理未返回有效内容。")

    print("代理原始响应:", raw_content)

    try:
        parsed = json.loads(raw_content)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"解析代理响应失败: {exc}",
        ) from exc

    try:
        updated = (
            UIState(**parsed["updatedConfig"]) if parsed.get("updatedConfig") else None
        )
        return AgentResult(
            success=parsed.get("success", False),
            message=parsed.get("message"),
            updatedConfig=updated,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"代理响应不符合预期结构: {exc}",
        ) from exc


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/api/adjust-ui")
async def adjust_ui(request: Request):
    payload = await request.json()
    print("收到前端请求:", json.dumps(payload, ensure_ascii=False))

    typed_request = AdjustUIRequest(**payload)

    agent_result = _call_agent(typed_request.command, typed_request.current_ui)

    if not agent_result.success:
        return {
            "success": False,
            "message": agent_result.message or "Command rejected.",
        }

    merged_state = _merge_ui_state(
        typed_request.current_ui, agent_result.updatedConfig or typed_request.current_ui
    )

    return {
        "success": True,
        "message": agent_result.message or "Configuration updated.",
        "newState": merged_state.dict(),
    }
