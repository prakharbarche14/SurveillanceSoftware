export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'admin'
  | 'teacher'
  | 'accountant'
  | 'receptionist'
  | 'parent'
  | 'student';

export type PlanTier = 'basic' | 'standard' | 'premium';
export type SubscriptionStatus = 'trial' | 'active' | 'expiring_soon' | 'suspended';

export interface Institute {
  id: string;
  instituteCode: string;
  name: string;
  tagline: string;
  ownerName: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  website: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  authorizedSignature: string;
  planTier: PlanTier;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string;
  planExpiresAt: string;
  studentLimit: number;
  staffLimit: number;
  createdAt: string;
}

export interface SubscriptionHistoryItem {
  id: string;
  instituteId: string;
  planTier: PlanTier;
  action: string;
  amountInr: number;
  status: string;
  date: string;
  notes: string;
}

export interface UserAccount {
  id: string;
  instituteId: string | null; // null only for SaaS Super Admin
  name: string;
  email: string;
  phone: string;
  password: string; // prototype demo password
  role: UserRole;
  linkedEntityId?: string; // studentId, parentId, teacherId, staffId
  isActive: boolean;
}

export interface ParentAccount {
  id: string;
  instituteId: string;
  userId?: string;
  fullName: string;
  mobile: string;
  whatsappNumber: string;
  email: string;
  address: string;
}

export interface Student {
  id: string;
  instituteId: string;
  parentId: string;
  studentCode: string;
  rollNumber: string;
  fullName: string;
  photoUrl: string;
  dateOfBirth: string;
  gender: 'Male' | 'Female' | 'Other';
  className: string;
  batchName: string;
  courseName: string;
  admissionDate: string;
  studentMobile: string;
  studentWhatsapp: string;
  parentName: string;
  parentMobile: string;
  parentWhatsapp: string;
  parentEmail: string;
  address: string;
  monthlyFee: number;
  admissionFee: number;
  status: 'active' | 'archived';
}

export interface Teacher {
  id: string;
  instituteId: string;
  employeeId: string;
  fullName: string;
  photoUrl: string;
  mobile: string;
  whatsappNumber: string;
  email: string;
  address: string;
  qualification: string;
  experienceYears: number;
  joiningDate: string;
  subjects: string[];
  assignedClasses: string[];
  assignedBatches: string[];
  monthlySalary: number;
  status: 'active' | 'inactive';
}

export type StaffDesignation =
  | 'Receptionist'
  | 'Accountant'
  | 'Office Assistant'
  | 'Manager'
  | 'Security Staff'
  | 'Other';

