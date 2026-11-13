import type {
  ActivityLog,
  AttendancePolicy,
  AttendanceStatus,
  ERPDatabase,
  Institute,
  NotificationOutboxItem,
  NotificationSettings,
  SessionState,
  Student,
  TestExam,
  TestMark,
  UserRole,
} from '../types/erp';
import { createSeedDatabase } from './seedData';

const DB_STORAGE_KEY = 'edutrack_erp_db_v1';
const SESSION_STORAGE_KEY = 'edutrack_erp_session_v1';
const IDB_NAME = 'edutrack_erp_idb';
const IDB_STORE = 'kv';

// IndexedDB async mirror for resilient persistence
function writeIndexedDB(key: string, value: string): void {
  try {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) {
        req.result.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(value, key);
    };
  } catch {
    // fallback already handled by localStorage
  }
}

export async function hydrateFromIndexedDB(): Promise<ERPDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(IDB_STORE, 'readonly');
        const getReq = tx.objectStore(IDB_STORE).get(DB_STORAGE_KEY);
        getReq.onsuccess = () => {
          if (typeof getReq.result === 'string') {
            try {
              resolve(JSON.parse(getReq.result));
              return;
            } catch {
              resolve(null);
              return;
            }
          }
          resolve(null);
        };
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function loadDatabase(): ERPDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ERPDatabase;
      if (parsed && Array.isArray(parsed.institutes) && parsed.institutes.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}

export function saveDatabase(db: ERPDatabase): void {
  const json = JSON.stringify(db);
  try {
    localStorage.setItem(DB_STORAGE_KEY, json);
  } catch {
    // storage quota fallback
  }
  writeIndexedDB(DB_STORAGE_KEY, json);
  // Sync tenant snapshot to Express backend asynchronously (non-blocking)
  fetch('/api/tenant/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json,
  }).catch(() => {});
}

export function loadSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionState) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionState | null): void {
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function resetDatabaseToDemo(): ERPDatabase {
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}

// ============================================================================
// RBAC PERMISSIONS MATRIX
// ============================================================================
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'SaaS Super Admin',
  owner: 'Institute Owner',
  admin: 'Institute Admin',
  teacher: 'Teacher',
  accountant: 'Accountant',
  receptionist: 'Receptionist',
  parent: 'Parent',
  student: 'Student',
};

export interface RolePermissions {
  canViewDashboard: boolean;
  canManageBranding: boolean;
  canViewStudents: boolean;
  canEditStudents: boolean;
  canMarkAttendance: boolean;
  canManageAttendancePolicy: boolean;
  canManageExams: boolean;
  canPublishResults: boolean;
  canManageTeachers: boolean;
  canManageStaff: boolean;
  canManageStaffAttendance: boolean;
  canAccessPayroll: boolean;
  canManageFees: boolean;
  canManageTimetableHomework: boolean;
  canManageNotifications: boolean;
  canViewReports: boolean;
  canAccessSuperAdmin: boolean;
  isParentPortal: boolean;
  isStudentPortal: boolean;
}

