
import aiohttp
import asyncio
import json
from config import HUGGING_FACE_API_TOKEN, HUGGING_FACE_MODEL

class HuggingFaceAPI:
    def __init__(self):
        self.api_url = f"https://api-inference.huggingface.co/models/{HUGGING_FACE_MODEL}"
        self.headers = {"Authorization": f"Bearer {HUGGING_FACE_API_TOKEN}"}

    async def generate_text(self, messages, retry_attempts=5, retry_delay=2):
        payload = {
            "inputs": self._format_messages_for_api(messages),
            "parameters": {
                "max_new_tokens": 250,
                "temperature": 0.7,
                "top_p": 0.9,
                "do_sample": True,
                "return_full_text": False
            }
        }
        
        for attempt in range(retry_attempts):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(self.api_url, headers=self.headers, json=payload) as response:
                        response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)
                        result = await response.json()
                        if isinstance(result, list) and result and "generated_text" in result[0]:
                            return result[0]["generated_text"]
                        elif "error" in result:
                            print(f"Hugging Face API error: {result["error"]}")
                            if "is currently loading" in result["error"] and attempt < retry_attempts - 1:
                                print(f"Model loading, retrying in {retry_delay} seconds...")
                                await asyncio.sleep(retry_delay)
                                continue
                            return f"Error from AI: {result["error"]}"
                        return "Unexpected response from AI."
            except aiohttp.ClientError as e:
                print(f"Hugging Face API request failed (attempt {attempt + 1}/{retry_attempts}): {e}")
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return f"Failed to connect to AI after multiple retries: {e}"
            except Exception as e:
                print(f"An unexpected error occurred: {e}")
                return f"An unexpected error occurred: {e}"
        return "Failed to get a response from AI after multiple retries."

    def _format_messages_for_api(self, messages):
        # The Llama-3.1-8B-Instruct model expects a specific chat format.
        # This function converts a list of {"role": ..., "content": ...} dicts
        # into the required string format.
        formatted_string = ""
        for message in messages:
            if message["role"] == "system":
                formatted_string += f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n{message["content"]}<|eot_id|>"
            elif message["role"] == "user":
                formatted_string += f"<|start_header_id|>user<|end_header_id|>\n{message["content"]}<|eot_id|>"
            elif message["role"] == "assistant":
                formatted_string += f"<|start_header_id|>assistant<|end_header_id|>\n{message["content"]}<|eot_id|>"
        formatted_string += "<|start_header_id|>assistant<|end_header_id|>\n"
        return formatted_string
