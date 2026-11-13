import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AttendancePolicy,
  AttendanceStatus,
  ERPDatabase,
  FeePayment,
  FeeRecord,
  HomeworkAssignment,
  Institute,
  LeaveRequest,
  NotificationOutboxItem,
  NotificationSettings,
  ParentAccount,
  PayrollRecord,
  SessionState,
  StaffMember,
  Student,
  SubscriptionHistoryItem,
  Teacher,
  TestExam,
  TestMark,
  TimetableSlot,
  UserAccount,
} from './types/erp';
import {
  appendActivity,
  buildChannelsToSend,
  calculateStudentAttendanceSummary,
  computeTestAnalytics,
  enqueueSimulatedNotifications,
  generateAttendanceAlerts,
  getRolePermissions,
  hydrateFromIndexedDB,
  loadDatabase,
  loadSession,
  renderNotificationTemplate,
  resetDatabaseToDemo,
  saveDatabase,
  saveSession,
} from './lib/erpStore';
import { ASSET_PATHS } from './lib/seedData';
import { ConfirmDialog, ToastContainer, type ToastItem } from './components/ui/Feedback';
import { AppShell, type NavSectionId } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { InstituteProfilePage } from './pages/InstituteProfilePage';
import { StudentsPage } from './pages/StudentsPage';
import { AttendancePage } from './pages/AttendancePage';
import { ExamsPage } from './pages/ExamsPage';
import { TeachersStaffPage } from './pages/TeachersStaffPage';
import { StaffAttendancePayrollPage } from './pages/StaffAttendancePayrollPage';
import { FeesPage } from './pages/FeesPage';
import { TimetableHomeworkPage } from './pages/TimetableHomeworkPage';
import { NotificationsSettingsPage } from './pages/NotificationsSettingsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ParentStudentPortal } from './pages/ParentStudentPortal';
import { SuperAdminPage } from './pages/SuperAdminPage';

function defaultSectionForRole(role: SessionState['role']): NavSectionId {
  if (role === 'super_admin') return 'super_admin';
  if (role === 'parent') return 'parent_portal';
  if (role === 'student') return 'student_portal';
  return 'dashboard';
}

