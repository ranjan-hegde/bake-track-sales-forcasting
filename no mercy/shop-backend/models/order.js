 const mongoose = require('mongoose');
 const OrderSchema = new mongoose.Schema({
 itemName: String,
 quantity: Number,
 totalPrice: Number,
 customerEmail: String,
 address: String,
 status: { type: String, default: 'pending' },
 date: { type: Date, default: Date.now }
 });
 module.exports = mongoose.model('Order', OrderSchema);