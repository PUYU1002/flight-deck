"""
Agent 处理模块
负责调用模型、提取和解析 JSON 响应
"""

import json
import re
from typing import Optional, Any

from fastapi import HTTPException

# 避免循环导入，使用延迟导入
# 这些变量将在第一次调用时初始化
_UIState = None
_AgentResult = None
_SYSTEM_INSTRUCTION = None


def _lazy_import():
    """延迟导入，避免循环依赖"""
    global _UIState, _AgentResult, _SYSTEM_INSTRUCTION
    if _UIState is None:
        from main import UIState, AgentResult, SYSTEM_INSTRUCTION

        _UIState = UIState
        _AgentResult = AgentResult
        _SYSTEM_INSTRUCTION = SYSTEM_INSTRUCTION
    return _UIState, _AgentResult, _SYSTEM_INSTRUCTION


def extract_json_from_response(raw_content: str, is_local_model: bool) -> str:
    """
    从模型响应中提取 JSON
    处理 markdown 代码块、schema 示例等情况
    """
    if not is_local_model:
        # 远程模型通常直接返回 JSON，不需要特殊处理
        return raw_content.strip()

    # 本地模型可能返回带代码块的响应
    # 1. 先去除 markdown 代码块标记（```json 和 ```）
    raw_content = re.sub(r"```json\s*", "", raw_content, flags=re.IGNORECASE)
    raw_content = re.sub(r"```\s*$", "", raw_content, flags=re.MULTILINE)
    raw_content = raw_content.strip()

    # 2. 智能提取 JSON：找到包含实际值的 JSON（如 "success": true），而不是 schema 示例
    # 先找到包含实际布尔值的位置
    value_match = re.search(r'"success"\s*:\s*(true|false)', raw_content)
    if value_match:
        # 从找到的位置向前找到对应的 { 开始位置
        value_pos = value_match.start()
        start_pos = value_pos
        # 向前查找最近的 {
        for i in range(value_pos, -1, -1):
            if raw_content[i] == "{":
                start_pos = i
                break

        # 从开始位置向后匹配完整的 JSON 对象
        brace_count = 0
        end_pos = start_pos
        for i in range(start_pos, len(raw_content)):
            if raw_content[i] == "{":
                brace_count += 1
            elif raw_content[i] == "}":
                brace_count -= 1
                if brace_count == 0:
                    end_pos = i + 1
                    break
        raw_content = raw_content[start_pos:end_pos]
        print(f"✅ 提取到实际 JSON (前200字符): {raw_content[:200]}...")
    else:
        # 如果找不到，尝试最后一个完整的 JSON 对象（通常是实际数据）
        # 找到所有 { 的位置，尝试匹配完整的 JSON
        json_objects = []
        for match in re.finditer(r"\{", raw_content):
            start_pos = match.start()
            brace_count = 0
            end_pos = start_pos
            for i in range(start_pos, len(raw_content)):
                if raw_content[i] == "{":
                    brace_count += 1
                elif raw_content[i] == "}":
                    brace_count -= 1
                    if brace_count == 0:
                        end_pos = i + 1
                        json_objects.append(raw_content[start_pos:end_pos])
                        break

        if json_objects:
            # 选择最长的 JSON（通常是实际数据，而不是 schema 示例）
            raw_content = max(json_objects, key=len)
            print(f"⚠️ 使用回退方法提取 JSON (前200字符): {raw_content[:200]}...")

    return raw_content


def parse_agent_response(raw_content: str, is_local_model: bool) -> dict:
    """
    解析 agent 响应为 JSON 字典
    """
    # 提取 JSON
    json_str = extract_json_from_response(raw_content, is_local_model)

    # 解析 JSON
    try:
        parsed = json.loads(json_str)
        return parsed
    except json.JSONDecodeError as exc:
        print(f"JSON 解析失败，原始内容: {json_str[:500]}")  # 打印前500字符用于调试
        raise HTTPException(
            status_code=502,
            detail=f"解析代理响应失败: {exc}",
        ) from exc


def call_agent(
    llm: Any,
    command: str,
    current_ui: Any,  # UIState
    is_local_model: bool,
) -> Any:  # AgentResult
    """
    调用 agent 处理命令

    Args:
        llm: 模型实例
        command: 用户命令
        current_ui: 当前 UI 状态
        is_local_model: 是否使用本地模型

    Returns:
        AgentResult: 处理结果
    """
    # 延迟导入避免循环依赖
    UIState, AgentResult, SYSTEM_INSTRUCTION = _lazy_import()

    if llm is None:
        raise HTTPException(
            status_code=500,
            detail="模型未配置，无法调用代理。",
        )

    # 构建 prompt
    prompt = (
        SYSTEM_INSTRUCTION
        + "\n\nCurrent UI State:\n"
        + json.dumps(current_ui.dict(), ensure_ascii=False, indent=2)
        + f'\n\nUser Command: "{command}"\n\n'
        + "Return only the JSON object described above (no prose, no code fences)."
    )

    # 调用模型
    try:
        print("调用代理输入:", prompt)
        response = llm.invoke(prompt)
    except Exception as exc:
        print("代理调用异常:", repr(exc))
        raise HTTPException(
            status_code=502, detail=f"调用 LangChain 代理失败: {exc}"
        ) from exc

    # 兼容不同模型返回格式
    if is_local_model:
        # HuggingFacePipeline 直接返回字符串
        raw_content = response if isinstance(response, str) else str(response)
    else:
        # ChatOpenAI 返回 AIMessage，需要取 .content
        raw_content = (
            response.content if hasattr(response, "content") else str(response)
        )

    if not isinstance(raw_content, str) or not raw_content.strip():
        raise HTTPException(status_code=502, detail="代理未返回有效内容。")

    print("代理原始响应:", raw_content)

    # 解析响应
    parsed = parse_agent_response(raw_content, is_local_model)

    # 验证和创建结果
    try:
        if not parsed.get("updatedConfig"):
            return AgentResult(
                success=parsed.get("success", False),
                message=parsed.get("message"),
                updatedConfig=None,
            )

        # 尝试创建 UIState，添加详细的错误信息
        updated = UIState(**parsed["updatedConfig"])
        return AgentResult(
            success=parsed.get("success", False),
            message=parsed.get("message"),
            updatedConfig=updated,
        )
    except Exception as exc:
        print(f"创建 UIState 失败: {exc}")
        print(
            f"解析后的 JSON: {json.dumps(parsed, ensure_ascii=False, indent=2)[:1000]}"
        )
        raise HTTPException(
            status_code=502,
            detail=f"代理响应不符合预期结构: {exc}",
        ) from exc
