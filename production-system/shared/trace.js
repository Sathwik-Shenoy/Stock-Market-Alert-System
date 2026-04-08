const crypto = require('crypto');

function newTraceId() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { newTraceId };

