"""
模型配置模块
负责加载环境变量、初始化本地或远程模型
"""

import os
import pathlib
import tempfile
from typing import Optional, Any

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI


def load_env_file():
    """加载 .env 文件，处理 BOM 问题"""
    env_path = pathlib.Path(__file__).parent / ".env"

    if env_path.exists():
        try:
            # 使用 utf-8-sig 编码自动去除 BOM
            with open(env_path, "r", encoding="utf-8-sig") as f:
                env_lines = f.readlines()
            # 创建临时文件（无 BOM）供 load_dotenv 使用
            with tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", delete=False, suffix=".env"
            ) as tmp:
                tmp.writelines(env_lines)
                tmp_path = tmp.name
            load_dotenv(dotenv_path=tmp_path, override=True)
            os.unlink(tmp_path)  # 删除临时文件
            print(f"✅ 已从 .env 文件加载环境变量（已去除 BOM）")
        except Exception as e:
            print(f"⚠️ 处理 .env 文件时出错: {e}，尝试直接加载")
            load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(dotenv_path=env_path, override=True)


def get_model_config():
    """获取模型配置"""
    use_local_model = os.getenv("USE_LOCAL_MODEL", "false").lower() in {
        "true",
        "1",
        "yes",
    }
    local_model_path = os.getenv(
        "LOCAL_MODEL_PATH",
        r"C:\Users\25477\.cache\huggingface\hub\models--Qwen--Qwen2.5-1.5B-Instruct",
    )
    use_official_openai_model = os.getenv(
        "USE_OFFICIAL_OPENAI_MODEL", "false"
    ).lower() in {
        "true",
        "1",
        "yes",
    }
    openai_api_key = os.getenv("OPENAI_API_KEY")
    openai_api_key_official = os.getenv("OPENAI_API_KEY_OFFICIAL")
    openai_base_url = os.getenv("OPENAI_BASE_URL")
    openai_base_url_official = os.getenv(
        "OPENAI_BASE_URL_OFFICIAL", "https://api.openai.com/v1"
    )
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    openai_model_official = os.getenv("OPENAI_MODEL_OFFICIAL", "gpt-4o-mini")

    return {
        "use_local_model": use_local_model,
        "local_model_path": local_model_path,
        "use_official_openai_model": use_official_openai_model,
        "openai_api_key": openai_api_key,
        "openai_api_key_official": openai_api_key_official,
        "openai_base_url": openai_base_url,
        "openai_base_url_official": openai_base_url_official,
        "openai_model": openai_model,
        "openai_model_official": openai_model_official,
    }


def find_model_snapshot(model_path: pathlib.Path) -> pathlib.Path:
    """智能查找正确的模型路径（处理 Hugging Face 缓存格式）"""
    # 如果路径是 Hugging Face 缓存目录格式（包含 models--），查找 snapshots
    if "models--" in str(model_path) and model_path.exists():
        snapshots_dir = model_path / "snapshots"
        if snapshots_dir.exists():
            # 获取所有 snapshot 目录
            snapshots = [d for d in snapshots_dir.iterdir() if d.is_dir()]
            if snapshots:
                # 选择最新的 snapshot（按修改时间排序）
                latest_snapshot = max(snapshots, key=lambda p: p.stat().st_mtime)
                print(f"✅ 在缓存目录中找到模型 snapshot: {latest_snapshot}")
                return latest_snapshot
            else:
                # 如果找不到 snapshot，尝试使用模型 ID
                model_id = str(model_path).split("models--")[-1].replace("--", "/")
                print(f"⚠️ 未找到 snapshot，尝试使用模型 ID: {model_id}")
                return pathlib.Path(model_id)
        else:
            # 如果路径不对，尝试使用模型 ID
            model_id = str(model_path).split("models--")[-1].replace("--", "/")
            print(f"⚠️ 路径格式不正确，尝试使用模型 ID: {model_id}")
            return pathlib.Path(model_id)
    elif not model_path.exists():
        # 如果路径不存在，尝试使用模型 ID（如果包含 /）
        if "/" in str(model_path) or "\\" in str(model_path):
            print(f"⚠️ 路径不存在，尝试使用模型 ID: {model_path}")
            return model_path
        else:
            raise FileNotFoundError(f"模型路径不存在: {model_path}")

    return model_path


