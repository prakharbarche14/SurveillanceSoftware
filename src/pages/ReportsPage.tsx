import React, { useMemo, useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { ERPDatabase, Institute } from '../types/erp';
import { calculateStudentAttendanceSummary, computeTestAnalytics } from '../lib/erpStore';
import { downloadCsv, downloadGenericTablePdf, downloadStudentReportCardPdf } from '../lib/exports';

export function ReportsPage({
  db,
  institute,
  canAccessPayroll,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  canAccessPayroll: boolean;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);

  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );
  const policy = db.attendancePolicies.find((p) => p.instituteId === institute.id);
  const tests = db.tests.filter((t) => t.instituteId === institute.id);
  const latestPublishedTest = tests.find((t) => t.status === 'published') || tests[0];

  const reportCards = [
    {
      title: '1. Daily Student Attendance',
      desc: `Attendance status for ${selectedDate}`,
      onCsv: () => {
        const rows = students.map((s) => {
          const rec = db.studentAttendance.find((a) => a.studentId === s.id && a.date === selectedDate);
          return [s.studentCode, s.fullName, s.batchName, selectedDate, rec?.status || 'Unmarked'];
        });
        downloadCsv(`${institute.instituteCode}_Daily_Attendance_${selectedDate}.csv`, ['ID', 'Student', 'Batch', 'Date', 'Status'], rows);
        onNotify('success', 'Daily attendance CSV downloaded.');
      },
      onPdf: () => {
        const rows = students.map((s) => {
          const rec = db.studentAttendance.find((a) => a.studentId === s.id && a.date === selectedDate);
          return [s.studentCode, s.fullName, s.batchName, (rec?.status || 'Unmarked').toUpperCase()];
        });
        downloadGenericTablePdf(institute, `DAILY ATTENDANCE (${selectedDate})`, `${institute.instituteCode}_Daily_Att.pdf`, ['ID', 'Student', 'Batch', 'Status'], rows);
        onNotify('success', 'Branded daily attendance PDF downloaded.');
      },
    },
    {
      title: '2. Monthly Attendance & History',
      desc: 'Cumulative working days & attendance % per student',
      onCsv: () => {
        const rows = students.map((s) => {
          const sum = calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy);
          return [s.studentCode, s.fullName, s.batchName, sum.applicableWorkingDays, sum.presentDays + sum.lateDays, sum.absentDays, `${sum.percentage}%`];
        });
        downloadCsv(`${institute.instituteCode}_Monthly_Attendance.csv`, ['ID', 'Student', 'Batch', 'Working Days', 'Present', 'Absent', '%'], rows);
        onNotify('success', 'Monthly attendance CSV downloaded.');
      },
      onPdf: () => {
        const rows = students.map((s) => {
          const sum = calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy);
          return [s.studentCode, s.fullName, s.batchName, sum.presentDays + sum.lateDays, sum.absentDays, `${sum.percentage}%`];
        });
        downloadGenericTablePdf(institute, 'MONTHLY ATTENDANCE REPORT', `${institute.instituteCode}_Monthly_Att.pdf`, ['ID', 'Student', 'Batch', 'Present', 'Absent', 'Att %'], rows);
        onNotify('success', 'Branded monthly attendance PDF downloaded.');
      },
    },
    {
      title: '3. Absent Student List & Low Attendance',
      desc: `Students absent on ${selectedDate} or below ${policy?.lowAttendanceThreshold ?? 75}%`,
      onCsv: () => {
        const rows = students
          .filter((s) => {
            const rec = db.studentAttendance.find((a) => a.studentId === s.id && a.date === selectedDate);
            const sum = calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy);
            return rec?.status === 'absent' || sum.isBelowThreshold;
          })
          .map((s) => {
            const sum = calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy);
            return [s.studentCode, s.fullName, s.batchName, s.parentMobile, `${sum.percentage}%`];
          });
        downloadCsv(`${institute.instituteCode}_Absent_Low_Attendance.csv`, ['ID', 'Student', 'Batch', 'Parent Mobile', 'Overall %'], rows);
        onNotify('success', 'Absent & low attendance CSV downloaded.');
      },
      onPdf: () => {
        const rows = students
          .filter((s) => calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy).isBelowThreshold)
          .map((s) => {
            const sum = calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy);
            return [s.fullName, s.batchName, s.parentMobile, `${sum.percentage}%`];
          });
        downloadGenericTablePdf(institute, 'LOW ATTENDANCE ALERT LIST', `${institute.instituteCode}_Low_Att.pdf`, ['Student', 'Batch', 'Parent Contact', 'Att %'], rows.length ? rows : [['None', '-', '-', '-']]);
        onNotify('success', 'Branded low attendance PDF downloaded.');
      },
    },
    {
      title: '4. Batch Attendance Summary',
      desc: 'Batch-wise average attendance and headcount',
      onCsv: () => {
        const batches = Array.from(new Set(students.map((s) => s.batchName)));
        const rows = batches.map((b) => {
          const bs = students.filter((s) => s.batchName === b);
          const avg = bs.length ? (bs.reduce((acc, s) => acc + calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy).percentage, 0) / bs.length).toFixed(1) : '0';
          return [b, bs.length, `${avg}%`];
        });
        downloadCsv(`${institute.instituteCode}_Batch_Attendance.csv`, ['Batch', 'Students', 'Avg Attendance %'], rows);
        onNotify('success', 'Batch attendance CSV downloaded.');
      },
      onPdf: () => {
        const batches = Array.from(new Set(students.map((s) => s.batchName)));
        const rows = batches.map((b) => {
          const bs = students.filter((s) => s.batchName === b);
          const avg = bs.length ? (bs.reduce((acc, s) => acc + calculateStudentAttendanceSummary(s.id, db.studentAttendance, policy).percentage, 0) / bs.length).toFixed(1) : '0';
          return [b, bs.length, `${avg}%`];
        });
        downloadGenericTablePdf(institute, 'BATCH-WISE ATTENDANCE REPORT', `${institute.instituteCode}_Batch_Att.pdf`, ['Batch', 'Total Students', 'Average Attendance'], rows);
        onNotify('success', 'Branded batch attendance PDF downloaded.');
      },
    },
    {
      title: '5. Test Results & Class Performance',
      desc: latestPublishedTest ? latestPublishedTest.name : 'No tests available',
      onCsv: () => {
        if (!latestPublishedTest) return;
        const an = computeTestAnalytics(latestPublishedTest, students, db.tests, db.testMarks);
        downloadCsv(
          `${institute.instituteCode}_Test_Results.csv`,
          ['Roll', 'Student', 'Marks', 'Max', '%', 'Grade', 'Rank'],
          an.results.map((r) => [r.rollNumber, r.studentName, r.isAbsent ? 'ABSENT' : r.obtainedMarks ?? '-', r.maxMarks, r.percentage ?? '-', r.grade, r.rank ?? '-'])
        );
        onNotify('success', 'Test results CSV downloaded.');
      },
      onPdf: () => {
        if (!latestPublishedTest) return;
        const an = computeTestAnalytics(latestPublishedTest, students, db.tests, db.testMarks);
        downloadGenericTablePdf(
          institute,
          `CLASS PERFORMANCE — ${latestPublishedTest.name}`,
          `${institute.instituteCode}_Test_Performance.pdf`,
          ['Roll', 'Student', 'Marks', '%', 'Grade', 'Rank'],
          an.results.map((r) => [r.rollNumber, r.studentName, r.isAbsent ? 'ABSENT' : `${r.obtainedMarks ?? '-'}/${r.maxMarks}`, r.percentage ? `${r.percentage}%` : '-', r.grade, r.rank ? `#${r.rank}` : '-'])
        );
        onNotify('success', 'Branded class performance PDF downloaded.');
      },
    },
    {
      title: '6. Sample Individual Report Card PDF',
      desc: latestPublishedTest && students[0] ? `${students[0].fullName} — ${latestPublishedTest.subject}` : 'Requires published test',
      onPdf: () => {
        if (!latestPublishedTest || !students[0]) return;
        const an = computeTestAnalytics(latestPublishedTest, students, db.tests, db.testMarks);
        const res = an.results.find((r) => r.studentId === students[0].id) || an.results[0];
        const stu = students.find((s) => s.id === res.studentId) || students[0];
        downloadStudentReportCardPdf(institute, stu, latestPublishedTest, res, an);
        onNotify('success', 'Sample branded report card PDF downloaded.');
      },
    },
    {
      title: '7. Fee Collection & Pending Fees',
      desc: 'Student fee ledger, paid receipts, and overdue dues',
      onCsv: () => {
        const rows = db.feeRecords
          .filter((f) => f.instituteId === institute.id)
          .map((f) => {
            const s = students.find((x) => x.id === f.studentId);
            const net = f.baseAmount - f.discount + f.lateFee;
            return [s?.fullName || '', f.title, net, f.paidAmount, Math.max(0, net - f.paidAmount), f.status];
          });
        downloadCsv(`${institute.instituteCode}_Fees_Report.csv`, ['Student', 'Title', 'Net Fee', 'Paid', 'Pending', 'Status'], rows);
        onNotify('success', 'Fee collection CSV downloaded.');
      },
      onPdf: () => {
        const rows = db.feeRecords
          .filter((f) => f.instituteId === institute.id)
          .map((f) => {
            const s = students.find((x) => x.id === f.studentId);
            const net = f.baseAmount - f.discount + f.lateFee;
            return [s?.fullName || '', f.title, `INR ${f.paidAmount}`, `INR ${Math.max(0, net - f.paidAmount)}`, f.status.toUpperCase()];
          });
        downloadGenericTablePdf(institute, 'FEE COLLECTION & PENDING DUES', `${institute.instituteCode}_Fees.pdf`, ['Student', 'Fee Item', 'Paid', 'Pending', 'Status'], rows);
        onNotify('success', 'Branded fees PDF downloaded.');
      },
    },
    {
      title: '8. Staff Attendance & Payroll Summary',
      desc: canAccessPayroll ? 'Teacher & staff monthly attendance and payroll ledger' : 'Staff attendance summary (Payroll restricted)',
      onCsv: () => {
        const rows = db.staffAttendance
          .filter((a) => a.instituteId === institute.id)
          .map((a) => [a.date, a.employeeType, a.employeeId, a.status]);
        downloadCsv(`${institute.instituteCode}_Staff_Attendance.csv`, ['Date', 'Type', 'Employee ID', 'Status'], rows);
        onNotify('success', 'Staff attendance CSV downloaded.');
      },
      onPdf: () => {
        if (canAccessPayroll) {
          const rows = db.payrollRecords
            .filter((p) => p.instituteId === institute.id)
            .map((p) => [p.monthKey, p.employeeName, p.designation, `INR ${p.netSalary}`, p.status.toUpperCase()]);
          downloadGenericTablePdf(institute, 'INSTITUTE PAYROLL REPORT', `${institute.instituteCode}_Payroll.pdf`, ['Month', 'Employee', 'Role', 'Net Salary', 'Status'], rows);
          onNotify('success', 'Branded payroll PDF downloaded.');
        } else {
          const rows = db.staffAttendance
            .filter((a) => a.instituteId === institute.id)
            .slice(0, 30)
            .map((a) => [a.date, a.employeeType.toUpperCase(), a.employeeId, a.status.toUpperCase()]);
          downloadGenericTablePdf(institute, 'STAFF ATTENDANCE LOG', `${institute.instituteCode}_Staff_Att.pdf`, ['Date', 'Type', 'Employee Ref', 'Status'], rows);
          onNotify('success', 'Branded staff attendance PDF downloaded.');
        }
      },
    },
    {
      title: '9. Complete Student Directory',
      desc: `${students.length} active students with parent contacts`,
      onCsv: () => {
        downloadCsv(
          `${institute.instituteCode}_Student_List.csv`,
          ['ID', 'Roll', 'Name', 'Class', 'Batch', 'Parent', 'Mobile'],
          students.map((s) => [s.studentCode, s.rollNumber, s.fullName, s.className, s.batchName, s.parentName, s.parentMobile])
        );
        onNotify('success', 'Student list CSV downloaded.');
      },
      onPdf: () => {
        downloadGenericTablePdf(
          institute,
          'REGISTERED STUDENT DIRECTORY',
          `${institute.instituteCode}_Students.pdf`,
          ['ID', 'Name', 'Batch', 'Parent', 'Mobile'],
          students.map((s) => [s.studentCode, s.fullName, s.batchName, s.parentName, s.parentMobile])
        );
        onNotify('success', 'Branded student directory PDF downloaded.');
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900">
            Branded Reports & Export Center
          </h2>
          <p className="text-xs text-slate-500">
            Every PDF includes {institute.name} header branding, address, contact details, and authorized signature.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-600">Reference Date:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-mono-num"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-sm text-slate-900">{card.title}</h3>
              <p className="mt-1 text-xs text-slate-500">{card.desc}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              {card.onPdf && (
                <button
                  type="button"
                  onClick={card.onPdf}
                  style={{ backgroundColor: institute.primaryColor }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Download PDF
                </button>
              )}
              {card.onCsv && (
                <button
                  type="button"
                  onClick={card.onCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Export CSV
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { Download };
