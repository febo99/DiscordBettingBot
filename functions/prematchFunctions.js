const Discord = require('discord.js');
const ScoreBing = require('scorebing-api');
const PrematchPick = require('../models/prematchPick');

const questions = ['MATCH', 'LEAGUE', 'PICK', 'DESCRIPTION', 'ODDS', 'STAKE'];
const answers = [];

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
  const userPicks = await PrematchPick.find({ user: id }, async (data, err) => {
    if (err) return false;
    return data;
  });
  if (!userPicks) {
    console.log('Something went wrong!');
  } else {
    userPicks.forEach((item, index) => {
      console.log(item);
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
    const roi = (winnings / stake) * 100;
    const record = `Record: ${nrWins}W - ${nrLoss}L - ${nrPush}P, Winnings: ${winnings}, ROI: ${roi}`;
    console.log(record);
    return record;
  }
};

const getMatches = () => {
  const score = new ScoreBing();

  score.req(0).then((res) => {
    const data = res.rs;

    data.forEach((item, index) => {
      console.log(item);
      // league.n => small name, league.fn => full name, league.cn => country
      // host, guest
      // rtime => start?
      // status => did it start already?
    });
  });
};

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
    case 3: // fourth input is league
      return 3;
    case 4: // fifth input are odds
      // eslint-disable-next-line no-restricted-globals
      if (isNaN(Number(input))) return false;
      return true;
    case 5: // sixth input is stake
    // eslint-disable-next-line no-restricted-globals
      if (isNaN(Number(input))) return false;
      return true;
    default:
      return false;
  }
};
exports.getMatchList = async () => {
  getMatches();
};

exports.insertPick = async (msg, channel) => {
  const record = await getUserRecord('110776620377231360');
  let outputString = '';
  const pick = new PrematchPick({
    _id: await nextSequence('pickid'),
    bet: 'test',
    user: 'test',
    betType: 'test',
    description: 'test',
    league: 'test',
    odds: 2,
    stake: 2,
    status: 0,
  });

  // console.log(msg.content);
  let numberOfReplies = 0;
  const reply = await msg.author.send(questions[numberOfReplies]);
  const filter = (m) => m.content.includes('') && m.author.id === msg.author.id;
  const collector = reply.channel.createMessageCollector(filter, { max: 6, time: 30000 });
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
  await collector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      msg.author.send('You have 30 seconds to write your pick! Try again!');
      return;
    }
    const collectedArray = collected.array();
    answers.push(collectedArray[collectedArray.length - 1].content);
    const [bet, league, betType, description, odds, stake] = answers;
    pick.bet = bet;
    pick.league = league;
    pick.betType = betType;
    pick.description = description;
    pick.odds = odds;
    pick.stake = stake;
    pick.user = msg.author.id;

    await pick.save((err, ret) => {
      if (err) {
        console.log(`Error with insertion! ${err}`);
        return err;
      }
      channel.send(`<@${msg.author.id}> | ${record} | League: ${pick.league} | Match: ${pick.bet} | Pick: ${pick.betType} | Odds:
      ${pick.odds} | Stake: ${pick.stake} | Analysis: ${pick.description} | ${statusDecider(pick.status)} | ID: ${ret.id}`);
      return ret;
    });
  });
};