'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { attendanceApi, employeeApi, deptApi } from '@/lib/api';
import { usePersistState } from '@/lib/hooks';
import { fmtDate, fmtCurrency, statusColors, cn } from '@/lib/utils';
import {
  Users, UserCheck, UserX, Clock, TrendingUp,
  Download, FileSpreadsheet, FileText, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Search, Filter, RefreshCw, Award,
  BarChart2, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, subDays, parseISO, differenceInMinutes } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────
interface AttRow {
  _id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  lateMinutes: number;
  employee: { _id: string; firstName: string; lastName: string; employeeCode: string; department?: { _id: string; name: string } } | null;
}

type SortKey = 'date' | 'employee' | 'checkIn' | 'checkOut' | 'hours' | 'status';
type SortDir = 'asc' | 'desc';

// ── Helpers ──────────────────────────────────────────────────────────────────
const toHHMM = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const calcHours = (checkIn: string | null, checkOut: string | null): number => {
  if (!checkIn || !checkOut) return 0;
  return Math.max(0, differenceInMinutes(new Date(checkOut), new Date(checkIn))) / 60;
};

const fmtHours = (h: number) => (h === 0 ? '—' : `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`);

const statusLabel: Record<string, string> = {
  present: 'Present', absent: 'Absent', late: 'Late',
  on_leave: 'On Leave', half_day: 'Half Day',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border shrink-0', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronUp className="w-3.5 h-3.5 text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', statusColors[status] || 'bg-gray-100 text-gray-600')}>
      {statusLabel[status] || status}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

