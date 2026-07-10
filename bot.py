import logging
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes, CallbackQueryHandler

from config import TELEGRAM_BOT_TOKEN, PERSONALITY_MODES, FEATURE_MODES, DEFAULT_MODE, MAX_HISTORY_MESSAGES
from services.database import init_db, get_user_settings, set_user_mode, set_custom_prompt, add_message_to_history, get_chat_history, clear_chat_history
from services.hf_api import GroqAPI

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

groq_api = GroqAPI()

# ==================== COMMAND HANDLERS ====================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    user_settings = await get_user_settings(user_id)
    if not user_settings:
        await set_user_mode(user_id, DEFAULT_MODE)

    keyboard = [
        [InlineKeyboardButton("🎭 Personality Modes", callback_data="menu_personality"),
         InlineKeyboardButton("⚡ Features", callback_data="menu_features")],
        [InlineKeyboardButton("⚙️ Settings", callback_data="menu_settings"),
         InlineKeyboardButton("❓ Help", callback_data="menu_help")],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    welcome_message = (
        f"👋 Welcome, {update.effective_user.first_name}!\n\n"
        "🤖 I am **NexaGen AI** — your advanced AI assistant.\n\n"
        "I can chat in multiple personality modes, search the web, "
        "generate code, analyze data, plan tasks, and much more!\n\n"
        "Choose an option below to get started:"
    )
    await update.message.reply_text(welcome_message, reply_markup=reply_markup, parse_mode="Markdown")


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_help(update.effective_chat.id, context)


async def send_help(chat_id, context):
    help_text = (
        "📚 **NexaGen AI Commands:**\n\n"
        "🎭 **Personality Modes:**\n"
    )
    for mode_key, mode_info in PERSONALITY_MODES.items():
        help_text += f"  /{mode_key} — {mode_info['name']}\n"

    help_text += "\n⚡ **Feature Commands:**\n"
    for feat_key, feat_info in FEATURE_MODES.items():
        help_text += f"  /{feat_key} — {feat_info['name']}\n"

    help_text += (
        "\n🛠 **Utility Commands:**\n"
        "  /start — Main menu\n"
        "  /help — This help message\n"
        "  /mode — Current active mode\n"
        "  /reset — Clear chat history\n"
        "  /custom — Set custom prompt\n"
        "  /settings — Bot settings\n"
    )

    keyboard = [[InlineKeyboardButton("🔙 Main Menu", callback_data="menu_main")]]
    await context.bot.send_message(chat_id=chat_id, text=help_text, parse_mode="Markdown",
                                   reply_markup=InlineKeyboardMarkup(keyboard))


async def reset_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    await clear_chat_history(user_id)
    await update.message.reply_text("🗑 Conversation history cleared! Fresh start.")


async def mode_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    user_settings = await get_user_settings(user_id)
    current_mode_key = user_settings.get("current_mode", DEFAULT_MODE) if user_settings else DEFAULT_MODE

    all_modes = {**PERSONALITY_MODES, **FEATURE_MODES}
    if current_mode_key in all_modes:
        mode_info = all_modes[current_mode_key]
        response_text = f"🎯 Current Mode: {mode_info['name']}\n📝 {mode_info['description']}"
    else:
        response_text = f"🎯 Current Mode: {current_mode_key}"

    if current_mode_key == "custom" and user_settings and user_settings.get("custom_prompt"):
        response_text += f"\n\n⚙️ Custom Prompt:\n{user_settings['custom_prompt']}"

    keyboard = [
        [InlineKeyboardButton("🎭 Change Mode", callback_data="menu_personality"),
         InlineKeyboardButton("⚡ Features", callback_data="menu_features")]
    ]
    await update.message.reply_text(response_text, reply_markup=InlineKeyboardMarkup(keyboard))


async def settings_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_settings(update.effective_chat.id, update.effective_user.id, context)


async def send_settings(chat_id, user_id, context):
    user_settings = await get_user_settings(user_id)
    current_mode = user_settings.get("current_mode", DEFAULT_MODE) if user_settings else DEFAULT_MODE

    all_modes = {**PERSONALITY_MODES, **FEATURE_MODES}
    mode_name = all_modes.get(current_mode, {}).get("name", current_mode)

    settings_text = (
        "⚙️ **Bot Settings:**\n\n"
        f"🎭 Current Mode: {mode_name}\n"
        f"💬 History Length: {MAX_HISTORY_MESSAGES} messages\n"
        f"🤖 AI Model: Llama 3.1 (Groq)\n"
    )

    keyboard = [
        [InlineKeyboardButton("🎭 Change Mode", callback_data="menu_personality")],
        [InlineKeyboardButton("⚡ Change Feature", callback_data="menu_features")],
        [InlineKeyboardButton("🗑 Clear History", callback_data="action_clear_history")],
        [InlineKeyboardButton("⚙️ Set Custom Prompt", callback_data="action_custom_prompt")],
        [InlineKeyboardButton("🔙 Main Menu", callback_data="menu_main")],
    ]
    await context.bot.send_message(chat_id=chat_id, text=settings_text, parse_mode="Markdown",
                                   reply_markup=InlineKeyboardMarkup(keyboard))


async def custom_mode_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    await set_user_mode(user_id, "custom")
    context.user_data["awaiting_custom_prompt"] = True
    await update.message.reply_text(
        "⚙️ **Custom Mode Activated!**\n\n"
        "Send me your custom system prompt now.\n"
        "This will define how the AI behaves and responds.\n\n"
        "Example: _You are a pirate who speaks in old English..._",
        parse_mode="Markdown"
    )


# ==================== CALLBACK QUERY HANDLERS ====================

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    user_id = update.effective_user.id
    data = query.data

    if data == "menu_main":
        keyboard = [
            [InlineKeyboardButton("🎭 Personality Modes", callback_data="menu_personality"),
             InlineKeyboardButton("⚡ Features", callback_data="menu_features")],
            [InlineKeyboardButton("⚙️ Settings", callback_data="menu_settings"),
             InlineKeyboardButton("❓ Help", callback_data="menu_help")],
        ]
        await query.edit_message_text(
            "🏠 **Main Menu**\n\nChoose an option:",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )

    elif data == "menu_personality":
        buttons = []
        for mode_key, mode_info in PERSONALITY_MODES.items():
            buttons.append(InlineKeyboardButton(mode_info["name"], callback_data=f"set_mode_{mode_key}"))
        keyboard = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
        keyboard.append([InlineKeyboardButton("🔙 Back", callback_data="menu_main")])
        await query.edit_message_text(
            "🎭 **Personality Modes:**\n\nChoose a personality for the AI:",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )

    elif data == "menu_features":
        buttons = []
        for feat_key, feat_info in FEATURE_MODES.items():
            buttons.append(InlineKeyboardButton(feat_info["name"], callback_data=f"set_feat_{feat_key}"))
        keyboard = [buttons[i:i + 2] for i in range(0, len(buttons), 2)]
        keyboard.append([InlineKeyboardButton("🔙 Back", callback_data="menu_main")])
        await query.edit_message_text(
            "⚡ **Feature Modes:**\n\nChoose a special capability:",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )

    elif data == "menu_settings":
        keyboard = [
            [InlineKeyboardButton("🎭 Change Mode", callback_data="menu_personality")],
            [InlineKeyboardButton("⚡ Change Feature", callback_data="menu_features")],
            [InlineKeyboardButton("🗑 Clear History", callback_data="action_clear_history")],
            [InlineKeyboardButton("⚙️ Set Custom Prompt", callback_data="action_custom_prompt")],
            [InlineKeyboardButton("🔙 Main Menu", callback_data="menu_main")],
        ]
        user_settings = await get_user_settings(user_id)
        current_mode = user_settings.get("current_mode", DEFAULT_MODE) if user_settings else DEFAULT_MODE
        all_modes = {**PERSONALITY_MODES, **FEATURE_MODES}
        mode_name = all_modes.get(current_mode, {}).get("name", current_mode)
        await query.edit_message_text(
            f"⚙️ **Settings**\n\n🎯 Current: {mode_name}\n💬 History: {MAX_HISTORY_MESSAGES} msgs\n🤖 Model: Llama 3.1",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )

    elif data == "menu_help":
        help_text = "📚 **Quick Help:**\n\nJust type any message and I'll respond in the current mode.\n\nUse /start for main menu.\nUse buttons to switch modes."
        keyboard = [[InlineKeyboardButton("🔙 Main Menu", callback_data="menu_main")]]
        await query.edit_message_text(help_text, reply_markup=InlineKeyboardMarkup(keyboard), parse_mode="Markdown")

    elif data.startswith("set_mode_"):
        mode_key = data.replace("set_mode_", "")
        if mode_key in PERSONALITY_MODES:
            await set_user_mode(user_id, mode_key)
            if context.user_data.get("awaiting_custom_prompt"):
                del context.user_data["awaiting_custom_prompt"]
            mode_info = PERSONALITY_MODES[mode_key]
            keyboard = [[InlineKeyboardButton("🔙 Modes", callback_data="menu_personality"),
                         InlineKeyboardButton("🏠 Menu", callback_data="menu_main")]]
            await query.edit_message_text(
                f"✅ Switched to {mode_info['name']} mode!\n\n📝 {mode_info['description']}\n\nNow just send me a message!",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode="Markdown"
            )

    elif data.startswith("set_feat_"):
        feat_key = data.replace("set_feat_", "")
        if feat_key in FEATURE_MODES:
            await set_user_mode(user_id, feat_key)
            if context.user_data.get("awaiting_custom_prompt"):
                del context.user_data["awaiting_custom_prompt"]
            feat_info = FEATURE_MODES[feat_key]
            keyboard = [[InlineKeyboardButton("🔙 Features", callback_data="menu_features"),
                         InlineKeyboardButton("🏠 Menu", callback_data="menu_main")]]
            await query.edit_message_text(
                f"✅ Activated {feat_info['name']}!\n\n📝 {feat_info['description']}\n\nNow send me what you need!",
                reply_markup=InlineKeyboardMarkup(keyboard),
                parse_mode="Markdown"
            )

    elif data == "action_clear_history":
        await clear_chat_history(user_id)
        keyboard = [[InlineKeyboardButton("🔙 Settings", callback_data="menu_settings"),
                     InlineKeyboardButton("🏠 Menu", callback_data="menu_main")]]
        await query.edit_message_text(
            "🗑 **Chat history cleared!** Fresh start.",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )

    elif data == "action_custom_prompt":
        await set_user_mode(user_id, "custom")
        context.user_data["awaiting_custom_prompt"] = True
        keyboard = [[InlineKeyboardButton("❌ Cancel", callback_data="menu_main")]]
        await query.edit_message_text(
            "⚙️ **Custom Mode Activated!**\n\nSend me your custom system prompt now.\n\n"
            "Example: _You are a pirate who speaks in old English..._",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )


# ==================== MESSAGE HANDLER ====================

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = update.effective_user.id
    user_message = update.message.text

    user_settings = await get_user_settings(user_id)
    if not user_settings:
        await set_user_mode(user_id, DEFAULT_MODE)
        user_settings = {"current_mode": DEFAULT_MODE, "custom_prompt": None}

    current_mode_key = user_settings.get("current_mode", DEFAULT_MODE)

    # Check if we are awaiting a custom prompt input
    if context.user_data.get("awaiting_custom_prompt") and current_mode_key == "custom":
        custom_prompt = user_message
        await set_custom_prompt(user_id, custom_prompt)
        del context.user_data["awaiting_custom_prompt"]
        keyboard = [[InlineKeyboardButton("🏠 Menu", callback_data="menu_main")]]
        await update.message.reply_text(
            f"✅ **Custom prompt set!**\n\n📝 Prompt: _{custom_prompt}_\n\nNow just chat with me!",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
        return

    # Add user message to history
    await add_message_to_history(user_id, "user", user_message)

    # Get system prompt based on current mode
    all_modes = {**PERSONALITY_MODES, **FEATURE_MODES}
    if current_mode_key in all_modes:
        system_prompt = all_modes[current_mode_key]["prompt"]
    else:
        system_prompt = PERSONALITY_MODES[DEFAULT_MODE]["prompt"]

    if current_mode_key == "custom" and user_settings.get("custom_prompt"):
        system_prompt = user_settings["custom_prompt"]

    chat_history = await get_chat_history(user_id)

    # Construct messages for the AI
    messages = [{"role": "system", "content": system_prompt}]
    for role, content in chat_history:
        messages.append({"role": role, "content": content})

    try:
        # Send typing action
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        ai_response = await groq_api.generate_text(messages)
        await update.message.reply_text(ai_response)
        await add_message_to_history(user_id, "assistant", ai_response)
    except Exception as e:
        logger.error(f"Error generating AI response: {e}")
        keyboard = [[InlineKeyboardButton("🔄 Retry", callback_data="menu_main")]]
        await update.message.reply_text(
            "❌ Sorry, I encountered an error. Please try again.",
            reply_markup=InlineKeyboardMarkup(keyboard)
        )


# ==================== FEATURE COMMAND HANDLERS ====================

def make_feature_handler(feat_key):
    async def handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        user_id = update.effective_user.id
        await set_user_mode(user_id, feat_key)
        if context.user_data.get("awaiting_custom_prompt"):
            del context.user_data["awaiting_custom_prompt"]
        feat_info = FEATURE_MODES[feat_key]
        keyboard = [[InlineKeyboardButton("⚡ Features", callback_data="menu_features"),
                     InlineKeyboardButton("🏠 Menu", callback_data="menu_main")]]
        await update.message.reply_text(
            f"✅ Activated {feat_info['name']}!\n\n📝 {feat_info['description']}\n\nSend me what you need!",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )
    return handler


def make_mode_handler(mode_key):
    async def handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        user_id = update.effective_user.id
        await set_user_mode(user_id, mode_key)
        if context.user_data.get("awaiting_custom_prompt"):
            del context.user_data["awaiting_custom_prompt"]
        mode_info = PERSONALITY_MODES[mode_key]
        keyboard = [[InlineKeyboardButton("🎭 Modes", callback_data="menu_personality"),
                     InlineKeyboardButton("🏠 Menu", callback_data="menu_main")]]
        await update.message.reply_text(
            f"✅ Switched to {mode_info['name']} mode!\n\n📝 {mode_info['description']}\n\nNow just send me a message!",
            reply_markup=InlineKeyboardMarkup(keyboard),
            parse_mode="Markdown"
        )
    return handler


# ==================== MAIN ====================

def main() -> None:
    asyncio.new_event_loop().run_until_complete(init_db())

    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Command handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("reset", reset_command))
    application.add_handler(CommandHandler("mode", mode_command))
    application.add_handler(CommandHandler("custom", custom_mode_start))
    application.add_handler(CommandHandler("settings", settings_command))

    # Dynamic personality mode command handlers
    for mode_key in PERSONALITY_MODES.keys():
        if mode_key != "custom":
            application.add_handler(CommandHandler(mode_key, make_mode_handler(mode_key)))

    # Dynamic feature mode command handlers
    for feat_key in FEATURE_MODES.keys():
        application.add_handler(CommandHandler(feat_key, make_feature_handler(feat_key)))

    # Callback query handler for all buttons
    application.add_handler(CallbackQueryHandler(handle_callback))

    # Message handler
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("NexaGen AI Bot started polling...")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
