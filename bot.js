const Discord = require('discord.js');

const client = new Discord.Client();
const mongoose = require('mongoose');
const AutoIncrementFactory = require('mongoose-sequence')(mongoose);
const tokens = require('./tokens');
const config = require('./functions/configFunctions');
// const live = require('./functions/liveFunctions');
const prematch = require('./functions/prematchFunctions');

const mongoDB = tokens.database;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false);
const db = mongoose.connection;


db.on('error', console.error.bind(console, 'MongoDB connection error:'));
client.login(tokens.discordToken);
db.once('open', async () => {
  console.log('Connection with db is working!');
  client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
  });
  client.on('message', async (msg) => {
    let liveID = await config.getChannelID('live');
    let prematchID = await config.getChannelID('prematch');
    const chs = await client.channels;
    if (msg.content === `${tokens.prefix}prematch`) {
      prematch.insertPick(msg, chs.cache.get(prematchID.channelID));
      console.log('jes');
    } else if (msg.content === `${tokens.prefix}live`) {
      msg.reply('Okej');
    } else if (msg.content === `${tokens.prefix}matches`) {
      prematch.getMatchList();
    } else if (msg.content.startsWith(`${tokens.prefix}config`)) {
      const params = msg.content.split(' ');
      if (params.length !== 3) {
        console.log('Too few parameters!');
        return;
      }
      await config.changeChannel(params[1], params[2]);
      // first parameter is prematch/live, second is the id of channel that you want to use

      if (params[1].toLowerCase() === 'live') liveID = config.getChannelID(params[1]);
      else if (params[1].toLowerCase() === 'prematch') prematchID = config.getChannelID(params[1]);
    }
  });
});