export default function ReportsPage() {
  // Data
  const [rows, setRows] = useState<AttRow[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters — persisted in sessionStorage so navigation doesn't reset them
  const [dateFrom, setDateFrom] = usePersistState('rpt_dateFrom', format(subDays(new Date(), 29), 'yyyy-MM-dd'));
  const [dateTo, setDateTo]     = usePersistState('rpt_dateTo',   format(new Date(), 'yyyy-MM-dd'));
  const [empFilter, setEmpFilter]       = usePersistState('rpt_emp', '');
  const [deptFilter, setDeptFilter]     = usePersistState('rpt_dept', '');
  const [statusFilter, setStatusFilter] = usePersistState('rpt_status', '');
  const [search, setSearch]             = usePersistState('rpt_search', '');

  // Table state — persisted
  const [sortKey, setSortKey] = usePersistState<SortKey>('rpt_sortKey', 'date');
  const [sortDir, setSortDir] = usePersistState<SortDir>('rpt_sortDir', 'desc');
  const [page, setPage]       = usePersistState('rpt_page', 1);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (empFilter) params.employeeId = empFilter;
      if (deptFilter) params.departmentId = deptFilter;
      if (statusFilter) params.status = statusFilter;

      const [attRes, empRes, deptRes] = await Promise.all([
        attendanceApi.getAll(params),
        employeeApi.getAll({ limit: 500 }),
        deptApi.getAll(),
      ]);
      setRows(attRes.data.data || []);
      setEmployees(empRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, empFilter, deptFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const present = rows.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = rows.filter(r => r.status === 'absent').length;
    const late = rows.filter(r => r.status === 'late').length;
    const hoursArr = rows.map(r => calcHours(r.checkIn, r.checkOut)).filter(h => h > 0);
    const avgHours = hoursArr.length ? hoursArr.reduce((a, b) => a + b, 0) / hoursArr.length : 0;
    return { present, absent, late, avgHours };
  }, [rows]);

  // ── Search filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(r => {
      const name = `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.toLowerCase();
      const code = (r.employee?.employeeCode ?? '').toLowerCase();
      const dept = (r.employee?.department?.name ?? '').toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q);
    });
  }, [rows, search]);

  // ── Sorting ────────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case 'date': va = a.date; vb = b.date; break;
        case 'employee': va = `${a.employee?.firstName} ${a.employee?.lastName}`; vb = `${b.employee?.firstName} ${b.employee?.lastName}`; break;
        case 'checkIn': va = a.checkIn ?? ''; vb = b.checkIn ?? ''; break;
        case 'checkOut': va = a.checkOut ?? ''; vb = b.checkOut ?? ''; break;
        case 'hours': va = calcHours(a.checkIn, a.checkOut); vb = calcHours(b.checkIn, b.checkOut); break;
        case 'status': va = a.status; vb = b.status; break;
        default: va = a.date; vb = b.date;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  // ── Performance: Top 3 employees by avg hours ─────────────────────────────
  const topPerformers = useMemo(() => {
    const map = new Map<string, { name: string; code: string; hours: number; days: number; dept: string }>();
    rows.forEach(r => {
      if (!r.employee) return;
      const id = r.employee._id;
      const h = calcHours(r.checkIn, r.checkOut);
      if (!map.has(id)) map.set(id, {
        name: `${r.employee.firstName} ${r.employee.lastName}`,
        code: r.employee.employeeCode,
        hours: 0, days: 0,
        dept: r.employee.department?.name || '—',
      });
      const cur = map.get(id)!;
      cur.hours += h;
      if (h > 0) cur.days += 1;
    });
    return Array.from(map.values())
      .map(v => ({ ...v, avgHours: v.days > 0 ? v.hours / v.days : 0 }))
      .sort((a, b) => b.avgHours - a.avgHours)
      .slice(0, 3);
  }, [rows]);

  // ── Chart: daily avg hours trend (last 14 days in range) ─────────────────
  const trendData = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number }>();
    rows.forEach(r => {
      const d = r.date.slice(0, 10);
      const h = calcHours(r.checkIn, r.checkOut);
      if (h > 0) {
        const cur = byDate.get(d) || { total: 0, count: 0 };
        cur.total += h;
        cur.count += 1;
        byDate.set(d, cur);
      }
    });
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, { total, count }]) => ({
        date: format(parseISO(date), 'dd MMM'),
        avgHours: parseFloat((total / count).toFixed(2)),
        totalHours: parseFloat(total.toFixed(2)),
      }));
  }, [rows]);

  // ── Status breakdown chart ─────────────────────────────────────────────────
  const statusChart = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({
      status: statusLabel[status] || status,
      count,
    }));
  }, [rows]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportExcel = async () => {
    const { utils, writeFile } = await import('xlsx');
    const data = sorted.map(r => ({
      'Employee': `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.trim(),
      'Code': r.employee?.employeeCode ?? '',
      'Department': r.employee?.department?.name ?? '',
      'Date': fmtDate(r.date),
      'Check In': toHHMM(r.checkIn),
      'Check Out': toHHMM(r.checkOut),
      'Total Hours': fmtHours(calcHours(r.checkIn, r.checkOut)),
      'Late (min)': r.lateMinutes || 0,
      'Status': statusLabel[r.status] || r.status,
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Attendance Report');
    writeFile(wb, `attendance-report-${dateFrom}-to-${dateTo}.xlsx`);
  };

  const exportPDF = async () => {
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Attendance Report', 14, 16);
    doc.setFontSize(10);
    doc.text(`Period: ${fmtDate(dateFrom)} – ${fmtDate(dateTo)}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [['Employee', 'Code', 'Department', 'Date', 'Check In', 'Check Out', 'Hours', 'Status']],
      body: sorted.map(r => [
        `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.trim(),
        r.employee?.employeeCode ?? '',
        r.employee?.department?.name ?? '',
        fmtDate(r.date),
        toHHMM(r.checkIn),
        toHHMM(r.checkOut),
        fmtHours(calcHours(r.checkIn, r.checkOut)),
        statusLabel[r.status] || r.status,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`attendance-report-${dateFrom}-to-${dateTo}.pdf`);
  };

  // ── Th helper ─────────────────────────────────────────────────────────────
  const Th = ({ label, sortable, sk }: { label: string; sortable?: boolean; sk?: SortKey }) => (
    <th
      className={cn('pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap', sortable && 'cursor-pointer select-none hover:text-gray-700')}
      onClick={sortable && sk ? () => handleSort(sk) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortable && sk && <SortIcon active={sortKey === sk} dir={sortDir} />}
      </span>
    </th>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-0.5">Attendance analytics &amp; workforce insights</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={load} disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Total Employees" value={employees.length} icon={Users} color="blue" />
        <SummaryCard label="Present (Period)" value={stats.present} icon={UserCheck} color="green" />
        <SummaryCard label="Absent (Period)" value={stats.absent} icon={UserX} color="red" />
        <SummaryCard label="Late Entries" value={stats.late} icon={Clock} color="orange" />
        <SummaryCard label="Avg Working Hrs" value={fmtHours(stats.avgHours)} icon={TrendingUp} color="purple" />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-800 text-sm">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="input text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
            <select value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Departments</option>
              {departments.map((d: any) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Employee</label>
            <select value={empFilter} onChange={e => { setEmpFilter(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Employees</option>
              {employees.map((e: any) => (
                <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="input text-sm">
              <option value="">All Statuses</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="on_leave">On Leave</option>
              <option value="half_day">Half Day</option>
            </select>
          </div>
        </div>

        {/* Search within results */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, code, or department…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="input text-sm pl-9 w-full"
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Working Hours Trend */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 className="w-4 h-4 text-blue-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Avg Working Hours Trend (last 14 days)</h3>
          </div>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data in selected range</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} unit="h" domain={[0, 12]} />
                <Tooltip formatter={(v: any) => [`${v}h`, 'Avg Hours']} />
                <Line type="monotone" dataKey="avgHours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Calendar className="w-4 h-4 text-purple-600" />
            <h3 className="font-semibold text-gray-800 text-sm">Status Breakdown</h3>
          </div>
          {statusChart.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusChart} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={70} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-gray-800 text-sm">Top Performers — Avg Working Hours</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {topPerformers.map((p, i) => (
              <div key={p.code}
                className={cn('rounded-xl border p-4 flex items-center gap-4',
                  i === 0 ? 'border-amber-200 bg-amber-50' :
                  i === 1 ? 'border-gray-200 bg-gray-50' :
                  'border-orange-200 bg-orange-50'
                )}>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0',
                  i === 0 ? 'bg-amber-400 text-white' :
                  i === 1 ? 'bg-gray-400 text-white' :
                  'bg-orange-400 text-white'
                )}>
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.dept} · {p.code}</p>
                  <p className="text-xs font-medium text-blue-700 mt-0.5">{fmtHours(p.avgHours)} avg/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold text-gray-800 text-sm">
            Attendance Records
            <span className="ml-2 text-xs font-normal text-gray-400">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </h3>
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-2 text-gray-500 text-sm">Loading records…</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BarChart2 className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No records found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or date range</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <Th label="Employee" sortable sk="employee" />
                    <Th label="Department" />
                    <Th label="Date" sortable sk="date" />
                    <Th label="Check In" sortable sk="checkIn" />
                    <Th label="Check Out" sortable sk="checkOut" />
                    <Th label="Total Hours" sortable sk="hours" />
                    <Th label="Status" sortable sk="status" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(r => {
                    const hours = calcHours(r.checkIn, r.checkOut);
                    return (
                      <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-gray-900">
                            {r.employee?.firstName ?? '—'} {r.employee?.lastName ?? ''}
                          </p>
                          <p className="text-xs text-gray-400">{r.employee?.employeeCode ?? ''}</p>
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {r.employee?.department?.name ?? '—'}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 whitespace-nowrap">
                          {fmtDate(r.date)}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 font-mono text-xs">
                          {toHHMM(r.checkIn)}
                        </td>
                        <td className="py-3 pr-4 text-gray-600 font-mono text-xs">
                          {toHHMM(r.checkOut)}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={cn('text-xs font-medium', hours > 0 ? (hours >= 8 ? 'text-green-600' : 'text-orange-500') : 'text-gray-400')}>
                            {fmtHours(hours)}
                          </span>
                        </td>
                        <td className="py-3">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  «
                </button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={cn('px-3 py-1.5 rounded-lg text-xs border transition-colors',
                        page === p ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                      )}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
