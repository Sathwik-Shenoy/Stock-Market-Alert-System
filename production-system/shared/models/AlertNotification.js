const mongoose = require('mongoose');

const alertNotificationSchema = new mongoose.Schema({
  dedupeKey: { type: String, required: true, unique: true, index: true },
  eventId: { type: String, required: true, index: true },
  ruleId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  symbol: { type: String, required: true, index: true },
  eventTimestamp: { type: Date, required: true },
  matchedConditions: [{
    indicator: String,
    operator: String,
    expected: Number,
    actual: Number
  }],
  deliveryStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' }
}, { timestamps: true, collection: 'alert_notifications' });

alertNotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.AlertNotification || mongoose.model('AlertNotification', alertNotificationSchema);
