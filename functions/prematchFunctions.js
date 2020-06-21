/* eslint-disable prefer-const */
/* eslint-disable no-nested-ternary */
const tiny = require('tiny-json-http');
const client = require('../bot').bot;
const config = require('./configFunctions');
const { msgGetter, editRecord, editStatus } = require('./utils');
const PrematchPick = require('../models/prematchPick');
const link = require('../tokens').url;

const questions = ['LEAGUE', 'MATCH', 'PICK', 'DESCRIPTION', 'ODDS', 'STAKE'];
let filteredMatches = '';

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

const sortCountries = (countries) => {
  const sorted = countries.sort((a, b) => {
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
  return sorted;
};

const getCountryLeagues = (country) => {
  let output = 'LEAGUES: \n';
  (country.leagues).forEach((item, index) => {
    output += `${index + 1}. ${item} \n`;
  });
  return output;
};

const oddsStakeFilter = (input) => {
  const value = input.replace(',', '.');
  if (Number.isNaN(Number(value))) return false;
  return true;
};

const getMatches = async () => {
  const matches = [];
  const countries = [];
  const result = await tiny.get({ url: link });
  const data = result.body.rs;
  let foundLeauge = false;
  data.forEach((item) => {
    if (item.status === 'NS') { // if match hasn't started yet
      const match = new Match(item.host, item.guest, item.league.cn, item.league.fn);
      matches.push(match);
      let found = false;
      countries.forEach((c) => {
        if (c.country === item.league.cn) { // find a proper country
          found = true;
          if (c.leagues.length === 0) { // if leagues array is empty
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
  countries = sortCountries(countries);
  let listOfCountries = 'LIST OF COUNTRIES:\n';
  let lastIndex = 0;
  let inputCounter = 0;
  let customInput = false;
  let switchInput = false;
  let userInput;
  userInput = [];
  // TO-DO: Error handling if string is longer than 2000 chars
  countries.forEach(async (item, index) => { // concatenate all countries to one string
    listOfCountries += `${index + 1}. ${item.country}\n`;
    lastIndex = index + 1;
  });

  listOfCountries += `${lastIndex + 1}. Create your own pick\n`;
  const reply = await msg.author.send(listOfCountries);
  const filter = (m) => m.content.includes('') && m.author.id === msg.author.id;

  const answersCollector = reply.channel.createMessageCollector(filter,
    { max: 7, time: 150000 });

  answersCollector.on('collect', async (m) => {
    if (customInput) {
      if (inputCounter === 2 && switchInput) {
        const select = Number(m.content);
        if (select <= 0 || select > filteredMatches.length + 1) {
          msg.author.send(`Please select an item from a list(Between 1 and ${filteredMatches.length + 1})`);
          answersCollector.stop();
          return -1;
        }
        const selectedMatch = filteredMatches[select - 1];
        userInput.push(`${selectedMatch.host.n} - ${selectedMatch.away.n}`);
      } else if (inputCounter === 5 || inputCounter === 6) {
        if (oddsStakeFilter(m.content)) {
          userInput.push(m.content);
        } else {
          msg.author.send('Odds/stake must be a number!');
          answersCollector.stop();
          return -1;
        }
      } else {
        userInput.push(m.content);
      }
      if (inputCounter < questions.length)msg.author.send(`${questions[inputCounter]}`);
    } else if (inputCounter === 0 && !customInput) {
      const userSelection = Number(m.content);
      if (Number.isNaN(userSelection)) {
        msg.author.send(`Please select an item from a list(Between 1 and ${countries.length + 1})`);
        answersCollector.stop();
        return -1;
      }
      if (userSelection <= 0 || userSelection > countries.length + 1) {
        msg.author.send(`Please select an item from a list(Between 1 and ${countries.length + 1})`);
        answersCollector.stop();
      }
      if (userSelection === countries.length + 1) {
        customInput = true;
        userInput.push(userSelection);
        msg.author.send(`${questions[inputCounter]}`);
        inputCounter += 1;
        return -1;
      }
      const leagues = getCountryLeagues(countries[userSelection - 1]);
      userInput.push(userSelection);
      msg.author.send(leagues);
    } else if (inputCounter === 1 && !customInput) {
      const userSelection = Number(m.content);
      const league = countries[userInput[0] - 1].leagues[userSelection - 1];
      userInput.push(league);
      filteredMatches = matches.filter((match) => match.league === league);
      let matchlist = 'MATCHES: \n';
      let counter = 1;
      filteredMatches.forEach((item) => {
        matchlist += `${counter}. ${item.host.n} - ${item.away.n} \n`;
        counter += 1;
      });
      msg.author.send(matchlist);
      customInput = true;
      switchInput = true;
    }
    inputCounter += 1;
    return 1;
  });

  answersCollector.on('end', async (collected, reason) => {
    if (reason === 'time') {
      msg.author.send('You ran out of time! Please try again!');
      return -1;
    }
    if (reason === 'user') {
      return -1;
    }
    const newPickMsg = await channel.send('Inserting your pick!');
    console.log(userInput);
    const pick = new PrematchPick({
      _id: await nextSequence('pickid'),
      bet: userInput[2],
      user: msg.author.id,
      betType: userInput[3],
      description: userInput[4],
      messageID: newPickMsg.id,
      league: userInput[1],
      odds: userInput[5],
      stake: userInput[6],
      status: 0,
    });
    const record = await getUserRecord(msg.author.id);
    await pick.save((err, ret) => {
      if (err) {
        console.log(`Error with insertion! ${err}`);
        msg.author.send('Your pick wasn\'t inserted correctly! Contact admin!');
        return err;
      }
      newPickMsg.edit(`<@${msg.author.id}> | ${record} | League: ${pick.league} | Match: ${pick.bet} | Pick: ${pick.betType} | Odds:
  ${pick.odds} | Stake: ${pick.stake} | Analysis: ${pick.description} | ${statusDecider(pick.status)} | ID: ${ret.id}`);
      return ret;
    });
    return 1;
  });
};
