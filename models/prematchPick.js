const mongoose = require('mongoose');

const { Schema } = mongoose;

const prematchSchema = new Schema({
  homeTeam: String,
  awayTeam: String,
  user: String,
  betType: String,
  description: String,
  odds: Number,
  stake: Number,
  status: Number,
});

module.exports = mongoose.model('prematchPick', prematchSchema);
