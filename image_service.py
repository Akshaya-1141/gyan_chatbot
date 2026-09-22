import os
import re
import random
import uuid
import urllib.parse
import urllib.request
import time
from io import BytesIO
from typing import Dict, Any, Optional, List, Tuple
from PIL import Image
from dotenv import load_dotenv

import groq_service

# Load environment
load_dotenv(override=True)

UPLOAD_BASE = os.path.join(os.path.dirname(__file__), "uploads")
GENERATED_DIR = os.path.join(UPLOAD_BASE, "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

# Curated visual styles with coherent prompt decorators
STYLE_PROMPTS = {
    "photorealistic": "8k photograph, highly detailed, realistic textures, natural lighting, sharp focus",
    "digital-art": "digital concept art, vivid colors, intricate detail, dynamic composition, trending on ArtStation",
    "anime": "anime aesthetic, Makoto Shinkai style, vibrant colors, detailed line art, cinematic lighting",
    "cinematic-3d": "cinematic 3D render, Octane render, volumetric light, photorealistic textures",
    "fantasy": "epic fantasy illustration, ethereal atmosphere, glowing magical details, masterpiece",
    "cyberpunk": "cyberpunk neon lights, dark moody atmosphere, futuristic city, rain reflections, high contrast",
    "watercolor": "watercolor painting, soft brush strokes, fluid colors, artistic paper texture",
    "sketch": "detailed pencil sketch, fine line art, graphite shading, monochrome",
    "pixel-art": "pixel art style, 16-bit retro aesthetic, clean sprites, vibrant palette",
    "minimalist-logo": "minimalist flat vector design, clean geometry, modern branding, bold shapes, solid background",
    "none": ""
}

ASPECT_RATIOS = {
    "1:1": {"width": 1024, "height": 1024},
    "16:9": {"width": 1280, "height": 720},
    "9:16": {"width": 720, "height": 1280}
}


def is_informational_query(prompt: str) -> bool:
    """
    Checks if a prompt is an informational question ABOUT images or formats,
    rather than a command to create an image.
    """
    p = prompt.strip().lower()
    
    # Informational question starters
    info_starters = [
        "what is", "what are", "what's", "how does", "how do", "how to convert",
        "difference between", "explain", "why does", "why is", "tell me about",
        "analyze", "read", "examine", "compare", "can you explain", "define",
        "describe the difference", "history of", "tutorial on"
    ]
    for starter in info_starters:
        if p.startswith(starter):
            return True
            
    # Check for analytical phrases anywhere in the sentence
    if re.search(r"\b(difference between|how to convert|how do i convert|explain the difference)\b", p):
        return True
        
    return False


def is_image_generation_query(prompt: str) -> bool:
    """
    Robust regex and keyword detector for image generation intent.
    Supports formats (.png, .jpeg, .jpg, .webp), commands, and conversational queries.
    """
    p = prompt.strip().lower()
    if not p:
        return False
        
    # Explicit slash commands
    if p.startswith(("/imagine", "/image", "/draw", "/paint", "/generate_image")):
        return True

    # Reject purely informational queries
    if is_informational_query(p):
        return False

    # 1. Format-specific generation requests (e.g., "generate a png of...", "create a .jpg of...")
    format_gen_pattern = re.compile(
        r"\b(generate|create|make|draw|paint|render|produce|give me|show me|export|download)\b"
        r".{0,40}\b(\.?(png|jpe?g|webp))\b",
        re.IGNORECASE
    )
    if format_gen_pattern.search(p):
        return True

    # 2. Phrases with "in/as [format]" (e.g. "image of a cat in png", "draw a lion as jpeg")
    in_format_pattern = re.compile(
        r"\b(image|picture|photo|photograph|drawing|illustration|sketch|wallpaper|portrait|logo)\b"
        r".{0,30}\b(in|as|with|into)\b.{0,10}\b(\.?(png|jpe?g|webp))\b",
        re.IGNORECASE
    )
    if in_format_pattern.search(p):
        return True

    # 3. Action verb + image noun (e.g., "generate an image of", "draw me a", "create a picture of")
    action_image_pattern = re.compile(
        r"\b(generate|create|make|draw|paint|render|sketch|design|produce|visualize)\b"
        r"(\s+(me|us|for\s+me))?"
        r"(\s+(an?|the|some))?"
        r"(\s+[\w\s]{0,20})?"
        r"\b(image|picture|photo|photograph|drawing|illustration|portrait|wallpaper|graphic|artwork|rendering|logo|icon|avatar|sketch)\b",
        re.IGNORECASE
    )
    if action_image_pattern.search(p):
        return True

    # 4. Direct command patterns like "draw a ...", "paint a ...", "picture of a ..."
    direct_patterns = [
        r"^draw\s+(me\s+)?(a|an|the)\s+",
        r"^paint\s+(me\s+)?(a|an|the)\s+",
        r"^sketch\s+(me\s+)?(a|an|the)\s+",
        r"^(a\s+)?photo\s+of\s+",
        r"^(a\s+)?picture\s+of\s+",
        r"^(an?\s+)?image\s+of\s+",
        r"^(an?\s+)?illustration\s+of\s+"
    ]
    for dp in direct_patterns:
        if re.search(dp, p):
            return True

    return False


def extract_format_from_text(text: str, default: str = "png") -> str:
    """Extracts requested image format (png, jpg, jpeg, webp) from text."""
    lower = text.lower()
    if ".jpeg" in lower or "jpeg" in lower:
        return "jpeg"
    if ".jpg" in lower or "jpg" in lower:
        return "jpg"
    if ".webp" in lower or "webp" in lower:
        return "webp"
    if ".png" in lower or "png" in lower:
        return "png"
    return default


def clean_prompt_offline(prompt: str) -> Tuple[str, str, str]:
    """
    Heuristic extraction of visual prompt, format, and style when offline or fallback.
    """
    target_format = extract_format_from_text(prompt, default="png")
    p = prompt.strip()

    # Remove slash commands
    for slash in ["/imagine ", "/image ", "/draw ", "/paint ", "/generate_image "]:
        if p.lower().startswith(slash):
            p = p[len(slash):].strip()

    # Strip conversational lead-ins
    filler_prefixes = [
        r"^(can\s+you\s+)?(please\s+)?(generate|create|make|draw|paint|render|produce|give\s+me|show\s+me)\s+(me\s+)?(an?\s+)?(new\s+)?(image|picture|photo|photograph|drawing|illustration|sketch|wallpaper|rendering|logo|icon)?\s*(of\s+)?",
        r"^(i\s+want|i\s+need|i\s+would\s+like)\s+(an?\s+)?(image|picture|photo|drawing|illustration)\s+(of\s+)?",
        r"^(draw|paint|sketch)\s+(me\s+)?(an?\s+)?",
        r"^(a\s+)?(photo|picture|image|illustration|painting|sketch)\s+of\s+"
    ]
    for fp in filler_prefixes:
        p = re.sub(fp, "", p, flags=re.IGNORECASE).strip()

    # Strip format instructions from the end or middle
    format_removals = [
        r"\b(in|as)\s+(a\s+)?\.?(png|jpe?g|webp)(\s+format|\s+file)?\b",
        r"\b(format|file)\s*:\s*\.?(png|jpe?g|webp)\b",
        r"\b\.?(png|jpe?g|webp)\b"
    ]
    for fr in format_removals:
        p = re.sub(fr, "", p, flags=re.IGNORECASE).strip()

    # Detect style keywords in the prompt
    detected_style = "photorealistic"
    lower_p = p.lower()
    if any(k in lower_p for k in ["anime", "manga", "shinkai"]):
        detected_style = "anime"
    elif any(k in lower_p for k in ["cyberpunk", "neon", "sci-fi", "futuristic"]):
        detected_style = "cyberpunk"
    elif any(k in lower_p for k in ["logo", "vector", "minimalist", "icon"]):
        detected_style = "minimalist-logo"
    elif any(k in lower_p for k in ["pixel art", "pixelated", "16-bit", "8-bit", "sprite"]):
        detected_style = "pixel-art"
    elif any(k in lower_p for k in ["watercolor", "watercolour", "aquarelle"]):
        detected_style = "watercolor"
    elif any(k in lower_p for k in ["sketch", "pencil", "drawing", "hand drawn", "charcoal"]):
        detected_style = "sketch"
    elif any(k in lower_p for k in ["3d", "render", "octane", "unreal engine"]):
        detected_style = "cinematic-3d"
    elif any(k in lower_p for k in ["digital art", "concept art", "artstation"]):
        detected_style = "digital-art"
    elif any(k in lower_p for k in ["fantasy", "mythical", "magical", "dragon"]):
        detected_style = "fantasy"

    p = re.sub(r"\s+", " ", p).strip()
    return p, target_format, detected_style


def analyze_image_request(prompt: str, conversation_history: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Intelligent analyzer combining fast regex and Groq LLM prompt synthesis.
    Extracts the visual subject, strips conversational noise/formats, detects style,
    and resolves conversational references.
    """
    # First, rule out obvious informational queries
    if is_informational_query(prompt):
        return {
            "is_image_request": False,
            "visual_prompt": prompt,
            "target_format": "png",
            "detected_style": "photorealistic",
            "title": ""
        }

    # If Groq is configured, use LLM for synthesis
    if groq_service.is_api_key_configured():
        try:
            client = groq_service.get_client()
            system_instruction = """You are an expert AI image prompt engineer and intent classifier.
Analyze the user's message and determine:
1. is_image_request: true if the user explicitly asks to generate, draw, paint, create, or render an image/picture/photo/illustration/logo/art.
   Set to false if the user is asking an informational/educational question (e.g. "What is a PNG?", "Explain JPEG compression", "How do images work?", "Analyze this picture").
2. target_format: 'png', 'jpg', 'jpeg', or 'webp'. Look for mentions like '.png', 'png', 'jpeg', 'jpg'. Default to 'png' if not specified.
3. detected_style: The most suitable visual style ('photorealistic', 'anime', 'digital-art', 'cinematic-3d', 'fantasy', 'cyberpunk', 'watercolor', 'sketch', 'pixel-art', 'minimalist-logo').
4. visual_prompt: A vivid, coherent text-to-image prompt (30-60 words).
   - Strip all conversational filler ("can you generate", "draw me", "please create", "in png format", "as a jpeg").
   - Ground purely in visual terms (subject, atmosphere, lighting, colors, details).
   - If the user refers to previous context (e.g. "generate an image of that"), use the recent conversation to resolve it.
5. title: A concise 3-5 word title for the image.

Output ONLY valid JSON:
{
  "is_image_request": true,
  "target_format": "png",
  "detected_style": "photorealistic",
  "visual_prompt": "...",
  "title": "..."
}"""

            messages = [{"role": "system", "content": system_instruction}]
            if conversation_history:
                for msg in conversation_history[-3:]:
                    content = msg.get("content", "")
                    if content and not content.startswith("Here is your generated image"):
                        messages.append({"role": msg.get("role", "user"), "content": content})

            messages.append({"role": "user", "content": prompt})

            # Fast model for instant classification & prompt engineering
            models_to_try = ["groq/compound-mini", "qwen/qwen3.8-27b", "groq/compound"]
            for m in models_to_try:
                try:
                    resp = client.chat.completions.create(
                        model=m,
                        messages=messages,
                        temperature=0.1,
                        max_tokens=400,
                        response_format={"type": "json_object"}
                    )
                    import json
                    parsed = json.loads(resp.choices[0].message.content)
                    if "is_image_request" in parsed:
                        # Normalize format
                        fmt = parsed.get("target_format", "png").lower().replace(".", "")
                        if fmt not in ["png", "jpg", "jpeg", "webp"]:
                            fmt = extract_format_from_text(prompt, "png")
                        parsed["target_format"] = fmt
                        return parsed
                except Exception:
                    continue
        except Exception:
            pass

    # Fallback to offline regex heuristic
    is_req = is_image_generation_query(prompt)
    clean_p, fmt, style = clean_prompt_offline(prompt)
    return {
        "is_image_request": is_req,
        "visual_prompt": clean_p or prompt,
        "target_format": fmt,
        "detected_style": style,
        "title": (clean_p[:30] + "...") if len(clean_p) > 30 else clean_p
    }


def build_image_prompt(base_prompt: str, style: str = "photorealistic") -> str:
    """
    Enhances the base prompt with coherent visual style directives.
    Avoids conflicting photographic tags when generating non-photographic styles.
    """
    cleaned = base_prompt.strip()
    style_key = (style or "photorealistic").lower()
    
    # Do not append photographic keywords if the prompt already specifies the style
    style_suffix = STYLE_PROMPTS.get(style_key, "")
    if style_suffix and style_key != "none":
        # Check if the prompt already contains the core descriptor
        if style_key not in cleaned.lower():
            return f"{cleaned}, {style_suffix}"
            
    return cleaned


def build_pollinations_url(prompt: str, seed: Optional[int] = None) -> str:
    """
    Builds a reliable, unconstrained Pollinations image URL.
    Omits parameters that cause rate limiting (429) or 0-byte responses.
    """
    if seed is None:
        seed = random.randint(1000, 999999)

    encoded_prompt = urllib.parse.quote(prompt.strip())
    # Keep query string minimal to ensure high reliability on Pollinations
    return f"https://image.pollinations.ai/prompt/{encoded_prompt}?seed={seed}"


def fetch_image_bytes(url: str, max_retries: int = 2) -> bytes:
    """
    Fetches image bytes from the remote provider with retry and backoff.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    }

    last_err = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=25) as response:
                if response.status == 200:
                    data = response.read()
                    if len(data) > 100:  # Valid image payload
                        return data
                    else:
                        raise ValueError(f"Received empty image payload ({len(data)} bytes)")
        except Exception as e:
            last_err = e
            if attempt < max_retries - 1:
                time.sleep(2.0 * (attempt + 1))
            continue

    raise RuntimeError(f"Failed to fetch image from {url} after {max_retries} attempts: {str(last_err)}")


