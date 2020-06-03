const PrematchPick = require('../models/prematchPick');

exports.insertPick = async (msg) => {
  const pick = new PrematchPick({
    homeTeam: 'test',
    awayTeam: 'test',
    user: 'test',
    betType: 'test',
    description: 'test',
    odds: 2,
    stake: 2,
    status: 0,
  });
  console.log(msg.content);
  await pick.save((err, ret) => {
    if (err) {
      console.log(`Error with insertion! ${err}`);
      return err;
    }
    return ret;
  });
};
