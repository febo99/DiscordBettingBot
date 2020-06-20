/* eslint-disable no-nested-ternary */
const tiny = require('tiny-json-http');
const client = require('../bot').bot;
const config = require('./configFunctions');
const { msgGetter, editRecord, editStatus } = require('./utils');
const PrematchPick = require('../models/prematchPick');
const link = require('../tokens').url;

const questions = ['MATCH', 'LEAGUE', 'PICK', 'DESCRIPTION', 'ODDS', 'STAKE'];
let answers = [];

class Match {
  constructor(host, away, country, league, bets) {
    this.host = host;
    this.away = away;
    this.country = country;
    this.league = league;
    this.bets = bets;
  }

  addBet = (b) => {
    this.bets.push(b);
  }
}

/** TO-DO
 * update command for updating specific user's record
 * match picking system(list of countries, matches and picks)
 * better logging system(Logger or smth)
 */

const getCountry = async (msg, countries) => {
  console.log(msg, countries);
};

const updatePick = async (userID, record, newStatus, msgID) => {
  const channelID = await config.getChannelID('prematch');
  const channel = await client.channels.fetch(channelID.channelID);
  const msgs = await msgGetter(channel);
  msgs.forEach(async (item) => {
    const msgArray = item.content.split('|');
    if (msgArray.length > 8) {
      const msg0 = msgArray[0].toString().replace('<@', '').replace('>', '').trim();
      if (msg0 === userID.toString()) {
        let editedMsg = editRecord(msgArray, record, 1);
        if (item.id === msgID) {
          editedMsg = editStatus(editedMsg.split('|'), newStatus, 8);
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
  const userPicks = await PrematchPick.find({ user: id }, async (data, err) => {
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


const getMatches = async () => {
  const matches = [];
  const countries = [];
  const result = await tiny.get({ url: link });
  const data = result.body.rs;
  let foundLeauge = false;
  data.forEach((item) => {
    if (item.status === 'NS') { // if match hasn't started yet
      console.log(item.league.fn);
      const match = new Match(item.host, item.guest, item.league.cn, item.league.fn);
      matches.push(match);
      let found = false;
      countries.forEach((c) => {
        if (c.country === item.league.cn) { // find a proper country
          found = true;
          if (c.leagues.length === 0) { // if leagues array is empty
            console.log(`First item in leagues ${item.league.fn}`);
            c.leagues.push(item.league.fn);
          } else {
            foundLeauge = false;
            c.leagues.forEach((l) => {
              if (l === item.league.fn) {
                foundLeauge = true;
                return -1;
              }
              return 1;
            });
            if (!foundLeauge) {
              console.log(`New league ${item.league.fn}`);
              c.leagues.push(item.league.fn);
            }
          }
        }
      });
      if (!found) {
        countries.push({ country: item.league.cn, leagues: [item.league.fn] });
        // if inserting brand new country we can safely add league
      }
    }
    // league.n => small name, league.fn => full name, league.cn => country
    // host, guest
    // rtime => start?
    // status => did it start already?
  });
  // console.log(countries);
  // console.log(countries);
  return { matches, countries };
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

exports.win = async (pickID, userID) => {
  await PrematchPick.findOneAndUpdate({ user: userID, id: pickID }, { status: 1 },
    async (data, err) => {
      const record = await getUserRecord(userID);
      await updatePick(userID, record, ':white_check_mark:', err.messageID);
      // console.log(data);
    });
};

exports.lose = async (pickID, userID) => {
  PrematchPick.findOneAndUpdate({ user: userID, id: pickID }, { status: 2 }, async (data, err) => {
    const record = await getUserRecord(userID);
    await updatePick(userID, record, ':x:', err.messageID);
    // console.log(data);
  });
};

exports.push = async (pickID, userID) => {
  PrematchPick.findOneAndUpdate({ user: userID, id: pickID }, { status: 3 }, async (data, err) => {
    const record = await getUserRecord(userID);
    await updatePick(userID, record, ':zero:', err.messageID);
    // console.log(data);
  });
};

exports.insertPick = async (msg, channel) => {
  const data = await getMatches();
  const { matches } = data;
  let { countries } = data;
  countries = countries.sort((a, b) => {
    const aS = a.country.toLowerCase();
    const bS = b.country.toLowerCase();
    if (aS === 'spain') return -1;
    if (aS === 'international') return -1;
    if (aS === 'italy') return -1;
    if (aS === 'france') return -1;
    if (aS === 'germany') return -1;
    if (aS === 'england') return -1;

    if (bS === 'spain') return 1;
    if (bS === 'international') return 1;
    if (bS === 'italy') return 1;
    if (bS === 'france') return 1;
    if (bS === 'germany') return 1;
    if (bS === 'england') return 1;

    return (aS > bS ? 1 : -1);
  });
  let listOfCountries = 'LIST OF COUNTRIES:\n';
  let lastIndex = 0;
  countries.forEach(async (item, index) => {
    listOfCountries += `${index + 1}. ${item.country}\n`;
    lastIndex = index + 1;
  });
  listOfCountries += `${lastIndex + 1}. Create your own pick\n`;
  const countryReply = await msg.author.send(listOfCountries);
  const filter = (m) => m.content.includes('') && m.author.id === msg.author.id;

  const countryCollector = countryReply.channel.createMessageCollector(filter,
    { max: 1, time: 30000 });

  let defaultPick = [];
  await countryCollector.on('collect', async (m) => {
    if (Number.isNaN(Number(m.content))) {
      msg.author.send('Your selection should be an integer!');
      return -1;
    }
    defaultPick.push(m.content);
    if (defaultPick <= 0 || defaultPick[0] > lastIndex + 1) {
      msg.author.send(`Your selection should be between 1 and ${lastIndex + 1}`);
      defaultPick = -1;
    }
  });
  await countryCollector.on('end', async (collected, reason) => {
    if (Number(defaultPick[0]) === countries.length + 1) { // if user selected custom option
      const record = await getUserRecord('110776620377231360');
      answers = [];
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
        const newPickMsg = await channel.send('Inserting your pick!');
        answers.push(collectedArray[collectedArray.length - 1].content);
        const [bet, league, betType, description, odds, stake] = answers;
        pick.bet = bet;
        pick.league = league;
        pick.betType = betType;
        pick.description = description;
        pick.odds = odds;
        pick.stake = stake;
        pick.messageID = newPickMsg.id;
        pick.user = msg.author.id;
        await pick.save((err, ret) => {
          if (err) {
            console.log(`Error with insertion! ${err}`);
            return err;
          }
          newPickMsg.edit(`<@${msg.author.id}> | ${record} | League: ${pick.league} | Match: ${pick.bet} | Pick: ${pick.betType} | Odds:
      ${pick.odds} | Stake: ${pick.stake} | Analysis: ${pick.description} | ${statusDecider(pick.status)} | ID: ${ret.id}`);
          return ret;
        });
      });
    } else {
      msg.author.send('Predefined matches!');
      const userPick = defaultPick[0] - 1;
      const { leagues } = countries[userPick];
      if (leagues.length === 0) {
        msg.author.send('No leagues were provided by API');
      } else {
        let leaguesMsg = '';
        leagues.forEach((item, index) => {
          leaguesMsg += `${index + 1}. ${item} \n`;
        });
        const leagueReply = await msg.author.send(leaguesMsg);
        const leagueCollector = leagueReply.channel.createMessageCollector(filter,
          { max: 1, time: 30000 });
        let userLeaguePick = [];
        await leagueCollector.on('collect', async (m3) => {
          const msgContent = Number(m3.content);
          userLeaguePick.push(msgContent);
          if (Number.isNaN(Number(msgContent))) {
            msg.author.send('This parameter must be a number!');
          } else if (msgContent <= 0 || msgContent > leagues.length) {
            msg.author.send(`League number must be between 1 and ${leagues.length - 1}`);
            userLeaguePick = -1;
          }
        });
        await leagueCollector.on('end', async () => {
          if (reason === 'time') {
            msg.author.send('You have 30 seconds to write your pick! Try again!');
            return;
          }
          let userMatches = '';
          let i = 1;
          matches.forEach((item) => {
            if (item.country === countries[userPick].country
               && item.league === countries[userPick].leagues[userLeaguePick[0] - 1]) {
              userMatches += `${i}. ${item.host.n} vs ${item.away.n} \n`;
              i += 1;
            }
          });
          const matchReply = await msg.author.send(userMatches);
          let matchPick = [];
          const matchCollector = matchReply.channel.createMessageCollector(filter,
            { max: 1, time: 30000 });
          await matchCollector.on('collect', async (m4) => {
            const msgContent = Number(m4.content);
            matchPick.push(msgContent);
            if (Number.isNaN(Number(msgContent))) {
              msg.author.send('This parameter must be a number!');
            } else if (msgContent <= 0 || msgContent > i) {
              msg.author.send(`League number must be between 1 and ${i}`);
              matchPick = -1;
            }
          });
          await matchCollector.on('end', async (reason) => {
            if (reason === 'time') {
              msg.author.send('You have 30 seconds to write your pick! Try again!');
            }
            matches.forEach(async (match) => {
              let k = 0;
              let selectedMatch;
              if (match.league === countries[userPick].leagues[userLeaguePick[0] - 1]
                && k === matchPick[0] - 1) {
                selectedMatch = match;
                const additionalInfo = await msg.author.send(`You selected: ${match.host.n} - ${match.away.n}`);
                const infoCollector = additionalInfo.channel.createMessageCollector(filter,
                  { max: 4, time: 30000 });
                await msg.author.send('PICK');
                const qs = ['ANALYSIS', 'STAKE', 'ODDS'];
                let c = 0;
                let info = [];
                info = [];
                await infoCollector.on('collect', async (m4) => {
                  info.push(m4.content);
                  if (c < qs.length) {
                    msg.author.send(qs[c]);
                    c += 1;
                  }
                });
                await infoCollector.on('end', async () => {
                  const pick = new PrematchPick({
                    _id: await nextSequence('pickid'),
                    bet: `${selectedMatch.host.n} - ${selectedMatch.away.n}`,
                    user: msg.author.id,
                    betType: info[0],
                    description: info[1],
                    league: selectedMatch.league,
                    odds: info[2],
                    stake: info[3],
                    status: 0,
                  });
                  const newPickMsg = await channel.send('Inserting your pick!');
                  const nRecord = await getUserRecord(msg.author.id);
                  await pick.save((err, ret) => {
                    if (err) {
                      console.log(`Error with insertion! ${err}`);
                      return err;
                    }
                    newPickMsg.edit(`<@${msg.author.id}> | ${nRecord} | League: ${pick.league} | Match: ${pick.bet} | Pick: ${pick.betType} | Odds:
                ${pick.odds} | Stake: ${pick.stake} | Analysis: ${pick.description} | ${statusDecider(pick.status)} | ID: ${ret.id}`);
                    return ret;
                  });
                });
              } else {
                k += 1;
              }
            });
          });
        });
      }
    }
  });
};