def save_image_as_format(raw_bytes: bytes, target_format: str = "png") -> Tuple[str, str, int, int]:
    """
    Converts and saves image data using Pillow into the exact requested format
    (.png, .jpeg, .jpg, .webp).
    Returns (filename, absolute_path, width, height).
    """
    target_format = target_format.lower().replace(".", "")
    if target_format not in ["png", "jpg", "jpeg", "webp"]:
        target_format = "png"

    pil_format = "PNG" if target_format == "png" else ("JPEG" if target_format in ["jpg", "jpeg"] else "WEBP")
    file_ext = f".{target_format}"

    img = Image.open(BytesIO(raw_bytes))
    width, height = img.size

    # Prepare for format constraints (e.g. JPEG doesn't support alpha channel)
    if pil_format == "JPEG" and img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[3] if len(img.split()) > 3 else None)
        img = background
    elif pil_format == "PNG" and img.mode not in ("RGBA", "RGB"):
        img = img.convert("RGBA")

    unique_id = uuid.uuid4().hex[:12]
    filename = f"gyan_gen_{unique_id}{file_ext}"
    filepath = os.path.join(GENERATED_DIR, filename)

    if pil_format == "PNG":
        img.save(filepath, format="PNG", optimize=True)
    elif pil_format == "JPEG":
        img.save(filepath, format="JPEG", quality=95, optimize=True)
    else:
        img.save(filepath, format="WEBP", quality=95)

    return filename, filepath, width, height


