const Discord = require('discord.js');
const tokens = require('./tokens');

const client = new Discord.Client();
client.login(tokens.discordToken);
exports.bot = (client);