export function getRolePermissions(role: UserRole): RolePermissions {
  switch (role) {
    case 'super_admin':
      return {
        canViewDashboard: false,
        canManageBranding: false,
        canViewStudents: false,
        canEditStudents: false,
        canMarkAttendance: false,
        canManageAttendancePolicy: false,
        canManageExams: false,
        canPublishResults: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageStaffAttendance: false,
        canAccessPayroll: false,
        canManageFees: false,
        canManageTimetableHomework: false,
        canManageNotifications: false,
        canViewReports: false,
        canAccessSuperAdmin: true,
        isParentPortal: false,
        isStudentPortal: false,
      };
    case 'owner':
    case 'admin':
      return {
        canViewDashboard: true,
        canManageBranding: true,
        canViewStudents: true,
        canEditStudents: true,
        canMarkAttendance: true,
        canManageAttendancePolicy: true,
        canManageExams: true,
        canPublishResults: true,
        canManageTeachers: true,
        canManageStaff: true,
        canManageStaffAttendance: true,
        canAccessPayroll: true,
        canManageFees: true,
        canManageTimetableHomework: true,
        canManageNotifications: true,
        canViewReports: true,
        canAccessSuperAdmin: false,
        isParentPortal: false,
        isStudentPortal: false,
      };
    case 'teacher':
      return {
        canViewDashboard: true,
        canManageBranding: false,
        canViewStudents: true,
        canEditStudents: false,
        canMarkAttendance: true,
        canManageAttendancePolicy: false,
        canManageExams: true,
        canPublishResults: true,
        canManageTeachers: false,
        canManageStaff: false,
        canManageStaffAttendance: false,
        canAccessPayroll: false,
        canManageFees: false,
        canManageTimetableHomework: true,
        canManageNotifications: false,
        canViewReports: true,
        canAccessSuperAdmin: false,
        isParentPortal: false,
        isStudentPortal: false,
      };
    case 'accountant':
      return {
        canViewDashboard: true,
        canManageBranding: false,
        canViewStudents: true,
        canEditStudents: false,
        canMarkAttendance: false,
        canManageAttendancePolicy: false,
        canManageExams: false,
        canPublishResults: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageStaffAttendance: false,
        canAccessPayroll: true,
        canManageFees: true,
        canManageTimetableHomework: false,
        canManageNotifications: false,
        canViewReports: true,
        canAccessSuperAdmin: false,
        isParentPortal: false,
        isStudentPortal: false,
      };
    case 'receptionist':
      return {
        canViewDashboard: true,
        canManageBranding: false,
        canViewStudents: true,
        canEditStudents: true,
        canMarkAttendance: true,
        canManageAttendancePolicy: false,
        canManageExams: false,
        canPublishResults: false,
        canManageTeachers: false,
        canManageStaff: true,
        canManageStaffAttendance: true,
        canAccessPayroll: false,
        canManageFees: true,
        canManageTimetableHomework: true,
        canManageNotifications: true,
        canViewReports: true,
        canAccessSuperAdmin: false,
        isParentPortal: false,
        isStudentPortal: false,
      };
    case 'parent':
      return {
        canViewDashboard: false,
        canManageBranding: false,
        canViewStudents: false,
        canEditStudents: false,
        canMarkAttendance: false,
        canManageAttendancePolicy: false,
        canManageExams: false,
        canPublishResults: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageStaffAttendance: false,
        canAccessPayroll: false,
        canManageFees: false,
        canManageTimetableHomework: false,
        canManageNotifications: false,
        canViewReports: false,
        canAccessSuperAdmin: false,
        isParentPortal: true,
        isStudentPortal: false,
      };
    case 'student':
      return {
        canViewDashboard: false,
        canManageBranding: false,
        canViewStudents: false,
        canEditStudents: false,
        canMarkAttendance: false,
        canManageAttendancePolicy: false,
        canManageExams: false,
        canPublishResults: false,
        canManageTeachers: false,
        canManageStaff: false,
        canManageStaffAttendance: false,
        canAccessPayroll: false,
        canManageFees: false,
        canManageTimetableHomework: false,
        canManageNotifications: false,
        canViewReports: false,
        canAccessSuperAdmin: false,
        isParentPortal: false,
        isStudentPortal: true,
      };
  }
}

// ============================================================================
// ATTENDANCE CALCULATION ENGINE (POLICY-AWARE)
// ============================================================================
export interface AttendanceSummary {
  studentId: string;
  totalMarkedDays: number;
  applicableWorkingDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  percentage: number;
  isBelowThreshold: boolean;
}

export function isWorkingDay(dateStr: string, policy?: AttendancePolicy): boolean {
  if (!policy) return new Date(dateStr).getDay() !== 0;
  const holidayDates = new Set(policy.holidays.map((h) => h.date));
  if (holidayDates.has(dateStr)) return false;
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return policy.workingDays.includes(day);
}

