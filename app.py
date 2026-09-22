import os
import tempfile
from flask import Flask, render_template, request, jsonify, send_from_directory, send_file
from dotenv import load_dotenv

import database as db
import file_service
import groq_service
import image_service

# Load environment
load_dotenv(override=True)
 
UPLOAD_BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
for sub in ["documents", "images", "audio", "generated"]:
    os.makedirs(os.path.join(UPLOAD_BASE, sub), exist_ok=True)

app = Flask(__name__, static_folder="static", template_folder="templates")
app.secret_key = os.getenv("FLASK_SECRET_KEY", "gyan-super-secret-key-2025-ai")
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv("MAX_CONTENT_LENGTH", 25 * 1024 * 1024))  # 25 MB
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0


@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/uploads/<path:filename>")
def serve_uploads(filename):
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
    return send_from_directory(uploads_dir, filename)


@app.route("/api/image/download/<path:filename>")
def download_image_file(filename):
    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", "generated")
    filepath = os.path.join(uploads_dir, filename)
    if not os.path.exists(filepath):
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads", filename)
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found."}), 404
        uploads_dir = os.path.dirname(filepath)
        filename = os.path.basename(filepath)

    target_fmt = request.args.get("format", "").lower().replace(".", "")
    if target_fmt in ["png", "jpg", "jpeg", "webp"]:
        curr_ext = os.path.splitext(filename)[1].lower().replace(".", "")
        if target_fmt != curr_ext and not (target_fmt in ["jpg", "jpeg"] and curr_ext in ["jpg", "jpeg"]):
            try:
                from io import BytesIO
                from PIL import Image
                img = Image.open(filepath)
                buf = BytesIO()
                pil_fmt = "PNG" if target_fmt == "png" else ("JPEG" if target_fmt in ["jpg", "jpeg"] else "WEBP")
                if pil_fmt == "JPEG" and img.mode in ("RGBA", "LA", "P"):
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    if img.mode == "P":
                        img = img.convert("RGBA")
                    bg.paste(img, mask=img.split()[3] if len(img.split()) > 3 else None)
                    img = bg
                elif pil_fmt == "PNG" and img.mode not in ("RGBA", "RGB"):
                    img = img.convert("RGBA")
                if pil_fmt == "PNG":
                    img.save(buf, format="PNG", optimize=True)
                elif pil_fmt == "JPEG":
                    img.save(buf, format="JPEG", quality=95, optimize=True)
                else:
                    img.save(buf, format="WEBP", quality=95)
                buf.seek(0)
                download_name = f"{os.path.splitext(filename)[0]}.{target_fmt}"
                return send_file(buf, as_attachment=True, download_name=download_name, mimetype=f"image/{target_fmt}")
            except Exception as e:
                pass

    return send_from_directory(uploads_dir, filename, as_attachment=True)


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "has_api_key": groq_service.is_api_key_configured(),
        "app_name": "GYAN"
    })


@app.route("/api/config/key", methods=["POST"])
def update_api_key():
    data = request.get_json() or {}
    new_key = data.get("api_key", "").strip()
    if not new_key:
        return jsonify({"error": "API key cannot be empty."}), 400
    
    try:
        groq_service.update_api_key_in_env(new_key)
        return jsonify({
            "success": True,
            "message": "Groq API key updated successfully!",
            "has_api_key": True
        })
    except Exception as e:
        return jsonify({"error": f"Failed to save API key: {str(e)}"}), 500


# --- CONVERSATION ENDPOINTS ---

@app.route("/api/conversations", methods=["GET"])
def list_conversations():
    search_q = request.args.get("q", "").strip()
    conversations = db.get_conversations(search_query=search_q if search_q else None)
    return jsonify({"conversations": conversations})


@app.route("/api/conversations", methods=["POST"])
def create_conversation():
    data = request.get_json() or {}
    title = data.get("title", "New Conversation")
    effort_level = data.get("effort_level", "medium")
    conv = db.create_conversation(title=title, effort_level=effort_level)
    return jsonify({"conversation": conv}), 201


@app.route("/api/conversations/<conv_id>", methods=["GET"])
def get_conversation_details(conv_id):
    conv = db.get_conversation(conv_id)
    if not conv:
        return jsonify({"error": "Conversation not found"}), 404
    messages = db.get_messages(conv_id)
    return jsonify({"conversation": conv, "messages": messages})


