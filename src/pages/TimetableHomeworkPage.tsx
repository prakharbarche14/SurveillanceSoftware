import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, Clock, Edit2, Plus, Trash2, X } from 'lucide-react';
import type { ERPDatabase, HomeworkAssignment, Institute, TimetableSlot } from '../types/erp';
import { EmptyState } from '../components/ui/Feedback';

export function TimetableHomeworkPage({
  db,
  institute,
  onSaveTimetableSlot,
  onDeleteTimetableSlot,
  onSaveHomework,
  onToggleHomeworkSubmission,
  onNotify,
}: {
  db: ERPDatabase;
  institute: Institute;
  onSaveTimetableSlot: (slot: TimetableSlot) => void;
  onDeleteTimetableSlot: (slotId: string) => void;
  onSaveHomework: (hw: HomeworkAssignment) => void;
  onToggleHomeworkSubmission: (homeworkId: string, studentId: string) => void;
  onNotify: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [tab, setTab] = useState<'timetable' | 'homework'>('timetable');
  const [viewBy, setViewBy] = useState<'batch' | 'teacher'>('batch');
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const teachers = useMemo(
    () => db.teachers.filter((t) => t.instituteId === institute.id && t.status === 'active'),
    [db.teachers, institute.id]
  );
  const students = useMemo(
    () => db.students.filter((s) => s.instituteId === institute.id && s.status === 'active'),
    [db.students, institute.id]
  );
  const batches = useMemo(() => Array.from(new Set(students.map((s) => s.batchName))), [students]);
  const classes = useMemo(() => Array.from(new Set(students.map((s) => s.className))), [students]);

  const slots = useMemo(
    () => db.timetable.filter((s) => s.instituteId === institute.id),
    [db.timetable, institute.id]
  );
  const homeworkList = useMemo(
    () => db.homework.filter((h) => h.instituteId === institute.id),
    [db.homework, institute.id]
  );

  const [slotModal, setSlotModal] = useState<TimetableSlot | null>(null);
  const [hwModal, setHwModal] = useState<HomeworkAssignment | null>(null);
  const [inspectHw, setInspectHw] = useState<HomeworkAssignment | null>(null);

  const visibleSlots = useMemo(() => {
    return slots.filter((s) => {
      if (selectedFilter === 'ALL') return true;
      return viewBy === 'batch' ? s.batchName === selectedFilter : s.teacherId === selectedFilter;
    });
  }, [slots, selectedFilter, viewBy]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('timetable')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
              tab === 'timetable' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Timetable Management
          </button>
          <button
            type="button"
            onClick={() => setTab('homework')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md ${
              tab === 'homework' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            Homework & Submissions ({homeworkList.length})
          </button>
        </div>
      </div>

      {/* TIMETABLE TAB */}
      {tab === 'timetable' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setViewBy('batch');
                    setSelectedFilter('ALL');
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    viewBy === 'batch' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Batch-wise View
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewBy('teacher');
                    setSelectedFilter('ALL');
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                    viewBy === 'teacher' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Teacher-wise View
                </button>
              </div>

              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
              >
                <option value="ALL">All {viewBy === 'batch' ? 'Batches' : 'Teachers'}</option>
                {viewBy === 'batch'
                  ? batches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))
                  : teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() =>
                setSlotModal({
                  id: `tt-${Date.now()}`,
                  instituteId: institute.id,
                  dayOfWeek: 'Monday',
                  startTime: '08:00',
                  endTime: '09:30',
                  subject: 'Physics',
                  teacherId: teachers[0]?.id || '',
                  className: classes[0] || 'Class 12',
                  batchName: batches[0] || 'JEE Target 2027',
                  roomNumber: 'Hall A-101',
                })
              }
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Class Slot
            </button>
          </div>

          {visibleSlots.length === 0 ? (
            <EmptyState
              title="No timetable slots found"
              description="Schedule lectures by batch, teacher, day, and classroom."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleSlots.map((slot) => {
                const teacher = teachers.find((t) => t.id === slot.teacherId);
                return (
                  <div key={slot.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{slot.subject}</p>
                        <p className="text-xs text-slate-500">
                          {slot.dayOfWeek} · {slot.startTime} – {slot.endTime}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSlotModal({ ...slot })}
                          className="p-1 text-slate-500 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteTimetableSlot(slot.id);
                            onNotify('info', 'Timetable slot removed.');
                          }}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <p>Faculty: {teacher?.fullName || 'Assigned Faculty'}</p>
                      <p>
                        Batch: {slot.batchName} ({slot.className}) · Room {slot.roomNumber}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* HOMEWORK TAB */}
      {tab === 'homework' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                setHwModal({
                  id: `hw-${Date.now()}`,
                  instituteId: institute.id,
                  teacherId: teachers[0]?.id || '',
                  subject: 'Physics',
                  className: classes[0] || 'Class 12',
                  batchName: batches[0] || 'JEE Target 2027',
                  title: '',
                  description: '',
                  attachmentName: '',
                  deadline: new Date().toISOString().slice(0, 10),
                  createdAt: new Date().toISOString().slice(0, 10),
                })
              }
              style={{ backgroundColor: institute.primaryColor }}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Create Homework Assignment
            </button>
          </div>

          {homeworkList.length === 0 ? (
            <EmptyState
              title="No homework assignments yet"
              description="Assign daily practice sheets (DPPs) or reading tasks to any batch."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworkList.map((hw) => {
                const batchStus = students.filter((s) => s.batchName === hw.batchName);
                const completedCount = batchStus.filter(
                  (s) =>
                    db.homeworkSubmissions.find(
                      (sub) => sub.homeworkId === hw.id && sub.studentId === s.id
                    )?.status === 'completed'
                ).length;
                const teacher = teachers.find((t) => t.id === hw.teacherId);
                return (
                  <div key={hw.id} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{hw.title}</p>
                        <p className="text-xs text-slate-500">
                          {hw.subject} · {hw.batchName} · By {teacher?.fullName || 'Faculty'}
                        </p>
                      </div>
                      <span className="text-xs font-mono-num text-slate-600 shrink-0">
                        Due {hw.deadline}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{hw.description}</p>
                    {hw.attachmentName && (
                      <p className="text-xs text-blue-700 font-medium">Attachment: {hw.attachmentName}</p>
                    )}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-600 tabular-nums">
                        Completed: {completedCount} / {batchStus.length} students
                      </span>
                      <button
                        type="button"
                        onClick={() => setInspectHw(hw)}
                        className="font-semibold text-blue-700 hover:underline"
                      >
                        Manage Submissions →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Timetable Slot Modal */}
      {slotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Timetable Slot</h3>
              <button type="button" onClick={() => setSlotModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSaveTimetableSlot(slotModal);
                setSlotModal(null);
                onNotify('success', 'Timetable schedule saved.');
              }}
              className="mt-4 grid grid-cols-2 gap-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">Day of Week</label>
                <select
                  value={slotModal.dayOfWeek}
                  onChange={(e) =>
                    setSlotModal({ ...slotModal, dayOfWeek: e.target.value as TimetableSlot['dayOfWeek'] })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Subject</label>
                <input
                  type="text"
                  required
                  value={slotModal.subject}
                  onChange={(e) => setSlotModal({ ...slotModal, subject: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Start Time</label>
                <input
                  type="time"
                  required
                  value={slotModal.startTime}
                  onChange={(e) => setSlotModal({ ...slotModal, startTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">End Time</label>
                <input
                  type="time"
                  required
                  value={slotModal.endTime}
                  onChange={(e) => setSlotModal({ ...slotModal, endTime: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Teacher</label>
                <select
                  value={slotModal.teacherId}
                  onChange={(e) => setSlotModal({ ...slotModal, teacherId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Batch</label>
                <select
                  value={slotModal.batchName}
                  onChange={(e) => setSlotModal({ ...slotModal, batchName: e.target.value })}
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
                <label className="block text-xs font-medium text-slate-700">Class</label>
                <input
                  type="text"
                  value={slotModal.className}
                  onChange={(e) => setSlotModal({ ...slotModal, className: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Room Number</label>
                <input
                  type="text"
                  value={slotModal.roomNumber}
                  onChange={(e) => setSlotModal({ ...slotModal, roomNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSlotModal(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Homework Modal */}
      {hwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">Assign Homework</h3>
              <button type="button" onClick={() => setHwModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!hwModal.title.trim()) return;
                onSaveHomework(hwModal);
                setHwModal(null);
                onNotify('success', 'Homework published to students and parents.');
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-slate-700">Assignment Title *</label>
                <input
                  type="text"
                  required
                  value={hwModal.title}
                  onChange={(e) => setHwModal({ ...hwModal, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Subject</label>
                  <input
                    type="text"
                    required
                    value={hwModal.subject}
                    onChange={(e) => setHwModal({ ...hwModal, subject: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Batch</label>
                  <select
                    value={hwModal.batchName}
                    onChange={(e) => setHwModal({ ...hwModal, batchName: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    {batches.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Description / Instructions</label>
                <textarea
                  rows={3}
                  required
                  value={hwModal.description}
                  onChange={(e) => setHwModal({ ...hwModal, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Attachment File (Optional)</label>
                  <input
                    type="file"
                    onChange={(e) =>
                      setHwModal({ ...hwModal, attachmentName: e.target.files?.[0]?.name || '' })
                    }
                    className="mt-1 w-full text-xs text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Deadline *</label>
                  <input
                    type="date"
                    required
                    value={hwModal.deadline}
                    onChange={(e) => setHwModal({ ...hwModal, deadline: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHwModal(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ backgroundColor: institute.primaryColor }}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
                >
                  Publish Homework
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submissions Inspector Modal */}
      {inspectHw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">{inspectHw.title}</h3>
                <p className="text-xs text-slate-500">{inspectHw.batchName} · Due {inspectHw.deadline}</p>
              </div>
              <button type="button" onClick={() => setInspectHw(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 divide-y divide-slate-100">
              {students
                .filter((s) => s.batchName === inspectHw.batchName)
                .map((stu) => {
                  const sub = db.homeworkSubmissions.find(
                    (x) => x.homeworkId === inspectHw.id && x.studentId === stu.id
                  );
                  const completed = sub?.status === 'completed';
                  return (
                    <div key={stu.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{stu.fullName}</p>
                        <p className="text-xs text-slate-500 font-mono-num">{stu.rollNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleHomeworkSubmission(inspectHw.id, stu.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          completed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {completed ? 'Completed' : 'Pending'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { BookOpen, CalendarDays };
