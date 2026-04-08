const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  indicator: { type: String, required: true },
  operator: { type: String, required: true, enum: ['<', '<=', '>', '>=', '==', '!='] },
  value: { type: Number, required: true }
}, { _id: false });

const strategySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true, index: true },
  // Either (logic + conditions) or `dsl` should be provided.
  dsl: { type: String, default: '' },
  compiled: { type: Object, default: null },
  logic: { type: String, enum: ['AND', 'OR'], default: 'AND' },
  conditions: { type: [conditionSchema], default: [] },
  cooldownSec: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true, collection: 'strategies' });

strategySchema.index({ userId: 1, symbol: 1, isActive: 1 });

strategySchema.pre('validate', function validateEither(next) {
  const hasDsl = Boolean(this.dsl && String(this.dsl).trim().length > 0);
  const hasConditions = Array.isArray(this.conditions) && this.conditions.length > 0;
  if (!hasDsl && !hasConditions) {
    this.invalidate('dsl', 'either_dsl_or_conditions_required');
  }
  next();
});

module.exports = mongoose.models.Strategy || mongoose.model('Strategy', strategySchema);