@app.route("/api/conversations/<conv_id>/title", methods=["PUT"])
def rename_conversation(conv_id):
    data = request.get_json() or {}
    new_title = data.get("title", "").strip()
    if not new_title:
        return jsonify({"error": "Title cannot be empty"}), 400
    
    success = db.update_conversation_title(conv_id, new_title)
    if not success:
        return jsonify({"error": "Conversation not found"}), 404
    return jsonify({"success": True, "title": new_title})


@app.route("/api/conversations/<conv_id>", methods=["DELETE"])
def delete_conversation(conv_id):
    success = db.delete_conversation(conv_id)
    return jsonify({"success": success})


@app.route("/api/conversations", methods=["DELETE"])
def clear_all():
    db.clear_all_conversations()
    return jsonify({"success": True})


# --- FILE UPLOAD & TRANSCRIBE ---

@app.route("/api/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded in request"}), 400
    
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    result = file_service.process_uploaded_file(file)
    if "error" in result:
        return jsonify({"error": result["error"]}), 400
        
    return jsonify({"attachment": result})


@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    if not groq_service.is_api_key_configured():
        return jsonify({"error": "Groq API Key is not configured. Please set your key first."}), 400

    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    orig_name = audio_file.filename or "recording.webm"
    ext = os.path.splitext(orig_name)[1].lower() or ".webm"

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
            audio_file.save(tf.name)
            temp_path = tf.name

        text = groq_service.transcribe_audio_file(temp_path)
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": f"Audio transcription failed: {str(e)}"}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


# --- CHAT & EDIT ---

def auto_title_from_prompt(prompt):
    cleaned = prompt.strip().replace("\n", " ")
    if len(cleaned) <= 38:
        return cleaned
    return cleaned[:35] + "..."


@app.route("/api/chat", methods=["POST"])
def chat():
    if not groq_service.is_api_key_configured():
        return jsonify({
            "error": "Groq API Key is required. Please set your GROQ_API_KEY in the .env file or via Settings."
        }), 400

    data = request.get_json() or {}
    prompt = data.get("prompt", "").strip()
    effort_level = data.get("effort_level", "medium").lower()
    conv_id = data.get("conversation_id")
    attachments = data.get("attachments", [])

    if not prompt and not attachments:
        return jsonify({"error": "Prompt or attachment is required."}), 400

    # Ensure conversation exists
    if not conv_id or not db.get_conversation(conv_id):
        first_title = auto_title_from_prompt(prompt) if prompt else "File Analysis"
        conv = db.create_conversation(title=first_title, effort_level=effort_level)
        conv_id = conv["id"]
        is_first_message = True
    else:
        existing_messages = db.get_messages(conv_id)
        is_first_message = len(existing_messages) == 0
        if is_first_message and prompt:
            db.update_conversation_title(conv_id, auto_title_from_prompt(prompt))
        db.update_conversation_effort(conv_id, effort_level)

    # Save user message
    user_msg = db.add_message(
        conv_id=conv_id,
        role="user",
        content=prompt,
        effort_level=effort_level,
        attachments=attachments
    )

    # Check if this query is an image generation request
    history = db.get_messages(conv_id)
    prior_turns = history[:-1] if len(history) > 1 else []

    is_explicit_img = data.get("is_image_generation", False)
    analysis = image_service.analyze_image_request(prompt, conversation_history=prior_turns)
    is_img_req = is_explicit_img or analysis.get("is_image_request", False) or image_service.is_image_generation_query(prompt)

    if is_img_req:
        try:
            img_style = data.get("image_style") or analysis.get("detected_style", "photorealistic")
            img_aspect = data.get("image_aspect_ratio", "1:1")
            target_fmt = data.get("target_format") or analysis.get("target_format", "png")
            visual_prompt = analysis.get("visual_prompt") or prompt

            img_info = image_service.generate_image_url(
                prompt=visual_prompt,
                style=img_style,
                aspect_ratio=img_aspect,
                target_format=target_fmt,
                conversation_history=prior_turns,
                save_local=True
            )

            display_title = analysis.get("title") or visual_prompt[:40]
            fmt_upper = img_info.get("format", "PNG")
            filename = img_info.get("filename", "")
            dl_url = f"/api/image/download/{filename}" if filename else img_info["image_url"]

            content = (
                f"Here is your generated **{fmt_upper}** image for: **\"{visual_prompt}\"**\n\n"
                f"![{display_title}]({img_info['image_url']})\n\n"
                f"*Format: **{fmt_upper}** • Style: {img_info['style'].title()} • Dimensions: {img_info['width']}x{img_info['height']} • [Download {fmt_upper}]({dl_url})*"
            )

            assistant_msg = db.add_message(
                conv_id=conv_id,
                role="assistant",
                content=content,
                thinking=f"Visual Synthesis Engine ({fmt_upper}). Visual Prompt: {img_info['enhanced_prompt']}",
                effort_level="flux-vision",
                attachments=[]
            )

            return jsonify({
                "conversation_id": conv_id,
                "user_message": user_msg,
                "assistant_message": assistant_msg,
                "model_used": f"GYAN Vision Engine ({fmt_upper})",
                "is_image": True,
                "image_url": img_info["image_url"],
                "download_url": dl_url,
                "format": fmt_upper
            })
        except Exception as img_err:
            return jsonify({"error": f"Image generation failed: {str(img_err)}", "conversation_id": conv_id}), 500

    try:
        # Call Groq Service
        result = groq_service.generate_response(
            conversation_history=history[:-1],  # prior turns
            prompt=prompt,
            attachments=attachments,
            effort_level=effort_level
        )

        assistant_content = result.get("content", "")
        thinking = result.get("thinking", "")
        model_used = result.get("model_used", "")

        # Save assistant message
        assistant_msg = db.add_message(
            conv_id=conv_id,
            role="assistant",
            content=assistant_content,
            thinking=thinking,
            effort_level=effort_level
        )

        return jsonify({
            "conversation_id": conv_id,
            "user_message": user_msg,
            "assistant_message": assistant_msg,
            "model_used": model_used
        })

    except Exception as e:
        # Save error message for user visibility
        err_str = f"Error generating response: {str(e)}"
        return jsonify({"error": err_str, "conversation_id": conv_id}), 500


