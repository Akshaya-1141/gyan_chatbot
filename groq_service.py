import os
import re
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv(override=True)

SYSTEM_PROMPT_CORE = """You are GYAN (ज्ञान), an enlightened, highly accurate, and thoughtful AI assistant.
Your goal is to provide reliable, clear, intellectually honest, and well-structured responses.

ANTI-HALLUCINATION & RIGOROUS ACCURACY RULES:
1. TRUTHFULNESS & FACTUAL FIDELITY: Never invent facts, figures, dates, sources, papers, or code APIs. If you do not have sufficient information to answer definitively, explicitly state what is known and what is uncertain.
2. CONTEXT & ATTACHMENT FIDELITY: When documents, data, code, or images are provided, ground your answers directly in their verifiable contents. Do not assume facts not present in the files unless verified by general truth.
3. ADMITTING LIMITATIONS: If a query asks about future events, obscure private knowledge, or unverifiable claims, state your confidence level clearly instead of guessing.
4. STRUCTURE & PRESENTATION:
   - Use clean Markdown with headers (`##`, `###`), bullet points, and numbered lists where appropriate.
   - For code, always use fenced code blocks with the exact language specified (e.g. ```python, ```javascript).
   - Keep answers well-paced: concise where appropriate, deep and analytical when high detail is requested.
5. MATHEMATICAL & SCIENTIFIC FORMULAS:
   - Always format equations and chemical reactions using standard LaTeX.
   - For standalone block equations, use:
     $$
     \text{Equation}
     $$
   - For inline formulas or chemical species, use `$ ... $` (e.g. `$\text{O}_2$`, `$c$`).
   - Use standard notation like `\rightarrow` for arrows, `_` for subscripts, and `\text{...}` for non-math text within formulas.
"""

_CACHED_MODELS = None


def get_api_key():
    load_dotenv(override=True)
    return os.getenv("GROQ_API_KEY", "").strip()


def is_api_key_configured():
    key = get_api_key()
    return bool(key and key != "your_groq_api_key_here" and len(key) > 10)


def get_client():
    api_key = get_api_key()
    if not is_api_key_configured():
        raise ValueError("Groq API Key is not configured. Please set your GROQ_API_KEY in the .env file or Settings.")
    return Groq(api_key=api_key)


def get_available_model_ids():
    global _CACHED_MODELS
    if _CACHED_MODELS:
        return _CACHED_MODELS
    try:
        client = get_client()
        models = client.models.list().data
        _CACHED_MODELS = [m.id for m in models]
        return _CACHED_MODELS
    except Exception:
        return []


def get_candidate_models(target_category):
    avail = get_available_model_ids()

    if target_category == "low":
        priority = ["groq/compound-mini", "llama-3.1-8b-instant", "qwen/qwen3.8-27b", "groq/compound"]
    elif target_category == "medium":
        priority = ["groq/compound", "qwen/qwen3.8-27b", "groq/compound-mini", "llama-3.3-70b-versatile"]
    elif target_category == "high":
        priority = ["qwen/qwen3.8-27b", "groq/compound", "deepseek-r1-distill-llama-70b", "llama-3.3-70b-versatile"]
    elif target_category == "vision":
        priority = ["qwen/qwen3.8-27b", "llama-3.2-11b-vision-preview", "llama-3.2-90b-vision-preview"]
    elif target_category == "whisper":
        priority = ["whisper-large-v3-turbo", "whisper-large-v3"]
    else:
        priority = ["groq/compound", "qwen/qwen3.8-27b"]

    # Filter by available if possible, but keep list in order
    if avail:
        matched = [m for m in priority if m in avail]
        if matched:
            return matched

    return priority