def generate_image_url(
    prompt: str,
    style: str = "photorealistic",
    aspect_ratio: str = "1:1",
    seed: Optional[int] = None,
    target_format: str = "png",
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    save_local: bool = True
) -> Dict[str, Any]:
    """
    End-to-end image generation pipeline:
    1. Analyzes prompt & resolves context
    2. Builds visual prompt for Pollinations
    3. Fetches image bytes reliably
    4. Converts & saves to exact target format (.png, .jpeg, .jpg) via Pillow
    5. Returns both local persistent URL and remote fallback URL.
    """
    if seed is None:
        seed = random.randint(1000, 999999)

    dim = ASPECT_RATIOS.get(aspect_ratio, ASPECT_RATIOS["1:1"])
    target_width = dim["width"]
    target_height = dim["height"]

    # 1. Analyze request & optimize prompt
    analysis = analyze_image_request(prompt, conversation_history)
    visual_prompt = analysis.get("visual_prompt") or prompt
    detected_style = style if style and style != "auto" else analysis.get("detected_style", "photorealistic")
    fmt = target_format if target_format != "auto" else analysis.get("target_format", "png")
    title = analysis.get("title") or (prompt[:30] + "...")

    # 2. Build enriched prompt
    full_prompt = build_image_prompt(visual_prompt, detected_style)
    remote_url = build_pollinations_url(full_prompt, seed=seed)

    local_url = None
    local_filename = None
    actual_width = target_width
    actual_height = target_height

    # 3. Fetch and save locally in requested format if enabled
    if save_local:
        try:
            raw_bytes = fetch_image_bytes(remote_url, max_retries=2)
            local_filename, _, actual_width, actual_height = save_image_as_format(raw_bytes, target_format=fmt)
            local_url = f"/uploads/generated/{local_filename}"
        except Exception as e:
            # Fallback to direct remote URL if local download encountered an error
            local_url = remote_url
            local_filename = None

    display_url = local_url if local_url else remote_url

    return {
        "image_url": display_url,
        "local_url": local_url,
        "remote_url": remote_url,
        "filename": local_filename,
        "original_prompt": prompt,
        "visual_prompt": visual_prompt,
        "enhanced_prompt": full_prompt,
        "title": title,
        "style": detected_style,
        "format": fmt.upper(),
        "aspect_ratio": aspect_ratio,
        "width": actual_width,
        "height": actual_height,
        "seed": seed
    }
