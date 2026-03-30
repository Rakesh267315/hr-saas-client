'use client';
import { useEffect, useState } from 'react';
import { payrollApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtCurrency, fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Play, DollarSign, TrendingUp } from 'lucide-react';

export default function AdminPayrollPage() {
  const now = new Date();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pr, sm] = await Promise.all([
        payrollApi.getAll({ month, year }),
        payrollApi.getSummary({ month, year }),
      ]);
      setPayrolls(pr.data.data);
      setSummary(sm.data.data);
    } catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await payrollApi.generate({ month, year });
      toast.success(`Generated ${res.data.count} payroll records`);
      load();
    } catch { toast.error('Failed to generate payroll'); }
    finally { setGenerating(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await payrollApi.updateStatus(id, { status, paymentDate: status === 'paid' ? new Date() : undefined });
      toast.success(`Payroll ${status}`);
      load();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
          <p className="text-gray-500 text-sm">{payrolls.length} records for {month}/{year}</p>
        </div>
        <div className="flex gap-3 items-center">
          <select className="input w-36" value={month} onChange={(e) => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(new Date().getFullYear(), i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <input type="number" className="input w-24" value={year} onChange={(e) => setYear(+e.target.value)} />
          <button onClick={generate} disabled={generating} className="btn-primary flex items-center gap-2">
            <Play className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate All'}
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary.count > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card bg-blue-50 border-blue-100">
            <p className="text-sm text-blue-600 font-medium">Total Gross</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{fmtCurrency(summary.totalGross || 0)}</p>
          </div>
          <div className="card bg-red-50 border-red-100">
            <p className="text-sm text-red-600 font-medium">Total Deductions</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{fmtCurrency(summary.totalDeductions || 0)}</p>
          </div>
          <div className="card bg-green-50 border-green-100">
            <p className="text-sm text-green-600 font-medium">Total Net Pay</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{fmtCurrency(summary.totalNet || 0)}</p>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-4 py-4 font-medium">Gross</th>
                <th className="px-4 py-4 font-medium">Deductions</th>
                <th className="px-4 py-4 font-medium">Net Pay</th>
                <th className="px-4 py-4 font-medium">Days</th>
                <th className="px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No payroll generated yet. Click "Generate All" to start.
                  </td>
                </tr>
              ) : payrolls.map((p: any) => (
                <tr key={p._id} className="table-row">
                  <td className="px-6 py-4">
                    <p className="font-medium">{p.employee?.firstName} {p.employee?.lastName}</p>
                    <p className="text-xs text-gray-400">{p.employee?.employeeCode}</p>
                  </td>
                  <td className="px-4 py-4 font-medium">{fmtCurrency(p.grossSalary)}</td>
                  <td className="px-4 py-4 text-red-600">-{fmtCurrency(p.totalDeductions)}</td>
                  <td className="px-4 py-4 font-bold text-green-700">{fmtCurrency(p.netSalary)}</td>
                  <td className="px-4 py-4 text-gray-500">{p.presentDays}/{p.workingDays}</td>
                  <td className="px-4 py-4"><Badge status={p.status} /></td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      {p.status === 'draft' && (
                        <button onClick={() => updateStatus(p._id, 'approved')} className="text-xs btn-secondary py-1">Approve</button>
                      )}
                      {p.status === 'approved' && (
                        <button onClick={() => updateStatus(p._id, 'paid')} className="text-xs btn-primary py-1">Mark Paid</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
