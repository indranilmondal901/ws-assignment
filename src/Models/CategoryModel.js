const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, uppercase: true },
});

module.exports = mongoose.model('Category', categorySchema);
