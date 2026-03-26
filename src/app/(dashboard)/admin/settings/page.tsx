'use client';
import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Building2, Save } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const [form, setForm] = useState({
    companyName: '',
    officeStartTime: '10:00',
    officeEndTime: '19:00',
    weeklyOffDay: 'Sunday',
    timezone: 'Asia/Kolkata',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsApi.get().then((r) => {
      const d = r.data.data;
      setForm({
        companyName: d.companyName || '',
        officeStartTime: d.officeStartTime || '10:00',
        officeEndTime: d.officeEndTime || '19:00',
        weeklyOffDay: d.weeklyOffDay || 'Sunday',
        timezone: d.timezone || 'Asia/Kolkata',
      });
    }).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(form);
      toast.success('Settings saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6 flex items-center gap-3">
        <Building2 className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
          <input
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="My Company"
            className="input w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office Start Time</label>
            <input
              type="time"
              name="officeStartTime"
              value={form.officeStartTime}
              onChange={handleChange}
              className="input w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Office End Time</label>
            <input
              type="time"
              name="officeEndTime"
              value={form.officeEndTime}
              onChange={handleChange}
              className="input w-full"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Off Day</label>
          <select name="weeklyOffDay" value={form.weeklyOffDay} onChange={handleChange} className="input w-full">
            {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <input
            name="timezone"
            value={form.timezone}
            onChange={handleChange}
            placeholder="Asia/Kolkata"
            className="input w-full"
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2 w-full justify-center">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}
