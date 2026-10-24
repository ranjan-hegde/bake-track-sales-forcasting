const mongoose = require('mongoose');
 const ItemSchema = new mongoose.Schema({
 name: String,
 quantity: Number,
 price: Number,
 imageUrl: String,
 category: { type: String, default: "Fiction & Fantasy" }
 });
 module.exports = mongoose.model('Item', ItemSchema);