LIFELINE HUMNITY NGO — COMPLETE ADMIN + MEMBER + FINANCE WEBSITE

Run: npm install then npm start
Website: http://localhost:3000
Admin: http://localhost:3000/admin.html
Members & Finance: http://localhost:3000/finance.html
Member Login: http://localhost:3000/member.html

Default admin: admin / admin123 (change before public deployment).

Finance defaults:
Monthly contribution ₹500
Due date 10th of each month
Late fee ₹10 per day after the due date
10th = ₹500; 11th = ₹510; 15th = ₹550; 20th = ₹600.

Admin can add members, activate/deactivate members, set passwords, edit finance rules, record payments, view ledger and print receipts. Members see only their own ledger. This version records contributions; it does not process online donations.

Logo file: public/logo.jpeg

PHASE 2 FEATURES:
- Printable digital Member ID Card using the NGO logo
- Member password change (minimum 6 characters)
- Admin printable monthly/all financial report
- Admin JSON backup download
- Automatic late fee calculation remains enabled

PHASE 3:
- Public member registration application
- Admin approval/rejection of applications
- Automatic Member ID after approval (LHN0001 format)
- Monthly due list
- WhatsApp reminder links with pre-filled messages
- Payment status in due list

Note: WhatsApp reminders open WhatsApp with a pre-filled message; the admin still chooses Send. No automatic bulk messaging service is included.

PHASE 5:
- Admin Dashboard (Admin Panel → Dashboard tab): total/active members, pending registrations,
  current month collection/expenses/balance, total outstanding, total late fees collected,
  recent payments and recent expenses.
- Notice / Announcement system (Admin Panel → Notices tab): add/edit/delete/publish/unpublish
  notices with title, description and date. Published notices appear on the public website.
- Member Activity records (Members & Finance page): admin logs meeting attendance, volunteer
  activity and event participation per member; members see their own activity history in the
  Member Portal.
- Certificate system (Members & Finance page → Generate Certificate): printable A4 certificates
  with NGO logo, auto-generated certificate number, member name, activity/event, date,
  description and a signature area. Members can print their own certificates from the Member
  Portal. Public certificate verification: GET /api/certificates/verify/:certNo
- Search & filter added to Members, Payment Ledger, Expense Ledger and Activity Records tables.
- CSV export added for Members, Payments, Expenses, Outstanding Dues and Activities
  (buttons in Members & Finance page); JSON backup (Backup Data button) now also includes
  notices, activities and certificates.
- Fixed a Phase 4 bug where /api/admin/due-list referenced an undefined currentMonth() helper.
