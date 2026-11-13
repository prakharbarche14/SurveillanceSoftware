import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Download, Edit2, Plus, Save, Send, Trash2, X } from 'lucide-react';
import type { ERPDatabase, Institute, TestExam, TestMark } from '../types/erp';
import { computeTestAnalytics } from '../lib/erpStore';
import { downloadCsv, downloadGenericTablePdf, downloadStudentReportCardPdf } from '../lib/exports';
import { ConfirmDialog, EmptyState } from '../components/ui/Feedback';

export function ExamsPage({
  db,
  institute,
  actorName,
  canPublish,
  onSaveTest,
  onDeleteTest,
  onSaveMarks,
  onPublishTest,
  onAnnounceTest,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  actorName: string;
  canPublish: boolean;
  onSaveTest: (test: TestExam) => void;
  onDeleteTest: (testId: string) => void;
  onSaveMarks: (testId: string, marks: TestMark[]) => void;
  onPublishTest: (testId: string) => void;
  onAnnounceTest: (testId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const tests = useMemo(
    () =>
      db.tests
        .filter((t) => t.instituteId === institute.id)
        .sort((a, b) => b.testDate.localeCompare(a.testDate)),
    [db.tests, institute.id]
  );
  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batchName))), [students]);
  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.className))), [students]);

  const [selectedTestId, setSelectedTestId] = useState<string>(tests[0]?.id || '');
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestExam | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TestExam | null>(null);

  const selectedTest = tests.find((t) => t.id === selectedTestId) || tests[0];

  useEffect(() => {
    if (!selectedTestId && tests[0]) setSelectedTestId(tests[0].id);
  }, [tests, selectedTestId]);

  const [testForm, setTestForm] = useState<TestExam>({
    id: '',
    instituteId: institute.id,
    name: '',
    subject: 'Physics',
    className: classes[0] || 'Class 12',
    batchName: batches[0] || 'JEE Target 2027',
    testDate: new Date().toISOString().slice(0, 10),
    maxMarks: 100,
    passingMarks: 35,
    status: 'draft',
    createdBy: actorName,
  });

  const openNewTest = () => {
    setEditingTest(null);
    setTestForm({
      id: `tst-${Date.now()}`,
      instituteId: institute.id,
      name: '',
      subject: 'Physics',
      className: classes[0] || 'Class 12',
      batchName: batches[0] || 'JEE Target 2027',
      testDate: new Date().toISOString().slice(0, 10),
      maxMarks: 100,
      passingMarks: 35,
      status: 'draft',
      createdBy: actorName,
    });
    setTestModalOpen(true);
  };

  const openEditTest = (t: TestExam) => {
    setEditingTest(t);
    setTestForm({ ...t });
    setTestModalOpen(true);
  };

  const handleSubmitTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.name.trim() || testForm.maxMarks <= 0 || testForm.passingMarks < 0 || testForm.passingMarks > testForm.maxMarks) {
      onNotify('error', 'Enter valid test name, max marks (>0), and passing marks (<= max marks).');
      return;
    }
    onSaveTest(testForm);
    setSelectedTestId(testForm.id);
    setTestModalOpen(false);
    onNotify('success', editingTest ? 'Test details updated.' : 'New test created in Draft status.');
  };

  // Marks Draft State for selected test
  const batchStudents = useMemo(
    () => (selectedTest ? students.filter((s) => s.batchName === selectedTest.batchName) : []),
    [students, selectedTest]
  );

  const [marksDraft, setMarksDraft] = useState<
    Record<string, { obtainedMarks: string; isAbsent: boolean; remarks: string }>
  >({});

  useEffect(() => {
    if (!selectedTest) return;
    const next: Record<string, { obtainedMarks: string; isAbsent: boolean; remarks: string }> = {};
    batchStudents.forEach((s) => {
      const existing = db.testMarks.find((m) => m.testId === selectedTest.id && m.studentId === s.id);
      next[s.id] = {
        obtainedMarks:
          existing && existing.obtainedMarks !== null && !existing.isAbsent
            ? String(existing.obtainedMarks)
            : '',
        isAbsent: Boolean(existing?.isAbsent),
        remarks: existing?.remarks || '',
      };
    });
    setMarksDraft(next);
  }, [selectedTest, batchStudents, db.testMarks]);

  const analytics = useMemo(() => {
    if (!selectedTest) return null;
    return computeTestAnalytics(selectedTest, students, db.tests, db.testMarks);
  }, [selectedTest, students, db.tests, db.testMarks]);

  const handleSaveMarksDraft = () => {
    if (!selectedTest) return;
    const built: TestMark[] = [];
    for (const s of batchStudents) {
      const row = marksDraft[s.id];
      if (!row) continue;
      if (row.isAbsent) {
        built.push({
          id: `mk-${selectedTest.id}-${s.id}`,
          instituteId: institute.id,
          testId: selectedTest.id,
          studentId: s.id,
          obtainedMarks: null,
          isAbsent: true,
          remarks: row.remarks || 'Absent in exam',
          updatedAt: new Date().toISOString(),
        });
        continue;
      }
      if (row.obtainedMarks.trim() === '') continue;
      const num = Number(row.obtainedMarks);
      if (Number.isNaN(num) || num < 0 || num > selectedTest.maxMarks) {
        onNotify(
          'error',
          `Invalid marks for ${s.fullName}: must be between 0 and ${selectedTest.maxMarks}.`
        );
        return;
      }
      built.push({
        id: `mk-${selectedTest.id}-${s.id}`,
        instituteId: institute.id,
        testId: selectedTest.id,
        studentId: s.id,
        obtainedMarks: num,
        isAbsent: false,
        remarks: row.remarks,
        updatedAt: new Date().toISOString(),
      });
    }
    onSaveMarks(selectedTest.id, built);
    onNotify('success', `Saved marks for ${built.length} student(s).`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Test List */}
      <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-slate-900">Tests & Exams</h2>
          <button
            type="button"
            onClick={openNewTest}
            style={{ backgroundColor: institute.primaryColor }}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Test
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {tests.length === 0 ? (
            <p className="py-6 text-xs text-slate-500 text-center">No tests created yet.</p>
          ) : (
            tests.map((t) => {
              const active = selectedTest?.id === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTestId(t.id)}
                  className={`cursor-pointer rounded-lg p-3 transition-colors ${
                    active ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">{t.name}</p>
                    <span
                      className={`text-[11px] font-semibold shrink-0 ${
                        t.status === 'published' ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {t.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {t.subject} · {t.batchName} · {t.testDate}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono-num">
                      Max {t.maxMarks} · Pass {t.passingMarks}
                    </span>
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditTest(t)}
                        className="p-1 text-slate-500 hover:text-slate-900"
                        title="Edit Test"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(t)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete Test"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Marks Entry & Analytics */}
      <div className="lg:col-span-8 space-y-5">
        {!selectedTest || !analytics ? (
          <EmptyState
            title="Select or create an examination"
            description="Create a subject test to enter student marks, compute ranks, and publish report cards."
            actionLabel="Create First Test"
            onAction={openNewTest}
          />
        ) : (
          <>
            {/* Test Summary & Actions */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-slate-900">{selectedTest.name}</h3>
                  <p className="text-xs text-slate-500">
                    {selectedTest.subject} · {selectedTest.className} · {selectedTest.batchName} · Date:{' '}
                    {selectedTest.testDate} ·{' '}
                    <strong className={selectedTest.status === 'published' ? 'text-emerald-700' : 'text-amber-700'}>
                      {selectedTest.status === 'published'
                        ? 'PUBLISHED (Visible to Parents & Students)'
                        : 'DRAFT (Hidden from Parents & Students)'}
                    </strong>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onAnnounceTest(selectedTest.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Bell className="h-3.5 w-3.5" />
                    Send Test Reminder
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMarksDraft}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <Save className="h-3.5 w-3.5" />
                    Save Marks
                  </button>
                  {canPublish && (
                    <button
                      type="button"
                      onClick={() => {
                        handleSaveMarksDraft();
                        onPublishTest(selectedTest.id);
                      }}
                      style={{ backgroundColor: institute.primaryColor }}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white hover:opacity-95"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {selectedTest.status === 'published' ? 'Re-Publish & Notify' : 'Publish Results & Notify'}
                    </button>
                  )}
                </div>
              </div>

              {/* Calculated Analytics KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Class Average</span>
                  <p className="mt-0.5 font-display text-lg font-bold text-slate-900 tabular-nums">
                    {analytics.classAverage}/{selectedTest.maxMarks}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Highest Marks</span>
                  <p className="mt-0.5 font-display text-lg font-bold text-emerald-700 tabular-nums">
                    {analytics.highestMarks}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Lowest Marks</span>
                  <p className="mt-0.5 font-display text-lg font-bold text-slate-900 tabular-nums">
                    {analytics.lowestMarks}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Pass Rate</span>
                  <p className="mt-0.5 font-display text-lg font-bold text-blue-700 tabular-nums">
                    {analytics.passPercentage}%
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Appeared / Absent</span>
                  <p className="mt-0.5 font-display text-lg font-bold text-slate-900 tabular-nums">
                    {analytics.appearedCount} / {analytics.absentCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Marks Entry & Auto-Calculated Results Table */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700">
                  Marks Entry & Auto-Calculated Results ({batchStudents.length} Students in {selectedTest.batchName})
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadCsv(
                        `${selectedTest.name.replace(/\s+/g, '_')}_Results.csv`,
                        ['Roll', 'Student Name', 'Marks', 'Max', '%', 'Grade', 'Rank', 'Status', 'Improvement'],
                        analytics.results.map((r) => [
                          r.rollNumber,
                          r.studentName,
                          r.isAbsent ? 'ABSENT' : r.obtainedMarks ?? '-',
                          r.maxMarks,
                          r.percentage !== null ? `${r.percentage}%` : '-',
                          r.grade,
                          r.rank ?? '-',
                          r.isAbsent ? 'ABSENT' : r.passed ? 'PASS' : 'FAIL',
                          r.improvementDelta !== null ? `${r.improvementDelta}%` : '-',
                        ])
                      );
                      onNotify('success', 'Test results CSV downloaded.');
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="h-3 w-3" />
                    CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      downloadGenericTablePdf(
                        institute,
                        `CLASS PERFORMANCE — ${selectedTest.name}`,
                        `${selectedTest.name.replace(/\s+/g, '_')}_Summary.pdf`,
                        ['Roll', 'Student', 'Marks', '%', 'Grade', 'Rank'],
                        analytics.results.map((r) => [
                          r.rollNumber,
                          r.studentName,
                          r.isAbsent ? 'ABSENT' : `${r.obtainedMarks ?? '-'}/${r.maxMarks}`,
                          r.percentage !== null ? `${r.percentage}%` : '-',
                          r.grade,
                          r.rank ? `#${r.rank}` : '-',
                        ])
                      );
                      onNotify('success', 'Branded class performance PDF downloaded.');
                    }}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <Download className="h-3 w-3" />
                    Class PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="border-b border-slate-200 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5">Student</th>
                      <th className="px-3 py-2.5">Absent</th>
                      <th className="px-3 py-2.5">Marks (/{selectedTest.maxMarks})</th>
                      <th className="px-3 py-2.5 text-right">% / Grade</th>
                      <th className="px-3 py-2.5 text-right">Rank</th>
                      <th className="px-3 py-2.5 text-right">Improvement</th>
                      <th className="px-4 py-2.5 text-right">Report Card</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchStudents.map((stu) => {
                      const entry = marksDraft[stu.id] || { obtainedMarks: '', isAbsent: false, remarks: '' };
                      const computed = analytics.results.find((r) => r.studentId === stu.id);
                      return (
                        <tr key={stu.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5">
                            <p className="font-medium text-slate-900">{stu.fullName}</p>
                            <p className="text-[11px] text-slate-500 font-mono-num">{stu.rollNumber}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={entry.isAbsent}
                              onChange={(e) =>
                                setMarksDraft((prev) => ({
                                  ...prev,
                                  [stu.id]: {
                                    ...entry,
                                    isAbsent: e.target.checked,
                                    obtainedMarks: e.target.checked ? '' : entry.obtainedMarks,
                                  },
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <input
                              type="number"
                              min={0}
                              max={selectedTest.maxMarks}
                              disabled={entry.isAbsent}
                              value={entry.isAbsent ? '' : entry.obtainedMarks}
                              onChange={(e) =>
                                setMarksDraft((prev) => ({
                                  ...prev,
                                  [stu.id]: { ...entry, obtainedMarks: e.target.value },
                                }))
                              }
                              placeholder={entry.isAbsent ? 'ABSENT' : 'Enter'}
                              className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-mono-num disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num">
                            {computed?.isAbsent ? (
                              <span className="font-semibold text-red-600">ABSENT</span>
                            ) : computed?.percentage !== null && computed?.percentage !== undefined ? (
                              <span className={computed.passed ? 'text-emerald-700 font-semibold' : 'text-red-600 font-semibold'}>
                                {computed.percentage}% ({computed.grade})
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num font-semibold text-slate-900">
                            {computed?.rank ? `#${computed.rank}` : '-'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-num">
                            {computed?.improvementDelta !== null && computed?.improvementDelta !== undefined ? (
                              <span className={computed.improvementDelta >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                                {computed.improvementDelta >= 0 ? '+' : ''}
                                {computed.improvementDelta}%
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {computed && (
                              <button
                                type="button"
                                onClick={() => {
                                  downloadStudentReportCardPdf(
                                    institute,
                                    stu,
                                    selectedTest,
                                    computed,
                                    analytics
                                  );
                                  onNotify('success', `Report Card PDF downloaded for ${stu.fullName}.`);
                                }}
                                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                <Download className="h-3 w-3" />
                                PDF
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Test Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingTest ? 'Edit Test Details' : 'Create New Test'}
              </h3>
              <button type="button" onClick={() => setTestModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitTest} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Test Name *</label>
                <input
                  type="text"
                  required
                  value={testForm.name}
                  onChange={(e) => setTestForm({ ...testForm, name: e.target.value })}
                  placeholder="e.g. Rotational Dynamics Weekly Test"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Subject *</label>
                  <input
                    type="text"
                    required
                    value={testForm.subject}
                    onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Test Date *</label>
                  <input
                    type="date"
                    required
                    value={testForm.testDate}
                    onChange={(e) => setTestForm({ ...testForm, testDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Class *</label>
                  <input
                    type="text"
                    required
                    value={testForm.className}
                    onChange={(e) => setTestForm({ ...testForm, className: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Batch *</label>
                  <select
                    value={testForm.batchName}
                    onChange={(e) => setTestForm({ ...testForm, batchName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {batches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Maximum Marks *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={testForm.maxMarks}
                    onChange={(e) => setTestForm({ ...testForm, maxMarks: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Passing Marks *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={testForm.passingMarks}
                    onChange={(e) => setTestForm({ ...testForm, passingMarks: Number(e.target.value) })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono-num"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTestModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Save Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete Examination?"
        message={`Delete "${confirmDelete?.name}" and its entered marks? This cannot be undone.`}
        confirmLabel="Delete Test"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            onDeleteTest(confirmDelete.id);
            onNotify('info', 'Examination deleted.');
          }
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
