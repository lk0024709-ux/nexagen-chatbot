import aiohttp
import asyncio
import logging
from config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

class GroqAPI:
    def __init__(self):
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }

    async def generate_text(self, messages, retry_attempts=3, retry_delay=3):
        payload = {
            "model": GROQ_MODEL,
            "messages": messages,
            "max_tokens": 1024,
            "temperature": 0.7,
            "top_p": 0.9,
            "stream": False,
        }

        for attempt in range(retry_attempts):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(self.api_url, headers=self.headers, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as response:
                        if response.status == 429:
                            retry_after = int(response.headers.get("Retry-After", retry_delay * (attempt + 1)))
                            logger.warning(f"Rate limited, retrying in {retry_after}s...")
                            await asyncio.sleep(retry_after)
                            continue
                        if response.status == 503:
                            logger.warning(f"Service unavailable, retrying in {retry_delay}s...")
                            await asyncio.sleep(retry_delay)
                            continue
                        if response.status != 200:
                            error_text = await response.text()
                            logger.error(f"Groq API error {response.status}: {error_text}")
                            if attempt < retry_attempts - 1:
                                await asyncio.sleep(retry_delay)
                                continue
                            return "Sorry, AI service is temporarily unavailable. Please try again."

                        result = await response.json()
                        if "choices" in result and result["choices"]:
                            content = result["choices"][0]["message"]["content"]
                            return content.strip() if content else "I couldn't generate a response. Please try again."
                        return "Unexpected response from AI. Please try again."

            except asyncio.TimeoutError:
                logger.error(f"Timeout on attempt {attempt + 1}/{retry_attempts}")
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return "Request timed out. Please try again."
            except aiohttp.ClientError as e:
                logger.error(f"Connection error (attempt {attempt + 1}/{retry_attempts}): {e}")
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return f"Connection error. Please check your internet and try again."
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return "An unexpected error occurred. Please try again."

        return "Failed to get a response after multiple retries. Please try again later."
