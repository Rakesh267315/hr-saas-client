'use client';
import { useEffect, useState } from 'react';
import { deptApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Building2, Edit2, Trash2 } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const load = async () => {
    try {
      const res = await deptApi.getAll();
      setDepartments(res.data.data);
    } catch { toast.error('Failed to load departments'); }
  };

  useEffect(() => { load(); }, []);

  const openEdit = (dept: any) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setShowModal(true);
  };

  const save = async () => {
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
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Deactivate this department?')) return;
    try {
      await deptApi.remove(id);
      toast.success('Department deactivated');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button onClick={() => { setEditing(null); setForm({ name: '', code: '', description: '' }); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((d: any) => (
          <div key={d._id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{d.name}</h3>
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{d.code}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(d)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => remove(d._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            {d.description && <p className="text-sm text-gray-500 mt-3">{d.description}</p>}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-600"><span className="font-semibold">{d.headCount}</span> employees</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit' : 'Add'} Department</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Code <span className="text-red-500">*</span></label>
                <input className="input uppercase" placeholder="ENG" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
