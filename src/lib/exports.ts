import { jsPDF } from 'jspdf';
import type {
  FeePayment,
  FeeRecord,
  Institute,
  PayrollRecord,
  Student,
  TestExam,
} from '../types/erp';
import type { ComputedStudentResult, TestAnalytics } from './erpStore';

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [15, 42, 86];
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function addInstituteHeader(doc: jsPDF, institute: Institute, documentTitle: string): number {
  const [r, g, b] = hexToRgb(institute.primaryColor || '#0F2A56');
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(institute.name, 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${institute.tagline || 'Coaching Institute ERP Document'}`, 14, 19);
  doc.text(`${institute.address}`, 14, 24);
  doc.text(`Ph: ${institute.phone}  |  Email: ${institute.email}`, 14, 29);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(documentTitle, 14, 42);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 45, 196, 45);
  return 52;
}

function addInstituteFooter(doc: jsPDF, institute: Institute): void {
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 266, 196, 266);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Generated via ${institute.name} Official Portal · ${institute.website || institute.email}`, 14, 273);
  doc.setFont('helvetica', 'bold');
  doc.text(`Authorized Signatory: ${institute.authorizedSignature || institute.ownerName}`, 14, 279);
}

export function downloadStudentReportCardPdf(
  institute: Institute,
  student: Student,
  test: TestExam,
  result: ComputedStudentResult,
  analytics: TestAnalytics
): void {
  const doc = new jsPDF();
  let y = addInstituteHeader(doc, institute, 'OFFICIAL EXAMINATION REPORT CARD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`Student Name: ${student.fullName}`, 14, y);
  doc.text(`Student ID: ${student.studentCode}`, 125, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Class & Batch: ${student.className} · ${student.batchName}`, 14, y);
  doc.text(`Roll Number: ${student.rollNumber}`, 125, y);
  y += 6;
  doc.text(`Parent / Guardian: ${student.parentName} (${student.parentMobile})`, 14, y);
  y += 10;

  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, 182, 24, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, y, 182, 24, 'S');
  doc.setFont('helvetica', 'bold');
  doc.text(`Examination: ${test.name}`, 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Subject: ${test.subject}   |   Test Date: ${test.testDate}`, 18, y + 14);
  doc.text(`Maximum Marks: ${test.maxMarks}   |   Passing Marks: ${test.passingMarks}`, 18, y + 20);
  y += 32;

  const rows: Array<[string, string]> = [
    ['Marks Obtained', result.isAbsent ? 'ABSENT' : `${result.obtainedMarks} / ${test.maxMarks}`],
    ['Percentage', result.percentage !== null ? `${result.percentage}%` : 'N/A'],
    ['Grade', result.grade],
    ['Result Status', result.isAbsent ? 'ABSENT' : result.passed ? 'PASS' : 'NEEDS IMPROVEMENT (FAIL)'],
    ['Batch Rank', result.rank ? `#${result.rank} out of ${analytics.appearedCount}` : 'N/A'],
    ['Batch Average / Highest', `${analytics.classAverage} / ${analytics.highestMarks}`],
    [
      'Improvement vs Previous Test',
      result.improvementDelta !== null
        ? `${result.improvementDelta >= 0 ? '+' : ''}${result.improvementDelta}%`
        : 'First recorded test in subject',
    ],
  ];

  rows.forEach(([label, val], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 5, 182, 9, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(label, 18, y);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 115, y);
    y += 9;
  });

  addInstituteFooter(doc, institute);
  doc.save(`ReportCard_${student.studentCode}_${test.subject}.pdf`);
}

