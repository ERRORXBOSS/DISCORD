const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const express = require('express');
require('dotenv').config();

// Express server for 24/7 uptime on Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`Web server is listening on port ${PORT}`));

// Initialize Discord Client with required Intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize DisTube
const distube = new DisTube(client, {
    plugins: [new YtDlpPlugin()],
    emitNewSongOnly: true,
    leaveOnEmpty: true,
    leaveOnFinish: false,
});

client.once('ready', () => {
    console.log(`Logged in successfully as ${client.user.tag}!`);
});

// Message command handler for !play
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!play')) return;

    const args = message.content.split(' ');
    const query = args[1];

    if (!query) {
        return message.reply('দয়া করে একটি ইউটিউব লিংক দিন! যেমন: `!play [URL]`');
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        return message.reply('প্রথমে আপনাকে একটি ভয়েস চ্যানেলে যুক্ত হতে হবে!');
    }

    try {
        await distube.play(voiceChannel, query, {
            textChannel: message.channel,
            member: message.member,
        });
        message.reply('🎵 গান প্লে করা শুরু হচ্ছে...');
    } catch (error) {
        console.error(error);
        message.reply(`গান প্লে করতে সমস্যা হয়েছে: ${error.message}`);
    }
});

// Login to Discord using TOKEN from Environment Variables
client.login(process.env.TOKEN);