@app.route("/api/image/generate", methods=["POST"])
def generate_image_endpoint():
    data = request.get_json() or {}
    prompt = data.get("prompt", "").strip()
    style = data.get("style", "photorealistic")
    aspect_ratio = data.get("aspect_ratio", "1:1")
    target_format = data.get("format") or data.get("target_format", "png")
    conv_id = data.get("conversation_id")
    insert_into_chat = data.get("insert_into_chat", False)

    if not prompt:
        return jsonify({"error": "Prompt is required to generate an image."}), 400

    try:
        img_info = image_service.generate_image_url(
            prompt=prompt,
            style=style,
            aspect_ratio=aspect_ratio,
            target_format=target_format,
            save_local=True
        )

        user_msg = None
        assistant_msg = None
        fmt_upper = img_info.get("format", "PNG")
        filename = img_info.get("filename", "")
        dl_url = f"/api/image/download/{filename}" if filename else img_info["image_url"]

        if insert_into_chat:
            if not conv_id or not db.get_conversation(conv_id):
                first_title = f"🎨 {prompt[:28]}"
                conv = db.create_conversation(title=first_title, effort_level="medium")
                conv_id = conv["id"]

            user_msg = db.add_message(
                conv_id=conv_id,
                role="user",
                content=f"/imagine {prompt} (style: {style}, aspect: {aspect_ratio}, format: {fmt_upper})",
                effort_level="medium"
            )

            content = (
                f"Here is your generated **{fmt_upper}** image for: **\"{prompt}\"**\n\n"
                f"![{prompt}]({img_info['image_url']})\n\n"
                f"*Format: **{fmt_upper}** • Style: {style.title()} • Dimensions: {img_info['width']}x{img_info['height']} • [Download {fmt_upper}]({dl_url})*"
            )

            assistant_msg = db.add_message(
                conv_id=conv_id,
                role="assistant",
                content=content,
                thinking=f"Visual Synthesis Engine ({fmt_upper}). Visual Prompt: {img_info['enhanced_prompt']}",
                effort_level="flux-vision",
                attachments=[]
            )

        return jsonify({
            "success": True,
            "image_url": img_info["image_url"],
            "download_url": dl_url,
            "filename": filename,
            "format": fmt_upper,
            "prompt": prompt,
            "enhanced_prompt": img_info["enhanced_prompt"],
            "style": style,
            "aspect_ratio": aspect_ratio,
            "seed": img_info["seed"],
            "conversation_id": conv_id,
            "user_message": user_msg,
            "assistant_message": assistant_msg
        })
    except Exception as e:
        return jsonify({"error": f"Image generation failed: {str(e)}"}), 500


