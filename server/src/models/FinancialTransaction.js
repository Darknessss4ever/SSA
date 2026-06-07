const mongoose = require('mongoose');

const financialTransactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { 
    type: String, 
    required: true 
  },
  subcategory: { type: String, default: '' },
  status: { type: String, enum: ['paid', 'pending', 'failed'], default: 'paid', required: true },
  date: { type: Date, default: Date.now, required: true },
  dueDate: { type: Date, default: null },
  paymentMethod: { 
    type: String, 
    enum: ['cash', 'card', 'upi', 'bank_transfer', 'other'], 
    default: 'cash' 
  },
  description: { type: String, default: '' },
  referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  referenceModel: { type: String, default: null }, // e.g. 'User', 'Booking', 'Subscription', 'Employee'
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('FinancialTransaction', financialTransactionSchema);
