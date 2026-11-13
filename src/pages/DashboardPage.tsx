import React, { useMemo, useState } from 'react';
import { Calendar, Filter } from 'lucide-react';
import type { ERPDatabase, Institute } from '../types/erp';
import { computeTestAnalytics } from '../lib/erpStore';
import { BarTrendChart, DonutBreakdownChart, LineTrendChart } from '../components/ui/Charts';
import type { NavSectionId } from '../components/layout/AppShell';

export function DashboardPage({
  db,
  institute,
  onNavigate,
}: {
  db: ERPDatabase;
  institute: Institute;
  onNavigate: (section: NavSectionId) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [batchFilter, setBatchFilter] = useState('ALL');

  // Strictly tenant-scoped data
  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );
  const teachers = useMemo(
    () => db.teachers.filter((t) => t.instituteId === institute.id && t.status === 'active'),
    [db.teachers, institute.id]
  );
  const staff = useMemo(
    () => db.staff.filter((st) => st.instituteId === institute.id && st.status === 'active'),
    [db.staff, institute.id]
  );

  const batches = useMemo(
    () => Array.from(new Set(students.map((s) => s.batchName))),
    [students]
  );

  const filteredStudents = useMemo(
    () => (batchFilter === 'ALL' ? students : students.filter((s) => s.batchName === batchFilter)),
    [students, batchFilter]
  );
  const filteredStudentIds = useMemo(
    () => new Set(filteredStudents.map((s) => s.id)),
    [filteredStudents]
  );

  // Date Attendance KPIs computed strictly from stored records
  const dateAttendance = db.studentAttendance.filter(
    (a) => a.instituteId === institute.id && a.date === selectedDate && filteredStudentIds.has(a.studentId)
  );
  const presentToday = dateAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const absentToday = dateAttendance.filter((a) => a.status === 'absent').length;
  const markedToday = dateAttendance.length;
  const attendancePctToday =
    markedToday > 0 ? Number(((presentToday / markedToday) * 100).toFixed(1)) : 0;

  // Staff attendance for selectedDate
  const staffAttDate = db.staffAttendance.filter(
    (a) => a.instituteId === institute.id && a.date === selectedDate
  );
  const staffPresentCount = staffAttDate.filter((a) => a.status === 'present' || a.status === 'late').length;

  // Fees collected & pending calculated from actual fee records
  const feeRecords = db.feeRecords.filter(
    (f) => f.instituteId === institute.id && filteredStudentIds.has(f.studentId)
  );
  const totalCollected = feeRecords.reduce((sum, f) => sum + f.paidAmount, 0);
  const totalPending = feeRecords.reduce(
    (sum, f) => sum + Math.max(0, f.baseAmount - f.discount + f.lateFee - f.paidAmount),
    0
  );

  // Monthly attendance chart data (last 7 marked dates)
  const attendanceTrendData = useMemo(() => {
    const byDate = new Map<string, { present: number; total: number }>();
    db.studentAttendance
      .filter((a) => a.instituteId === institute.id && filteredStudentIds.has(a.studentId))
      .forEach((a) => {
        const cur = byDate.get(a.date) || { present: 0, total: 0 };
        cur.total++;
        if (a.status === 'present' || a.status === 'late') cur.present++;
        byDate.set(a.date, cur);
      });
    return Array.from(byDate.entries())
      .sort(([d1], [d2]) => d1.localeCompare(d2))
      .slice(-7)
      .map(([date, val]) => ({
        label: date.slice(5),
        value: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
      }));
  }, [db.studentAttendance, institute.id, filteredStudentIds]);

  // Batch-wise attendance bar chart
  const batchAttendanceData = useMemo(() => {
    return batches.map((b) => {
      const bIds = new Set(students.filter((s) => s.batchName === b).map((s) => s.id));
      const recs = db.studentAttendance.filter((a) => a.instituteId === institute.id && bIds.has(a.studentId));
      const pres = recs.filter((r) => r.status === 'present' || r.status === 'late').length;
      const pct = recs.length > 0 ? Math.round((pres / recs.length) * 100) : 0;
      return {
        label: b.length > 14 ? `${b.slice(0, 12)}..` : b,
        value: pct,
      };
    });
  }, [batches, students, db.studentAttendance, institute.id]);

  // Test performance line chart (published tests average %)
  const tests = db.tests.filter(
    (t) =>
      t.instituteId === institute.id &&
      (batchFilter === 'ALL' || t.batchName === batchFilter)
  );
  const publishedTests = tests
    .filter((t) => t.status === 'published')
    .sort((a, b) => a.testDate.localeCompare(b.testDate));

  const testPerfData = publishedTests.map((t) => {
    const analytics = computeTestAnalytics(t, students, db.tests, db.testMarks);
    const avgPct = t.maxMarks > 0 ? Number(((analytics.classAverage / t.maxMarks) * 100).toFixed(1)) : 0;
    return {
      label: t.name.slice(0, 14),
      value: avgPct,
    };
  });

  const upcomingTests = tests
    .filter((t) => t.testDate >= today)
    .sort((a, b) => a.testDate.localeCompare(b.testDate))
    .slice(0, 4);

  const recentNotifications = db.notificationsOutbox
    .filter((n) => n.instituteId === institute.id)
    .slice(0, 4);

  const recentActivities = db.activityLogs
    .filter((a) => a.instituteId === institute.id)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Institute Operations Overview
          </h2>
          <p className="text-xs text-slate-500">
            All counters and charts are computed live from stored records for {institute.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent focus:outline-none tabular-nums"
            />
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <select
              value={batchFilter}
              onChange={(e) => setBatchFilter(e.target.value)}
              className="bg-transparent focus:outline-none"
            >
              <option value="ALL">All Batches</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('students')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">Total Active Students</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {filteredStudents.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">{batches.length} active batches</p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('teachers_staff')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">Teachers & Staff</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {teachers.length} <span className="text-sm font-normal text-slate-500">Faculty</span> · {staff.length}{' '}
            <span className="text-sm font-normal text-slate-500">Staff</span>
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Staff present ({selectedDate.slice(5)}): {staffPresentCount}/{staffAttDate.length || teachers.length + staff.length}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('attendance')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">Student Attendance ({selectedDate.slice(5)})</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-slate-900 tabular-nums">
            {markedToday > 0 ? `${attendancePctToday}%` : 'Unmarked'}
          </p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">
            Present: {presentToday} · Absent: {absentToday}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('fees')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 transition-colors"
        >
          <p className="text-xs font-medium text-slate-500">Fee Collection vs Pending</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-emerald-700 tabular-nums">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-amber-700 tabular-nums">
            Pending: ₹{totalPending.toLocaleString('en-IN')}
          </p>
        </button>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Daily Attendance Trend</h3>
              <p className="text-xs text-slate-500">Recent working days attendance %</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Mark Attendance →
            </button>
          </div>
          <BarTrendChart
            data={attendanceTrendData}
            primaryColor={institute.primaryColor}
            primaryLabel="Attendance %"
            maxValue={100}
            formatValue={(v) => `${v}%`}
          />
        </div>

        <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Fee Collection Breakdown</h3>
              <p className="text-xs text-slate-500">Collected vs pending dues across filtered batch</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('fees')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Open Fee Desk →
            </button>
          </div>
          <DonutBreakdownChart
            centerLabel="Net Billed"
            centerValue={`₹${(totalCollected + totalPending).toLocaleString('en-IN')}`}
            segments={[
              { label: 'Collected Fees', value: totalCollected, color: '#16A34A' },
              { label: 'Pending / Overdue Fees', value: totalPending, color: '#D97706' },
            ]}
          />
        </div>
      </div>

      {/* Second Charts Row: Batch Attendance & Test Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Batch-Wise Attendance</h3>
          <p className="text-xs text-slate-500 mb-4">Cumulative present rate per coaching batch</p>
          <BarTrendChart
            data={batchAttendanceData}
            primaryColor={institute.secondaryColor}
            primaryLabel="Batch Attendance %"
            maxValue={100}
            formatValue={(v) => `${v}%`}
          />
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Published Examination Performance</h3>
              <p className="text-xs text-slate-500">Class average percentage across published tests</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('exams')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Manage Exams →
            </button>
          </div>
          <LineTrendChart data={testPerfData} color={institute.secondaryColor} unit="%" />
        </div>
      </div>

      {/* Bottom Operational Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Tests & Recent Results */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Upcoming & Recent Tests</h3>
            <button
              type="button"
              onClick={() => onNavigate('exams')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {upcomingTests.length === 0 && publishedTests.length === 0 && (
              <p className="text-xs text-slate-500 py-4">No tests scheduled yet.</p>
            )}
            {upcomingTests.map((t) => (
              <div key={t.id} className="py-2.5">
                <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                <p className="text-xs text-slate-500">
                  Upcoming · {t.testDate} · {t.batchName} · Max {t.maxMarks}
                </p>
              </div>
            ))}
            {publishedTests.slice(-2).map((t) => {
              const an = computeTestAnalytics(t, students, db.tests, db.testMarks);
              return (
                <div key={t.id} className="py-2.5">
                  <p className="text-sm font-medium text-slate-900 truncate">{t.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    Published · Avg {an.classAverage}/{t.maxMarks} · Pass {an.passPercentage}%
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Simulated Notifications */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Notification Outbox</h3>
            <button
              type="button"
              onClick={() => onNavigate('notifications')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Open Outbox
            </button>
          </div>
          <div className="mt-4 divide-y divide-slate-100">
            {recentNotifications.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No notifications queued yet.</p>
            ) : (
              recentNotifications.map((n) => (
                <div key={n.id} className="py-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900">{n.recipientName}</span>
                    <span className="text-amber-700 font-medium">
                      {n.channel.toUpperCase()} · SIMULATED
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{n.messageContent}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-slate-900">Recent Institute Activity</h3>
          <div className="mt-4 divide-y divide-slate-100">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No recent activity logged.</p>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="py-2.5">
                  <p className="text-xs font-medium text-slate-900">{act.action}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {act.actorName} · {act.timestamp.slice(0, 10)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
