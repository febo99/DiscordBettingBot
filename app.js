const mongoose = require('mongoose');
const client = require('./bot').bot;
const tokens = require('./tokens');
const config = require('./functions/configFunctions');
const live = require('./functions/liveFunctions');
const prematch = require('./functions/prematchFunctions');

const mongoDB = tokens.database;
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false);
const db = mongoose.connection;


db.on('error', console.error.bind(console, 'MongoDB connection error:'));


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
    } else if (msg.content.startsWith(`${tokens.prefix}win`)) { // WIN
      const params = msg.content.split(' ');
      if (params.length !== 3) {
        msg.author.send(`${params[0]} command must be in this format: ${params[0]} p/l ID`);
        return;
      }
      if (params[1].toLowerCase() === 'p') { // PREMATCH WIN
        if (Number.isNaN(Number(params[2]))) {
          msg.author.send('Last parameter must be a integer!');
          return;
        }
        prematch.win(params[2], msg.author.id);
      } else if (params[1].toLowerCase() === 'l') { // LIVE WIN
        if (Number.isNaN(Number(params[2]))) {
          msg.author.send('Last parameter must be a integer!');
          return;
        }
        live.win(params[2], msg.author.id);
      } else {
        msg.author.send(`${params[0]} command must have either p or l as a second parameter!`);
      }
    } else if (msg.content.startsWith(`${tokens.prefix}lose`)) { // LOSE
      const params = msg.content.split(' ');
      if (params.length !== 3) {
        msg.author.send(`${params[0]} command must be in this format: ${params[0]} p/l ID`);
        return;
      }
      if (params[1].toLowerCase() === 'p') { // PREMATCH LOSE
        if (Number.isNaN(Number(params[2]))) {
          msg.author.send('Last parameter must be a integer!');
          return;
        }
        prematch.lose(params[2], msg.author.id);
      } else if (params[1].toLowerCase() === 'l') { // LIVE LOSE
        if (Number.isNaN(Number(params[2]))) {
          msg.author.send('Last parameter must be a integer!');
          return;
        }
        live.lose(params[2], msg.author.id);
      } else {
        msg.author.send(`${params[0]} command must have either p or l as a second parameter!`);
      }
    } else if (msg.content.startsWith(`${tokens.prefix}push`)) { // PUSH
      const params = msg.content.split(' ');
      if (params.length !== 3) {
        msg.author.send(`${params[0]} command must be in this format: ${params[0]} p/l ID`);
        return;
      }
      if (params[1].toLowerCase() === 'p') { // PREMATCH PUSH
        if (Number.isNaN(Number(params[2]))) {
          msg.author.send('Last parameter must be a integer!');
          return;
        }
        prematch.push(params[2], msg.author.id);
      } else if (params[1].toLowerCase() === 'l') { // LIVE PUSH
        if (Number.isNaN(Number(params[2]))) {
          msg.author.send('Last parameter must be a integer!');
          return;
        }
        live.push(params[2], msg.author.id);
      } else {
        msg.author.send(`${params[0]} command must have either p or l as a second parameter!`);
      }
    } else if (msg.content === `${tokens.prefix}live`) {
      live.insertPick(msg, chs.cache.get(liveID.channelID));
    } else if (msg.content === `${tokens.prefix}matches`) {
      prematch.getMatchList();
    } else if (msg.content.startsWith(`${tokens.prefix}config`)) {
      const params = msg.content.split(' ');
      if (params.length !== 3) {
        console.log('Too few parameters!');
        return;
      }
      await config.changeChannel(params[1], params[2], msg);
      // first parameter is prematch/live, second is the id of channel that you want to use

      if (params[1].toLowerCase() === 'live') liveID = config.getChannelID(params[1]);
      else if (params[1].toLowerCase() === 'prematch') prematchID = config.getChannelID(params[1]);
    }
  });
});
