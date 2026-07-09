
import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

from config import TELEGRAM_BOT_TOKEN, PERSONALITY_MODES, DEFAULT_MODE, MAX_HISTORY_MESSAGES
from services.database import init_db, get_user_settings, set_user_mode, set_custom_prompt, add_message_to_history, get_chat_history, clear_chat_history
from services.hf_api import HuggingFaceAPI

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

hf_api = HuggingFaceAPI()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    user_settings = await get_user_settings(user_id)
    if not user_settings:
        await set_user_mode(user_id, DEFAULT_MODE)
        user_settings = {"current_mode": DEFAULT_MODE, "custom_prompt": None}

    mode_buttons = []
    for mode_key, mode_info in PERSONALITY_MODES.items():
        mode_buttons.append(InlineKeyboardButton(mode_info["name"], callback_data=f"set_mode_{mode_key}"))
    
    keyboard = InlineKeyboardMarkup([mode_buttons[i:i + 2] for i in range(0, len(mode_buttons), 2)]) # Two buttons per row

    welcome_message = (
        f"Hello, {update.effective_user.first_name}! I am NexaGen AI Chatbot. "
        "I can converse with you in various personality modes.\n\n"
        "Use /help to see all available commands.\n"
        f"Your current mode is: {PERSONALITY_MODES[user_settings["current_mode"]]["name"]}.\n\n"
        "Choose a personality mode below or type /custom to set your own prompt:"
    )
    await update.message.reply_text(welcome_message, reply_markup=keyboard)

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    help_text = (
        "Here are the commands you can use:\n\n"
        "/start - Show welcome message and mode selection\n"
        "/help - Show this help message\n"
        "/reset - Clear current conversation history\n"
        "/mode - Show your current active personality mode\n"
    )
    for mode_key, mode_info in PERSONALITY_MODES.items():
        if mode_key != "custom": # Custom mode is handled separately
            help_text += f"/{mode_key} - Switch to {mode_info["name"]} mode: {mode_info["description"]}\n"
    help_text += "/custom - Set your own custom system prompt\n"
    await update.message.reply_text(help_text)

async def reset_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    await clear_chat_history(user_id)
    await update.message.reply_text("Conversation history has been cleared.")

async def mode_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    user_settings = await get_user_settings(user_id)
    current_mode_key = user_settings.get("current_mode", DEFAULT_MODE)
    current_mode_name = PERSONALITY_MODES[current_mode_key]["name"]
    current_mode_desc = PERSONALITY_MODES[current_mode_key]["description"]
    
    response_text = f"Your current personality mode is: {current_mode_name}.\nDescription: {current_mode_desc}"
    if current_mode_key == "custom" and user_settings.get("custom_prompt"):
        response_text += f"\nCustom Prompt: {user_settings["custom_prompt"]}"
    
    await update.message.reply_text(response_text)

async def set_mode(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    query = update.callback_query
    await query.answer()
    mode_key = query.data.replace("set_mode_", "")
    
    if mode_key in PERSONALITY_MODES:
        await set_user_mode(user_id, mode_key)
        # Clear the awaiting_custom_prompt flag if user switches mode
        if context.user_data.get("awaiting_custom_prompt"):
            del context.user_data["awaiting_custom_prompt"]
        await query.edit_message_text(
            f"Switched to {PERSONALITY_MODES[mode_key]["name"]} mode.\nDescription: {PERSONALITY_MODES[mode_key]["description"]}"
        )
    else:
        await query.edit_message_text("Invalid mode selected.")

async def custom_mode_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    await set_user_mode(user_id, "custom")
    context.user_data["awaiting_custom_prompt"] = True # Set flag
    await update.message.reply_text(
        "You\"ve switched to Custom mode. Please send me the system prompt you\"d like to use.\n"
        "This prompt will define the AI\"s personality and behavior."
    )

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    user_message = update.message.text

    user_settings = await get_user_settings(user_id)
    current_mode_key = user_settings.get("current_mode", DEFAULT_MODE)

    # Check if we are awaiting a custom prompt input
    if context.user_data.get("awaiting_custom_prompt") and current_mode_key == "custom":
        custom_prompt = user_message
        await set_custom_prompt(user_id, custom_prompt)
        del context.user_data["awaiting_custom_prompt"] # Clear flag
        await update.message.reply_text(f"Custom prompt set successfully!\nPrompt: {custom_prompt}")
        return

    # Add user message to history for normal conversation
    await add_message_to_history(user_id, "user", user_message)
    
    system_prompt = PERSONALITY_MODES[current_mode_key]["prompt"]
    if current_mode_key == "custom" and user_settings.get("custom_prompt"):
        system_prompt = user_settings["custom_prompt"]

    chat_history = await get_chat_history(user_id)
    
    # Construct messages for the AI, including system prompt and history
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    
    for role, content in chat_history:
        messages.append({"role": role, "content": content})

    try:
        # Send typing action
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        ai_response = await hf_api.generate_text(messages)
        await update.message.reply_text(ai_response)
        await add_message_to_history(user_id, "assistant", ai_response)
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        await update.message.reply_text("Sorry, I encountered an error while processing your request. Please try again later.")

def main() -> None:
    import asyncio
    asyncio.get_event_loop().run_until_complete(init_db())

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("reset", reset_command))
    application.add_handler(CommandHandler("mode", mode_command))
    application.add_handler(CommandHandler("custom", custom_mode_start))

    # Dynamic command handlers for personality modes
    for mode_key in PERSONALITY_MODES.keys():
        if mode_key != "custom":
            application.add_handler(CommandHandler(mode_key, set_mode_command_factory(mode_key)))

    # Callback query handler for mode selection buttons
    application.add_handler(CallbackQueryHandler(set_mode, pattern="^set_mode_.*"))

    # Message handlers
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot started polling...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

def set_mode_command_factory(mode_key: str):
    async def _handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        user_id = update.effective_user.id
        if mode_key in PERSONALITY_MODES:
            await set_user_mode(user_id, mode_key)
            if context.user_data.get("awaiting_custom_prompt"):
                del context.user_data["awaiting_custom_prompt"]
            mode_info = PERSONALITY_MODES[mode_key]
            await update.message.reply_text(
                f"Switched to {mode_info['name']} mode.\nDescription: {mode_info['description']}"
            )
        else:
            await update.message.reply_text("Invalid mode specified.")
    return _handler

if __name__ == "__main__":
    main()
