exports.msgGetter = async (channel, limit = 999999999) => {
  const allMsg = [];
  let lastID;
  while (true) {
    const options = { limit: 100 };
    if (lastID) {
      options.before = lastID;
    }

    // eslint-disable-next-line no-await-in-loop
    const msgs = await channel.messages.fetch(options);
    allMsg.push(...msgs.array());
    lastID = msgs.last().id;

    if (msgs.size !== 100 || allMsg.size >= limit) break;
  }
  return allMsg;
};
exports.editRecord = (msg, record, index) => {
  const returnMsg = msg;
  returnMsg[index] = record;
  return returnMsg.join('|');
};

exports.editStatus = (msg, status, index) => {
  const returnMsg = msg;
  returnMsg[index] = status;
  return returnMsg.join('|');
};
