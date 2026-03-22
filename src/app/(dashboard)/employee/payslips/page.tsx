'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { payrollApi } from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { fmtCurrency } from '@/lib/utils';
import { FileText, Download } from 'lucide-react';

export default function EmployeePayslipsPage() {
  const { employee } = useAuthStore();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!employee?._id) return;
    payrollApi.getAll({ employeeId: employee._id }).then((r) => setPayrolls(r.data.data));
  }, [employee]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Payslips</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 space-y-3">
          {payrolls.length === 0 ? (
            <div className="card text-center text-gray-400 py-8">No payslips available</div>
          ) : payrolls.map((p: any) => (
            <button
              key={p._id}
              onClick={() => setSelected(p)}
              className={`card w-full text-left hover:shadow-md transition-shadow ${selected?._id === p._id ? 'border-primary-400 ring-2 ring-primary-200' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{p.period}</p>
                  <p className="text-sm text-gray-500 mt-0.5">Net: <span className="text-green-700 font-bold">{fmtCurrency(p.netSalary)}</span></p>
                </div>
                <Badge status={p.status} />
              </div>
            </button>
          ))}
        </div>

        {/* Payslip detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="card text-center text-gray-400 py-16">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Select a payslip to view details</p>
            </div>
          ) : (
            <div className="card">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Payslip — {selected.period}</h2>
                  <Badge status={selected.status} className="mt-2" />
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl text-sm">
                <div><p className="text-gray-500">Working Days</p><p className="font-bold text-lg">{selected.workingDays}</p></div>
                <div><p className="text-gray-500">Present Days</p><p className="font-bold text-lg text-green-700">{selected.presentDays}</p></div>
                <div><p className="text-gray-500">Absent Days</p><p className="font-bold text-lg text-red-500">{selected.absentDays}</p></div>
              </div>

              {/* Earnings */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Earnings</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Base Salary', selected.baseSalary],
                    ['HRA', selected.allowances?.hra],
                    ['Transport', selected.allowances?.transport],
                    ['Medical', selected.allowances?.medical],
                    ['Overtime Pay', selected.overtimePay],
                    ['Bonus', selected.bonus],
                  ].filter(([, v]) => v > 0).map(([label, val]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium">{fmtCurrency(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Gross Salary</span>
                    <span>{fmtCurrency(selected.grossSalary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Deductions</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Income Tax', selected.deductions?.tax],
                    ['Provident Fund', selected.deductions?.providentFund],
                    ['Insurance', selected.deductions?.insurance],
                    ['Late Deduction', selected.deductions?.lateDeduction],
                  ].filter(([, v]) => v > 0).map(([label, val]) => (
                    <div key={label as string} className="flex justify-between">
                      <span className="text-gray-600">{label}</span>
                      <span className="text-red-600">-{fmtCurrency(val as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold border-t pt-2 text-red-600">
                    <span>Total Deductions</span>
                    <span>-{fmtCurrency(selected.totalDeductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
                <span className="font-bold text-green-800 text-lg">Net Pay</span>
                <span className="font-bold text-2xl text-green-700">{fmtCurrency(selected.netSalary)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
