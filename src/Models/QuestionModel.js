const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    questionText: { type: String, required: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category', required:true }],
});

module.exports = mongoose.model('Question', questionSchema);
