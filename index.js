const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

// ---- YouTube cookies ----
// Cookies are read from the YT_COOKIES environment variable (never stored in code).
const COOKIE_PATH = './cookies.txt';
if (process.env.YT_COOKIES) {
    // Support both real newlines and "\n" escapes (Render/.env often store them as escapes)
    fs.writeFileSync(COOKIE_PATH, process.env.YT_COOKIES.replace(/\\n/g, '\n'));
    console.log('YouTube cookies loaded from environment.');
} else {
    console.warn('YT_COOKIES is not set. YouTube may return 429 (rate limit) errors.');
}

const pluginOptions = { update: true };
if (fs.existsSync(COOKIE_PATH)) pluginOptions.cookies = COOKIE_PATH;

// ---- Express server (keeps Render web service alive) ----
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Web server is listening on port ${PORT}`));

// ---- Discord client ----
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ---- DisTube ----
const distube = new DisTube(client, {
    plugins: [new YtDlpPlugin(pluginOptions)],
    emitNewSongOnly: true,
    leaveOnEmpty: true,
    leaveOnFinish: false,
});

// DisTube reports most playback errors through this event instead of throwing
distube.on('error', (error, queue) => {
    console.error('DisTube error:', error);
    const friendly = explainError(error);
    if (queue?.textChannel) queue.textChannel.send(`Error playing song: ${friendly}`).catch(() => {});
});

function explainError(error) {
    const msg = error?.message || String(error);
    if (msg.includes('429')) {
        return 'YouTube is rate-limiting this bot (429). Try again in a few minutes, or update the YT_COOKIES value.';
    }
    return msg;
}

// Retry a few times on 429, since it is often temporary
async function playWithRetry(voiceChannel, query, options, attempts = 3) {
    for (let i = 1; i <= attempts; i++) {
        try {
            return await distube.play(voiceChannel, query, options);
        } catch (error) {
            const isRateLimit = String(error.message).includes('429');
            if (!isRateLimit || i === attempts) throw error;
            console.warn(`429 from YouTube, retrying (${i}/${attempts})...`);
            await new Promise(r => setTimeout(r, 3000 * i));
        }
    }
}

client.once('ready', () => {
    console.log(`Logged in successfully as ${client.user.tag}!`);
});

// ---- !play command ----
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!play')) return;

    const args = message.content.trim().split(/ +/);
    const query = args.slice(1).join(' ');

    if (!query) {
        return message.reply('Please provide a YouTube URL or a song name. Example: `!play never gonna give you up`');
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        return message.reply('You need to join a voice channel first!');
    }

    try {
        await playWithRetry(voiceChannel, query, {
            textChannel: message.channel,
            member: message.member,
        });
    } catch (error) {
        console.error(error);
        message.reply(`Error playing song: ${explainError(error)}`);
    }
});

// ---- Login ----
if (!process.env.TOKEN) {
    console.error('TOKEN is missing. Set it in your environment variables.');
    process.exit(1);
}
client.login(process.env.TOKEN);
