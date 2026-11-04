const { Client, GatewayIntentBits } = require('discord.js');
const { DisTube } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const express = require('express');
require('dotenv').config();

// Simple Express server to keep the bot alive on cloud hosting
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Music bot is running 24/7!');
});

app.listen(PORT, () => {
    console.log(`Web server is listening on port ${PORT}`);
});

// Initialize Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Initialize DisTube Music Player with YtDlpPlugin for playing links
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    savePreviousSongs: true,
    plugins: [new YtDlpPlugin()]
});

client.once('ready', () => {
    console.log(`Logged in successfully as ${client.user.tag}!`);
});

// Bot Commands Handler
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const voiceChannel = message.member?.voice?.channel;

    if (command === 'play') {
        if (!voiceChannel) {
            return message.reply('You need to join a voice channel first!');
        }
        const query = args.join(' ');
        if (!query) {
            return message.reply('Please provide a song name or a URL!');
        }
        distube.play(voiceChannel, query, {
            textChannel: message.channel,
            member: message.member,
        });
    }

    if (command === 'stop') {
        if (!voiceChannel) {
            return message.reply('You need to join a voice channel first!');
        }
        const queue = distube.getQueue(message);
        if (!queue) {
            return message.reply('There is nothing playing right now!');
        }
        distube.stop(message);
        message.reply('Stopped the music and cleared the queue!');
    }

    if (command === 'skip') {
        if (!voiceChannel) {
            return message.reply('You need to join a voice channel first!');
        }
        const queue = distube.getQueue(message);
        if (!queue) {
            return message.reply('There is nothing playing right now!');
        }
        try {
            await distube.skip(message);
            message.reply('Skipped to the next song!');
        } catch (error) {
            message.reply('No more songs left in the queue!');
        }
    }

    if (command === 'queue') {
        const queue = distube.getQueue(message);
        if (!queue) {
            return message.reply('There is nothing playing right now!');
        }
        const q = queue.songs.map((song, i) => `${i === 0 ? '▶ Playing:' : `${i}.`} ${song.name} - \`${song.formattedDuration}\``).join('\n');
        message.reply(`**Current Queue:**\n${q}`);
    }
});

// DisTube Event Listeners
distube
    .on('playSong', (queue, song) => 
        queue.textChannel.send(`Playing \`${song.name}\` - \`${song.formattedDuration}\` requested by ${song.user}`)
    )
    .on('addSong', (queue, song) => 
        queue.textChannel.send(`Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`)
    )
    .on('error', (channel, error) => {
        console.error(error);
        if (channel) channel.send(`An error encountered: ${error.toString().slice(0, 1900)}`);
    });

client.login(process.env.TOKEN);