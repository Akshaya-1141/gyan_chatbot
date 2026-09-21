import os
import io
import unittest
from PIL import Image

import image_service
from app import app


class TestImageServiceAndEndpoints(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_intent_detection_image_queries(self):
        """Test that image creation queries with formats (.png, .jpeg, .jpg) are properly detected."""
        positive_queries = [
            "generate a png of a sunset over mountains",
            "can you create a .jpg of a futuristic sports car?",
            "make a jpeg image of a golden retriever puppy",
            "draw a cute anime girl reading a book in .png format",
            "create an image of a cybernetic tiger in jpg",
            "generate a .jpeg picture of a cozy cabin in the snow",
            "draw me a cartoon dragon",
            "paint a landscape of rolling green hills",
            "/imagine neon cyberpunk city",
            "photo of an astronaut riding a horse on mars",
            "render an image of a modern coffee cup logo.png"
        ]
        for query in positive_queries:
            self.assertTrue(
                image_service.is_image_generation_query(query),
                f"Expected query to be detected as image generation: '{query}'"
            )

    def test_intent_detection_informational_queries(self):
        """Test that questions ABOUT images/formats are NOT mistakenly detected as image generation."""
        negative_queries = [
            "What is the difference between PNG and JPEG?",
            "Can you explain how JPEG compression works?",
            "What is a PNG image?",
            "How do I convert a JPG to PNG in Python?",
            "Analyze the attached image and tell me what is in it",
            "Explain how diffusion models generate images",
            "Tell me about the history of digital photography",
            "Why is PNG better than JPEG for transparent graphics?"
        ]
        for query in negative_queries:
            self.assertFalse(
                image_service.is_image_generation_query(query),
                f"Expected query NOT to be detected as image generation: '{query}'"
            )

    def test_format_extraction(self):
        """Test accurate format extraction from user queries."""
        self.assertEqual(image_service.extract_format_from_text("generate a .png of a cat"), "png")
        self.assertEqual(image_service.extract_format_from_text("draw a dog in jpeg"), "jpeg")
        self.assertEqual(image_service.extract_format_from_text("create a jpg image of mountains"), "jpg")
        self.assertEqual(image_service.extract_format_from_text("export as webp"), "webp")
        self.assertEqual(image_service.extract_format_from_text("draw a car"), "png")  # default

    def test_offline_prompt_cleaning(self):
        """Test stripping conversational noise and format mentions."""
        prompt = "Can you please generate an image of a majestic lion in the savanna in .png format?"
        clean_p, fmt, style = image_service.clean_prompt_offline(prompt)
        self.assertEqual(fmt, "png")
        self.assertNotIn("can you please generate", clean_p.lower())
        self.assertNotIn("in .png format", clean_p.lower())
        self.assertIn("lion in the savanna", clean_p.lower())

    def test_save_image_as_format_png(self):
        """Test that Pillow properly saves valid PNG files with headers."""
        buf = io.BytesIO()
        test_img = Image.new("RGBA", (128, 128), color=(255, 0, 0, 128))
        test_img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        filename, filepath, width, height = image_service.save_image_as_format(raw_bytes, target_format="png")
        self.assertTrue(os.path.exists(filepath))
        self.assertTrue(filename.endswith(".png"))
        self.assertEqual(width, 128)
        self.assertEqual(height, 128)

        # Verify with PIL
        with Image.open(filepath) as loaded:
            self.assertEqual(loaded.format, "PNG")

    def test_save_image_as_format_jpeg(self):
        """Test that Pillow properly converts RGBA to RGB and saves valid JPEG files."""
        buf = io.BytesIO()
        test_img = Image.new("RGBA", (128, 128), color=(0, 255, 0, 255))
        test_img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        filename, filepath, width, height = image_service.save_image_as_format(raw_bytes, target_format="jpeg")
        self.assertTrue(os.path.exists(filepath))
        self.assertTrue(filename.endswith(".jpeg") or filename.endswith(".jpg"))

        # Verify with PIL
        with Image.open(filepath) as loaded:
            self.assertEqual(loaded.format, "JPEG")

    def test_serve_uploads_and_download_endpoints(self):
        """Test /uploads/generated/<file> and /api/image/download/<file>."""
        # Create a test image in generated folder
        buf = io.BytesIO()
        test_img = Image.new("RGB", (64, 64), color="blue")
        test_img.save(buf, format="JPEG")
        raw_bytes = buf.getvalue()
        filename, filepath, _, _ = image_service.save_image_as_format(raw_bytes, target_format="jpg")

        # 1. Test serve
        res = self.app.get(f"/uploads/generated/{filename}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content_type, "image/jpeg")

        # 2. Test direct download
        res = self.app.get(f"/api/image/download/{filename}")
        self.assertEqual(res.status_code, 200)

        # 3. Test on-the-fly conversion download as PNG
        res = self.app.get(f"/api/image/download/{filename}?format=png")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content_type, "image/png")
        # Verify downloaded data is valid PNG
        downloaded_img = Image.open(io.BytesIO(res.data))
        self.assertEqual(downloaded_img.format, "PNG")

    def test_chat_endpoint_format_query(self):
        """Test that sending a prompt with .png format to /api/chat triggers image generation."""
        res = self.app.post("/api/chat", json={
            "prompt": "generate a .png of a cute puppy in the park",
            "effort_level": "medium"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("is_image"))
        self.assertIn("image_url", data)
        self.assertEqual(data.get("format"), "PNG")
        self.assertIn("download_url", data)


if __name__ == "__main__":
    unittest.main()
