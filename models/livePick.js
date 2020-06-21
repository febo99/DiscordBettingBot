const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const { Schema } = mongoose;

const liveSchema = new Schema({
  bet: String,
  user: String,
  messageID: String,
  betType: String,
  odds: Number,
  stake: Number,
  status: Number,
  seq: Number,
});

liveSchema.plugin(AutoIncrement, { inc_field: 'idL' });
module.exports = mongoose.model('livePick', liveSchema);
