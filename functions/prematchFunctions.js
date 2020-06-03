const Discord = require('discord.js');
const PrematchPick = require('../models/prematchPick');

const questions = ['MATCH', 'BET', 'DESCRIPTION', 'ODDS', 'STAKE'];

const inputFilter = (nr, input) => {
  switch (nr) {
    case 0: // first input is match
      return true;
    case 1: // second input is bet type
      return true;
    case 2: // third input is bet description
      if (input.len >= 1900) return false;
      break;
    case 3: // fourth input are odds
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(Number(input))) return false;
      break;
    case 4: // fifth input is stake
    // eslint-disable-next-line no-restricted-globals
      if (isNaN(Number(input))) return false;
      break;
    default:
      return false;
  }
  return true;
};
exports.insertPick = async (msg) => {
  const pick = new PrematchPick({
    bet: 'test',
    user: 'test',
    betType: 'test',
    description: 'test',
    odds: 2,
    stake: 2,
    status: 0,
  });
  console.log(msg.content);
  let numberOfReplies = 0;
  const reply = await msg.author.send(questions[numberOfReplies]);
  const filter = (m) => m.content.includes('') && m.author.id === msg.author.id;
  const collector = reply.channel.createMessageCollector(filter, { max: 5, time: 15000 });
  collector.on('collect', (m) => {
    if (m.content === 'stop' || m.content === 'STOP') {
      collector.stop('User ended');
      return;
    }
    console.log(`Collected ${m.content}`);
    if (!inputFilter(numberOfReplies, m.content)) {
      console.log('WRONG TYPE');
      return;
    }
    numberOfReplies += 1;
    msg.author.send(questions[numberOfReplies]);
  });
  collector.on('end', () => {
    console.log('END');
  });
  // await pick.save((err, ret) => {
  //   if (err) {
  //     console.log(`Error with insertion! ${err}`);
  //     return err;
  //   }
  //   return ret;
  // });
};
