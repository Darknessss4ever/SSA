import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, Briefcase, Plus, Search, Edit2, Trash2, Mail, Phone, Calendar, 
  CheckCircle, XCircle, AlertCircle, X, Download, Trash, PlusCircle, Clock
} from 'lucide-react';
import { employeesAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { formatDate, formatTime, downloadCSV } from '../../lib/utils';
import type { Employee, Shift } from '../../types';

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
    roleSelection: string;
    customRoleName: string;
    salary: number;
    status: 'Active' | 'Inactive';
    notes: string;
    shifts: Shift[];
  }>({
    name: '',
    email: '',
    phone: '',
    roleSelection: 'Staff',
    customRoleName: '',
    salary: 0,
    status: 'Active',
    notes: '',
    shifts: []
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: () => employeesAPI.getAll(),
  });

  const employees: Employee[] = data?.data?.data || [];

  // Standard roles and compile custom roles dynamically
  const standardRoles = ['Coach', 'Staff', 'Manager'];
  const customRoles = Array.from(
    new Set(employees.map(e => e.role).filter(r => !standardRoles.includes(r)))
  );
  const allAvailableRoles = [...standardRoles, ...customRoles];

  // Create Employee Mutation
  const createMutation = useMutation({
    mutationFn: (newEmp: any) => employeesAPI.create(newEmp),
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
      roleSelection: 'Staff',
      customRoleName: '',
      salary: 0,
      status: 'Active',
      notes: '',
      shifts: []
    });
  };

  const getPayload = () => {
    return {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.roleSelection === 'Other' ? formData.customRoleName : formData.roleSelection,
      salary: formData.salary,
      status: formData.status,
      notes: formData.notes,
      shifts: formData.shifts.filter(s => s.startTime && s.endTime)
    };
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = getPayload();
    if (!payload.name || !payload.email || !payload.phone || !payload.role || payload.salary <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    const payload = getPayload();
    updateMutation.mutate({
      id: selectedEmployee._id,
      data: payload
    });
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    const isCustom = !standardRoles.includes(emp.role);
    setFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      roleSelection: isCustom ? 'Other' : emp.role,
      customRoleName: isCustom ? emp.role : '',
      salary: emp.salary,
      status: emp.status,
      notes: emp.notes || '',
      shifts: emp.shifts || []
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to remove ${name} from employees?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleAddShift = () => {
    setFormData(prev => ({
      ...prev,
      shifts: [...prev.shifts, { startTime: '09:00', endTime: '17:00', name: '' }]
    }));
  };

  const handleRemoveShift = (index: number) => {
    setFormData(prev => ({
      ...prev,
      shifts: prev.shifts.filter((_, idx) => idx !== index)
    }));
  };

  const handleShiftChange = (index: number, field: keyof Shift, value: string) => {
    setFormData(prev => {
      const newShifts = [...prev.shifts];
      newShifts[index] = { ...newShifts[index], [field]: value };
      return { ...prev, shifts: newShifts };
    });
  };

  const handleExportCSV = () => {
    if (employees.length === 0) {
      toast.error('No employees to export');
      return;
    }
    const headers = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'salary', label: 'Salary (INR)' },
      { key: 'joiningDate', label: 'Joined Date' },
      { key: 'status', label: 'Status' },
      { key: 'shifts', label: 'Shifts Schedule' },
      { key: 'notes', label: 'Notes' }
    ];
    downloadCSV(filteredEmployees, headers, 'employees_roster.csv');
    toast.success('Employee roster exported! 📥');
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
          <p className="section-subtitle">Manage system staff, roles, shifts, contacts, and payroll.</p>
        </div>
        <div className="flex gap-2">
          {employees.length > 0 && (
            <button onClick={handleExportCSV} className="btn btn-secondary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="btn btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add Employee
          </button>
        </div>
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
              {allAvailableRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
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
                  <th className="table-head">Shifts</th>
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
                      {emp.shifts && emp.shifts.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {emp.shifts.map((shift, idx) => {
                            const isCrossover = shift.endTime < shift.startTime;
                            return (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-dark-900 text-dark-300 border border-dark-800 w-fit">
                                <Clock className="w-3 h-3 text-primary-400" />
                                {shift.name && <span className="text-primary-400 font-bold mr-1">{shift.name}:</span>}
                                <span>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</span>
                                {isCrossover && <span className="text-[10px] text-amber-400 ml-1 font-bold">(+1 day)</span>}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-dark-500 text-xs italic">No shifts assigned</span>
                      )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-lg rounded-2xl overflow-hidden shadow-glow my-8">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Add New Employee</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                    value={formData.roleSelection}
                    onChange={e => setFormData({ ...formData, roleSelection: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    {standardRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    {customRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="Other">Other (Specify...)</option>
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

              {formData.roleSelection === 'Other' && (
                <div className="animate-slide-up">
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Specify Role Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customRoleName}
                    onChange={e => setFormData({ ...formData, customRoleName: e.target.value })}
                    placeholder="e.g. Physiotherapist"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              )}

              {/* Shifts Section */}
              <div className="border-t border-dark-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-xs text-dark-400 font-semibold">Shifts Schedule</span>
                  <button 
                    type="button" 
                    onClick={handleAddShift}
                    className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Shift
                  </button>
                </div>

                {formData.shifts.length === 0 ? (
                  <p className="text-xs text-dark-500 italic">No shifts assigned. Employee will work standard hours.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.shifts.map((shift, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-dark-950 p-3 rounded-xl border border-dark-800 animate-slide-up">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-dark-500">Start Time</label>
                              <input
                                type="time"
                                required
                                value={shift.startTime}
                                onChange={e => handleShiftChange(idx, 'startTime', e.target.value)}
                                className="w-full bg-dark-900 border border-dark-700/30 rounded-lg px-2.5 py-1 text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-dark-500">End Time</label>
                              <input
                                type="time"
                                required
                                value={shift.endTime}
                                onChange={e => handleShiftChange(idx, 'endTime', e.target.value)}
                                className="w-full bg-dark-900 border border-dark-700/30 rounded-lg px-2.5 py-1 text-white text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={shift.name}
                              onChange={e => handleShiftChange(idx, 'name', e.target.value)}
                              placeholder="Shift Name (e.g. Morning, Split Shift)"
                              className="w-full bg-dark-900 border border-dark-700/30 rounded-lg px-2.5 py-1 text-white text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveShift(idx)}
                          className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all self-center"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-dark-900 border border-dark-700/50 w-full max-w-lg rounded-2xl overflow-hidden shadow-glow my-8">
            <div className="px-6 py-4 border-b border-dark-700/50 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-white">Edit Employee Details</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-dark-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
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
                    value={formData.roleSelection}
                    onChange={e => setFormData({ ...formData, roleSelection: e.target.value })}
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  >
                    {standardRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    {customRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    <option value="Other">Other (Specify...)</option>
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

              {formData.roleSelection === 'Other' && (
                <div className="animate-slide-up">
                  <label className="block text-xs text-dark-400 font-semibold mb-1">Specify Role Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.customRoleName}
                    onChange={e => setFormData({ ...formData, customRoleName: e.target.value })}
                    placeholder="e.g. Physiotherapist"
                    className="w-full bg-dark-950 border border-dark-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-primary-500/50 text-sm"
                  />
                </div>
              )}

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

              {/* Shifts Section */}
              <div className="border-t border-dark-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="block text-xs text-dark-400 font-semibold">Shifts Schedule</span>
                  <button 
                    type="button" 
                    onClick={handleAddShift}
                    className="text-xs text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Shift
                  </button>
                </div>

                {formData.shifts.length === 0 ? (
                  <p className="text-xs text-dark-500 italic">No shifts assigned. Employee will work standard hours.</p>
                ) : (
                  <div className="space-y-3">
                    {formData.shifts.map((shift, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-dark-950 p-3 rounded-xl border border-dark-800 animate-slide-up">
                        <div className="flex-1 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-dark-500">Start Time</label>
                              <input
                                type="time"
                                required
                                value={shift.startTime}
                                onChange={e => handleShiftChange(idx, 'startTime', e.target.value)}
                                className="w-full bg-dark-900 border border-dark-700/30 rounded-lg px-2.5 py-1 text-white text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-dark-500">End Time</label>
                              <input
                                type="time"
                                required
                                value={shift.endTime}
                                onChange={e => handleShiftChange(idx, 'endTime', e.target.value)}
                                className="w-full bg-dark-900 border border-dark-700/30 rounded-lg px-2.5 py-1 text-white text-xs"
                              />
                            </div>
                          </div>
                          <div>
                            <input
                              type="text"
                              value={shift.name}
                              onChange={e => handleShiftChange(idx, 'name', e.target.value)}
                              placeholder="Shift Name (e.g. Morning, Split Shift)"
                              className="w-full bg-dark-900 border border-dark-700/30 rounded-lg px-2.5 py-1 text-white text-xs"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveShift(idx)}
                          className="p-2 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all self-center"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
