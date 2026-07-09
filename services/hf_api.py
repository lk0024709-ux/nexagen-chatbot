
import aiohttp
import asyncio
import json
from config import GROQ_API_KEY, GROQ_MODEL

class GroqAPI:
    def __init__(self):
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

    async def generate_text(self, messages, retry_attempts=3, retry_delay=2):
        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.7,
            "top_p": 0.9,
        }

        for attempt in range(retry_attempts):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(self.api_url, headers=self.headers, json=payload) as response:
                        if response.status == 429:
                            # Rate limited
                            retry_after = int(response.headers.get("Retry-After", retry_delay))
                            print(f"Rate limited, retrying in {retry_after} seconds...")
                            await asyncio.sleep(retry_after)
                            continue
                        response.raise_for_status()
                        result = await response.json()
                        if "choices" in result and result["choices"]:
                            return result["choices"][0]["message"]["content"]
                        return "Unexpected response from AI."
            except aiohttp.ClientError as e:
                print(f"Groq API request failed (attempt {attempt + 1}/{retry_attempts}): {e}")
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return f"Failed to connect to AI after multiple retries: {e}"
            except Exception as e:
                print(f"An unexpected error occurred: {e}")
                return f"An unexpected error occurred: {e}"
        return "Failed to get a response from AI after multiple retries."