export function calculateStudentAttendanceSummary(
  studentId: string,
  records: ERPDatabase['studentAttendance'],
  policy?: AttendancePolicy,
  dateFilter?: { from?: string; to?: string }
): AttendanceSummary {
  const threshold = policy?.lowAttendanceThreshold ?? 75;
  const leaveTreatment = policy?.approvedLeaveTreatment ?? 'excused_excluded';

  const filtered = records.filter((r) => {
    if (r.studentId !== studentId) return false;
    if (dateFilter?.from && r.date < dateFilter.from) return false;
    if (dateFilter?.to && r.date > dateFilter.to) return false;
    // Exclude non-working days & holidays per institute policy
    return isWorkingDay(r.date, policy);
  });

  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let leaveDays = 0;

  filtered.forEach((r) => {
    if (r.status === 'present') presentDays++;
    else if (r.status === 'late') lateDays++;
    else if (r.status === 'absent') absentDays++;
    else if (r.status === 'leave') leaveDays++;
  });

  let effectivePresent = presentDays + lateDays;
  let applicableWorkingDays = presentDays + lateDays + absentDays;

  if (leaveTreatment === 'counted_present') {
    effectivePresent += leaveDays;
    applicableWorkingDays += leaveDays;
  } else if (leaveTreatment === 'counted_absent') {
    applicableWorkingDays += leaveDays;
  }
  // 'excused_excluded': leaveDays neither increase numerator nor denominator

  const percentage =
    applicableWorkingDays > 0
      ? Number(((effectivePresent / applicableWorkingDays) * 100).toFixed(1))
      : 100;

  return {
    studentId,
    totalMarkedDays: filtered.length,
    applicableWorkingDays,
    presentDays,
    lateDays,
    absentDays,
    leaveDays,
    percentage,
    isBelowThreshold: applicableWorkingDays > 0 && percentage < threshold,
  };
}

// ============================================================================
// EXAMINATION & RESULT CALCULATION ENGINE
// ============================================================================
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 35) return 'D';
  return 'F';
}

export interface ComputedStudentResult {
  studentId: string;
  studentName: string;
  rollNumber: string;
  obtainedMarks: number | null;
  maxMarks: number;
  isAbsent: boolean;
  percentage: number | null;
  grade: string;
  passed: boolean;
  rank: number | null;
  improvementDelta: number | null; // percentage points compared to previous test in same subject/batch
  remarks?: string;
}

export interface TestAnalytics {
  test: TestExam;
  results: ComputedStudentResult[];
  appearedCount: number;
  absentCount: number;
  passCount: number;
  passPercentage: number;
  classAverage: number;
  highestMarks: number;
  lowestMarks: number;
}

