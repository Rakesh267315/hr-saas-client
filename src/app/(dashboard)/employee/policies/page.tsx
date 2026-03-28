'use client';
import { useEffect, useState } from 'react';
import { settingsApi } from '@/lib/api';
import { ScrollText, Clock, UserCheck, Calendar, Banknote } from 'lucide-react';

export default function PoliciesPage() {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    settingsApi.get().then((r) => setSettings(r.data.data)).catch(() => {});
  }, []);

  if (!settings) return <div className="text-gray-400 text-sm">Loading policies…</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <ScrollText className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Policies</h1>
          <p className="text-sm text-gray-500">{settings.companyName}</p>
        </div>
      </div>

      {/* Office Timing Card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-600" />
          <h2 className="font-semibold text-gray-800">Office Timing</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Start Time</p>
            <p className="font-medium">{settings.officeStartTime}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">End Time</p>
            <p className="font-medium">{settings.officeEndTime}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-0.5">Weekly Off</p>
            <p className="font-medium">{settings.weeklyOffDay}</p>
          </div>
        </div>
      </div>

      {/* Attendance Rules Card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck className="w-4 h-4 text-green-600" />
          <h2 className="font-semibold text-gray-800">Attendance Rules</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Grace period</span>
            <span className="font-medium">{settings.gracePeriodMinutes} minutes</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Half-day if late by more than</span>
            <span className="font-medium">{settings.halfDayAfterMinutes} minutes ({Math.round(settings.halfDayAfterMinutes / 60 * 10) / 10}h)</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-600">Absent if late by more than</span>
            <span className="font-medium">{settings.absentAfterMinutes} minutes ({Math.round(settings.absentAfterMinutes / 60 * 10) / 10}h)</span>
          </div>
        </div>
      </div>

      {/* Leave Policy Card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-purple-600" />
          <h2 className="font-semibold text-gray-800">Leave Policy</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Monthly leave limit</span>
            <span className="font-medium">{settings.monthlyLeaveLimit} days</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Sick leave limit</span>
            <span className="font-medium">{settings.sickLeaveLimit} days/month</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Leave type</span>
            <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${settings.leaveIsPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {settings.leaveIsPaid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-600">Approval required</span>
            <span className="font-medium">{settings.leaveApprovalRequired ? 'Yes' : 'No (auto-approved)'}</span>
          </div>
        </div>
      </div>

      {/* Salary Rules Card */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="w-4 h-4 text-amber-600" />
          <h2 className="font-semibold text-gray-800">Salary Rules</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">HRA</span>
            <span className="font-medium">{settings.hraPercent}% of base salary</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Transport allowance</span>
            <span className="font-medium">₹{settings.transportAllowance}/month</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Medical allowance</span>
            <span className="font-medium">₹{settings.medicalAllowance}/month</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Provident Fund</span>
            <span className="font-medium">{settings.pfPercent}% of base pay</span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-gray-100">
            <span className="text-gray-600">Late penalty</span>
            <span className="font-medium">Every {settings.lateCountForHalfDay} late arrivals = 0.5 day deducted</span>
          </div>
          <div className="flex justify-between py-1.5">
            <span className="text-gray-600">Overtime multiplier</span>
            <span className="font-medium">{settings.overtimeMultiplier}× hourly rate</span>
          </div>
        </div>
      </div>

      {/* Company Policies Text */}
      {settings.companyPolicies && (
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-4 h-4 text-gray-600" />
            <h2 className="font-semibold text-gray-800">HR Rules & Guidelines</h2>
          </div>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {settings.companyPolicies}
          </pre>
        </div>
      )}
    </div>
  );
}
