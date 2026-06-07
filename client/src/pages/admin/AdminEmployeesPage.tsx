import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Briefcase, Plus, Search, Edit2, Trash2, Mail, Phone, Calendar, 
  CheckCircle, XCircle, AlertCircle, X 
} from 'lucide-react';
import { employeesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { formatDate } from '../../lib/utils';

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Coach' | 'Staff' | 'Manager' | 'Other';
  salary: number;
  joiningDate: string;
  status: 'Active' | 'Inactive';
  notes?: string;
}

export const AdminEmployeesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    role: 'Coach' | 'Staff' | 'Manager' | 'Other';
    salary: number;
    status: 'Active' | 'Inactive';
    notes: string;
  }>({
    name: '',
    email: '',
    phone: '',
    role: 'Staff',
    salary: 0,
    status: 'Active',
    notes: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: () => employeesAPI.getAll(),
  });

  const employees: Employee[] = data?.data?.data || [];

  // Create Employee Mutation
  const createMutation = useMutation({
    mutationFn: (newEmp: typeof formData) => employeesAPI.create(newEmp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      toast.success('Employee added successfully 👔');
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add employee');
    }
  });

  // Update Employee Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => 
      employeesAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      toast.success('Employee details updated 📝');
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update employee');
    }
  });

  // Delete Employee Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => employeesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      toast.success('Employee removed 🗑️');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to remove employee');
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'Staff',
      salary: 0,
      status: 'Active',
      notes: ''
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || formData.salary <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    updateMutation.mutate({
      id: selectedEmployee._id,
      data: formData
    });
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      salary: emp.salary,
      status: emp.status,
      notes: emp.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from employees?`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          emp.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'All' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stat calculations
  const totalStaff = employees.length;
  const activeCoaches = employees.filter(emp => emp.role === 'Coach' && emp.status === 'Active').length;
  const monthlyPayroll = employees.reduce((sum, emp) => sum + (emp.status === 'Active' ? emp.salary : 0), 0);

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
            <Briefcase className="w-7 h-7 text-primary-400" />
            Employee Management
          </h1>
          <p className="section-subtitle">Manage system staff, roles, contacts, and payroll.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
          className="btn btn-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add Employee
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-primary-400" />
          </div>
          <p className="text-3xl font-display font-black text-white">{totalStaff}</p>
          <p className="text-dark-400 text-sm">Total Registered Staff</p>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-2">
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>
          <p className="text-3xl font-display font-black text-white">{activeCoaches}</p>
          <p className="text-dark-400 text-sm">Active Coaches</p>
        </div>
        <div className="stat-card">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-3xl font-display font-black text-white">₹{monthlyPayroll.toLocaleString('en-IN')}</p>
          <p className="text-dark-400 text-sm">Active Monthly Payroll</p>
        </div>
      </div>

      {/* Filters ledger */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-dark-950 border border-dark-700/50 rounded-xl py-2.5 pl-11 pr-4 text-white placeholder-dark-500 focus:outline-none focus:border-primary-500/50 text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-dark-400 text-sm whitespace-nowrap">Filter Role:</span>
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary-500/50"
            >
              <option value="All">All Roles</option>
              <option value="Coach">Coach</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Employees Table */}
        {filteredEmployees.length === 0 ? (
          <div className="text-center py-10">
            <Users className="w-12 h-12 text-dark-600 mx-auto mb-2" />
            <p className="text-dark-400 text-sm">No employees match the selected criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/50">
                  <th className="table-head">Name</th>
                  <th className="table-head">Role</th>
                  <th className="table-head">Salary</th>
                  <th className="table-head">Joined On</th>
                  <th className="table-head">Status</th>
                  <th className="table-head text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp._id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    <td className="table-cell">
                      <div>
                        <p className="text-white text-sm font-semibold">{emp.name}</p>
                        <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-dark-500">
                          <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {emp.email}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {emp.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-dark-850 text-dark-300">
                        {emp.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-white font-medium">₹{emp.salary.toLocaleString('en-IN')}</span>
                    </td>
                    <td className="table-cell">
                      <span className="text-dark-300 text-sm flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-dark-500" />
                        {formatDate(emp.joiningDate)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                        emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {emp.status === 'Active' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {emp.status}
                      </span>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 transition-all"
                          title="Edit Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp._id, emp.name)}
                          className="p-1.5 rounded-lg text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete Employee"
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

      {/* Modal - Add Employee */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-md rounded-2xl overflow-hidden shadow-glow">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Add New Employee</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sunil Kumar"
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@shsa.com"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765..."
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Staff Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    <option value="Coach">Coach</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Monthly Salary (INR) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                    placeholder="35000"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">General Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes regarding skills, shift, credentials, etc."
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
                  disabled={createMutation.isPending}
                  className="btn btn-primary px-5 py-2.5 rounded-xl text-sm"
                >
                  {createMutation.isPending ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Edit Employee */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-md rounded-2xl overflow-hidden shadow-glow">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Edit Employee Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Staff Role *</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    <option value="Coach">Coach</option>
                    <option value="Manager">Manager</option>
                    <option value="Staff">Staff</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Monthly Salary (INR) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formData.salary}
                    onChange={e => setFormData({ ...formData, salary: parseInt(e.target.value) || 0 })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Employment Status *</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-dark-400 font-semibold mb-1">General Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm resize-none"
                />
              </div>

              <div className="pt-4 border-t border-dark-700/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-dark-300 hover:text-white transition-all text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn btn-primary px-5 py-2.5 rounded-xl text-sm"
                >
                  {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
