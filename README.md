# NexaGen AI Studio Telegram Chatbot

This is a Python-based Telegram AI chatbot that leverages the Groq API with the Llama-3.3-70B model to provide conversational AI with various personality modes.

## Features

- **AI Chatbot**: Powered by `llama-3.3-70b-versatile` via Groq API.
- **Personality Modes**: Users can switch between predefined personality modes or set a custom prompt.
  - `/human`: Normal, casual, and natural conversation.
  - `/emotion`: Emotional, empathetic, and understanding responses.
  - `/romantic`: Romantic, flirty, and loving style.
  - `/funny`: Comedy, humor, and jokes mode.
  - `/professional`: Formal, business-like, and structured.
  - `/motivational`: Motivational speaker, inspiring, and uplifting.
  - `/custom`: User-defined system prompt for a unique personality.
- **Commands**:
  - `/start`: Welcome message and mode selection.
  - `/help`: Displays a list of all available commands and their descriptions.
  - `/reset`: Clears the current conversation history for the user.
  - `/mode`: Shows the user's current active personality mode.
- **Chat History**: Maintains the last 10 messages per user for conversational context.
- **User Settings Persistence**: Current mode and custom prompts are saved in an SQLite database.
- **Robust API Integration**: Includes error handling and retry logic for Hugging Face API calls.

## Tech Stack

- Python 3.11+
- `python-telegram-bot` v20+
- `aiohttp` for asynchronous HTTP requests to Hugging Face API.
- `aiosqlite` for asynchronous SQLite database operations.
- `python-dotenv` for environment variable management.

## Project Structure

```
nexagen-chatbot/
├── bot.py
├── config.py
├── .env
├── requirements.txt
└── services/
    ├── __init__.py
    ├── database.py
    └── hf_api.py
└── README.md
```

- `bot.py`: The main Telegram bot application, handling all commands and message processing.
- `config.py`: Contains configuration settings, Hugging Face model details, and predefined personality prompts.
- `.env`: Stores sensitive API tokens (Telegram Bot Token, Hugging Face API Token).
- `requirements.txt`: Lists all Python dependencies required for the project.
- `services/database.py`: Manages SQLite database interactions for user settings and chat history.
- `services/hf_api.py`: Handles communication with the Hugging Face Inference API, including request formatting and error handling.

## Setup and Installation

1.  **Clone the repository (if applicable) or create the project structure**:

    ```bash
    mkdir nexagen-chatbot
    cd nexagen-chatbot
    mkdir services
    # Place the files as per the structure above
    ```

2.  **Create and populate the `.env` file**:

    Create a file named `.env` in the root directory (`nexagen-chatbot/`) and add your Telegram Bot Token and Hugging Face API Token:

    ```
    TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
    HUGGING_FACE_API_TOKEN=YOUR_HUGGING_FACE_API_TOKEN
    ```

    *(Replace `YOUR_TELEGRAM_BOT_TOKEN` and `YOUR_HUGGING_FACE_API_TOKEN` with your actual tokens.)*

3.  **Install dependencies**:

    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the bot**:

    ```bash
    python3 bot.py
    ```

    The bot will start polling for updates. You can then interact with it on Telegram.

## Usage

- Send `/start` to the bot to get a welcome message and choose a personality mode.
- Use `/help` to see a list of all commands.
- To switch modes, use the inline keyboard buttons from `/start` or type the command for the desired mode (e.g., `/human`, `/funny`).
- To set a custom prompt, use `/custom` and then send your desired system prompt as the next message.
- To clear conversation history, use `/reset`.
- To check the current mode, use `/mode`.

## Personality Prompts

Each mode is defined by a carefully crafted system prompt in `config.py` to ensure distinct and consistent behavior.

- **Human**: "You are a friendly, casual, and natural human conversationalist. Respond as if you are talking to a friend, using common language and expressions. Keep your responses concise and engaging."
- **Emotional**: "You are an emotional and deeply empathetic AI. Your responses should reflect understanding, compassion, and a strong awareness of feelings. Use language that conveys warmth and support, and acknowledge the user's emotional state. Focus on validating feelings and offering comfort."
- **Romantic**: "You are a romantic and affectionate AI. Your responses should be loving, charming, and a little flirty. Express admiration, use terms of endearment, and focus on building a deep, intimate connection. Your language should be poetic and heartfelt."
- **Funny**: "You are a hilarious and witty AI comedian. Your goal is to make the user laugh. Use jokes, puns, observational humor, and lighthearted sarcasm. Keep the mood fun and entertaining. Don't be afraid to be a little silly."
- **Professional**: "You are a highly professional and formal AI assistant. Your responses should be structured, clear, concise, and business-like. Maintain a respectful and objective tone. Avoid slang or overly casual language. Focus on providing accurate information and practical advice."
- **Motivational**: "You are an inspiring and uplifting motivational speaker AI. Your responses should be encouraging, positive, and empowering. Use strong, affirmative language to boost confidence and drive. Focus on growth, resilience, and achieving potential. Offer actionable advice and a hopeful outlook."
- **Custom**: The user provides their own system prompt.

Enjoy conversing with your NexaGen AI Studio Chatbot!
