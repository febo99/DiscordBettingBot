/* eslint-disable no-param-reassign */
const Channel = require('../models/channel');

exports.changeChannel = async (type, id) => {
  if (type.toLowerCase() === 'prematch' || type.toLowerCase() === 'live') {
    console.log(id);
    Channel.findOne({ channelName: type }, (err, ch) => {
      if (err) {
        console.log(`Didn't find a channel with this name! ${err}`);
        return err;
      }
      if (ch === null) ch = new Channel();
      ch.channelID = id;
      ch.channelName = ch.channelName || type;
      console.log();
      ch.save((err1, ret) => {
        if (err1) {
          console.log(`Error with insertion! ${err1}`);
          return err1;
        }
        return ret;
      });
      return ch;
    });
  }
};
