const Discord = require('discord.js');
const PrematchPick = require('../models/prematchPick');

const questions = ['MATCH', 'BET', 'DESCRIPTION', 'ODDS', 'STAKE'];
const answers = [];

const nextSequence = (n) => {
  const ret = PrematchPick.findOneAndUpdate({
    query: { _id: n },
    update: { $inc: { seq: 1 } },
  });
  return ret.seq;
};
const inputFilter = (nr, input) => {
  switch (nr) {
    case 0: // first input is match
      return true;
    case 1: // second input is bet type
      return true;
    case 2: // third input is bet description
      if (input.len >= 1900) return false;
      return true;
    case 3: // fourth input are odds
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(Number(input))) return false;
      return true;
    case 4: // fifth input is stake
    // eslint-disable-next-line no-restricted-globals
      if (isNaN(Number(input))) return false;
      return true;
    default:
      return false;
  }
};
exports.insertPick = async (msg, channel) => {
  let outputString = '';
  const pick = new PrematchPick({
    _id: await nextSequence('pickid'),
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
  const collector = reply.channel.createMessageCollector(filter, { max: 5, time: 30000 });
  await collector.on('collect', async (m) => {
    const msgContent = await m.content;
    if (msgContent.toLowerCase() === 'stop') {
      collector.stop('User ended');
      return;
    }
    console.log(`Collected ${msgContent}`);
    if (!inputFilter(numberOfReplies, msgContent)) {
      console.log('WRONG TYPE');
      return;
    }
    outputString += msgContent;
    answers.push(m.content);
    if (numberOfReplies === 0) {
      msg.author.send(questions[numberOfReplies + 1]);
    } else if (numberOfReplies < questions.length - 1) {
      console.log(questions[numberOfReplies + 1]);
      msg.author.send(questions[numberOfReplies + 1]);
    }
    numberOfReplies += 1;
  });
  await collector.on('end', async () => {
    console.log('END', outputString);
    const [bet, betType, description, odds, stake] = answers;
    pick.bet = bet;
    pick.betType = betType;
    pick.description = description;
    pick.odds = odds;
    pick.stake = stake;

    await pick.save((err, ret) => {
      if (err) {
        console.log(`Error with insertion! ${err}`);
        return err;
      }
      return ret;
    });
  });
  // channel.send(outputString);
};
