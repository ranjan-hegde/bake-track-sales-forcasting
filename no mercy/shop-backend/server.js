const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const Item = require('./models/item');
const Order = require('./models/order');
const User = require('./models/user');
const Promotion = require('./models/promotion');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shop';

// ML Forecasting API URL
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

mongoose.connection.on('connected', () => {
    console.log("------------------------------------------------");
    console.log("✅ Database Connected Successfully");
    console.log("📂 Looking for data in Database Name:", mongoose.connection.name);
    console.log("💻 Host:", mongoose.connection.host);
    console.log("------------------------------------------------");
});
// --- API Routes ---

// 1. USERS: Login (Check Role) & Signup
app.get('/api/users/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (user) res.json(user);
    else res.status(404).json({ message: "User not found" });
  } catch(e) { res.status(500).json(e); }
});

app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.json(newUser);
  } catch(e) { res.status(500).json(e); }
});

// 2. ITEMS: Get All (Inventory)
app.get('/api/items', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

// 3. ITEMS: Add New (Shopkeeper)
app.post('/api/items', async (req, res) => {
  const newItem = new Item(req.body);
  await newItem.save();
  res.json(newItem);
});

// 4. ITEMS: Update Quantity (Billing, Restocking, Orders)
app.put('/api/items/:id', async (req, res) => {
  // Used for: Godown restock, Shopkeeper billing decrement
  const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, {new: true});
  res.json(updatedItem);
});

// 5. ITEMS: Delete (Shopkeeper)
app.delete('/api/items/:id', async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// 6. ORDERS: Create New (Customer)
app.post('/api/orders', async (req, res) => {
  try {
    const newOrder = new Order(req.body);
    await newOrder.save();
    res.json(newOrder);

    // Fire-and-forget: notify ML API about this sale for retraining
    const item = await Item.findOne({ name: req.body.itemName });
    const category = item && item.category ? item.category : "Fiction & Fantasy";

    const recordPayload = {
      publication_name: req.body.itemName,
      publication_category: category,
      price: newOrder.totalPrice / (newOrder.quantity || 1),
      customer_age: 35,
      income_level: "Medium",
      educational_background: "Bachelor",
      occupation: "Professional",
      region: "North",
      promotion: 0,
      special_events: "None",
      target_date: new Date().toISOString().slice(0, 10),
      actual_sales_quantity: newOrder.quantity || 1
    };

    axios.post(`${ML_API_URL}/record-sale`, recordPayload, { timeout: 60000 })
      .then(() => console.log('✅ ML model notified of sale:', newOrder.itemName))
      .catch(err => console.log('⚠️ ML record-sale skipped:', err.message));
  } catch(e) { res.status(500).json(e); }
});

// 7. ORDERS: Get All (Shopkeeper/Customer History)
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ date: -1 });
  res.json(orders);
});

// 8. ORDERS: Accept (Shopkeeper)
app.put('/api/orders/:id/accept', async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: 'accepted' }, {new: true});
  res.json(order);
});

// 9. ML FORECAST: Get sales prediction for an item
app.get('/api/forecast/:itemName', async (req, res) => {
  try {
    const itemName = decodeURIComponent(req.params.itemName);
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);
    const modelType = req.query.model || 'lgbm';

    // Look up the item to get its price and category
    const item = await Item.findOne({ name: itemName });
    const price = item ? item.price : 5.0;
    const category = item && item.category ? item.category : "Fiction & Fantasy";

    // Check if this date has a promotion for this specific item
    const promo = await Promotion.findOne({ date: targetDate });
    const itemPromo = promo ? promo.items.find(i => i.name === itemName) : null;
    const promoDiscount = itemPromo ? itemPromo.discount : 0;

    const forecastPayload = {
      publication_name: itemName,
      publication_category: category,
      price: price,
      customer_age: 35,
      income_level: "Medium",
      educational_background: "Bachelor",
      occupation: "Professional",
      region: "North",
      promo_discount: promoDiscount,
      special_events: "None",
      festival_name: req.query.festival ? decodeURIComponent(req.query.festival) : "None",
      target_date: targetDate,
      model_type: modelType
    };

    const mlResponse = await axios.post(`${ML_API_URL}/forecast`, forecastPayload, {
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    res.json({
      item_name: itemName,
      item_price: price,
      ...mlResponse.data
    });
  } catch (e) {
    console.error('ML Forecast Error:', e.message);
    if (e.response) {
      res.status(e.response.status).json({ message: 'ML API Error', detail: e.response.data });
    } else if (e.code === 'ECONNREFUSED') {
      res.status(503).json({ message: 'ML Forecasting service is not running. Start it on port 8000.' });
    } else {
      res.status(500).json({ message: 'Forecast failed', error: e.message });
    }
  }
});

// 10. ML HEALTH: Check if ML API is running
app.get('/api/ml-health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/health`, { timeout: 5000 });
    res.json({ ml_status: 'connected', ...response.data });
  } catch (e) {
    res.json({ ml_status: 'disconnected', message: 'ML API is not reachable' });
  }
});

// 11. ML: Trigger Retrain
app.post('/api/retrain', async (req, res) => {
  try {
    const response = await axios.post(`${ML_API_URL}/retrain`, {}, { timeout: 60000 });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ message: 'Retrain failed', error: e.message });
  }
});

// 12. ML: Get Genres
app.get('/api/genres', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/genres`, { timeout: 5000 });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch genres', error: e.message });
  }
});

// 13. PROMOTIONS: Get all promotions
app.get('/api/promotions', async (req, res) => {
  try {
    const promos = await Promotion.find();
    res.json(promos);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch promotions' });
  }
});

// 14. PROMOTIONS: Toggle promotion for an item on a date
app.post('/api/promotions', async (req, res) => {
  try {
    const { date, itemName, discount } = req.body; // YYYY-MM-DD
    let existing = await Promotion.findOne({ date });
    if (!existing) {
      existing = new Promotion({ date, items: [{ name: itemName, discount: discount || 10 }] });
    } else {
      const itemIndex = existing.items.findIndex(i => i.name === itemName);
      if (itemIndex > -1) {
        // Toggle off if it exists
        existing.items.splice(itemIndex, 1);
      } else {
        // Toggle on with discount
        existing.items.push({ name: itemName, discount: discount || 10 });
      }
    }
    await existing.save();
    res.json(existing);
  } catch (e) {
    res.status(500).json({ message: 'Failed to toggle promotion' });
  }
});

// 15. DATASET: Get row count
app.get('/api/dataset-info', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/dataset-info`, { timeout: 5000 });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch dataset info', error: e.message });
  }
});

// 16. DATASET: Get historical items from CSV
app.get('/api/historical-items', async (req, res) => {
  try {
    const response = await axios.get(`${ML_API_URL}/historical-items`, { timeout: 5000 });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch historical items', error: e.message });
  }
});

// 17. ORDERS: Record POS Sale
app.post('/api/pos-sale', async (req, res) => {
  try {
    const payload = req.body;
    axios.post(`${ML_API_URL}/record-sale`, payload, { timeout: 60000 })
      .then(() => console.log('✅ ML model notified of POS sale:', payload.publication_name))
      .catch(err => console.log('⚠️ ML record-sale failed:', err.message));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to record POS sale', error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));