import os
import io
import unittest
import database as db
import file_service
from app import app
from PIL import Image

class TestGyanBackend(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_database_crud(self):
        # 1. Create conversation
        conv = db.create_conversation(title="Test Architecture Chat", effort_level="high")
        conv_id = conv["id"]
        self.assertIsNotNone(conv_id)
        self.assertEqual(conv["title"], "Test Architecture Chat")

        # 2. Add messages
        msg1 = db.add_message(conv_id, "user", "What is quantum computing?", effort_level="high")
        msg2 = db.add_message(conv_id, "assistant", "Quantum computing uses qubits.", thinking="Calculated qubit states", effort_level="high")

        # 3. Retrieve messages
        messages = db.get_messages(conv_id)
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]["content"], "What is quantum computing?")
        self.assertEqual(messages[1]["thinking"], "Calculated qubit states")

        # 4. Search conversations
        searched = db.get_conversations(search_query="Architecture")
        self.assertTrue(any(c["id"] == conv_id for c in searched))

        # 5. Trim messages (Edit prompt simulation)
        db.trim_messages_after(conv_id, msg1["id"], include_target=False)
        remaining = db.get_messages(conv_id)
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]["id"], msg1["id"])

        # 6. Delete conversation
        db.delete_conversation(conv_id)
        self.assertIsNone(db.get_conversation(conv_id))

    def test_file_processing(self):
        # Test text file upload
        class MockFile:
            def __init__(self, filename, data):
                self.filename = filename
                self._data = data
            def read(self):
                return self._data

        txt_mock = MockFile("notes.txt", b"GYAN is an enlightened AI system designed for maximum accuracy.")
        result = file_service.process_uploaded_file(txt_mock)
        self.assertEqual(result["type"], "document")
        self.assertIn("GYAN is an enlightened AI", result["text_content"])

        # Test image processing
        img_buffer = io.BytesIO()
        test_img = Image.new("RGB", (100, 100), color="blue")
        test_img.save(img_buffer, format="JPEG")
        img_bytes = img_buffer.getvalue()

        img_mock = MockFile("test_pic.jpg", img_bytes)
        img_result = file_service.process_uploaded_file(img_mock)
        self.assertEqual(img_result["type"], "image")
        self.assertTrue(img_result["data_uri"].startswith("data:image/jpeg;base64,"))

    def test_flask_endpoints(self):
        # Health check
        res = self.app.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["app_name"], "GYAN")

        # Conversations list
        res = self.app.get("/api/conversations")
        self.assertEqual(res.status_code, 200)

        # Upload without file should return 400
        res = self.app.post("/api/upload")
        self.assertEqual(res.status_code, 400)

if __name__ == "__main__":
    unittest.main()