export default function App() {
  const [db, setDb] = useState<ERPDatabase>(() => loadDatabase());
  const [session, setSession] = useState<SessionState | null>(() => loadSession());
  const [publicView, setPublicView] = useState<'landing' | 'auth'>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authInstituteId, setAuthInstituteId] = useState<string | undefined>(undefined);
  const [activeSection, setActiveSection] = useState<NavSectionId>(() =>
    session ? defaultSectionForRole(session.role) : 'dashboard'
  );
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Hydrate from IndexedDB if newer / available
  useEffect(() => {
    hydrateFromIndexedDB().then((idbData) => {
      if (idbData && Array.isArray(idbData.institutes) && idbData.institutes.length > 0) {
        setDb(idbData);
      }
    });
  }, []);

  const updateDb = useCallback((updater: (prev: ERPDatabase) => ERPDatabase) => {
    setDb((prev) => {
      const next = updater(prev);
      saveDatabase(next);
      return next;
    });
  }, []);

  const notify = useCallback((type: ToastItem['type'], message: string) => {
    setToasts((prev) => [...prev, { id: `toast-${Date.now()}-${Math.random()}`, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const activeInstitute = useMemo(
    () => (session?.instituteId ? db.institutes.find((i) => i.id === session.instituteId) : undefined),
    [db.institutes, session?.instituteId]
  );

  // Guard activeSection whenever session changes
  useEffect(() => {
    if (session) {
      setActiveSection(defaultSectionForRole(session.role));
    }
  }, [session?.userId]);

  const handleLoginSuccess = (user: UserAccount) => {
    const newSession: SessionState = {
      token: `sess-${Date.now()}`,
      userId: user.id,
      role: user.role,
      instituteId: user.instituteId,
      userName: user.name,
      email: user.email,
      linkedEntityId: user.linkedEntityId,
    };
    saveSession(newSession);
    setSession(newSession);
    setActiveSection(defaultSectionForRole(user.role));
    notify('success', `Signed in as ${user.name}.`);
  };

  const handleQuickDemoLogin = (email: string) => {
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      handleLoginSuccess(user);
    }
  };

  const handleLogout = () => {
    saveSession(null);
    setSession(null);
    setPublicView('auth');
    setAuthMode('login');
  };

  const handleRegisterInstitute = (payload: {
    ownerName: string;
    instituteName: string;
    mobile: string;
    email: string;
    password: string;
    address: string;
  }) => {
    const newInstId = `inst-${Date.now()}`;
    const codePrefix = payload.instituteName
      .replace(/[^A-Za-z]/g, '')
      .slice(0, 6)
      .toUpperCase() || 'INST';
    const instCode = `${codePrefix}-${Math.floor(100 + Math.random() * 899)}`;
    const today = new Date().toISOString().slice(0, 10);
    const trialEnd = new Date(Date.now() + 14 * 86400_000).toISOString().slice(0, 10);

    const newInstitute: Institute = {
      id: newInstId,
      instituteCode: instCode,
      name: payload.instituteName.trim(),
      tagline: 'Excellence in Competitive Exam Preparation',
      ownerName: payload.ownerName.trim(),
      phone: payload.mobile.trim(),
      whatsappNumber: payload.mobile.trim(),
      email: payload.email.trim(),
      address: payload.address.trim(),
      website: '',
      logoUrl: ASSET_PATHS.apexLogo,
      primaryColor: '#0F2A56',
      secondaryColor: '#1D4ED8',
      authorizedSignature: `${payload.ownerName.trim()} — Director`,
      planTier: 'standard',
      subscriptionStatus: 'trial',
      trialEndsAt: trialEnd,
      planExpiresAt: trialEnd,
      studentLimit: 500,
      staffLimit: 35,
      createdAt: today,
    };

    const newOwnerUser: UserAccount = {
      id: `usr-${Date.now()}`,
      instituteId: newInstId,
      name: payload.ownerName.trim(),
      email: payload.email.trim(),
      phone: payload.mobile.trim(),
      password: payload.password,
      role: 'owner',
      isActive: true,
    };

    updateDb((prev) => ({
      ...prev,
      institutes: [...prev.institutes, newInstitute],
      users: [...prev.users, newOwnerUser],
      subscriptionHistory: [
        ...prev.subscriptionHistory,
        {
          id: `sub-${Date.now()}`,
          instituteId: newInstId,
          planTier: 'standard',
          action: '14-Day Free Trial Started',
          amountInr: 0,
          status: 'trial',
          date: today,
          notes: 'Self-registered coaching institute workspace',
        },
      ],
      attendancePolicies: [
        ...prev.attendancePolicies,
        {
          instituteId: newInstId,
          workingDays: [1, 2, 3, 4, 5, 6],
          holidays: [],
          approvedLeaveTreatment: 'excused_excluded',
          lowAttendanceThreshold: 75,
        },
      ],
      notificationSettings: [
        ...prev.notificationSettings,
        {
          instituteId: newInstId,
          sendAbsentAlert: true,
          sendPresentConfirmation: false,
          sendLowAttendanceAlert: true,
          sendLeaveApprovalAlert: true,
          sendResultAlert: true,
          sendUpcomingTestAlert: true,
          sendFeeReminder: true,
          sendStaffNotification: true,
          attendanceRecipient: 'parent',
          resultRecipient: 'both',
          defaultChannel: 'whatsapp',
          preferredSendTime: '18:30',
          signatureLine: `${newInstitute.name} · ${newInstitute.phone}`,
          whatsappTemplateAbsent:
            'Dear Parent, {{studentName}} was marked {{status}} on {{date}} at {{instituteName}}. Contact {{institutePhone}}.',
          smsTemplateAbsent:
            '{{instituteName}}: {{studentName}} was {{status}} on {{date}}. Call {{institutePhone}}.',
          whatsappTemplateResult:
            '{{instituteName}} Result: {{studentName}} scored {{obtained}}/{{max}} ({{percentage}}%, Grade {{grade}}, {{passStatus}}) in {{testName}} ({{subject}}). Contact {{institutePhone}}.',
          smsTemplateResult:
            '{{instituteName}}: {{studentName}} scored {{obtained}}/{{max}} ({{percentage}}%, {{passStatus}}) in {{testName}}. {{institutePhone}}.',
        },
      ],
    }));

    handleLoginSuccess(newOwnerUser);
    notify('success', `Workspace created for ${newInstitute.name} (${instCode}).`);
  };

  // ============================================================================
  // PUBLIC VIEWS (LANDING & AUTH)
  // ============================================================================
  if (!session) {
    if (publicView === 'landing') {
      return (
        <>
          <LandingPage
            institutes={db.institutes}
            onNavigateAuth={(mode, instId) => {
              setAuthMode(mode);
              setAuthInstituteId(instId);
              setPublicView('auth');
            }}
            onQuickDemoLogin={handleQuickDemoLogin}
            onNotify={notify}
          />
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }

    return (
      <>
        <AuthPage
          db={db}
          initialMode={authMode}
          initialInstituteId={authInstituteId}
          onBackHome={() => setPublicView('landing')}
          onLoginSuccess={handleLoginSuccess}
          onRegisterInstitute={handleRegisterInstitute}
          onNotify={notify}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  // ============================================================================
  // AUTHENTICATED WORKSPACE HANDLERS (TENANT-SCOPED)
  // ============================================================================
  const perms = getRolePermissions(session.role);

  const handleSaveInstitute = (updated: Institute) => {
    updateDb((prev) => {
      let next = {
        ...prev,
        institutes: prev.institutes.map((i) => (i.id === updated.id ? updated : i)),
      };
      next = appendActivity(next, updated.id, session.userName, session.role, 'Updated institute profile and branding');
      return next;
    });
  };

  const handleSaveStudent = (student: Student, newParent?: ParentAccount) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const exists = prev.students.some((s) => s.id === student.id);
      const nextParents = newParent ? [...prev.parents, newParent] : prev.parents;
      const nextStudents = exists
        ? prev.students.map((s) => (s.id === student.id ? student : s))
        : [...prev.students, student];
      let next: ERPDatabase = { ...prev, parents: nextParents, students: nextStudents };
      next = appendActivity(
        next,
        activeInstitute.id,
        session.userName,
        session.role,
        `${exists ? 'Updated' : 'Admitted'} student ${student.fullName} (${student.batchName})`
      );
      return next;
    });
  };

  const handleDeleteStudent = (studentId: string) => {
    if (!activeInstitute) return;
    updateDb((prev) => ({
      ...prev,
      students: prev.students.filter((s) => !(s.id === studentId && s.instituteId === activeInstitute.id)),
    }));
  };

  const handleSaveAttendance = (
    date: string,
    entries: Array<{ studentId: string; status: AttendanceStatus }>
  ) => {
    if (!activeInstitute) return;
    let alertCount = 0;
    updateDb((prev) => {
      const updatedEntries: Array<{ student: Student; status: AttendanceStatus; isCorrection: boolean }> = [];
      let nextAttendance = [...prev.studentAttendance];

      for (const entry of entries) {
        const student = prev.students.find(
          (s) => s.id === entry.studentId && s.instituteId === activeInstitute.id
        );
        if (!student) continue;

        const existingIdx = nextAttendance.findIndex(
          (a) => a.instituteId === activeInstitute.id && a.studentId === entry.studentId && a.date === date
        );

        if (existingIdx >= 0) {
          const prevStatus = nextAttendance[existingIdx].status;
          const isCorrection = prevStatus !== entry.status;
          nextAttendance[existingIdx] = {
            ...nextAttendance[existingIdx],
            status: entry.status,
            markedBy: session.userName,
            updatedAt: new Date().toISOString(),
          };
          updatedEntries.push({ student, status: entry.status, isCorrection });
        } else {
          nextAttendance.push({
            id: `att-${entry.studentId}-${date}`,
            instituteId: activeInstitute.id,
            studentId: entry.studentId,
            date,
            status: entry.status,
            markedBy: session.userName,
            updatedAt: new Date().toISOString(),
          });
          updatedEntries.push({ student, status: entry.status, isCorrection: false });
        }
      }

      let next: ERPDatabase = { ...prev, studentAttendance: nextAttendance };
      const alertRes = generateAttendanceAlerts(next, activeInstitute, date, updatedEntries);
      next = alertRes.nextDb;
      alertCount = alertRes.addedCount;
      next = appendActivity(
        next,
        activeInstitute.id,
        session.userName,
        session.role,
        `Saved attendance for ${entries.length} students (${date}); queued ${alertCount} simulated alert(s)`
      );
      return next;
    });
    notify(
      'success',
      `Attendance saved for ${date}. ${alertCount} deduplicated notification(s) added to simulated outbox.`
    );
  };

  const handleSavePolicy = (policy: AttendancePolicy) => {
    updateDb((prev) => {
      const exists = prev.attendancePolicies.some((p) => p.instituteId === policy.instituteId);
      return {
        ...prev,
        attendancePolicies: exists
          ? prev.attendancePolicies.map((p) => (p.instituteId === policy.instituteId ? policy : p))
          : [...prev.attendancePolicies, policy],
      };
    });
  };

  const handleSendLowAttendanceAlerts = (studentIds: string[]) => {
    if (!activeInstitute) return;
    let added = 0;
    updateDb((prev) => {
      const settings = prev.notificationSettings.find((s) => s.instituteId === activeInstitute.id);
      const policy = prev.attendancePolicies.find((p) => p.instituteId === activeInstitute.id);
      if (!settings) return prev;
      const channels = buildChannelsToSend(settings);
      const today = new Date().toISOString().slice(0, 10);
      const queue: Array<
        Omit<NotificationOutboxItem, 'id' | 'instituteId' | 'deliveryStatus' | 'isSimulated' | 'createdAt'>
      > = [];

      studentIds.forEach((sid) => {
        const stu = prev.students.find((s) => s.id === sid && s.instituteId === activeInstitute.id);
        if (!stu) return;
        const sum = calculateStudentAttendanceSummary(sid, prev.studentAttendance, policy);
        channels.forEach((ch) => {
          queue.push({
            dedupeKey: `lowatt-${today}-${stu.id}-${ch}`,
            recipientName: stu.parentName,
            recipientNumber: stu.parentWhatsapp || stu.parentMobile,
            recipientRole: 'parent',
            notificationType: 'low_attendance_warning',
            channel: ch,
            messageContent: `${activeInstitute.name} Attendance Alert: ${stu.fullName}'s attendance is ${sum.percentage}%, below the ${policy?.lowAttendanceThreshold ?? 75}% requirement. Call ${activeInstitute.phone}.`,
          });
        });
      });

      const res = enqueueSimulatedNotifications(prev, activeInstitute, queue);
      added = res.addedCount;
      return res.nextDb;
    });
    notify('success', `Queued ${added} low-attendance warning(s) in simulated outbox.`);
  };

  const handleSaveTest = (test: TestExam) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const exists = prev.tests.some((t) => t.id === test.id);
      return {
        ...prev,
        tests: exists ? prev.tests.map((t) => (t.id === test.id ? test : t)) : [...prev.tests, test],
      };
    });
  };

  const handleDeleteTest = (testId: string) => {
    if (!activeInstitute) return;
    updateDb((prev) => ({
      ...prev,
      tests: prev.tests.filter((t) => !(t.id === testId && t.instituteId === activeInstitute.id)),
      testMarks: prev.testMarks.filter((m) => m.testId !== testId),
    }));
  };

  const handleSaveMarks = (testId: string, marks: TestMark[]) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const incomingIds = new Set(marks.map((m) => m.studentId));
      const kept = prev.testMarks.filter(
        (m) => !(m.testId === testId && incomingIds.has(m.studentId))
      );
      return {
        ...prev,
        testMarks: [...kept, ...marks],
      };
    });
  };

  const handlePublishTest = (testId: string) => {
    if (!activeInstitute) return;
    let added = 0;
    updateDb((prev) => {
      const test = prev.tests.find((t) => t.id === testId && t.instituteId === activeInstitute.id);
      if (!test) return prev;
      const publishedTest: TestExam = {
        ...test,
        status: 'published',
        publishedAt: new Date().toISOString().slice(0, 10),
      };
      const nextTests = prev.tests.map((t) => (t.id === testId ? publishedTest : t));
      const settings = prev.notificationSettings.find((s) => s.instituteId === activeInstitute.id);

      let next: ERPDatabase = { ...prev, tests: nextTests };

      if (settings && settings.sendResultAlert) {
        const analytics = computeTestAnalytics(publishedTest, prev.students, nextTests, prev.testMarks);
        const channels = buildChannelsToSend(settings);
        const queue: Array<
          Omit<NotificationOutboxItem, 'id' | 'instituteId' | 'deliveryStatus' | 'isSimulated' | 'createdAt'>
        > = [];

        analytics.results.forEach((res) => {
          const stu = prev.students.find((s) => s.id === res.studentId);
          if (!stu) return;

          const recipients: Array<{ role: 'parent' | 'student'; name: string; phone: string }> = [];
          if (settings.resultRecipient === 'parent' || settings.resultRecipient === 'both') {
            recipients.push({
              role: 'parent',
              name: stu.parentName,
              phone: stu.parentWhatsapp || stu.parentMobile,
            });
          }
          if (settings.resultRecipient === 'student' || settings.resultRecipient === 'both') {
            recipients.push({
              role: 'student',
              name: stu.fullName,
              phone: stu.studentWhatsapp || stu.studentMobile,
            });
          }

          recipients.forEach((rec) => {
            channels.forEach((ch) => {
              const tpl = ch === 'whatsapp' ? settings.whatsappTemplateResult : settings.smsTemplateResult;
              const msg = res.isAbsent
                ? `${activeInstitute.name}: ${stu.fullName} was ABSENT for ${publishedTest.name} (${publishedTest.subject}) on ${publishedTest.testDate}. Contact ${activeInstitute.phone}.`
                : renderNotificationTemplate(tpl, {
                    studentName: stu.fullName,
                    obtained: String(res.obtainedMarks ?? 0),
                    max: String(publishedTest.maxMarks),
                    percentage: String(res.percentage ?? 0),
                    grade: res.grade,
                    passStatus: res.passed ? 'PASS' : 'NEEDS IMPROVEMENT',
                    testName: publishedTest.name,
                    subject: publishedTest.subject,
                    instituteName: activeInstitute.name,
                    institutePhone: activeInstitute.phone,
                  });

              queue.push({
                dedupeKey: `res-${publishedTest.id}-${stu.id}-${rec.role}-${ch}`,
                recipientName: rec.name,
                recipientNumber: rec.phone,
                recipientRole: rec.role,
                notificationType: res.isAbsent
                  ? 'absent_in_test'
                  : !res.passed
                  ? 'low_marks_alert'
                  : 'test_result',
                channel: ch,
                messageContent: msg,
              });
            });
          });
        });

        const outRes = enqueueSimulatedNotifications(next, activeInstitute, queue);
        next = outRes.nextDb;
        added = outRes.addedCount;
      }

      next = appendActivity(
        next,
        activeInstitute.id,
        session.userName,
        session.role,
        `Published results for "${publishedTest.name}" and queued ${added} notification(s)`
      );
      return next;
    });
    notify('success', `Results published to Parent & Student portals. ${added} alert(s) queued.`);
  };

  const handleAnnounceTest = (testId: string) => {
    if (!activeInstitute) return;
    let added = 0;
    updateDb((prev) => {
      const test = prev.tests.find((t) => t.id === testId && t.instituteId === activeInstitute.id);
      const settings = prev.notificationSettings.find((s) => s.instituteId === activeInstitute.id);
      if (!test || !settings) return prev;
      const batchStudents = prev.students.filter(
        (s) => s.instituteId === activeInstitute.id && s.status === 'active' && s.batchName === test.batchName
      );
      const channels = buildChannelsToSend(settings);
      const queue: Array<
        Omit<NotificationOutboxItem, 'id' | 'instituteId' | 'deliveryStatus' | 'isSimulated' | 'createdAt'>
      > = [];

      batchStudents.forEach((stu) => {
        channels.forEach((ch) => {
          queue.push({
            dedupeKey: `announce-${test.id}-${stu.id}-${ch}`,
            recipientName: stu.parentName,
            recipientNumber: stu.parentWhatsapp || stu.parentMobile,
            recipientRole: 'parent',
            notificationType: 'test_announcement',
            channel: ch,
            messageContent: `${activeInstitute.name} Test Reminder: ${test.name} (${test.subject}, Max ${test.maxMarks}) for ${stu.fullName} is scheduled on ${test.testDate}. Helpline: ${activeInstitute.phone}.`,
          });
        });
      });

      const res = enqueueSimulatedNotifications(prev, activeInstitute, queue);
      added = res.addedCount;
      return res.nextDb;
    });
    notify('success', `Queued ${added} upcoming test reminder(s) in simulated outbox.`);
  };

  const handleSaveTeacher = (teacher: Teacher, loginPassword?: string) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const exists = prev.teachers.some((t) => t.id === teacher.id);
      const nextTeachers = exists
        ? prev.teachers.map((t) => (t.id === teacher.id ? teacher : t))
        : [...prev.teachers, teacher];
      const existingUser = prev.users.find((u) => u.linkedEntityId === teacher.id);
      let nextUsers = prev.users;
      if (!existingUser && teacher.email) {
        nextUsers = [
          ...prev.users,
          {
            id: `usr-${Date.now()}`,
            instituteId: activeInstitute.id,
            name: teacher.fullName,
            email: teacher.email,
            phone: teacher.mobile,
            password: loginPassword || 'demo',
            role: 'teacher',
            linkedEntityId: teacher.id,
            isActive: teacher.status === 'active',
          },
        ];
      } else if (existingUser) {
        nextUsers = prev.users.map((u) =>
          u.id === existingUser.id
            ? { ...u, name: teacher.fullName, email: teacher.email, isActive: teacher.status === 'active' }
            : u
        );
      }
      return { ...prev, teachers: nextTeachers, users: nextUsers };
    });
  };

  const handleSaveStaff = (staffMember: StaffMember) => {
    updateDb((prev) => {
      const exists = prev.staff.some((s) => s.id === staffMember.id);
      return {
        ...prev,
        staff: exists
          ? prev.staff.map((s) => (s.id === staffMember.id ? staffMember : s))
          : [...prev.staff, staffMember],
      };
    });
  };

  const handleSaveStaffAttendance = (
    date: string,
    entries: Array<{ employeeType: 'teacher' | 'staff'; employeeId: string; status: AttendanceStatus }>
  ) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const next = [...prev.staffAttendance];
      for (const e of entries) {
        const idx = next.findIndex(
          (x) => x.instituteId === activeInstitute.id && x.employeeId === e.employeeId && x.date === date
        );
        if (idx >= 0) {
          next[idx] = { ...next[idx], status: e.status, markedBy: session.userName };
        } else {
          next.push({
            id: `satt-${e.employeeId}-${date}`,
            instituteId: activeInstitute.id,
            employeeType: e.employeeType,
            employeeId: e.employeeId,
            date,
            status: e.status,
            markedBy: session.userName,
          });
        }
      }
      return { ...prev, staffAttendance: next };
    });
  };

  const handleReviewLeave = (leaveId: string, status: 'approved' | 'rejected') => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const target = prev.leaveRequests.find((l) => l.id === leaveId);
      const nextLeaves = prev.leaveRequests.map((l) =>
        l.id === leaveId ? { ...l, status, reviewedBy: session.userName } : l
      );
      let next: ERPDatabase = { ...prev, leaveRequests: nextLeaves };
      if (target && target.requesterType === 'student') {
        const stu = prev.students.find((s) => s.id === target.requesterId);
        if (stu) {
          next = enqueueSimulatedNotifications(next, activeInstitute, [
            {
              dedupeKey: `leave-${leaveId}-${status}`,
              recipientName: stu.parentName,
              recipientNumber: stu.parentWhatsapp || stu.parentMobile,
              recipientRole: 'parent',
              notificationType: 'leave_status',
              channel: 'whatsapp',
              messageContent: `${activeInstitute.name}: Leave request for ${stu.fullName} (${target.fromDate} to ${target.toDate}) has been ${status.toUpperCase()}. Contact ${activeInstitute.phone}.`,
            },
          ]).nextDb;
        }
      }
      return next;
    });
    notify('success', `Leave request ${status}.`);
  };

  const handleSavePayroll = (record: PayrollRecord) => {
    updateDb((prev) => {
      const exists = prev.payrollRecords.some((p) => p.id === record.id);
      return {
        ...prev,
        payrollRecords: exists
          ? prev.payrollRecords.map((p) => (p.id === record.id ? record : p))
          : [...prev.payrollRecords, record],
      };
    });
  };

  const handleCreateFeeRecord = (record: FeeRecord) => {
    updateDb((prev) => ({ ...prev, feeRecords: [record, ...prev.feeRecords] }));
  };

  const handleRecordPayment = (feeId: string, payment: FeePayment) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const nextFees = prev.feeRecords.map((f) => {
        if (f.id !== feeId) return f;
        const nextPaid = f.paidAmount + payment.amount;
        const net = Math.max(0, f.baseAmount - f.discount + f.lateFee);
        const nextStatus: FeeRecord['status'] =
          nextPaid >= net ? 'paid' : nextPaid > 0 ? 'partial' : f.status;
        return { ...f, paidAmount: nextPaid, status: nextStatus };
      });
      let next: ERPDatabase = {
        ...prev,
        feeRecords: nextFees,
        feePayments: [payment, ...prev.feePayments],
      };
      next = appendActivity(
        next,
        activeInstitute.id,
        session.userName,
        session.role,
        `Recorded ${payment.paymentMethod.toUpperCase()} fee payment ₹${payment.amount.toLocaleString('en-IN')} (${payment.receiptNumber})`
      );
      return next;
    });
  };

  const handleSendFeeReminder = (feeId: string) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const fee = prev.feeRecords.find((f) => f.id === feeId);
      const stu = fee ? prev.students.find((s) => s.id === fee.studentId) : undefined;
      const settings = prev.notificationSettings.find((s) => s.instituteId === activeInstitute.id);
      if (!fee || !stu || !settings) return prev;
      const pending = Math.max(0, fee.baseAmount - fee.discount + fee.lateFee - fee.paidAmount);
      const channels = buildChannelsToSend(settings);
      const today = new Date().toISOString().slice(0, 10);
      return enqueueSimulatedNotifications(
        prev,
        activeInstitute,
        channels.map((ch) => ({
          dedupeKey: `fee-${fee.id}-${today}-${ch}`,
          recipientName: stu.parentName,
          recipientNumber: stu.parentWhatsapp || stu.parentMobile,
          recipientRole: 'parent' as const,
          notificationType: 'fee_reminder' as const,
          channel: ch,
          messageContent: `${activeInstitute.name} Fee Reminder: ₹${pending.toLocaleString('en-IN')} is pending for ${stu.fullName} (${fee.title}, Due ${fee.dueDate}). Contact ${activeInstitute.phone}.`,
        }))
      ).nextDb;
    });
    notify('success', 'Fee reminder added to simulated outbox.');
  };

  const handleSaveTimetableSlot = (slot: TimetableSlot) => {
    updateDb((prev) => {
      const exists = prev.timetable.some((s) => s.id === slot.id);
      return {
        ...prev,
        timetable: exists ? prev.timetable.map((s) => (s.id === slot.id ? slot : s)) : [...prev.timetable, slot],
      };
    });
  };

  const handleDeleteTimetableSlot = (slotId: string) => {
    updateDb((prev) => ({
      ...prev,
      timetable: prev.timetable.filter((s) => s.id !== slotId),
    }));
  };

  const handleSaveHomework = (hw: HomeworkAssignment) => {
    updateDb((prev) => ({ ...prev, homework: [hw, ...prev.homework] }));
  };

  const handleToggleHomeworkSubmission = (homeworkId: string, studentId: string) => {
    if (!activeInstitute) return;
    updateDb((prev) => {
      const existing = prev.homeworkSubmissions.find(
        (s) => s.homeworkId === homeworkId && s.studentId === studentId
      );
      if (existing) {
        return {
          ...prev,
          homeworkSubmissions: prev.homeworkSubmissions.map((s) =>
            s.id === existing.id
              ? {
                  ...s,
                  status: s.status === 'completed' ? 'pending' : 'completed',
                  submittedAt: s.status === 'pending' ? new Date().toISOString().slice(0, 10) : undefined,
                }
              : s
          ),
        };
      }
      return {
        ...prev,
        homeworkSubmissions: [
          ...prev.homeworkSubmissions,
          {
            id: `hws-${Date.now()}`,
            instituteId: activeInstitute.id,
            homeworkId,
            studentId,
            status: 'completed',
            submittedAt: new Date().toISOString().slice(0, 10),
          },
        ],
      };
    });
  };

  const handleSaveNotificationSettings = (settings: NotificationSettings) => {
    updateDb((prev) => {
      const exists = prev.notificationSettings.some((s) => s.instituteId === settings.instituteId);
      return {
        ...prev,
        notificationSettings: exists
          ? prev.notificationSettings.map((s) => (s.instituteId === settings.instituteId ? settings : s))
          : [...prev.notificationSettings, settings],
      };
    });
  };

  const handleSubmitLeave = (leave: LeaveRequest) => {
    updateDb((prev) => ({ ...prev, leaveRequests: [leave, ...prev.leaveRequests] }));
  };

  const handleUpdateSubscription = (inst: Institute, historyEntry: SubscriptionHistoryItem) => {
    updateDb((prev) => ({
      ...prev,
      institutes: prev.institutes.map((i) => (i.id === inst.id ? inst : i)),
      subscriptionHistory: [historyEntry, ...prev.subscriptionHistory],
    }));
  };

  const handleSendRenewalReminder = (instituteId: string) => {
    updateDb((prev) => {
      const inst = prev.institutes.find((i) => i.id === instituteId);
      if (!inst) return prev;
      return {
        ...prev,
        subscriptionHistory: [
          {
            id: `sub-${Date.now()}`,
            instituteId: inst.id,
            planTier: inst.planTier,
            action: 'Renewal Reminder Logged',
            amountInr: 0,
            status: inst.subscriptionStatus,
            date: new Date().toISOString().slice(0, 10),
            notes: `Sent renewal notice to ${inst.email}`,
          },
          ...prev.subscriptionHistory,
        ],
      };
    });
  };

  return (
    <>
      <AppShell
        session={session}
        institute={activeInstitute}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onLogout={handleLogout}
        onResetDemo={() => setConfirmResetOpen(true)}
      >
        {activeSection === 'super_admin' && perms.canAccessSuperAdmin && (
          <SuperAdminPage
            db={db}
            onUpdateSubscription={handleUpdateSubscription}
            onSendRenewalReminder={handleSendRenewalReminder}
            onNotify={notify}
          />
        )}

        {(activeSection === 'parent_portal' || activeSection === 'student_portal') &&
          activeInstitute &&
          (perms.isParentPortal || perms.isStudentPortal) && (
            <ParentStudentPortal
              db={db}
              institute={activeInstitute}
              session={session}
              onSubmitLeave={handleSubmitLeave}
              onToggleStudentHomework={handleToggleHomeworkSubmission}
              onNotify={notify}
            />
          )}

        {activeInstitute && activeSection === 'dashboard' && perms.canViewDashboard && (
          <DashboardPage db={db} institute={activeInstitute} onNavigate={setActiveSection} />
        )}

        {activeInstitute && activeSection === 'branding' && perms.canManageBranding && (
          <InstituteProfilePage
            institute={activeInstitute}
            onSaveInstitute={handleSaveInstitute}
            onNotify={notify}
          />
        )}

        {activeInstitute && activeSection === 'students' && perms.canViewStudents && (
          <StudentsPage
            db={db}
            institute={activeInstitute}
            canEdit={perms.canEditStudents}
            onSaveStudent={handleSaveStudent}
            onDeleteStudent={handleDeleteStudent}
            onNotify={notify}
          />
        )}

        {activeInstitute &&
          activeSection === 'attendance' &&
          (perms.canMarkAttendance || perms.canManageAttendancePolicy) && (
            <AttendancePage
              db={db}
              institute={activeInstitute}
              canEditPolicy={perms.canManageAttendancePolicy}
              onSaveAttendance={handleSaveAttendance}
              onSavePolicy={handleSavePolicy}
              onSendLowAttendanceAlerts={handleSendLowAttendanceAlerts}
              onNotify={notify}
            />
          )}

        {activeInstitute && activeSection === 'exams' && perms.canManageExams && (
          <ExamsPage
            db={db}
            institute={activeInstitute}
            actorName={session.userName}
            canPublish={perms.canPublishResults}
            onSaveTest={handleSaveTest}
            onDeleteTest={handleDeleteTest}
            onSaveMarks={handleSaveMarks}
            onPublishTest={handlePublishTest}
            onAnnounceTest={handleAnnounceTest}
            onNotify={notify}
          />
        )}

        {activeInstitute &&
          activeSection === 'teachers_staff' &&
          (perms.canManageTeachers || perms.canManageStaff) && (
            <TeachersStaffPage
              db={db}
              institute={activeInstitute}
              canManageTeachers={perms.canManageTeachers}
              canManageStaff={perms.canManageStaff}
              canViewSalaries={perms.canAccessPayroll}
              onSaveTeacher={handleSaveTeacher}
              onSaveStaff={handleSaveStaff}
              onNotify={notify}
            />
          )}

        {activeInstitute &&
          activeSection === 'staff_payroll' &&
          (perms.canManageStaffAttendance || perms.canAccessPayroll) && (
            <StaffAttendancePayrollPage
              db={db}
              institute={activeInstitute}
              canManageStaffAttendance={perms.canManageStaffAttendance}
              canAccessPayroll={perms.canAccessPayroll}
              onSaveStaffAttendance={handleSaveStaffAttendance}
              onReviewLeave={handleReviewLeave}
              onSavePayroll={handleSavePayroll}
              onNotify={notify}
            />
          )}

        {activeInstitute && activeSection === 'fees' && perms.canManageFees && (
          <FeesPage
            db={db}
            institute={activeInstitute}
            actorName={session.userName}
            onCreateFeeRecord={handleCreateFeeRecord}
            onRecordPayment={handleRecordPayment}
            onSendFeeReminder={handleSendFeeReminder}
            onNotify={notify}
          />
        )}

        {activeInstitute && activeSection === 'timetable_homework' && perms.canManageTimetableHomework && (
          <TimetableHomeworkPage
            db={db}
            institute={activeInstitute}
            onSaveTimetableSlot={handleSaveTimetableSlot}
            onDeleteTimetableSlot={handleDeleteTimetableSlot}
            onSaveHomework={handleSaveHomework}
            onToggleHomeworkSubmission={handleToggleHomeworkSubmission}
            onNotify={notify}
          />
        )}

        {activeInstitute && activeSection === 'notifications' && perms.canManageNotifications && (
          <NotificationsSettingsPage
            db={db}
            institute={activeInstitute}
            onSaveSettings={handleSaveNotificationSettings}
            onNotify={notify}
          />
        )}

        {activeInstitute && activeSection === 'reports' && perms.canViewReports && (
          <ReportsPage
            db={db}
            institute={activeInstitute}
            canAccessPayroll={perms.canAccessPayroll}
            onNotify={notify}
          />
        )}
      </AppShell>

      <ConfirmDialog
        open={confirmResetOpen}
        title="Reset Demo Data?"
        message="This will restore the default Apex Scholars Academy and Meridian MedPrep demo datasets in local storage."
        confirmLabel="Reset Demo Data"
        destructive
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={() => {
          const fresh = resetDatabaseToDemo();
          setDb(fresh);
          setConfirmResetOpen(false);
          notify('info', 'Demo database restored to initial realistic state.');
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
