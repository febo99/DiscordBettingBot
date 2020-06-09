const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const { Schema } = mongoose;

const prematchSchema = new Schema({
  bet: String,
  user: String,
  league: String,
  betType: String,
  description: String,
  odds: Number,
  stake: Number,
  status: Number,
  seq: Number,
});
prematchSchema.plugin(AutoIncrement, { inc_field: 'id' });
module.exports = mongoose.model('prematchPick', prematchSchema);
