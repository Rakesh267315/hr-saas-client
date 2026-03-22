'use client';
import { useEffect, useState } from 'react';
import { employeeApi, deptApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Search, Plus, Edit2, Eye, Filter } from 'lucide-react';
import Link from 'next/link';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const loadEmployees = async (params = {}) => {
    setLoading(true);
    try {
      const res = await employeeApi.getAll({ search, department: deptFilter, status: statusFilter, ...params });
      setEmployees(res.data.data);
      setPagination(res.data.pagination);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    deptApi.getAll().then((r) => setDepartments(r.data.data));
    loadEmployees();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total employees</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48 relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Search by name, code, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadEmployees()}
            />
          </div>
          <select className="input w-48" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select className="input w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>
          <button onClick={() => loadEmployees()} className="btn-primary">Apply</button>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-4 py-4 font-medium">Code</th>
                <th className="px-4 py-4 font-medium">Department</th>
                <th className="px-4 py-4 font-medium">Designation</th>
                <th className="px-4 py-4 font-medium">Joined</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No employees found</td></tr>
              ) : employees.map((emp: any) => (
                <tr key={emp._id} className="table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                        {getInitials(`${emp.firstName} ${emp.lastName}`)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                        <p className="text-gray-400 text-xs">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-gray-600">{emp.employeeCode}</td>
                  <td className="px-4 py-4 text-gray-600">{emp.department?.name || '—'}</td>
                  <td className="px-4 py-4 text-gray-600">{emp.designation}</td>
                  <td className="px-4 py-4 text-gray-500">{fmtDate(emp.joiningDate)}</td>
                  <td className="px-4 py-4"><Badge status={emp.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/employees/${emp._id}`}>
                        <button className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 text-sm text-gray-500">
          Showing {employees.length} of {pagination.total} employees
        </div>
      </div>

      {/* Add Employee Modal */}
      {showModal && <AddEmployeeModal departments={departments} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadEmployees(); }} />}
    </div>
  );
}

function AddEmployeeModal({ departments, onClose, onSave }: any) {
  const [form, setForm] = useState<any>({
    firstName: '', lastName: '', email: '', phone: '',
    department: '', designation: '', joiningDate: '', baseSalary: '',
    workStartTime: '09:00', employmentType: 'full_time',
    createAccount: true, password: 'Hr@123456',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    try {
      await employeeApi.create(form);
      toast.success('Employee added successfully');
      onSave();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 className="text-xl font-bold mb-6">Add New Employee</h2>
        <form onSubmit={save} className="grid grid-cols-2 gap-4">
          {[
            { label: 'First Name', key: 'firstName', required: true },
            { label: 'Last Name', key: 'lastName', required: true },
            { label: 'Email', key: 'email', type: 'email', required: true },
            { label: 'Phone', key: 'phone' },
            { label: 'Designation', key: 'designation', required: true },
            { label: 'Joining Date', key: 'joiningDate', type: 'date', required: true },
            { label: 'Base Salary', key: 'baseSalary', type: 'number', required: true },
            { label: 'Work Start Time', key: 'workStartTime', type: 'time' },
          ].map(({ label, key, type = 'text', required }) => (
            <div key={key}>
              <label className="label">{label} {required && <span className="text-red-500">*</span>}</label>
              <input
                type={type}
                className="input"
                required={required}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <label className="label">Department <span className="text-red-500">*</span></label>
            <select className="input" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
              <option value="">Select...</option>
              {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Employment Type</label>
            <select className="input" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })}>
              <option value="full_time">Full Time</option>
              <option value="part_time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="intern">Intern</option>
            </select>
          </div>
          <div className="col-span-2 flex items-center gap-2 mt-2">
            <input type="checkbox" id="ca" checked={form.createAccount} onChange={(e) => setForm({ ...form, createAccount: e.target.checked })} />
            <label htmlFor="ca" className="text-sm text-gray-700">Create login account</label>
          </div>
          <div className="col-span-2 flex gap-3 justify-end pt-4 border-t">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Employee'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
