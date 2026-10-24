const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    name: String,
    discount: { type: Number, default: 10 }
  }]
});

module.exports = mongoose.model('Promotion', promotionSchema);
