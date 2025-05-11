const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
  userPhoneNumber: {
    type: String,
    required: true,
  },
  prompt: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  result: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    required: true,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('Interaction', interactionSchema);
