/* eslint-disable no-param-reassign */
const Channel = require('../models/channel');
/** TO-DO
 * bot sends a message on error or success
 */

exports.changeChannel = async (type, id, msg) => {
  if (type.toLowerCase() === 'prematch' || type.toLowerCase() === 'live'
  || type.toLowerCase() === 'group1' || type.toLowerCase() === 'group2' || type.toLowerCase() === 'group3') {
    Channel.findOne({ channelName: type }, (err, ch) => {
      if (err) {
        console.log(`Didn't find a channel with this name! ${err}`);
        return err;
      }
      if (ch === null) ch = new Channel();
      ch.channelID = id;
      ch.channelName = ch.channelName || type;
      ch.save((err1, ret) => {
        if (err1) {
          msg.author.send(`Update of ${type} channel failed! Contact admin!`);
          return err1;
        }
        msg.author.send(`Succesfuly updated ${type} channel to ${ret.channelID}!`);
        return ret;
      });
      return ch;
    });
  }
};
exports.getChannelID = async (type) => Channel.findOne({ channelName: type }, async (err, id) => {
  if (err) {
    console.log(`Didn't find a channel with this name! ${err}`);
    return err;
  }
  return id;
});
