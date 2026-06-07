import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  DollarSign, Plus, ArrowUpRight, ArrowDownRight, Clock, 
  Search, Filter, Trash2, CheckCircle2, User, X 
} from 'lucide-react';
import { financialsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../lib/utils';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend 
} from 'recharts';

interface Transaction {
  _id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory?: string;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  dueDate?: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer' | 'other';
  description?: string;
  customerDetails?: {
    name: string;
    email: string;
    phone: string;
  };
}

export const AdminFinancialsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ledger' | 'dues'>('ledger');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customCategoryActive, setCustomCategoryActive] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [customSubcatActive, setCustomSubcatActive] = useState(false);
  const [customSubcatText, setCustomSubcatText] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('All');
  const [formData, setFormData] = useState({
    type: 'income',
    amount: '',
    category: 'membership',
    subcategory: '',
    status: 'paid',
    paymentMethod: 'upi',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    description: ''
  });

  // Queries
  const { data: overviewRes, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['financials-overview'],
    queryFn: () => financialsAPI.getOverview(),
  });

  const { data: transactionsRes, isLoading: isTxLoading } = useQuery({
    queryKey: ['financials-transactions'],
    queryFn: () => financialsAPI.getTransactions(),
  });

  const { data: subcatsRes } = useQuery({
    queryKey: ['financials-subcategories'],
    queryFn: () => financialsAPI.getSubcategories(),
  });

  const subcategoriesMap = subcatsRes?.data?.data || {};

  const overview = overviewRes?.data?.data || {
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    totalDues: 0,
    monthlyData: []
  };

  const transactions: Transaction[] = transactionsRes?.data?.data || [];

  // Mutations
  const createTxMutation = useMutation({
    mutationFn: (data: any) => financialsAPI.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials-overview'] });
      queryClient.invalidateQueries({ queryKey: ['financials-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financials-subcategories'] });
      toast.success('Transaction logged successfully 💸');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to log transaction');
    }
  });

  const updateTxMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      financialsAPI.updateTransaction(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials-overview'] });
      queryClient.invalidateQueries({ queryKey: ['financials-transactions'] });
      toast.success('Transaction updated 💰');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update transaction');
    }
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: string) => financialsAPI.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financials-overview'] });
      queryClient.invalidateQueries({ queryKey: ['financials-transactions'] });
      toast.success('Transaction record deleted 🗑️');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete transaction');
    }
  });

  const resetForm = () => {
    setFormData({
      type: 'income',
      amount: '',
      category: 'membership',
      subcategory: '',
      status: 'paid',
      paymentMethod: 'upi',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      description: ''
    });
    setCustomCategoryActive(false);
    setCustomCategoryText('');
    setCustomSubcatActive(false);
    setCustomSubcatText('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    const categoryValue = formData.category === 'custom' ? customCategoryText.trim() : formData.category;
    if (!categoryValue) {
      toast.error('Please enter or select a category');
      return;
    }
    const subcategoryValue = formData.subcategory === 'custom' ? customSubcatText.trim() : formData.subcategory;
    
    createTxMutation.mutate({
      ...formData,
      category: categoryValue,
      subcategory: subcategoryValue,
      amount: amt,
    });
  };

  const markAsPaid = (id: string) => {
    updateTxMutation.mutate({ id, status: 'paid' });
  };

  const handleDeleteTx = (id: string) => {
    if (window.confirm('Delete this financial transaction permanently?')) {
      deleteTxMutation.mutate(id);
    }
  };

  // Dynamic categories extraction (seeded defaults + unique ones from database)
  const uniqueCategories = Array.from(new Set([
    'membership', 'coaching', 'tournament', 'booking', 'salary', 'purchase', 'maintenance', 'rent', 'utilities', 'other',
    ...transactions.map(t => t.category)
  ]));

  const uniqueIncomeCategories = Array.from(new Set([
    'membership', 'coaching', 'tournament', 'booking', 'other',
    ...transactions.filter(t => t.type === 'income').map(t => t.category)
  ]));

  const uniqueExpenseCategories = Array.from(new Set([
    'salary', 'purchase', 'maintenance', 'rent', 'utilities', 'other',
    ...transactions.filter(t => t.type === 'expense').map(t => t.category)
  ]));

  const uniqueSubcategories = Array.from(new Set(
    transactions.map(t => t.subcategory).filter(Boolean) as string[]
  ));

  // Filtered transactions
  const filteredLedger = transactions.filter(t => {
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesSubcategory = subcategoryFilter === 'All' || t.subcategory === subcategoryFilter;
    const matchesSearch = (t.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (t.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (t.subcategory?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (t.customerDetails?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesType && matchesCategory && matchesSubcategory && matchesSearch;
  });

  const duesList = transactions.filter(t => t.status === 'pending');

  const isLoading = isOverviewLoading || isTxLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-80">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-primary-400" />
            Financial Management
          </h1>
          <p className="section-subtitle">Track sports arena income, expenses, P&L, and pending payments.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="btn btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Record Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
            <ArrowUpRight className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-display font-black text-white">
            ₹{overview.totalIncome.toLocaleString('en-IN')}
          </p>
          <p className="text-dark-400 text-xs lg:text-sm">Total Income (Sales)</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-2">
            <ArrowDownRight className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-display font-black text-white">
            ₹{overview.totalExpense.toLocaleString('en-IN')}
          </p>
          <p className="text-dark-400 text-xs lg:text-sm">Total Expenses (Purchases)</p>
        </div>
        <div className="stat-card">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
            overview.netProfit >= 0 ? 'bg-primary-500/10' : 'bg-rose-500/10'
          }`}>
            <DollarSign className={`w-5 h-5 ${overview.netProfit >= 0 ? 'text-primary-400' : 'text-rose-400'}`} />
          </div>
          <p className={`text-2xl lg:text-3xl font-display font-black ${
            overview.netProfit >= 0 ? 'text-primary-400' : 'text-rose-400'
          }`}>
            ₹{overview.netProfit.toLocaleString('en-IN')}
          </p>
          <p className="text-dark-400 text-xs lg:text-sm">Net Profit / Loss</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl lg:text-3xl font-display font-black text-white">
            ₹{overview.totalDues.toLocaleString('en-IN')}
          </p>
          <p className="text-dark-400 text-xs lg:text-sm">Total Outstanding Dues</p>
        </div>
      </div>

      {/* P&L Trend Chart */}
      <div className="card p-6">
        <h2 className="text-lg font-display font-bold text-white mb-4">6-Month Profit & Loss Trend</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={overview.monthlyData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
              <Legend verticalAlign="top" height={36} />
              <Area type="monotone" dataKey="income" name="Income (Sales)" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" />
              <Area type="monotone" dataKey="expense" name="Expense (Purchases)" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ledger & Dues Tables */}
      <div className="card overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-dark-700/50 bg-dark-900/50">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'ledger' 
                ? 'border-primary-500 text-primary-400 bg-primary-500/5' 
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            Transactions Ledger
          </button>
          <button
            onClick={() => setActiveTab('dues')}
            className={`px-6 py-4 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'dues' 
                ? 'border-primary-500 text-primary-400 bg-primary-500/5' 
                : 'border-transparent text-dark-400 hover:text-white'
            }`}
          >
            Dues Tracker
            {duesList.length > 0 && (
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold">
                {duesList.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Ledger */}
        {activeTab === 'ledger' && (
          <div className="p-6 space-y-4">
            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search ledger..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 text-sm transition-all"
                />
              </div>
              <div className="flex gap-2.5 flex-wrap">
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500/50"
                >
                  <option value="All">All Types</option>
                  <option value="income">Income (Sales)</option>
                  <option value="expense">Expense (Purchases)</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500/50 capitalize"
                >
                  <option value="All">All Categories</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat === 'purchase' ? 'equipment' : cat}</option>
                  ))}
                </select>
                <select
                  value={subcategoryFilter}
                  onChange={e => setSubcategoryFilter(e.target.value)}
                  className="bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500/50 capitalize"
                >
                  <option value="All">All Subcategories</option>
                  {uniqueSubcategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            {filteredLedger.length === 0 ? (
              <div className="text-center py-10">
                <Filter className="w-12 h-12 text-dark-600 mx-auto mb-2" />
                <p className="text-dark-400 text-sm">No transaction records found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="table-head">Date</th>
                      <th className="table-head">Type</th>
                      <th className="table-head">Category</th>
                      <th className="table-head">Subcategory</th>
                      <th className="table-head">Customer / Description</th>
                      <th className="table-head">Amount</th>
                      <th className="table-head">Status</th>
                      <th className="table-head text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLedger.map(tx => (
                      <tr key={tx._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                        <td className="table-cell">
                          <span className="text-dark-300 text-sm whitespace-nowrap">
                            {formatDate(tx.date)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                            tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.type === 'income' ? '+' : '-'} {tx.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-850 text-dark-300 capitalize">
                            {tx.category === 'purchase' ? 'equipment' : tx.category}
                          </span>
                        </td>
                        <td className="table-cell">
                          {tx.subcategory ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 capitalize">
                              {tx.subcategory}
                            </span>
                          ) : (
                            <span className="text-dark-500 text-xs italic">N/A</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <div>
                            {tx.customerDetails ? (
                              <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-primary-400" />
                                {tx.customerDetails.name}
                              </p>
                            ) : null}
                            <p className="text-dark-400 text-xs mt-0.5">{tx.description || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className="text-white font-bold">₹{tx.amount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="table-cell">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${
                            tx.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : 
                            tx.status === 'pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1">
                            {tx.status === 'pending' && (
                              <button
                                onClick={() => markAsPaid(tx._id)}
                                className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all"
                                title="Mark as Paid"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteTx(tx._id)}
                              className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Dues Tracker */}
        {activeTab === 'dues' && (
          <div className="p-6">
            {duesList.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                <p className="text-emerald-400 text-sm font-semibold">No Outstanding Dues!</p>
                <p className="text-dark-500 text-xs mt-1">All customer invoices and booking payments have been settled.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-700/50">
                      <th className="table-head">Due Date</th>
                      <th className="table-head">Customer</th>
                      <th className="table-head">Category</th>
                      <th className="table-head">Description</th>
                      <th className="table-head">Amount Due</th>
                      <th className="table-head text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {duesList.map(tx => (
                      <tr key={tx._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                        <td className="table-cell">
                          <span className="text-amber-400 text-sm font-medium flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {tx.dueDate ? formatDate(tx.dueDate) : 'Immediate'}
                          </span>
                        </td>
                        <td className="table-cell">
                          {tx.customerDetails ? (
                            <div>
                              <p className="text-white text-sm font-semibold">{tx.customerDetails.name}</p>
                              <p className="text-dark-500 text-xs">{tx.customerDetails.phone} | {tx.customerDetails.email}</p>
                            </div>
                          ) : (
                            <span className="text-dark-500 italic">Walk-in Customer</span>
                          )}
                        </td>
                        <td className="table-cell">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-850 text-dark-300 capitalize">
                            {tx.category}
                          </span>
                        </td>
                        <td className="table-cell">
                          <p className="text-dark-300 text-sm">{tx.description || 'Booking Due'}</p>
                        </td>
                        <td className="table-cell">
                          <span className="text-white font-bold text-base">₹{tx.amount.toLocaleString('en-IN')}</span>
                        </td>
                        <td className="table-cell text-right">
                          <button
                            onClick={() => markAsPaid(tx._id)}
                            className="btn btn-secondary py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/20 hover:border-emerald-500 flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Record Transaction */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-md rounded-2xl overflow-hidden shadow-glow">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Record New Transaction</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1.5">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2 bg-dark-950 p-1.5 rounded-xl border border-dark-700/50">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'income', category: 'membership' });
                      setCustomCategoryActive(false);
                      setCustomCategoryText('');
                    }}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      formData.type === 'income' ? 'bg-emerald-500 text-white shadow-md' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Income (Sale)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, type: 'expense', category: 'purchase' });
                      setCustomCategoryActive(false);
                      setCustomCategoryText('');
                    }}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      formData.type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    Expense (Purchase)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Amount (INR) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 500"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, category: val });
                      if (val === 'custom') {
                        setCustomCategoryActive(true);
                      } else {
                        setCustomCategoryActive(false);
                      }
                    }}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm capitalize"
                  >
                    {formData.type === 'income' ? (
                      <>
                        {uniqueIncomeCategories.map(cat => (
                          <option key={cat} value={cat}>{cat === 'purchase' ? 'equipment' : cat}</option>
                        ))}
                        <option value="custom">+ Add new category...</option>
                      </>
                    ) : (
                      <>
                        {uniqueExpenseCategories.map(cat => (
                          <option key={cat} value={cat}>{cat === 'purchase' ? 'equipment' : cat}</option>
                        ))}
                        <option value="custom">+ Add new category...</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {customCategoryActive && (
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Custom Category Name *</label>
                  <input
                    type="text"
                    required
                    value={customCategoryText}
                    onChange={e => setCustomCategoryText(e.target.value)}
                    placeholder="e.g. canteen"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">Subcategory</label>
                <select
                  value={formData.subcategory}
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({ ...formData, subcategory: val });
                    if (val === 'custom') {
                      setCustomSubcatActive(true);
                    } else {
                      setCustomSubcatActive(false);
                    }
                  }}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                >
                  <option value="">None / General</option>
                  {(subcategoriesMap[formData.category] || []).map((sub: string) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="custom">+ Add new subcategory...</option>
                </select>
              </div>

              {customSubcatActive && (
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Custom Subcategory Name *</label>
                  <input
                    type="text"
                    required
                    value={customSubcatText}
                    onChange={e => setCustomSubcatText(e.target.value)}
                    placeholder="e.g. pool cleaning"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Payment Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    <option value="paid">Paid</option>
                    {formData.type === 'income' && <option value="pending">Pending (Due)</option>}
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    disabled={formData.status !== 'paid'}
                    onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    <option value="upi">UPI / GPay</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                {formData.status === 'pending' && (
                  <div>
                    <label className="block text-xs text-dark-400 font-semibold mb-1">Due Date</label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">Description / Memo</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details about items purchased, customer names, coach ids, etc."
                  rows={2}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm resize-none"
                />
              </div>

              <div className="pt-4 border-t border-dark-700/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-dark-300 hover:text-white transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTxMutation.isPending}
                  className="btn btn-primary px-5 py-2.5 rounded-xl text-sm"
                >
                  {createTxMutation.isPending ? 'Logging...' : 'Save Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
