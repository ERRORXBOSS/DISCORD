const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const express = require('express');
const fs = require('fs');
require('dotenv').config();

// Fixed Netscape Cookie File with proper tab separation
const cookieData = `# Netscape HTTP Cookie File
# https://curl.haxx.se/rfc/cookie_spec.html
.youtube.com	TRUE	/	TRUE	1825333474	__Secure-1PSIDTS	sidts-CjYBnJZzajKW5HHHwJZsafOvhYHQL-FeQ76C-a9ocgG0Z5P4FkAliEjsZEhEZeWepjLQJfN4LP4QAA
.youtube.com	TRUE	/	TRUE	1793798074	__Secure-1PSIDRTS	sidts-CjYBnJZzajKW5HHHwJZsafOvhYHQL-FeQ76C-a9ocgG0Z5P4FkAliEjsZEhEZeWepjLQJfN4LP4QAA
.youtube.com	TRUE	/	TRUE	1825333474	__Secure-3PSIDTS	sidts-CjYBnJZzajKW5HHHwJZsafOvhYHQL-FeQ76C-a9ocgG0Z5P4FkAliEjsZEhEZeWepjLQJfN4LP4QAA
.youtube.com	TRUE	/	TRUE	1793798074	__Secure-3PSIDRTS	sidts-CjYBnJZzajKW5HHHwJZsafOvhYHQL-FeQ76C-a9ocgG0Z5P4FkAliEjsZEhEZeWepjLQJfN4LP4QAA
.youtube.com	TRUE	/	TRUE	1793799275	GPS	1
.youtube.com	TRUE	/	TRUE	1828357477	PREF	f6=40000000&tz=Asia.Dhaka
.youtube.com	TRUE	/	TRUE	1809349475	__Secure-YNID	CtkBCAUSiwEBDB6PDG4Z6CKM3E73kTopEcwdqx9Iq00_4FKc6OYroZ4v8L9JxTKksZ07D_ci3F1NpwiT01NVv5GaAFg9K8c_uR_V2GanNigCgU1UgrIyq8z29dUxN71i7dWzBPEssmNfMQmSAg_xAJh087IJaKcMCgYFZFEkZz_zLFfjMjlozqg0yqHV8ekp3mf8KAUyRQEcWPVq_0L29tf1athClefl4zu0hlFmhpyoyoMAr7Kqf8OY4UFYXbLPCcXzzOLlVHaffCsuPCqcU9SgjG7XXcsTEACIBQ
.youtube.com	TRUE	/	TRUE	0	YSC	PCrzAAaN0Vk
.youtube.com	TRUE	/	TRUE	1809349477	VISITOR_INFO1_LIVE	XISzIxcXHao
.youtube.com	TRUE	/	TRUE	1809349477	VISITOR_PRIVACY_METADATA	CgJCRBIEGgAgGA%3D%3D
.youtube.com	TRUE	/	TRUE	1809349475	__Secure-ROLLOUT_TOKEN	CK3wtJ7QlYbxrAEQr4e2sLDulwMYhPnXsLDulwM%3D`;

fs.writeFileSync('./cookies.txt', cookieData);

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

// Initialize DisTube with cookies and auto-update
const distube = new DisTube(client, {
    plugins: [
        new YtDlpPlugin({
            cookies: './cookies.txt',
            update: true,
        }),
    ],
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

    const args = message.content.trim().split(/ +/);
    const query = args.slice(1).join(' ');

    if (!query) {
        return message.reply('Please provide a valid YouTube URL!');
    }

    const voiceChannel = message.member?.voice?.channel;
    if (!voiceChannel) {
        return message.reply('You need to join a voice channel first!');
    }

    try {
        await distube.play(voiceChannel, query, {
            textChannel: message.channel,
            member: message.member,
        });
    } catch (error) {
        console.error(error);
        message.reply(`Error playing song: ${error.message}`);
    }
});

// Login to Discord using TOKEN from Environment Variables
client.login(process.env.TOKEN);