import {run} from '@grammyjs/runner';
import {Injectable, Logger, OnModuleInit} from '@nestjs/common';
import {Bot, webhookCallback} from 'grammy';

import {AgentService} from '../modules/agent/agent.service';
import {ChatService} from '../modules/chat/chat.service';
import {SettingsService} from '../modules/settings/settings.service';
import {UserService} from '../modules/user/user.service';

import axios from 'axios';
import {BotService} from './bot.service';
import {WhisperService} from './whisper.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
    private readonly logger = new Logger(TelegramBotService.name);
    bot: Bot;

    constructor(
        private readonly botService: BotService,
        private readonly chatService: ChatService,
        private readonly userService: UserService,
        private readonly settingsService: SettingsService,
        private readonly agentService: AgentService,
        private readonly whisperService: WhisperService,
    ) {
        this.bot = this.botService.bot;
    }

    async onModuleInit(): Promise<void> {
        const settings = this.settingsService.getSettings();
        const isLocal = settings.env.isLocal;
        this.registerCommands();
        this.onTextMessage();

        // if (isLocal) {
        //   await this.bot.api.deleteWebhook();
        //   run(this.bot);
        // } else {
        //   const endpoint = `${settings.app.url}/api/telegram`;
        //   const url = `https://api.telegram.org/bot${settings.keys.telegramBotToken}/setWebhook?url=${endpoint}`;
        // }

        // const endpoint = `${settings.app.url}/api/telegram`;
        // const url = `https://api.telegram.org/bot${settings.keys.telegramBotToken}/setWebhook?url=${endpoint}`;

        if (!isLocal) {
            await this.bot.api.deleteWebhook();
            // await this.bot.api.setWebhook(url);
            run(this.bot);

            await this.bot.api.sendMessage(493516212, 'Telegram bot is running');
            // await this.bot.api.sendMessage(493516212, 'Telegram bot is running');
        }
    }

    public async registerCommands(): Promise<void> {
        this.bot.command('start', (ctx) => ctx.reply('Welcome to Blockchain Agent!'));
        this.bot.command('last_tool', async (ctx) => {
            const userId = ctx.from?.id.toString();
            if (!userId) {
                return;
            }
            const response = await this.sendMessageToAgent(userId, 'What tool and arguments did you use to get this data?');
            ctx.reply(response, {parse_mode: 'Markdown'});
        });
    }

    public async onTextMessage(): Promise<void> {
        this.bot.on('message:text', async (ctx) => {
            this.logger.log(`HANDLING TEXT MESSAGE FROM ${ctx.message.from.username}`);
            if (!ctx?.message?.from?.id) {
                this.logger.error('No user id found');
                return;
            }
            const telegramId = ctx.message.from.id.toString();
            const message = ctx.message.text;

            try {
                const user = await this.userService.getInitUserTelegram(telegramId);
                const response = await this.agentService.run(user!.id, message, {
                    userId: user!.id,
                });
                await ctx.reply(response, {parse_mode: 'Markdown'});
            } catch (error) {
                this.logger.error('Error on text message:', error);
                await this.botService.sendMessage(
                    telegramId,
                    'An error occurred while processing your message. Please try again later.',
                );
            }
        });

        this.bot.on('message:voice', async (ctx) => {
            this.logger.log(`Received voice message from ${ctx.message.from?.username}`);

            const fileId = ctx.message.voice.file_id;
            const file = await this.bot.api.getFile(fileId);
            const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
            const telegramId = ctx.message.from.id.toString();

            try {
                const user = await this.userService.getInitUserTelegram(telegramId);
                const answer = await axios.get(fileUrl, {responseType: 'arraybuffer'});
                const transcription = await this.whisperService.transcribeOggFile(answer.data);
                const response = await this.agentService.run(user!.id, transcription, {
                    userId: user!.id,
                });
                await ctx.reply(response, {parse_mode: 'Markdown'});
            } catch (err) {
                this.logger.error('Voice transcription failed', err);
                await ctx.reply('⚠️ Sorry, failed to transcribe your voice message.');
            }
        });

    }

    private async sendMessageToAgent(telegramId: string, message: string): Promise<string> {
        // bot is typing...
        await this.botService.sendChatAction(telegramId, 'typing');

        const user = await this.userService.getInitUserTelegram(telegramId);
        const response = await this.agentService.run(user!.id, message, {
            userId: user!.id,
        });
        return response;
    }

    async getWebhookCallback(): Promise<any> {
        return webhookCallback(this.bot, 'express'); // Use 'express' for NestJS
    }
}
