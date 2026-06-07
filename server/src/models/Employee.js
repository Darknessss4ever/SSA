const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['Coach', 'Staff', 'Manager', 'Other'], required: true },
  salary: { type: Number, required: true },
  joiningDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Employee', employeeSchema);
