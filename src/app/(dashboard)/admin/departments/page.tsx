'use client';
import { useEffect, useState } from 'react';
import { deptApi, employeeApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Building2, Edit2, Trash2, Users, ChevronRight } from 'lucide-react';

// Helper: format employee count display
function empLabel(count: number) {
  if (count === 0) return 'No employees';
  if (count === 1) return '1 Employee';
  return `${count} Employees`;
}

// Department card skeleton
function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex gap-1">
          <div className="w-7 h-7 bg-gray-100 rounded" />
          <div className="w-7 h-7 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await deptApi.getAll();
      setDepartments(res.data.data);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', code: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (dept: any) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code || '', description: dept.description || '' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Department name is required');
    if (!form.code.trim()) return toast.error('Department code is required');
    setSaving(true);
    try {
      if (editing) {
        await deptApi.update(editing._id, form);
        toast.success('Department updated');
      } else {
        await deptApi.create(form);
        toast.success('Department created');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', code: '', description: '' });
      load();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save department';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const remove = async (dept: any) => {
    if (!confirm(`Deactivate "${dept.name}"? This won't affect existing employees.`)) return;
    try {
      await deptApi.remove(dept._id);
      toast.success('Department deactivated');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  const totalEmployees = departments.reduce((sum, d) => sum + (d.headCount || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {departments.length} department{departments.length !== 1 ? 's' : ''} · {totalEmployees} active employee{totalEmployees !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
          : departments.length === 0
            ? (
              <div className="col-span-3 text-center py-16 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No departments yet</p>
                <p className="text-sm mt-1">Click "Add Department" to create your first one</p>
              </div>
            )
            : departments.map((d: any) => {
              const count: number = d.headCount ?? 0;
              const hasEmployees = count > 0;

              return (
                <div
                  key={d._id}
                  className="card hover:shadow-md transition-all duration-200 group"
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        hasEmployees ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Building2 className={`w-5 h-5 ${hasEmployees ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 leading-tight">{d.name}</h3>
                        {d.code && (
                          <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2 py-0.5 rounded mt-0.5 inline-block">
                            {d.code}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions — show on hover */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(d)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit department"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(d)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {d.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{d.description}</p>
                  )}

                  {/* Footer — live employee count */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 text-sm font-medium ${
                      hasEmployees ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span>{empLabel(count)}</span>
                    </div>

                    {/* Progress bar — visual ratio vs total */}
                    {totalEmployees > 0 && hasEmployees && (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, (count / totalEmployees) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">
                          {Math.round((count / totalEmployees) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editing ? 'Edit Department' : 'Add Department'}
                </h2>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  placeholder="e.g. Engineering"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Code <span className="text-red-500">*</span></label>
                <input
                  className="input uppercase"
                  placeholder="e.g. ENG"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  maxLength={10}
                />
                <p className="text-xs text-gray-400 mt-1">Short identifier shown on cards</p>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="What does this department do?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="btn-primary flex items-center gap-2 disabled:opacity-70"
                onClick={save}
                disabled={saving}
              >
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {editing ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