export function computeTestAnalytics(
  test: TestExam,
  students: Student[],
  allTests: TestExam[],
  allMarks: TestMark[]
): TestAnalytics {
  const batchStudents = students.filter(
    (s) => s.instituteId === test.instituteId && s.status === 'active' && s.batchName === test.batchName
  );
  const marksForTest = allMarks.filter((m) => m.testId === test.id);

  // Find previous test in same batch & subject for improvement comparison
  const previousTests = allTests
    .filter(
      (t) =>
        t.instituteId === test.instituteId &&
        t.batchName === test.batchName &&
        t.subject === test.subject &&
        t.testDate < test.testDate &&
        t.id !== test.id
    )
    .sort((a, b) => b.testDate.localeCompare(a.testDate));
  const prevTest = previousTests[0];

  const rawEntries: ComputedStudentResult[] = batchStudents.map((stu) => {
    const mk = marksForTest.find((m) => m.studentId === stu.id);
    if (!mk || mk.isAbsent || mk.obtainedMarks === null) {
      return {
        studentId: stu.id,
        studentName: stu.fullName,
        rollNumber: stu.rollNumber,
        obtainedMarks: null,
        maxMarks: test.maxMarks,
        isAbsent: Boolean(mk?.isAbsent),
        percentage: null,
        grade: mk?.isAbsent ? 'AB' : '-',
        passed: false,
        rank: null,
        improvementDelta: null,
        remarks: mk?.remarks,
      };
    }

    const pct = Number(((mk.obtainedMarks / test.maxMarks) * 100).toFixed(1));
    const passed = mk.obtainedMarks >= test.passingMarks;

    let improvementDelta: number | null = null;
    if (prevTest) {
      const prevMk = allMarks.find((m) => m.testId === prevTest.id && m.studentId === stu.id);
      if (prevMk && !prevMk.isAbsent && prevMk.obtainedMarks !== null) {
        const prevPct = (prevMk.obtainedMarks / prevTest.maxMarks) * 100;
        improvementDelta = Number((pct - prevPct).toFixed(1));
      }
    }

    return {
      studentId: stu.id,
      studentName: stu.fullName,
      rollNumber: stu.rollNumber,
      obtainedMarks: mk.obtainedMarks,
      maxMarks: test.maxMarks,
      isAbsent: false,
      percentage: pct,
      grade: calculateGrade(pct),
      passed,
      rank: null,
      improvementDelta,
      remarks: mk.remarks,
    };
  });

  // Compute dense ranks for appeared students
  const appeared = rawEntries
    .filter((r) => !r.isAbsent && r.obtainedMarks !== null)
    .sort((a, b) => (b.obtainedMarks ?? 0) - (a.obtainedMarks ?? 0));

  let currentRank = 0;
  let lastScore: number | null = null;
  const rankMap = new Map<string, number>();
  appeared.forEach((entry, idx) => {
    if (entry.obtainedMarks !== lastScore) {
      currentRank = idx + 1;
      lastScore = entry.obtainedMarks;
    }
    rankMap.set(entry.studentId, currentRank);
  });

  const results = rawEntries.map((r) => ({
    ...r,
    rank: rankMap.get(r.studentId) ?? null,
  }));

  const scores = appeared.map((a) => a.obtainedMarks as number);
  const appearedCount = appeared.length;
  const absentCount = results.filter((r) => r.isAbsent).length;
  const passCount = appeared.filter((a) => a.passed).length;
  const classAverage =
    appearedCount > 0 ? Number((scores.reduce((s, v) => s + v, 0) / appearedCount).toFixed(1)) : 0;
  const highestMarks = appearedCount > 0 ? Math.max(...scores) : 0;
  const lowestMarks = appearedCount > 0 ? Math.min(...scores) : 0;
  const passPercentage = appearedCount > 0 ? Number(((passCount / appearedCount) * 100).toFixed(1)) : 0;

  return {
    test,
    results,
    appearedCount,
    absentCount,
    passCount,
    passPercentage,
    classAverage,
    highestMarks,
    lowestMarks,
  };
}

// ============================================================================
// NOTIFICATION TEMPLATE & OUTBOX GENERATOR (DEDUPLICATED & SIMULATED)
// ============================================================================
export function renderNotificationTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function enqueueSimulatedNotifications(
  db: ERPDatabase,
  institute: Institute,
  items: Array<Omit<NotificationOutboxItem, 'id' | 'instituteId' | 'deliveryStatus' | 'isSimulated' | 'createdAt'>>
): { nextDb: ERPDatabase; addedCount: number; skippedDuplicates: number } {
  const existingKeys = new Set(
    db.notificationsOutbox
      .filter((n) => n.instituteId === institute.id)
      .map((n) => n.dedupeKey)
  );

  const created: NotificationOutboxItem[] = [];
  let skippedDuplicates = 0;

  for (const item of items) {
    if (existingKeys.has(item.dedupeKey)) {
      skippedDuplicates++;
      continue;
    }
    existingKeys.add(item.dedupeKey);
    const hasInvalidPhone = !item.recipientNumber || item.recipientNumber.replace(/\D/g, '').length < 10;
    created.push({
      ...item,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      instituteId: institute.id,
      deliveryStatus: hasInvalidPhone ? 'simulated_error' : 'simulated',
      isSimulated: true,
      errorInfo: hasInvalidPhone ? 'Invalid or missing 10-digit mobile number' : undefined,
      createdAt: new Date().toISOString(),
    });
  }

  return {
    nextDb: {
      ...db,
      notificationsOutbox: [...created, ...db.notificationsOutbox],
    },
    addedCount: created.length,
    skippedDuplicates,
  };
}

