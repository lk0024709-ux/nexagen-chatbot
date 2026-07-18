import aiohttp
import asyncio
import logging
from config import (
    GROQ_API_KEY, GROQ_MODEL,
    GITHUB_TOKEN, GPT_MODEL,
    AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_VERSION, AZURE_OPENAI_DEPLOYMENT_NAME,
)

logger = logging.getLogger(__name__)


class GroqAPI:
    """Llama 3.3 via Groq API (default model for all non-GPT modes)."""

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
                    return "Connection error. Please check your internet and try again."
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                return "An unexpected error occurred. Please try again."

        return "Failed to get a response after multiple retries. Please try again later."


class AzureOpenAIAPI:
    """GPT-5 via Microsoft Azure OpenAI SDK.

    Authentication methods (priority order):
      1. AZURE_OPENAI_API_KEY  — direct Azure API key
      2. GITHUB_TOKEN          — GitHub PAT used as api-key (Microsoft SDK auth)
      3. Neither               — returns a config-missing warning
    """

    def __init__(self):
        # Build the Azure OpenAI chat completions URL
        endpoint = AZURE_OPENAI_ENDPOINT.rstrip("/")
        deployment = AZURE_OPENAI_DEPLOYMENT_NAME
        api_version = AZURE_OPENAI_API_VERSION
        self.api_url = (
            f"{endpoint}/openai/deployments/{deployment}"
            f"/chat/completions?api-version={api_version}"
        )

        # Determine auth token — Azure API key takes priority, then GitHub token
        if AZURE_OPENAI_API_KEY:
            self.headers = {
                "api-key": AZURE_OPENAI_API_KEY,
                "Content-Type": "application/json",
            }
            self.auth_method = "azure-api-key"
        elif GITHUB_TOKEN:
            self.headers = {
                "Authorization": f"Bearer {GITHUB_TOKEN}",
                "Content-Type": "application/json",
            }
            self.auth_method = "github-token"
        else:
            self.headers = {"Content-Type": "application/json"}
            self.auth_method = None

        logger.info(f"AzureOpenAIAPI initialized — auth={self.auth_method}, deployment={deployment}")

    async def generate_text(self, messages, retry_attempts=3, retry_delay=3):
        if self.auth_method is None:
            return (
                "⚠️ Azure OpenAI is not configured.\n"
                "Please set AZURE_OPENAI_API_KEY or GITHUB_TOKEN in your environment."
            )

        payload = {
            "messages": messages,
            "max_tokens": 4096,
            "temperature": 0.7,
            "top_p": 0.95,
            "frequency_penalty": 0,
            "presence_penalty": 0,
            "stream": False,
        }

        for attempt in range(retry_attempts):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        self.api_url,
                        headers=self.headers,
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=60),
                    ) as response:
                        if response.status == 429:
                            retry_after = int(
                                response.headers.get("Retry-After", retry_delay * (attempt + 1))
                            )
                            logger.warning(f"GPT-5 rate limited, retrying in {retry_after}s...")
                            await asyncio.sleep(retry_after)
                            continue
                        if response.status == 503:
                            logger.warning("GPT-5 service unavailable, retrying...")
                            await asyncio.sleep(retry_delay)
                            continue
                        if response.status in (401, 403):
                            error_text = await response.text()
                            logger.error(f"Azure auth error {response.status}: {error_text}")
                            return (
                                "⚠️ Azure OpenAI authentication failed. "
                                "Please check your AZURE_OPENAI_API_KEY or GITHUB_TOKEN."
                            )
                        if response.status != 200:
                            error_text = await response.text()
                            logger.error(f"Azure OpenAI error {response.status}: {error_text}")
                            if attempt < retry_attempts - 1:
                                await asyncio.sleep(retry_delay)
                                continue
                            return "Sorry, GPT-5 service is temporarily unavailable. Please try again."

                        result = await response.json()
                        if "choices" in result and result["choices"]:
                            content = result["choices"][0]["message"]["content"]
                            return content.strip() if content else "I couldn't generate a response. Please try again."
                        return "Unexpected response from GPT-5. Please try again."

            except asyncio.TimeoutError:
                logger.error(f"GPT-5 timeout on attempt {attempt + 1}/{retry_attempts}")
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return "GPT-5 request timed out. Please try again."
            except aiohttp.ClientError as e:
                logger.error(f"GPT-5 connection error (attempt {attempt + 1}/{retry_attempts}): {e}")
                if attempt < retry_attempts - 1:
                    await asyncio.sleep(retry_delay)
                else:
                    return "Connection error to GPT-5 service. Please check your internet and try again."
            except Exception as e:
                logger.error(f"GPT-5 unexpected error: {e}")
                return "An unexpected error occurred with GPT-5. Please try again."

        return "Failed to get a response from GPT-5 after multiple retries. Please try again later."


class ModelRouter:
    """Routes AI requests to the correct backend with automatic fallback.

    Model Selection Flow:
      1. Complex tasks     → GPT-5 (Microsoft Azure OpenAI SDK)
      2. Fast responses    → Llama 3 70B (Groq)
      3. Cost-effective    → Llama 3 8B (Groq)
      4. Creative tasks    → GPT-4 Turbo (Azure)
      5. Fallback          → Any available model
    """

    def __init__(self):
        self.azure_api = AzureOpenAIAPI()
        self.groq_api = GroqAPI()
        self.fallback_models = MODEL_PRIORITY_LIST

    async def generate(self, messages, task_type="general"):
        """Generate text with automatic model selection and fallback."""
        # Select primary model based on task type
        if task_type == "complex":
            primary = "gpt-5"
        elif task_type == "fast":
            primary = "groq"
        elif task_type == "creative":
            primary = "gpt-5"
        else:
            primary = "groq"

        # Try primary
        if primary == "gpt-5":
            response = await self.azure_api.generate_text(messages)
            if not response.startswith("⚠️") and not response.startswith("Sorry"):
                return response
        else:
            response = await self.groq_api.generate_text(messages)
            if not response.startswith("⚠️") and not response.startswith("Sorry"):
                return response

        # Try fallback chain
        for fallback in self.fallback_models:
            logger.info(f"Falling back to: {fallback}")
            if fallback in ("gpt-5", "gpt-4-turbo", "gpt-4"):
                response = await self.azure_api.generate_text(messages)
            else:
                response = await self.groq_api.generate_text(messages)

            if not response.startswith("⚠️") and not response.startswith("Sorry") and not response.startswith("Failed"):
                return response

        return "⚠️ All AI models failed. Please try again later."


# Priority list for fallback
MODEL_PRIORITY_LIST = [m.strip() for m in __import__('config').MODEL_PRIORITY.split(",")]