def init_local_model(model_path: str) -> Optional[Any]:
    """初始化本地 Hugging Face 模型"""
    try:
        from langchain_community.llms import HuggingFacePipeline
        from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
        import torch

        # 智能查找正确的模型路径
        model_path_obj = find_model_snapshot(pathlib.Path(model_path))
        print(f"正在加载本地模型: {model_path_obj}")

        # 详细的 CUDA 检测
        print("=" * 60)
        print("CUDA 检测信息:")
        print(f"  PyTorch 版本: {torch.__version__}")
        print(f"  CUDA 是否可用: {torch.cuda.is_available()}")
        if torch.cuda.is_available():
            print(f"  CUDA 版本: {torch.version.cuda}")
            print(f"  GPU 数量: {torch.cuda.device_count()}")
            for i in range(torch.cuda.device_count()):
                print(f"    GPU {i}: {torch.cuda.get_device_name(i)}")
            device = "cuda"
        else:
            print("  ⚠️ CUDA 不可用，可能的原因:")
            print("    1. PyTorch 安装的是 CPU 版本（需要重新安装 CUDA 版本）")
            print("    2. CUDA 驱动未安装或版本不匹配")
            print("    3. 没有 NVIDIA GPU 或 GPU 驱动问题")
            print("    提示: 要使用 CUDA，请安装 PyTorch CUDA 版本:")
            print(
                "      pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118"
            )
            device = "cpu"
        print("=" * 60)
        print(f"使用设备: {device}")

        tokenizer = AutoTokenizer.from_pretrained(
            str(model_path_obj), trust_remote_code=True
        )
        model = AutoModelForCausalLM.from_pretrained(
            str(model_path_obj),
            trust_remote_code=True,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto" if device == "cuda" else None,
        )

        # 对于 JSON 生成任务，使用确定性输出（greedy decoding）
        pipe = pipeline(
            "text-generation",
            model=model,
            tokenizer=tokenizer,
            max_new_tokens=512,
            do_sample=False,  # 确定性输出，类似 temperature=0
            device=0 if device == "cuda" else -1,
        )

        llm = HuggingFacePipeline(pipeline=pipe)
        print("本地模型加载完成")
        return llm
    except Exception as e:
        print(f"本地模型加载失败: {e}")
        return None


def init_remote_model(api_key: str, base_url: str, model: str) -> Optional[Any]:
    """初始化远程 OpenAI 兼容模型"""
    if not api_key:
        return None
    print(f"使用远程模型 (代理: {base_url})")
    return ChatOpenAI(
        model=model,
        temperature=0,
        api_key=api_key,
        base_url=base_url,
        max_retries=2,
    )


def init_model() -> tuple[Optional[Any], bool, dict]:
    """
    初始化模型
    返回: (llm实例, 是否使用本地模型, 配置信息)
    """
    # 加载环境变量
    load_env_file()

    # 获取配置
    config = get_model_config()

    # 打印配置信息
    print("=" * 60)
    print("模型配置检查:")
    print(f"  USE_LOCAL_MODEL (环境变量): {os.getenv('USE_LOCAL_MODEL', '未设置')}")
    print(f"  USE_LOCAL_MODEL (解析后): {config['use_local_model']}")
    print(f"  LOCAL_MODEL_PATH: {config['local_model_path']}")
    print(
        f"  OPENAI_API_KEY_OFFICIAL: {'已设置' if config['openai_api_key_official'] else '未设置'}"
    )
    print(f"  OPENAI_API_KEY: {'已设置' if config['openai_api_key'] else '未设置'}")
    print("=" * 60)

    llm = None
    use_local = config["use_local_model"]

    # 尝试初始化本地模型
    if use_local:
        llm = init_local_model(config["local_model_path"])
        if llm is None:
            print("本地模型加载失败，回退到远程模型")
            use_local = False

    # 如果本地模型失败或未启用，使用远程模型，根据是否使用官方OpenAI模型选择不同的API Key和Base URL
    if not use_local:
        if config["use_official_openai_model"]:
            llm = init_remote_model(
                config["openai_api_key_official"],
                config["openai_base_url_official"],
                config["openai_model_official"],
            )
        else:
            llm = init_remote_model(
                config["openai_api_key"],
                config["openai_base_url"],
                config["openai_model"],
            )

    # 最终状态总结
    print("=" * 60)
    if llm is None:
        print("⚠️  警告: 未配置任何模型，API 将无法工作")
        print("   请设置 USE_LOCAL_MODEL=true 或配置 OPENAI_API_KEY")
    else:
        model_type_str = "本地模型" if use_local else "远程模型"
        print(f"✅ 模型已就绪: {model_type_str}")
    print("=" * 60)

    return llm, use_local, config
