const Discord = require('discord.js');

const client = new Discord.Client();
const mongoose = require('mongoose');
const tokens = require('./tokens');
const config = require('./functions/configFunctions');
// const live = require('./functions/liveFunctions');
const prematch = require('./functions/prematchFunctions');

const mongoDB = tokens.database;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connection with db is working!');
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });

  client.on('message', (msg) => {
    if (msg.content === `${tokens.prefix}prematch`) {
      prematch.insertPick(msg);
    } else if (msg.content === `${tokens.prefix}live`) {
      msg.reply('Okej');
    } else if (msg.content.startsWith(`${tokens.prefix}config`)) {
      const params = msg.content.split(' ');
      if (params.length !== 3) {
        console.log('Too few parameters!');
        return;
      }
      config.changeChannel(params[1], params[2]);
    }
  });

  client.login(tokens.discordToken);
});
