/* eslint-disable no-restricted-globals */
const ScoreBing = require('scorebing-api');
const client = require('../bot').bot;
const config = require('./configFunctions');
const { msgGetter, editRecord, editStatus } = require('./utils');
const LivePick = require('../models/livePick');

const questions = ['MATCH', 'PICK', 'ODDS', 'STAKE'];
let answers = [];

/** TO-DO
 * update command for updating specific user's record
 * match picking system(list of countries, matches and picks)
 * better logging system(Logger or smth)
 */

const updatePick = async (userID, record, newStatus, msgID) => {
  const channelID = await config.getChannelID('live');
  const channel = await client.channels.fetch(channelID.channelID);
  const msgs = await msgGetter(channel);
  msgs.forEach(async (item) => {
    const msgArray = item.content.split('|');
    if (msgArray.length > 6) {
      const msg0 = msgArray[0].toString().replace('<@', '').replace('>', '').trim();
      if (msg0 === userID.toString()) {
        let editedMsg = editRecord(msgArray, record, 1);
        if (item.id === msgID) {
          editedMsg = editStatus(editedMsg.split('|'), newStatus, 6);
        }
        await item.edit(editedMsg);
      }
    }
  });
};


const statusDecider = (nr) => {
  if (nr === 0) return ':clock:';
  if (nr === 1) return ':white_check_mark:';
  if (nr === 2) return ':x:';
  if (nr === 3) return ':zero:';
  return 'error';
};

const getUserRecord = async (id) => {
  let winnings = 0;
  let stake = 0;
  let nrWins = 0;
  let nrLoss = 0;
  let nrPush = 0;
  const userPicks = await LivePick.find({ user: id }, async (data, err) => {
    if (err) return false;
    return data;
  });
  if (!userPicks) {
    console.log('Something went wrong!');
  } else {
    userPicks.forEach((item) => {
      if (item.status === 1) {
        winnings += (item.odds * item.stake - item.stake);
        nrWins += 1;
        stake += item.stake;
      } else if (item.status === 2) {
        winnings -= (item.stake);
        nrLoss += 1;
        stake += item.stake;
      } else if (item.status === 3) {
        nrPush += 1;
      }
    });
    const roi = ((winnings / stake) * 100).toFixed(2);
    const record = `Record: ${nrWins}W - ${nrLoss}L - ${nrPush}P, Winnings: ${winnings}, ROI: ${roi}%`;
    return record;
  }
  return false;
};

const getMatches = () => {
  const score = new ScoreBing();

  score.req(0).then((res) => {
    const data = res.rs;

    data.forEach((item) => {
      console.log(item);
      // league.n => small name, league.fn => full name, league.cn => country
      // host, guest
      // rtime => start?
      // status => did it start already?
    });
  });
};

const nextSequence = (n) => {
  const ret = LivePick.findOneAndUpdate({
    query: { _id: n },
    update: { $inc: { seq: 1 } },
  });
  return ret.seq;
};
const inputFilter = (nr, input) => {
  switch (nr) {
    case 0: // bet
      return true;
    case 1: // pick
      return true;
    case 2: // odds
      if (isNaN(Number(input))) return false;
      return true;
    case 3: // stake
      if (isNaN(Number(input))) return false;
      return true;
    default:
      return false;
  }
};
exports.getMatchList = async () => {
  getMatches();
};

exports.win = async (pickID, userID) => {
  await LivePick.findOneAndUpdate({ user: userID, idL: pickID }, { status: 1 },
    async (data, err) => {
      const record = await getUserRecord(userID);
      await updatePick(userID, record, ':white_check_mark:', err.messageID);
    });
};

exports.lose = async (pickID, userID) => {
  LivePick.findOneAndUpdate({ user: userID, idL: pickID }, { status: 2 }, async (data, err) => {
    const record = await getUserRecord(userID);
    await updatePick(userID, record, ':x:', err.messageID);
    // console.log(data);
  });
};

exports.push = async (pickID, userID) => {
  LivePick.findOneAndUpdate({ user: userID, idL: pickID }, { status: 3 }, async (data, err) => {
    const record = await getUserRecord(userID);
    await updatePick(userID, record, ':zero:', err.messageID);
    // console.log(data);
  });
};

exports.insertPick = async (msg, channel) => {
  const record = await getUserRecord(msg.author.id);
  answers = [];
  const pick = new LivePick({
    _id: await nextSequence('idL'),
    bet: 'test',
    user: 'test',
    betType: 'test',
    odds: 2,
    stake: 2,
    status: 0,
  });

  // console.log(msg.content);
  let numberOfReplies = 0;
  const reply = await msg.author.send(questions[numberOfReplies]);
  const filter = (m) => m.content.includes('') && m.author.id === msg.author.id;
  const collector = reply.channel.createMessageCollector(filter, { max: 4, time: 30000 });
  await collector.on('collect', async (m) => {
    const msgContent = await m.content;
    if (msgContent.toLowerCase() === 'stop') {
      collector.stop('User ended');
      return;
    }
    // console.log(`Collected ${msgContent}`);
    if (!inputFilter(numberOfReplies, msgContent)) {
      // console.log('WRONG TYPE');
      msg.author.send('Your input was wrong! Check the description length and your format of odds/stake!');
      return;
    }
    answers.push(m.content);
    if (numberOfReplies === 0) {
      msg.author.send(questions[numberOfReplies + 1]);
    } else if (numberOfReplies < questions.length - 1) {
      msg.author.send(questions[numberOfReplies + 1]);
    }
    numberOfReplies += 1;
  });
  await collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      msg.author.send('You have 30 seconds to write your pick! Try again!');
      return;
    }
    const collectedArray = collected.array();
    const newPickMsg = await channel.send('Inserting your pick!');
    answers.push(collectedArray[collectedArray.length - 1].content);
    const [bet, betType, odds, stake] = answers;
    pick.bet = bet;
    pick.betType = betType;
    pick.odds = odds;
    pick.stake = stake;
    pick.messageID = newPickMsg.id;
    pick.user = msg.author.id;
    await pick.save((err, ret) => {
      if (err) {
        console.log(`Error with insertion! ${err}`);
        return err;
      }
      newPickMsg.edit(`<@${msg.author.id}> | ${record}  | Match: ${pick.bet} | Pick: ${pick.betType} | Odds:
      ${pick.odds} | Stake: ${pick.stake}  | ${statusDecider(pick.status)} | ID: ${ret.idL}`);
      return ret;
    });
  });
};