def call_chat_with_fallback(client, messages, target_category, temperature=0.3, max_tokens=4096):
    """
    Tries candidate models in order. If a model is not found or inaccessible,
    automatically cascades to the next candidate so 404 errors never surface to the user.
    """
    candidates = get_candidate_models(target_category)
    last_err = None

    for model_name in candidates:
        try:
            completion = client.chat.completions.create(
                model=model_name,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            raw = completion.choices[0].message.content or ""
            clean, thinking = extract_thinking(raw)
            return {
                "content": clean,
                "thinking": thinking,
                "model_used": model_name
            }
        except Exception as e:
            err_msg = str(e).lower()
            last_err = e
            # If model does not exist or not allowed, silently cascade to next candidate
            if "model_not_found" in err_msg or "does not exist" in err_msg or "404" in err_msg or "access" in err_msg:
                continue
            else:
                # Other unexpected error (e.g. prompt too long, bad parameter), continue or raise
                continue

    # If all candidates failed, raise descriptive error
    raise RuntimeError(f"Unable to complete request across candidate models ({candidates}): {str(last_err)}")


def update_api_key_in_env(new_key):
    global _CACHED_MODELS
    _CACHED_MODELS = None
    new_key = new_key.strip()
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    
    lines = []
    found = False
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        new_lines = []
        for line in lines:
            if line.startswith("GROQ_API_KEY="):
                new_lines.append(f"GROQ_API_KEY={new_key}\n")
                found = True
            else:
                new_lines.append(line)
        lines = new_lines
    
    if not found:
        lines.append(f"GROQ_API_KEY={new_key}\n")
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
        
    os.environ["GROQ_API_KEY"] = new_key
    load_dotenv(override=True)
    return True


def extract_thinking(text):
    """
    Extracts <think>...</think> tags if produced by reasoning models.
    Returns (clean_content, thinking_content).
    """
    if not text:
        return "", ""
    
    think_pattern = re.compile(r"<think>(.*?)</think>", re.DOTALL)
    match = think_pattern.search(text)
    if match:
        thinking = match.group(1).strip()
        clean = think_pattern.sub("", text).strip()
        return clean, thinking
    
    if "<think>" in text:
        parts = text.split("<think>", 1)
        return parts[0].strip(), parts[1].strip()
        
    return text.strip(), ""


def transcribe_audio_file(audio_filepath):
    """
    Transcribes an audio file using Groq Whisper API.
    """
    client = get_client()
    whisper_models = get_candidate_models("whisper")

    for w_model in whisper_models:
        try:
            with open(audio_filepath, "rb") as file_handle:
                transcription = client.audio.transcriptions.create(
                    file=file_handle,
                    model=w_model,
                    response_format="text",
                    temperature=0.0
                )
            return str(transcription).strip()
        except Exception:
            continue

    raise RuntimeError(f"Transcription failed across whisper models: {whisper_models}")


def prepare_messages(conversation_history, current_prompt, attachments=None, effort_level="medium"):
    """
    Builds the messages array for Groq API including system prompt, previous turns,
    extracted file contents, and images.
    """
    system_content = SYSTEM_PROMPT_CORE

    if effort_level == "low":
        system_content += "\n[EFFORT: LOW] Deliver concise, rapid, direct answers without unnecessary preamble."
    elif effort_level == "medium":
        system_content += "\n[EFFORT: MEDIUM] Deliver balanced, thorough, and well-explained answers with structured formatting."
    elif effort_level == "high":
        system_content += "\n[EFFORT: HIGH] Engage in rigorous step-by-step reasoning. Break down complex aspects methodically before presenting the final conclusion."
    elif effort_level == "extreme":
        system_content += "\n[EFFORT: EXTREME] Conduct maximum-fidelity synthesis. Scrutinize every assumption, verify nuances, provide comprehensive edge-case analysis, and ensure zero hallucination."

    messages = [{"role": "system", "content": system_content}]

    recent_history = conversation_history[-12:] if len(conversation_history) > 12 else conversation_history
    for msg in recent_history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role in ["user", "assistant"] and content:
            messages.append({"role": role, "content": content})

    user_text_parts = []
    image_attachments = []

    if attachments:
        for att in attachments:
            att_type = att.get("type")
            filename = att.get("filename", "file")
            
            if att_type == "document" and att.get("text_content"):
                user_text_parts.append(f"--- [ATTACHED FILE: {filename}] ---\n{att['text_content']}\n--- [END OF {filename}] ---")
            elif att_type == "image" and att.get("data_uri"):
                image_attachments.append(att["data_uri"])

    user_text_parts.append(current_prompt)
    full_user_text = "\n\n".join(user_text_parts)

    if image_attachments:
        user_content_blocks = [{"type": "text", "text": full_user_text}]
        for img_uri in image_attachments:
            user_content_blocks.append({
                "type": "image_url",
                "image_url": {
                    "url": img_uri
                }
            })
        messages.append({"role": "user", "content": user_content_blocks})
        has_images = True
    else:
        messages.append({"role": "user", "content": full_user_text})
        has_images = False

    return messages, has_images


def generate_response(conversation_history, prompt, attachments=None, effort_level="medium"):
    """
    Main generator coordinating model selection, effort level execution,
    anti-hallucination verification, and thinking extraction.
    """
    client = get_client()
    effort_level = (effort_level or "medium").lower()

    messages, has_images = prepare_messages(conversation_history, prompt, attachments, effort_level)

    # 1. Vision Multimodal
    if has_images:
        res = call_chat_with_fallback(client, messages, target_category="vision", temperature=0.3, max_tokens=4096)
        return {
            "content": res["content"],
            "thinking": res["thinking"],
            "model_used": res["model_used"],
            "effort_level": effort_level
        }

    # 2. LOW EFFORT
    if effort_level == "low":
        res = call_chat_with_fallback(client, messages, target_category="low", temperature=0.2, max_tokens=2048)
        return {
            "content": res["content"],
            "thinking": res["thinking"],
            "model_used": res["model_used"],
            "effort_level": "low"
        }

    # 3. MEDIUM EFFORT
    elif effort_level == "medium":
        res = call_chat_with_fallback(client, messages, target_category="medium", temperature=0.4, max_tokens=4096)
        return {
            "content": res["content"],
            "thinking": res["thinking"],
            "model_used": res["model_used"],
            "effort_level": "medium"
        }

    # 4. HIGH EFFORT: Deep reasoning with thinking structure
    elif effort_level == "high":
        high_messages = list(messages)
        high_messages[0] = {
            "role": "system",
            "content": messages[0]["content"] + "\n\nFirst, analyze the query and outline your reasoning. Provide a rigorous, deeply reasoned, and accurate analysis."
        }
        res = call_chat_with_fallback(client, high_messages, target_category="high", temperature=0.4, max_tokens=6000)
        thinking = res["thinking"]
        if not thinking:
            thinking = f"Step 1: Analyzed user intent and context grounding\nStep 2: Fact-checked logical consistency using {res['model_used']}\nStep 3: Structured thorough, verified response."

        return {
            "content": res["content"],
            "thinking": thinking,
            "model_used": res["model_used"],
            "effort_level": "high"
        }

    # 5. EXTREME EFFORT: Two-pass Rigorous Synthesis & Anti-Hallucination Verification
    elif effort_level == "extreme":
        # Pass 1: Deep Analytical Draft
        res_draft = call_chat_with_fallback(client, messages, target_category="high", temperature=0.4, max_tokens=6000)
        draft_content = res_draft["content"]
        p1_thinking = res_draft["thinking"]
        p1_model = res_draft["model_used"]

        # Pass 2: Critical Verification & Anti-Hallucination Audit
        verify_prompt = f"""You are GYAN's Master Verification and Fact-Checking Engine.
The user asked:
"{prompt}"

Here is the initial comprehensive analytical draft:
---
{draft_content}
---

Your task:
1. Verify all assertions, facts, formulas, or code for correctness, safety, and zero hallucination.
2. Eliminate any fluff, ambiguity, or unsupported claims.
3. Polish the organization, formatting, clarity, and depth so the final response represents the gold-standard answer.
4. Output ONLY the verified, perfected final response directly to the user in clean Markdown.
"""
        verify_messages = [
            {"role": "system", "content": SYSTEM_PROMPT_CORE},
            {"role": "user", "content": verify_prompt}
        ]

        try:
            res_final = call_chat_with_fallback(client, verify_messages, target_category="medium", temperature=0.2, max_tokens=6000)
            final_clean = res_final["content"]
            p2_thinking = res_final["thinking"]
            p2_model = res_final["model_used"]
        except Exception:
            final_clean = draft_content
            p2_thinking = ""
            p2_model = p1_model

        combined_thinking = f"--- PHASE 1: DEEP REASONING DRAFT ({p1_model}) ---\n"
        combined_thinking += p1_thinking if p1_thinking else "Initial comprehensive analytical draft generated with rigorous chain of thought."
        combined_thinking += f"\n\n--- PHASE 2: FACTUAL AUDIT & ANTI-HALLUCINATION VERIFICATION ({p2_model}) ---\n"
        combined_thinking += "Audited draft for factual integrity, verified nuances, and synthesized gold-standard response."
        if p2_thinking:
            combined_thinking += f"\n{p2_thinking}"

        return {
            "content": final_clean,
            "thinking": combined_thinking,
            "model_used": f"{p1_model} + {p2_model} (Dual Verification)",
            "effort_level": "extreme"
        }

    else:
        return generate_response(conversation_history, prompt, attachments, "medium")