export function downloadFeeReceiptPdf(
  institute: Institute,
  student: Student,
  fee: FeeRecord,
  payment: FeePayment
): void {
  const doc = new jsPDF();
  let y = addInstituteHeader(doc, institute, 'OFFICIAL FEE PAYMENT RECEIPT');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Receipt No: ${payment.receiptNumber}`, 14, y);
  doc.text(`Payment Date: ${payment.paymentDate}`, 135, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.text(`Student Name: ${student.fullName} (${student.studentCode})`, 14, y);
  y += 6;
  doc.text(`Class / Batch: ${student.className} · ${student.batchName}`, 14, y);
  y += 6;
  doc.text(`Parent Name: ${student.parentName} (${student.parentMobile})`, 14, y);
  y += 10;

  const netPayable = fee.baseAmount - fee.discount + fee.lateFee;
  const balance = Math.max(0, netPayable - fee.paidAmount);

  const lines: Array<[string, string]> = [
    ['Fee Description', fee.title],
    ['Base Amount', `INR ${fee.baseAmount.toLocaleString('en-IN')}`],
    ['Discount Applied', `INR ${fee.discount.toLocaleString('en-IN')}`],
    ['Late Fee', `INR ${fee.lateFee.toLocaleString('en-IN')}`],
    ['Total Net Fee', `INR ${netPayable.toLocaleString('en-IN')}`],
    ['Amount Paid (This Receipt)', `INR ${payment.amount.toLocaleString('en-IN')}`],
    ['Payment Mode (Manual Entry)', payment.paymentMethod.replace('_', ' ').toUpperCase()],
    ['Reference Note', payment.referenceNote || '-'],
    ['Remaining Balance', `INR ${balance.toLocaleString('en-IN')}`],
    ['Recorded By', payment.recordedBy],
  ];

  lines.forEach(([k, v], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 5, 182, 8.5, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.text(k, 18, y);
    doc.setFont('helvetica', 'normal');
    doc.text(v, 110, y);
    y += 8.5;
  });

  addInstituteFooter(doc, institute);
  doc.save(`FeeReceipt_${payment.receiptNumber}.pdf`);
}

export function downloadSalarySlipPdf(institute: Institute, payroll: PayrollRecord): void {
  const doc = new jsPDF();
  let y = addInstituteHeader(doc, institute, 'MONTHLY SALARY SLIP');

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Slip Number: ${payroll.slipNumber}`, 14, y);
  doc.text(`Pay Period: ${payroll.monthKey}`, 145, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`Employee Name: ${payroll.employeeName}`, 14, y);
  y += 6;
  doc.text(`Designation: ${payroll.designation} (${payroll.employeeType.toUpperCase()})`, 14, y);
  y += 6;
  doc.text(`Status: ${payroll.status.toUpperCase()}${payroll.paymentDate ? ` · Paid on ${payroll.paymentDate}` : ''}`, 14, y);
  y += 10;

  const lines: Array<[string, string]> = [
    ['Basic Monthly Salary', `INR ${payroll.baseSalary.toLocaleString('en-IN')}`],
    ['Performance Bonus', `INR ${payroll.bonus.toLocaleString('en-IN')}`],
    ['Salary Advance Recovery', `- INR ${payroll.advanceDeduction.toLocaleString('en-IN')}`],
    ['Other Deductions', `- INR ${payroll.otherDeductions.toLocaleString('en-IN')}`],
    ['Net Payable Salary', `INR ${payroll.netSalary.toLocaleString('en-IN')}`],
  ];

  lines.forEach(([k, v], idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 5, 182, 9, 'F');
    }
    doc.setFont('helvetica', idx === lines.length - 1 ? 'bold' : 'normal');
    doc.text(k, 18, y);
    doc.text(v, 130, y);
    y += 9;
  });

  addInstituteFooter(doc, institute);
  doc.save(`SalarySlip_${payroll.slipNumber}_${payroll.monthKey}.pdf`);
}

export function downloadGenericTablePdf(
  institute: Institute,
  title: string,
  filename: string,
  columns: string[],
  rows: Array<Array<string | number>>
): void {
  const doc = new jsPDF();
  let y = addInstituteHeader(doc, institute, title);
  doc.setFontSize(8.5);
  const colWidth = 182 / Math.max(1, columns.length);

  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 4, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  columns.forEach((col, i) => {
    doc.text(String(col).slice(0, 22), 16 + i * colWidth, y + 1);
  });
  y += 8;
  doc.setFont('helvetica', 'normal');

  rows.forEach((row, rIdx) => {
    if (y > 255) {
      addInstituteFooter(doc, institute);
      doc.addPage();
      y = addInstituteHeader(doc, institute, `${title} (Cont.)`);
    }
    if (rIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y - 4, 182, 7.5, 'F');
    }
    row.forEach((cell, cIdx) => {
      doc.text(String(cell ?? '').slice(0, 24), 16 + cIdx * colWidth, y + 1);
    });
    y += 7.5;
  });

  addInstituteFooter(doc, institute);
  doc.save(filename);
}