export function buildChannelsToSend(settings: NotificationSettings): Array<'whatsapp' | 'sms'> {
  if (settings.defaultChannel === 'both') return ['whatsapp', 'sms'];
  return [settings.defaultChannel];
}

export function appendActivity(
  db: ERPDatabase,
  instituteId: string,
  actorName: string,
  actorRole: UserRole,
  action: string
): ERPDatabase {
  const entry: ActivityLog = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    instituteId,
    actorName,
    actorRole,
    action,
    timestamp: new Date().toISOString(),
  };
  return {
    ...db,
    activityLogs: [entry, ...db.activityLogs].slice(0, 120),
  };
}

export function generateAttendanceAlerts(
  db: ERPDatabase,
  institute: Institute,
  date: string,
  updatedEntries: Array<{ student: Student; status: AttendanceStatus; isCorrection: boolean }>
): { nextDb: ERPDatabase; addedCount: number } {
  const settings = db.notificationSettings.find((s) => s.instituteId === institute.id);
  if (!settings) return { nextDb: db, addedCount: 0 };

  const channels = buildChannelsToSend(settings);
  const queue: Array<
    Omit<NotificationOutboxItem, 'id' | 'instituteId' | 'deliveryStatus' | 'isSimulated' | 'createdAt'>
  > = [];

  for (const { student, status, isCorrection } of updatedEntries) {
    const shouldNotifyAbsent = status === 'absent' && settings.sendAbsentAlert;
    const shouldNotifyPresent = status === 'present' && settings.sendPresentConfirmation;
    const shouldNotifyCorrection = isCorrection;

    if (!shouldNotifyAbsent && !shouldNotifyPresent && !shouldNotifyCorrection) continue;

    const recipients: Array<{ role: 'parent' | 'student'; name: string; phone: string }> = [];
    if (settings.attendanceRecipient === 'parent' || settings.attendanceRecipient === 'both') {
      recipients.push({
        role: 'parent',
        name: student.parentName,
        phone: student.parentWhatsapp || student.parentMobile,
      });
    }
    if (settings.attendanceRecipient === 'student' || settings.attendanceRecipient === 'both') {
      recipients.push({
        role: 'student',
        name: student.fullName,
        phone: student.studentWhatsapp || student.studentMobile,
      });
    }

    for (const rec of recipients) {
      for (const ch of channels) {
        const template = ch === 'whatsapp' ? settings.whatsappTemplateAbsent : settings.smsTemplateAbsent;
        const baseMsg = renderNotificationTemplate(template, {
          studentName: student.fullName,
          status: status.toUpperCase(),
          date,
          instituteName: institute.name,
          institutePhone: institute.phone,
        });
        const msg = isCorrection ? `[Correction Notice] ${baseMsg}` : baseMsg;
        queue.push({
          dedupeKey: `att-${date}-${student.id}-${status}-${rec.role}-${ch}${isCorrection ? '-corr' : ''}`,
          recipientName: rec.name,
          recipientNumber: rec.phone,
          recipientRole: rec.role,
          notificationType: isCorrection
            ? 'attendance_correction'
            : status === 'absent'
            ? 'absent_alert'
            : 'present_confirmation',
          channel: ch,
          messageContent: msg,
        });
      }
    }
  }

  const res = enqueueSimulatedNotifications(db, institute, queue);
  return { nextDb: res.nextDb, addedCount: res.addedCount };
}