@app.route("/api/conversations/<conv_id>/edit", methods=["POST"])
def edit_prompt(conv_id):
    """
    Edits a previous user prompt, prunes any subsequent messages,
    and regenerates the assistant response with the requested effort level.
    """
    if not groq_service.is_api_key_configured():
        return jsonify({"error": "Groq API Key is not configured."}), 400

    data = request.get_json() or {}
    message_id = data.get("message_id")
    new_prompt = data.get("new_prompt", "").strip()
    effort_level = data.get("effort_level", "medium").lower()

    if not message_id or not new_prompt:
        return jsonify({"error": "message_id and new_prompt are required."}), 400

    target_msg = db.get_message(message_id)
    if not target_msg or target_msg["conversation_id"] != conv_id:
        return jsonify({"error": "Target message not found."}), 404

    # Keep attachments from the original message if not passed anew
    attachments = data.get("attachments", target_msg.get("attachments", []))

    # Trim all subsequent messages after target_msg
    db.trim_messages_after(conv_id, message_id, include_target=True)

    # Re-insert updated user message
    user_msg = db.add_message(
        conv_id=conv_id,
        role="user",
        content=new_prompt,
        effort_level=effort_level,
        attachments=attachments
    )

    # Get history prior to this turn
    history = db.get_messages(conv_id)

    try:
        result = groq_service.generate_response(
            conversation_history=history[:-1],
            prompt=new_prompt,
            attachments=attachments,
            effort_level=effort_level
        )

        assistant_content = result.get("content", "")
        thinking = result.get("thinking", "")
        model_used = result.get("model_used", "")

        assistant_msg = db.add_message(
            conv_id=conv_id,
            role="assistant",
            content=assistant_content,
            thinking=thinking,
            effort_level=effort_level
        )

        return jsonify({
            "conversation_id": conv_id,
            "user_message": user_msg,
            "assistant_message": assistant_msg,
            "model_used": model_used
        })

    except Exception as e:
        return jsonify({"error": f"Failed to regenerate response: {str(e)}"}), 500


@app.route("/api/conversations/<conv_id>/regenerate", methods=["POST"])
def regenerate_response(conv_id):
    """
    Regenerates the assistant response for the conversation.
    If message_id is provided, deletes that assistant message and re-runs.
    """
    if not groq_service.is_api_key_configured():
        return jsonify({"error": "Groq API Key is not configured."}), 400

    data = request.get_json() or {}
    target_msg_id = data.get("message_id")
    effort_level = data.get("effort_level", "medium").lower()

    messages = db.get_messages(conv_id)
    if not messages:
        return jsonify({"error": "No messages found in conversation to regenerate."}), 400

    # If target assistant message specified, delete it and any after it
    if target_msg_id:
        target_msg = db.get_message(target_msg_id)
        if target_msg:
            db.trim_messages_after(conv_id, target_msg_id, include_target=True)
            messages = db.get_messages(conv_id)

    # Find the last user message
    last_user_msg = None
    for m in reversed(messages):
        if m["role"] == "user":
            last_user_msg = m
            break

    if not last_user_msg:
        return jsonify({"error": "No prompt found to regenerate."}), 400

    # Get history prior to this user message
    history = [m for m in messages if m["id"] != last_user_msg["id"]]

    try:
        result = groq_service.generate_response(
            conversation_history=history,
            prompt=last_user_msg["content"],
            attachments=last_user_msg.get("attachments", []),
            effort_level=effort_level
        )

        assistant_content = result.get("content", "")
        thinking = result.get("thinking", "")
        model_used = result.get("model_used", "")

        assistant_msg = db.add_message(
            conv_id=conv_id,
            role="assistant",
            content=assistant_content,
            thinking=thinking,
            effort_level=effort_level
        )

        return jsonify({
            "conversation_id": conv_id,
            "assistant_message": assistant_msg,
            "model_used": model_used
        })

    except Exception as e:
        return jsonify({"error": f"Failed to regenerate response: {str(e)}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", 5000)))
    debug = os.getenv("FLASK_DEBUG", "False").lower() in ("true", "1")
    print(f"Starting GYAN AI on http://0.0.0.0:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