export interface StaffMember {
  id: string;
  instituteId: string;
  employeeId: string;
  fullName: string;
  photoUrl: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  designation: StaffDesignation;
  department: string;
  joiningDate: string;
  monthlySalary: number;
  status: 'active' | 'inactive';
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface HolidayItem {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
}

export interface AttendancePolicy {
  instituteId: string;
  workingDays: number[]; // 0=Sun, 1=Mon...6=Sat
  holidays: HolidayItem[];
  approvedLeaveTreatment: 'excused_excluded' | 'counted_present' | 'counted_absent';
  lowAttendanceThreshold: number; // default 75
}

export interface StudentAttendanceRecord {
  id: string;
  instituteId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string;
  updatedAt: string;
  remarks?: string;
}

export interface StaffAttendanceRecord {
  id: string;
  instituteId: string;
  employeeType: 'teacher' | 'staff';
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  markedBy: string;
  remarks?: string;
}

export interface LeaveRequest {
  id: string;
  instituteId: string;
  requesterType: 'student' | 'teacher' | 'staff';
  requesterId: string;
  requesterName: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  createdAt: string;
}

export interface TestExam {
  id: string;
  instituteId: string;
  name: string;
  subject: string;
  className: string;
  batchName: string;
  testDate: string;
  maxMarks: number;
  passingMarks: number;
  status: 'draft' | 'published';
  createdBy: string;
  publishedAt?: string;
}

export interface TestMark {
  id: string;
  instituteId: string;
  testId: string;
  studentId: string;
  obtainedMarks: number | null;
  isAbsent: boolean;
  remarks?: string;
  updatedAt: string;
}

export interface FeeRecord {
  id: string;
  instituteId: string;
  studentId: string;
  feeType: 'monthly' | 'admission' | 'course' | 'other';
  title: string;
  baseAmount: number;
  discount: number;
  lateFee: number;
  paidAmount: number;
  dueDate: string;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
}

export interface FeePayment {
  id: string;
  instituteId: string;
  feeRecordId: string;
  studentId: string;
  receiptNumber: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'other';
  referenceNote: string;
  paymentDate: string;
  recordedBy: string;
}

export interface PayrollRecord {
  id: string;
  instituteId: string;
  employeeType: 'teacher' | 'staff';
  employeeId: string;
  employeeName: string;
  designation: string;
  monthKey: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  advanceDeduction: number;
  otherDeductions: number;
  netSalary: number;
  status: 'paid' | 'unpaid';
  paymentDate?: string;
  slipNumber: string;
}

export interface TimetableSlot {
  id: string;
  instituteId: string;
  dayOfWeek: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  className: string;
  batchName: string;
  roomNumber: string;
}

export interface HomeworkAssignment {
  id: string;
  instituteId: string;
  teacherId: string;
  subject: string;
  className: string;
  batchName: string;
  title: string;
  description: string;
  attachmentName?: string;
  deadline: string;
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  instituteId: string;
  homeworkId: string;
  studentId: string;
  status: 'pending' | 'completed';
  submittedAt?: string;
}

export type NotificationRecipientMode = 'parent' | 'student' | 'both';
export type NotificationChannelMode = 'whatsapp' | 'sms' | 'both';

export interface NotificationSettings {
  instituteId: string;
  sendAbsentAlert: boolean;
  sendPresentConfirmation: boolean;
  sendLowAttendanceAlert: boolean;
  sendLeaveApprovalAlert: boolean;
  sendResultAlert: boolean;
  sendUpcomingTestAlert: boolean;
  sendFeeReminder: boolean;
  sendStaffNotification: boolean;
  attendanceRecipient: NotificationRecipientMode;
  resultRecipient: NotificationRecipientMode;
  defaultChannel: NotificationChannelMode;
  preferredSendTime: string;
  signatureLine: string;
  whatsappTemplateAbsent: string;
  smsTemplateAbsent: string;
  whatsappTemplateResult: string;
  smsTemplateResult: string;
}

export interface NotificationOutboxItem {
  id: string;
  instituteId: string;
  dedupeKey: string;
  recipientName: string;
  recipientNumber: string;
  recipientRole: 'parent' | 'student' | 'staff';
  notificationType:
    | 'absent_alert'
    | 'present_confirmation'
    | 'low_attendance_warning'
    | 'leave_status'
    | 'attendance_correction'
    | 'test_result'
    | 'test_announcement'
    | 'absent_in_test'
    | 'low_marks_alert'
    | 'fee_reminder'
    | 'staff_alert';
  channel: 'whatsapp' | 'sms';
  messageContent: string;
  deliveryStatus: 'simulated' | 'simulated_error';
  isSimulated: true;
  errorInfo?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  instituteId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  timestamp: string;
}

export interface ERPDatabase {
  institutes: Institute[];
  subscriptionHistory: SubscriptionHistoryItem[];
  users: UserAccount[];
  parents: ParentAccount[];
  students: Student[];
  teachers: Teacher[];
  staff: StaffMember[];
  attendancePolicies: AttendancePolicy[];
  studentAttendance: StudentAttendanceRecord[];
  staffAttendance: StaffAttendanceRecord[];
  leaveRequests: LeaveRequest[];
  tests: TestExam[];
  testMarks: TestMark[];
  feeRecords: FeeRecord[];
  feePayments: FeePayment[];
  payrollRecords: PayrollRecord[];
  timetable: TimetableSlot[];
  homework: HomeworkAssignment[];
  homeworkSubmissions: HomeworkSubmission[];
  notificationSettings: NotificationSettings[];
  notificationsOutbox: NotificationOutboxItem[];
  activityLogs: ActivityLog[];
}

export interface SessionState {
  token: string;
  userId: string;
  role: UserRole;
  instituteId: string | null;
  userName: string;
  email: string;
  linkedEntityId?: string;
}
