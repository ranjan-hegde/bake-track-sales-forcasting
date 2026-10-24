const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['shopkeeper', 'godown', 'customer'], default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('User', UserSchema);