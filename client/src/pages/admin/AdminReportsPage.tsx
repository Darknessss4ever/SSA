import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, DollarSign, Clock, Users, Calendar, Mail, Phone,
  AlertTriangle, AlertCircle, FileText, CheckCircle2, Download
} from 'lucide-react';
import { reportsAPI, financialsAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { formatDate, downloadCSV } from '../../lib/utils';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface DueRecord {
  _id: string;
  amount: number;
  category: string;
  date: string;
  dueDate: string;
  description: string;
  customerDetails?: {
    name: string;
    email: string;
    phone: string;
  };
}

interface ExpiringMembership {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  planName: string;
  price: number;
  validFrom: string;
  validTo: string;
  durationLabel: string;
  daysRemaining: number;
}

export const AdminReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'dues' | 'expirations'>('sales');
  const [reportType, setReportType] = useState<'income' | 'expense'>('income');
  const [timeRange, setTimeRange] = useState<'month' | 'last3m' | 'last6m' | 'ytd' | 'year' | 'custom' | 'all'>('month');
  
  // Custom range dates
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Queries
  const { data: transactionsRes, isLoading: isTxLoading } = useQuery({
    queryKey: ['financials-transactions-reports'],
    queryFn: () => financialsAPI.getTransactions(),
    enabled: activeTab === 'sales'
  });

  const { data: duesRes, isLoading: isDuesLoading } = useQuery({
    queryKey: ['reports-dues'],
    queryFn: () => reportsAPI.getDuesReport(),
    enabled: activeTab === 'dues'
  });

  const { data: membershipsRes, isLoading: isMembershipsLoading } = useQuery({
    queryKey: ['reports-memberships'],
    queryFn: () => reportsAPI.getMembershipsReport(),
    enabled: activeTab === 'expirations'
  });

  const allTransactions = transactionsRes?.data?.data || [];

  // Helper for dynamic category colors
  const getCategoryColor = (cat: string, type: 'income' | 'expense') => {
    if (type === 'income') {
      switch (cat) {
        case 'membership': return '#3b82f6';
        case 'coaching': return '#10b981';
        case 'tournament': return '#8b5cf6';
        case 'booking': return '#f59e0b';
        default: return '#6b7280';
      }
    } else {
      switch (cat) {
        case 'salary': return '#ef4444';
        case 'rent': return '#ec4899';
        case 'utilities': return '#06b6d4';
        case 'maintenance': return '#f97316';
        case 'purchase': return '#84cc16';
        default: return '#6b7280';
      }
    }
  };

  // Group and aggregate on client side
  const categoryTotals: Record<string, number> = {};
  
  const filteredTransactions = allTransactions.filter((tx: any) => {
    if (tx.status !== 'paid') return false;
    if (tx.type !== reportType) return false;
    
    if (timeRange === 'all') return true;
    
    const txDate = new Date(tx.date);
    const now = new Date();
    
    if (timeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return txDate >= startOfMonth;
    }
    if (timeRange === 'last3m') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      return txDate >= threeMonthsAgo;
    }
    if (timeRange === 'last6m') {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      return txDate >= sixMonthsAgo;
    }
    if (timeRange === 'custom') {
      if (!customStartDate || !customEndDate) return true;
      const start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return txDate >= start && txDate <= end;
    }
    if (timeRange === 'ytd') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return txDate >= startOfYear && txDate <= now;
    }
    if (timeRange === 'year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      return txDate >= startOfYear && txDate <= endOfYear;
    }
    return true;
  });

  filteredTransactions.forEach((tx: any) => {
    const cat = tx.category || 'other';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + tx.amount;
  });

  const salesChartData = Object.keys(categoryTotals).map(cat => ({
    name: cat.charAt(0).toUpperCase() + cat.slice(1),
    value: categoryTotals[cat] || 0,
    color: getCategoryColor(cat, reportType)
  })).filter(item => item.value > 0);

  const totalSalesVolume = salesChartData.reduce((sum, item) => sum + item.value, 0);
  const salesTransactions = filteredTransactions;

  // Dues Data Extract
  const duesRecords: DueRecord[] = duesRes?.data?.data || [];
  const totalDuesVolume = duesRecords.reduce((sum, d) => sum + d.amount, 0);

  // Membership Data Extract
  const membershipData = membershipsRes?.data?.data || { expiringSoon: [], allActive: [] };
  const expiringMemberships: ExpiringMembership[] = membershipData.expiringSoon || [];
  const allActiveMemberships: ExpiringMembership[] = membershipData.allActive || [];

  const isLoading = 
    (activeTab === 'sales' && isTxLoading) || 
    (activeTab === 'dues' && isDuesLoading) || 
    (activeTab === 'expirations' && isMembershipsLoading);

  // CSV Exporters
  const handleExportSalesCSV = () => {
    if (salesTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }
    const headers = [
      { key: 'category', label: 'Category' },
      { key: 'subcategory', label: 'Subcategory' },
      { key: 'date', label: 'Date' },
      { key: 'customerDetails.name', label: 'Customer Name' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount (INR)' },
      { key: 'paymentMethod', label: 'Payment Method' }
    ];
    const rangeName = timeRange === 'custom' ? `custom_${customStartDate}_to_${customEndDate}` : timeRange;
    downloadCSV(salesTransactions, headers, `${reportType}_report_${rangeName}.csv`);
    toast.success('Transactions report exported! 📥');
  };

  const handleExportDuesCSV = () => {
    if (duesRecords.length === 0) {
      toast.error('No outstanding dues to export');
      return;
    }
    const headers = [
      { key: 'customerDetails.name', label: 'Customer Name' },
      { key: 'customerDetails.email', label: 'Email' },
      { key: 'customerDetails.phone', label: 'Phone' },
      { key: 'category', label: 'Category' },
      { key: 'dueDate', label: 'Due Date' },
      { key: 'description', label: 'Description' },
      { key: 'amount', label: 'Amount (INR)' }
    ];
    downloadCSV(duesRecords, headers, 'outstanding_payment_dues.csv');
    toast.success('Payment dues report exported! 📥');
  };

  const handleExportExpiringCSV = () => {
    if (expiringMemberships.length === 0) {
      toast.error('No expiring memberships to export');
      return;
    }
    const headers = [
      { key: 'user.name', label: 'Member Name' },
      { key: 'user.email', label: 'Email' },
      { key: 'user.phone', label: 'Phone' },
      { key: 'planName', label: 'Plan Name' },
      { key: 'durationLabel', label: 'Duration' },
      { key: 'validTo', label: 'Expiry Date' },
      { key: 'daysRemaining', label: 'Days Remaining' },
      { key: 'price', label: 'Price (INR)' }
    ];
    downloadCSV(expiringMemberships, headers, 'expiring_memberships_report.csv');
    toast.success('Expiring memberships list exported! 📥');
  };

  const handleExportAllActiveCSV = () => {
    if (allActiveMemberships.length === 0) {
      toast.error('No active memberships to export');
      return;
    }
    const headers = [
      { key: 'user.name', label: 'Member Name' },
      { key: 'user.email', label: 'Email' },
      { key: 'user.phone', label: 'Phone' },
      { key: 'planName', label: 'Plan Name' },
      { key: 'durationLabel', label: 'Duration' },
      { key: 'validFrom', label: 'Start Date' },
      { key: 'validTo', label: 'End Date' },
      { key: 'price', label: 'Price (INR)' }
    ];
    downloadCSV(allActiveMemberships, headers, 'active_memberships_ledger.csv');
    toast.success('Active memberships ledger exported! 📥');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-primary-400" />
          Business Reports
        </h1>
        <p className="section-subtitle">View sales analytics, payment dues, and membership expirations.</p>
      </div>

      {/* Tabs List */}
      <div className="flex border-b border-dark-700/50 bg-dark-900/50 rounded-xl overflow-hidden p-1 gap-1">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sales' 
              ? 'bg-primary-500 text-white shadow-md' 
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Timeline Reports
        </button>
        <button
          onClick={() => setActiveTab('dues')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'dues' 
              ? 'bg-primary-500 text-white shadow-md' 
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <Clock className="w-4 h-4" /> Payment Dues
        </button>
        <button
          onClick={() => setActiveTab('expirations')}
          className={`flex-1 py-3 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'expirations' 
              ? 'bg-primary-500 text-white shadow-md' 
              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
          }`}
        >
          <Users className="w-4 h-4" /> Membership Expiry
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-60">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: TIMELINE REPORT */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Filter controls */}
              <div className="flex flex-col gap-4 bg-dark-900/60 p-4 rounded-xl border border-dark-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Report Type Toggle */}
                  <div className="flex gap-1.5 bg-dark-950 p-1 rounded-lg border border-dark-800">
                    <button
                      onClick={() => setReportType('income')}
                      className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                        reportType === 'income'
                          ? 'bg-emerald-500 text-white shadow-md'
                          : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      Sales (Income)
                    </button>
                    <button
                      onClick={() => setReportType('expense')}
                      className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${
                        reportType === 'expense'
                          ? 'bg-red-500 text-white shadow-md'
                          : 'text-dark-400 hover:text-white'
                      }`}
                    >
                      Purchases (Expenses)
                    </button>
                  </div>

                  {/* Time Range Pills */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                    {(['month', 'last3m', 'last6m', 'ytd', 'year', 'custom', 'all'] as const).map((range) => {
                      const label = {
                        month: 'This Month',
                        last3m: 'Last 3 Months',
                        last6m: 'Last 6 Months',
                        ytd: 'YTD',
                        year: 'This Year',
                        custom: 'Custom Range',
                        all: 'All Time'
                      }[range];
                      return (
                        <button
                          key={range}
                          onClick={() => setTimeRange(range)}
                          className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                            timeRange === range
                              ? 'bg-primary-500/15 border-primary-500/35 text-primary-400 font-bold'
                              : 'bg-dark-950 border-dark-700/50 text-dark-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Date Range Picker */}
                {timeRange === 'custom' && (
                  <div className="flex flex-wrap gap-4 items-center bg-dark-950 p-3 rounded-xl border border-dark-800/80 animate-slide-up w-fit">
                    <div>
                      <label className="block text-[10px] text-dark-500 font-bold uppercase mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={e => setCustomStartDate(e.target.value)}
                        className="bg-dark-900 border border-dark-700/40 rounded-lg px-3 py-1.5 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-dark-500 font-bold uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={e => setCustomEndDate(e.target.value)}
                        className="bg-dark-900 border border-dark-700/40 rounded-lg px-3 py-1.5 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Pie Chart Card */}
                <div className="card p-6 flex flex-col justify-between">
                  <div>
                    <h2 className="text-base font-display font-bold text-white mb-2">
                      {reportType === 'income' ? 'Sales by Category' : 'Expenses by Category'}
                    </h2>
                    <p className="text-xs text-dark-400">
                      {reportType === 'income' ? 'Total revenue generated from paying users.' : 'Total expenditure logged in the system.'}
                    </p>
                  </div>
                  
                  {salesChartData.length === 0 ? (
                    <p className="text-dark-400 text-sm text-center py-10">
                      No {reportType === 'income' ? 'sales' : 'expenses'} logged for this period.
                    </p>
                  ) : (
                    <>
                      <div className="h-48 my-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={salesChartData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={50}
                              outerRadius={75} 
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {salesChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                              itemStyle={{ color: '#e2e8f0' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-dark-500 font-bold border-b border-dark-700 pb-1.5 mb-2">
                          <span>Category</span>
                          <span>{reportType === 'income' ? 'Revenue' : 'Expenses'}</span>
                        </div>
                        {salesChartData.map(item => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-dark-300">{item.name}</span>
                            </div>
                            <span className="text-white font-medium">₹{item.value.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between text-sm font-bold text-white pt-2 border-t border-dark-700">
                          <span>Total Volume</span>
                          <span className={reportType === 'income' ? 'text-emerald-400' : 'text-red-400'}>
                            ₹{totalSalesVolume.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Transactions Ledger */}
                <div className="lg:col-span-2 card p-6 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary-400" />
                      {reportType === 'income' ? 'Recent Sales Transactions' : 'Recent Purchase/Expense Transactions'}
                    </h2>
                    {salesTransactions.length > 0 && (
                      <button 
                        onClick={handleExportSalesCSV}
                        className="px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-850 hover:bg-dark-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Export CSV
                      </button>
                    )}
                  </div>

                  {salesTransactions.length === 0 ? (
                    <p className="text-dark-400 text-sm text-center py-20 flex-1">
                      No {reportType === 'income' ? 'sales' : 'purchase'} transactions available for this period.
                    </p>
                  ) : (
                    <div className="overflow-y-auto max-h-[380px] pr-2 space-y-3 flex-1">
                      {salesTransactions.map((tx: any) => (
                        <div key={tx._id} className="flex items-center justify-between p-3 rounded-xl bg-dark-950 border border-dark-800 hover:border-dark-700 transition-all animate-fade-in">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                                reportType === 'income' ? 'bg-primary-500/10 text-primary-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {tx.category}
                              </span>
                              {tx.subcategory && (
                                <span className="text-[10px] text-dark-450 capitalize bg-dark-900 px-1.5 py-0.5 rounded border border-dark-800">
                                  {tx.subcategory}
                                </span>
                              )}
                              <span className="text-[11px] text-dark-500">{formatDate(tx.date)}</span>
                            </div>
                            <p className="text-white text-sm font-medium">
                              {tx.customerDetails?.name || tx.description || 'Walk-in customer'}
                            </p>
                            {tx.customerDetails?.name && tx.description && (
                              <p className="text-xs text-dark-500">{tx.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-base ${
                              reportType === 'income' ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                              {reportType === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                            </p>
                            <p className="text-[10px] text-dark-500 uppercase">{tx.paymentMethod}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAYMENT DUES */}
          {activeTab === 'dues' && (
            <div className="space-y-4">
              <div className="card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-display font-bold text-white">Outstanding Receivables</h2>
                  <p className="text-sm text-dark-400">List of clients with pending payments on court bookings, coaching, or subscriptions.</p>
                </div>
                <div className="flex items-center gap-4">
                  {duesRecords.length > 0 && (
                    <button 
                      onClick={handleExportDuesCSV}
                      className="px-4 py-2.5 rounded-xl bg-dark-950 border border-dark-800 hover:bg-dark-850 text-white text-xs font-semibold flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4 text-dark-400" /> Export CSV
                    </button>
                  )}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-5 py-3 text-right">
                    <p className="text-amber-400 font-black text-2xl">₹{totalDuesVolume.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-dark-400">Total Unpaid Balance</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                {duesRecords.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                    <p className="text-emerald-400 text-sm font-semibold">All bills cleared! No pending dues.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700/50">
                          <th className="table-head">Customer Name</th>
                          <th className="table-head">Contact Info</th>
                          <th className="table-head">Category</th>
                          <th className="table-head">Due Date</th>
                          <th className="table-head">Description</th>
                          <th className="table-head text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {duesRecords.map(d => (
                          <tr key={d._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                            <td className="table-cell">
                              <span className="text-white font-semibold">{d.customerDetails?.name || 'Walk-in customer'}</span>
                            </td>
                            <td className="table-cell">
                              <div className="flex flex-col gap-0.5 text-xs text-dark-500">
                                <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {d.customerDetails?.email || 'N/A'}</span>
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {d.customerDetails?.phone || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-400 capitalize">
                                {d.category}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="text-red-400 text-sm font-medium flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-red-500" />
                                {d.dueDate ? formatDate(d.dueDate) : 'Immediate'}
                              </span>
                            </td>
                            <td className="table-cell">
                              <span className="text-dark-300 text-xs">{d.description}</span>
                            </td>
                            <td className="table-cell text-right">
                              <span className="text-white font-bold text-base">₹{d.amount.toLocaleString('en-IN')}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERSHIP EXPIRY */}
          {activeTab === 'expirations' && (
            <div className="space-y-6">
              {/* Top Banner Alert */}
              {expiringMemberships.length > 0 && (
                <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-6 h-6 text-rose-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-rose-400">Action Required</h3>
                    <p className="text-xs text-dark-300">There are {expiringMemberships.length} memberships expiring in the next 30 days. Recommend sending renewal reminders.</p>
                  </div>
                </div>
              )}

              {/* Expiring Soon Section */}
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-base font-display font-bold text-white flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                    Expiring in Next 30 Days ({expiringMemberships.length})
                  </h2>
                  {expiringMemberships.length > 0 && (
                    <button 
                      onClick={handleExportExpiringCSV}
                      className="px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-850 hover:bg-dark-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Expiring List
                    </button>
                  )}
                </div>

                {expiringMemberships.length === 0 ? (
                  <p className="text-dark-400 text-sm text-center py-8">No memberships expiring in the next 30 days. All active plans are healthy!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700/50">
                          <th className="table-head">Member</th>
                          <th className="table-head">Plan Details</th>
                          <th className="table-head">Expiry Date</th>
                          <th className="table-head">Days Left</th>
                          <th className="table-head text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expiringMemberships.map(sub => (
                          <tr key={sub._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                            <td className="table-cell">
                              <div>
                                <p className="text-white text-sm font-semibold">{sub.user.name}</p>
                                <p className="text-dark-500 text-xs">{sub.user.phone || sub.user.email}</p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <div>
                                <p className="text-white text-sm font-medium">{sub.planName}</p>
                                <p className="text-dark-500 text-xs capitalize">{sub.durationLabel}</p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="text-dark-300 text-sm font-semibold">{formatDate(sub.validTo)}</span>
                            </td>
                            <td className="table-cell">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                                sub.daysRemaining <= 7 ? 'bg-red-500/10 text-red-400' : 
                                sub.daysRemaining <= 15 ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {sub.daysRemaining} days left
                              </span>
                            </td>
                            <td className="table-cell text-right">
                              <span className="text-white font-bold">₹{sub.price.toLocaleString('en-IN')}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* All Active Memberships Ledger */}
              <div className="card p-6">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                  <h2 className="text-base font-display font-bold text-white">
                    All Active Memberships Ledger ({allActiveMemberships.length})
                  </h2>
                  {allActiveMemberships.length > 0 && (
                    <button 
                      onClick={handleExportAllActiveCSV}
                      className="px-3 py-1.5 rounded-lg bg-dark-950 border border-dark-850 hover:bg-dark-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Export Active Ledger
                    </button>
                  )}
                </div>

                {allActiveMemberships.length === 0 ? (
                  <p className="text-dark-400 text-sm text-center py-6">No active memberships found in the system.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700/50">
                          <th className="table-head">Member</th>
                          <th className="table-head">Plan Name</th>
                          <th className="table-head">Duration</th>
                          <th className="table-head">Validity Period</th>
                          <th className="table-head text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allActiveMemberships.map(sub => (
                          <tr key={sub._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                            <td className="table-cell">
                              <div>
                                <p className="text-white text-sm font-semibold">{sub.user.name}</p>
                                <p className="text-dark-500 text-xs">{sub.user.email}</p>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="text-white text-sm">{sub.planName}</span>
                            </td>
                            <td className="table-cell">
                              <span className="text-dark-300 text-sm font-medium capitalize">{sub.durationLabel || '1 Month'}</span>
                            </td>
                            <td className="table-cell">
                              <span className="text-dark-400 text-xs">
                                {formatDate(sub.validFrom)} to {formatDate(sub.validTo)}
                              </span>
                            </td>
                            <td className="table-cell text-right">
                              <span className="text-white font-bold">₹{sub.price.toLocaleString('en-IN')}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
