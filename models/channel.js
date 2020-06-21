const mongoose = require('mongoose');

const { Schema } = mongoose;

const channelSchema = new Schema({
  channelID: String,
  channelName: String, // channelName can be PREMATCH or LIVE
});

module.exports = mongoose.model('channelsConfig', channelSchema);
