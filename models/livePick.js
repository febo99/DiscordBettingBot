const mongoose = require('mongoose');

const { Schema } = mongoose;

const liveSchema = new Schema({
  homeTeam: String,
  awayTeam: String,
  user: String,
  betType: String,
  odds: Number,
  stake: Number,
  status: Number,
});

module.exports = mongoose.model('livePick', liveSchema);
