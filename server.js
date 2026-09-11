const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const DATA_FILE = path.join(DATA_DIR, "site.json");
const MEMBERS_FILE = path.join(DATA_DIR, "members.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const REG_FILE = path.join(DATA_DIR, "registrations.json");
const EXPENSES_FILE = path.join(DATA_DIR, "expenses.json");
const NOTICES_FILE = path.join(DATA_DIR, "notices.json");
const ACTIVITIES_FILE = path.join(DATA_DIR, "activities.json");
const CERTIFICATES_FILE = path.join(DATA_DIR, "certificates.json");

for (const d of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(d, { recursive: true });

const defaultSite = {
  site: {
    name: "LIFELINE HUMNITY NGO",
    shortName: "KAYAKUCHI",
    tagline: "Working Together for a Better Tomorrow.",
    description: "A community-focused society working across development, health, environment, education, and science & technology.",
    registration: "Registered under Societies Registration Act, XXI of 1860",
    address: "Vill–Barbahar, P.O.–Kayakuchi, P.S.–Barpeta, District–Barpeta, Assam – 781352",
    phone: "",
    email: "",
    whatsapp: "",
    facebook: "",
    instagram: "",
    youtube: ""
  },
  about: {
    title: "A society committed to positive community development.",
    text: "LIFELINE HUMNITY NGO, KAYAKUCHI is a society whose memorandum identifies development, health, environment, education, and science & technology as its core objectives.",
    image: ""
  },
  objectives: [
    { id: 1, title: "Development", icon: "🌱", description: "Supporting development-focused community initiatives." },
    { id: 2, title: "Health", icon: "❤", description: "Promoting health-focused activities and community wellbeing." },
    { id: 3, title: "Environment", icon: "🌍", description: "Encouraging care for the environment and local surroundings." },
    { id: 4, title: "Education", icon: "📚", description: "Supporting education and learning-oriented initiatives." },
    { id: 5, title: "Science & Technology", icon: "🔬", description: "Encouraging useful science and technology initiatives." }
  ],
  work: [],
  projects: [],
  team: [],
  gallery: [],
  volunteers: {
    title: "Be part of meaningful community work.",
    text: "Interested in volunteering or collaborating? Get in touch with the NGO."
  }
};

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultSite, null, 2));
if (!fs.existsSync(MEMBERS_FILE)) fs.writeFileSync(MEMBERS_FILE, "[]");
if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, "[]");
if (!fs.existsSync(REG_FILE)) fs.writeFileSync(REG_FILE, "[]");
if (!fs.existsSync(EXPENSES_FILE)) fs.writeFileSync(EXPENSES_FILE, "[]");
if (!fs.existsSync(NOTICES_FILE)) fs.writeFileSync(NOTICES_FILE, "[]");
if (!fs.existsSync(ACTIVITIES_FILE)) fs.writeFileSync(ACTIVITIES_FILE, "[]");
if (!fs.existsSync(CERTIFICATES_FILE)) fs.writeFileSync(CERTIFICATES_FILE, "[]");

function readSite() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return JSON.parse(JSON.stringify(defaultSite)); }
}
function writeSite(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(String(password), salt, 64).toString("hex");
}
function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const check = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(check, "hex"));
}
function memberAuth(req, res, next) {
  if (req.session && req.session.memberId) return next();
  res.status(401).json({ error: "Member login required" });
}
function isoDate(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10);
}
function dayDiff(a,b) { return Math.round((new Date(b+"T00:00:00")-new Date(a+"T00:00:00"))/86400000); }
function getFinance() {
  const site = readSite();
  return site.finance || { monthlyContribution:500, dueDay:10, lateFeePerDay:10 };
}
function dueDate(month, dueDay) {
  const [y,m] = month.split("-").map(Number);
  const last = new Date(y,m,0).getDate();
  return `${y}-${String(m).padStart(2,"0")}-${String(Math.min(Number(dueDay)||10,last)).padStart(2,"0")}`;
}
function calcContribution(month, paymentDate) {
  const f = getFinance();
  const due = dueDate(month, f.dueDay);
  const reference = paymentDate || isoDate();
  const lateDays = reference > due ? dayDiff(due, reference) : 0;
  const contribution = Number(f.monthlyContribution) || 0;
  const lateFee = lateDays * (Number(f.lateFeePerDay) || 0);
  return { dueDate:due, lateDays, contribution, lateFee, total:contribution+lateFee };
}
function safeMember(m) { return { id:m.id, name:m.name, phone:m.phone||"", email:m.email||"", joinDate:m.joinDate||"", active:m.active!==false, type:m.type==='volunteer'?'volunteer':'member' }; }
function currentMonth() { return isoDate().slice(0,7); }
// Shared month-by-month ledger for a member (used by member finance view + admin dashboard)
function memberLedger(m, allPayments) {
  const mine = allPayments.filter(p => p.memberId === m.id);
  const paid = new Map(mine.map(p => [p.month, p]));
  const start = new Date((m.joinDate || isoDate()) + "T00:00:00"), now = new Date(isoDate() + "T00:00:00");
  const rows = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1), end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cur <= end) {
    const month = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}`;
    const p = paid.get(month);
    const c = calcContribution(month, p?.paymentDate);
    rows.push({ month, ...c, paid: !!p, payment: p || null });
    cur.setMonth(cur.getMonth() + 1);
  }
  return {
    rows,
    totalPaid: mine.reduce((s,p)=>s+Number(p.total||0),0),
    lateFeesPaid: mine.reduce((s,p)=>s+Number(p.lateFee||0),0),
    unpaidMonths: rows.filter(x=>!x.paid).length,
    outstanding: rows.filter(x=>!x.paid).reduce((s,x)=>s+x.total,0)
  };
}
function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function toCSV(headers, rows) {
  return headers.map(csvEscape).join(",") + "\r\n" + rows.map(r => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}
function sendCSV(res, filename, headers, rows) {
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "text/csv");
  res.send(toCSV(headers, rows));
}

function auth(req, res, next) {
  if (req.session && req.session.admin) return next();
  res.status(401).json({ error: "Unauthorized" });
}

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 8 * 60 * 60 * 1000 }
}));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, "public")));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, Date.now() + "-" + safe);
  }
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

app.get("/api/site", (_, res) => res.json(readSite()));

app.post("/api/login", (req, res) => {
  const user = process.env.ADMIN_USER || "admin";
  const pass = process.env.ADMIN_PASSWORD || "admin123";
  if (req.body.username === user && req.body.password === pass) {
    req.session.admin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Invalid username or password" });
});
app.post("/api/logout", auth, (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get("/api/auth", (req, res) => res.json({ authenticated: !!(req.session && req.session.admin) }));

app.put("/api/site", auth, (req, res) => {
  const old = readSite();
  const allowed = ["site", "about", "objectives", "work", "projects", "team", "gallery", "volunteers"];
  for (const key of allowed) if (req.body[key] !== undefined) old[key] = req.body[key];
  writeSite(old);
  res.json(old);
});

app.post("/api/upload", auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  res.json({ url: "/uploads/" + req.file.filename, filename: req.file.filename });
});

app.delete("/api/upload", auth, (req, res) => {
  const filename = path.basename(req.body.filename || "");
  if (!filename) return res.status(400).json({ error: "Filename required" });
  const target = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(target)) fs.unlinkSync(target);
  res.json({ ok: true });
});


// ---------------- MEMBER + FINANCE ----------------
app.get("/api/admin/members", auth, (req,res) => {
  let rows = readJSON(MEMBERS_FILE,[]).map(safeMember);
  const { search, status, memberId, type } = req.query || {};
  if (memberId) rows = rows.filter(m => m.id === memberId);
  if (type) rows = rows.filter(m => m.type === type);
  if (status === "active") rows = rows.filter(m => m.active);
  else if (status === "inactive") rows = rows.filter(m => !m.active);
  if (search) { const q=String(search).toLowerCase(); rows = rows.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || (m.phone||"").toLowerCase().includes(q)); }
  res.json(rows);
});
app.post("/api/admin/members", auth, (req,res) => {
  const b=req.body||{}; if(!b.id||!b.name||!b.password) return res.status(400).json({error:"Member ID, name and password are required"});
  const members=readJSON(MEMBERS_FILE,[]);
  if(members.some(m=>m.id.toLowerCase()===String(b.id).trim().toLowerCase())) return res.status(400).json({error:"Member ID already exists"});
  const m={id:String(b.id).trim(),name:String(b.name).trim(),phone:b.phone||"",email:b.email||"",joinDate:b.joinDate||isoDate(),active:true,type:b.type==='volunteer'?'volunteer':'member',passwordHash:hashPassword(b.password)};
  members.push(m); writeJSON(MEMBERS_FILE,members); res.json(safeMember(m));
});
app.put("/api/admin/members/:id", auth, (req,res) => {
  const members=readJSON(MEMBERS_FILE,[]), m=members.find(x=>x.id===req.params.id);
  if(!m) return res.status(404).json({error:"Member not found"}); const b=req.body||{};
  for(const k of ["name","phone","email","joinDate"]) if(b[k]!==undefined) m[k]=b[k];
  if(b.type!==undefined) m.type = (b.type==='volunteer'?'volunteer':'member');
  if(b.active!==undefined)m.active=!!b.active; if(b.password)m.passwordHash=hashPassword(b.password);
  writeJSON(MEMBERS_FILE,members); res.json(safeMember(m));
});
app.delete("/api/admin/members/:id", auth, (req,res) => {
  const members=readJSON(MEMBERS_FILE,[]); if(!members.some(m=>m.id===req.params.id)) return res.status(404).json({error:"Member not found"});
  writeJSON(MEMBERS_FILE,members.filter(m=>m.id!==req.params.id)); res.json({ok:true});
});
app.get("/api/admin/finance/settings", auth, (req,res)=>res.json(getFinance()));
app.put("/api/admin/finance/settings", auth, (req,res)=>{
  const site=readSite(); site.finance={monthlyContribution:Math.max(0,Number(req.body.monthlyContribution)||500),dueDay:Math.min(28,Math.max(1,Number(req.body.dueDay)||10)),lateFeePerDay:Math.max(0,Number(req.body.lateFeePerDay)||10)}; writeSite(site); res.json(site.finance);
});
app.get("/api/admin/payments", auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), map=new Map(members.map(m=>[m.id,m]));
  let rows = readJSON(PAYMENTS_FILE,[]).map(p=>({...p,memberName:map.get(p.memberId)?.name||"Deleted member",calc:calcContribution(p.month,p.paymentDate)}));
  const { month, memberId, search } = req.query || {};
  if (month) rows = rows.filter(p => p.month === month);
  if (memberId) rows = rows.filter(p => p.memberId === memberId);
  if (search) { const q=String(search).toLowerCase(); rows = rows.filter(p => p.memberId.toLowerCase().includes(q) || (p.memberName||"").toLowerCase().includes(q)); }
  res.json(rows);
});
app.post("/api/admin/payments", auth, (req,res)=>{
  const b=req.body||{}; if(!b.memberId||!b.month) return res.status(400).json({error:"Member and month are required"});
  const members=readJSON(MEMBERS_FILE,[]); const targetMember=members.find(m=>m.id===b.memberId); if(!targetMember) return res.status(400).json({error:"Member not found"});
  if((targetMember.type||'member')==='volunteer') return res.status(400).json({error:"Volunteers are not enrolled in the monthly contribution scheme"});
  const payments=readJSON(PAYMENTS_FILE,[]); if(payments.some(p=>p.memberId===b.memberId&&p.month===b.month)) return res.status(400).json({error:"This month is already recorded"});
  const paid=b.paymentDate||isoDate(), c=calcContribution(b.month,paid);
  const p={id:crypto.randomUUID(),memberId:b.memberId,month:b.month,paymentDate:paid,amount:c.contribution,lateFee:c.lateFee,total:c.total,paymentMethod:b.paymentMethod||"Cash",note:b.note||"",createdAt:new Date().toISOString()};
  payments.push(p); writeJSON(PAYMENTS_FILE,payments); res.json({...p,calc:c});
});
app.put("/api/admin/payments/:id", auth, (req,res)=>{
  const payments=readJSON(PAYMENTS_FILE,[]),p=payments.find(x=>x.id===req.params.id); if(!p)return res.status(404).json({error:"Payment not found"});
  if(req.body.paymentDate)p.paymentDate=req.body.paymentDate; if(req.body.paymentMethod!==undefined)p.paymentMethod=req.body.paymentMethod; if(req.body.note!==undefined)p.note=req.body.note;
  const c=calcContribution(p.month,p.paymentDate); p.amount=c.contribution;p.lateFee=c.lateFee;p.total=c.total;writeJSON(PAYMENTS_FILE,payments);res.json({...p,calc:c});
});
app.delete("/api/admin/payments/:id", auth, (req,res)=>{writeJSON(PAYMENTS_FILE,readJSON(PAYMENTS_FILE,[]).filter(p=>p.id!==req.params.id));res.json({ok:true});});
app.post("/api/member/login",(req,res)=>{
  const b=req.body||{},m=readJSON(MEMBERS_FILE,[]).find(x=>x.id===String(b.memberId||"").trim()&&x.active!==false);
  if(!m||!verifyPassword(b.password||"",m.passwordHash))return res.status(401).json({error:"Invalid Member ID or password"}); req.session.memberId=m.id;res.json({ok:true,member:safeMember(m)});
});
app.post("/api/member/logout",(req,res)=>{req.session.memberId=null;res.json({ok:true});});
app.get("/api/member/auth",(req,res)=>{const m=readJSON(MEMBERS_FILE,[]).find(x=>x.id===req.session.memberId);res.json({loggedIn:!!m,member:m?safeMember(m):null});});
app.get("/api/member/finance",memberAuth,(req,res)=>{
  const m=readJSON(MEMBERS_FILE,[]).find(x=>x.id===req.session.memberId); if(!m)return res.status(401).json({error:"Member not found"});
  if((m.type||'member')==='volunteer') return res.json({member:safeMember(m),settings:getFinance(),months:[],summary:{totalPaid:0,lateFeesPaid:0,unpaidMonths:0,outstanding:0},volunteer:true});
  const allPayments=readJSON(PAYMENTS_FILE,[]);
  const led=memberLedger(m, allPayments);
  res.json({member:safeMember(m),settings:getFinance(),months:led.rows,summary:{totalPaid:led.totalPaid,lateFeesPaid:led.lateFeesPaid,unpaidMonths:led.unpaidMonths,outstanding:led.outstanding}});
});


// ---------------- PHASE 2: ID CARDS, PASSWORD, REPORTS & BACKUP ----------------
app.post('/api/member/password', memberAuth, (req,res)=>{
  const {currentPassword,newPassword}=req.body||{};
  if(!newPassword || String(newPassword).length<6) return res.status(400).json({error:'New password must be at least 6 characters'});
  const members=readJSON(MEMBERS_FILE,[]), m=members.find(x=>x.id===req.session.memberId);
  if(!m || !verifyPassword(currentPassword||'',m.passwordHash)) return res.status(400).json({error:'Current password is incorrect'});
  m.passwordHash=hashPassword(newPassword); writeJSON(MEMBERS_FILE,members); res.json({ok:true});
});
app.get('/api/member/idcard', memberAuth, (req,res)=>{
  const m=readJSON(MEMBERS_FILE,[]).find(x=>x.id===req.session.memberId);
  if(!m)return res.status(404).json({error:'Member not found'});
  const site=readSite(); res.json({member:safeMember(m),site:site.site||defaultSite.site});
});
app.get('/api/admin/report', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), payments=readJSON(PAYMENTS_FILE,[]), month=req.query.month||'';
  const filtered=month?payments.filter(p=>p.month===month):payments;
  const rows=filtered.map(p=>{const m=members.find(x=>x.id===p.memberId);return {memberId:p.memberId,memberName:m?.name||'Deleted member',month:p.month,paymentDate:p.paymentDate,dueDate:calcContribution(p.month,p.paymentDate).dueDate,contribution:p.amount,lateFee:p.lateFee,total:p.total,method:p.paymentMethod,note:p.note||''}});
  res.json({month:month||'all',members:members.length,paymentRecords:rows.length,totalContribution:rows.reduce((s,x)=>s+Number(x.contribution||0),0),totalLateFee:rows.reduce((s,x)=>s+Number(x.lateFee||0),0),grandTotal:rows.reduce((s,x)=>s+Number(x.total||0),0),rows});
});
app.get('/api/admin/backup', auth, (req,res)=>{
  const payload={exportedAt:new Date().toISOString(),site:readSite(),members:readJSON(MEMBERS_FILE,[]).map(m=>({...m,passwordHash:undefined})),payments:readJSON(PAYMENTS_FILE,[]),expenses:readJSON(EXPENSES_FILE,[]),registrations:readJSON(REG_FILE,[]),notices:readJSON(NOTICES_FILE,[]),activities:readJSON(ACTIVITIES_FILE,[]),certificates:readJSON(CERTIFICATES_FILE,[])};
  const clean=JSON.parse(JSON.stringify(payload)); clean.members.forEach(m=>delete m.passwordHash);
  res.setHeader('Content-Disposition','attachment; filename="lifeline-ngo-backup.json"');res.setHeader('Content-Type','application/json');res.send(JSON.stringify(clean,null,2));
});


// ---------------- PHASE 3: MEMBER REGISTRATION & DUE REMINDERS ----------------
app.post('/api/member/register',(req,res)=>{
  const b=req.body||{};
  if(!b.name || !b.phone) return res.status(400).json({error:'Name and phone are required'});
  const regs=readJSON(REG_FILE,[]);
  const r={id:crypto.randomUUID(),name:String(b.name).trim(),phone:String(b.phone).trim(),email:b.email||'',address:b.address||'',requestedAt:new Date().toISOString(),status:'PENDING'};
  regs.push(r);writeJSON(REG_FILE,regs);res.json({ok:true,message:'Application submitted. Admin approval is required.'});
});
app.get('/api/admin/registrations',auth,(req,res)=>res.json(readJSON(REG_FILE,[])));
app.post('/api/admin/registrations/:id/approve',auth,(req,res)=>{
  const regs=readJSON(REG_FILE,[]), r=regs.find(x=>x.id===req.params.id);
  if(!r)return res.status(404).json({error:'Application not found'});
  const members=readJSON(MEMBERS_FILE,[]);
  let base='LHN';let n=members.length+1;let id=base+String(n).padStart(4,'0');while(members.some(x=>x.id===id)){n++;id=base+String(n).padStart(4,'0')}
  const temp=String(req.body?.password||('LHN@'+String(new Date().getFullYear())+'123'));
  const m={id,name:r.name,phone:r.phone,email:r.email||'',joinDate:isoDate(new Date()),active:true,passwordHash:hashPassword(temp)};
  members.push(m);writeJSON(MEMBERS_FILE,members);r.status='APPROVED';r.memberId=id;r.approvedAt=new Date().toISOString();writeJSON(REG_FILE,regs);
  res.json({member:safeMember(m),temporaryPassword:temp});
});
app.post('/api/admin/registrations/:id/reject',auth,(req,res)=>{
  const regs=readJSON(REG_FILE,[]),r=regs.find(x=>x.id===req.params.id);if(!r)return res.status(404).json({error:'Application not found'});
  r.status='REJECTED';r.rejectedAt=new Date().toISOString();writeJSON(REG_FILE,regs);res.json({ok:true});
});
app.get('/api/admin/due-list',auth,(req,res)=>{
  const month=req.query.month||currentMonth(), members=readJSON(MEMBERS_FILE,[]), payments=readJSON(PAYMENTS_FILE,[]), paid=new Set(payments.filter(p=>p.month===month).map(p=>p.memberId));
  const f=getFinance();const rows=members.filter(m=>m.active!==false&&(m.type||'member')==='member').map(m=>{const c=calcContribution(month,null);return {memberId:m.id,name:m.name,phone:m.phone||'',dueDate:c.dueDate,amount:c.total,paid:paid.has(m.id),whatsappMessage:`Hello ${m.name}, your NGO monthly contribution for ${month} is ₹${c.total}. Due date: ${c.dueDate}. Please pay your contribution. Thank you — LIFELINE HUMNITY NGO.`};});
  res.json({month,settings:f,rows});
});


// ---------------- PHASE 4: EXPENSES & FINANCIAL DASHBOARD ----------------
app.get('/api/admin/expenses', auth, (req,res)=>{
  let rows = readJSON(EXPENSES_FILE,[]).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  const { category, from, to, search } = req.query || {};
  if (category) rows = rows.filter(e => e.category.toLowerCase()===String(category).toLowerCase());
  if (from) rows = rows.filter(e => e.date >= from);
  if (to) rows = rows.filter(e => e.date <= to);
  if (search) { const q=String(search).toLowerCase(); rows = rows.filter(e => e.category.toLowerCase().includes(q) || (e.note||"").toLowerCase().includes(q)); }
  res.json(rows);
});
app.post('/api/admin/expenses', auth, (req,res)=>{
  const b=req.body||{};
  if(!b.date||!b.category||!b.amount) return res.status(400).json({error:'Date, category and amount are required'});
  const amount=Number(b.amount); if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({error:'Amount must be greater than 0'});
  const e={id:crypto.randomUUID(),date:String(b.date),category:String(b.category).trim(),amount,note:String(b.note||'').trim(),createdAt:new Date().toISOString()};
  const rows=readJSON(EXPENSES_FILE,[]);rows.push(e);writeJSON(EXPENSES_FILE,rows);res.json(e);
});
app.put('/api/admin/expenses/:id', auth, (req,res)=>{
  const rows=readJSON(EXPENSES_FILE,[]),e=rows.find(x=>x.id===req.params.id);if(!e)return res.status(404).json({error:'Expense not found'});
  const b=req.body||{};if(b.date!==undefined)e.date=b.date;if(b.category!==undefined)e.category=String(b.category).trim();if(b.note!==undefined)e.note=String(b.note).trim();if(b.amount!==undefined){const n=Number(b.amount);if(!Number.isFinite(n)||n<=0)return res.status(400).json({error:'Amount must be greater than 0'});e.amount=n;}
  writeJSON(EXPENSES_FILE,rows);res.json(e);
});
app.delete('/api/admin/expenses/:id', auth, (req,res)=>{writeJSON(EXPENSES_FILE,readJSON(EXPENSES_FILE,[]).filter(x=>x.id!==req.params.id));res.json({ok:true});});
app.get('/api/admin/financial-summary', auth, (req,res)=>{
  const month=req.query.month||'';const payments=readJSON(PAYMENTS_FILE,[]),expenses=readJSON(EXPENSES_FILE,[]);
  const income=month?payments.filter(x=>x.month===month):payments;const out=month?expenses.filter(x=>String(x.date).slice(0,7)===month):expenses;
  const totalIncome=income.reduce((s,x)=>s+Number(x.total||0),0),totalExpenses=out.reduce((s,x)=>s+Number(x.amount||0),0);
  res.json({month:month||'all',totalIncome,totalExpenses,balance:totalIncome-totalExpenses,incomeRecords:income.length,expenseRecords:out.length,expenses:out});
});

// ---------------- PHASE 5: DASHBOARD, NOTICES, ACTIVITIES, CERTIFICATES, SEARCH/FILTER, CSV EXPORT ----------------

// ---- Admin Dashboard ----
app.get('/api/admin/dashboard', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]);
  const payments=readJSON(PAYMENTS_FILE,[]);
  const expenses=readJSON(EXPENSES_FILE,[]);
  const registrations=readJSON(REG_FILE,[]);
  const month=currentMonth();
  const map=new Map(members.map(m=>[m.id,m]));

  const monthPayments=payments.filter(p=>p.month===month);
  const monthExpenses=expenses.filter(e=>String(e.date).slice(0,7)===month);
  const currentMonthCollection=monthPayments.reduce((s,p)=>s+Number(p.total||0),0);
  const currentMonthExpenses=monthExpenses.reduce((s,e)=>s+Number(e.amount||0),0);

  let totalOutstanding=0;
  for (const m of members.filter(x=>x.active!==false)) totalOutstanding += memberLedger(m, payments).outstanding;

  const totalLateFees = payments.reduce((s,p)=>s+Number(p.lateFee||0),0);

  const recentPayments = payments.slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,5)
    .map(p=>({...p, memberName: map.get(p.memberId)?.name || "Deleted member"}));
  const recentExpenses = expenses.slice().sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))).slice(0,5);

  res.json({
    month,
    totalMembers: members.length,
    activeMembers: members.filter(m=>m.active!==false).length,
    pendingRegistrations: registrations.filter(r=>r.status==='PENDING').length,
    currentMonthCollection,
    currentMonthExpenses,
    currentMonthBalance: currentMonthCollection - currentMonthExpenses,
    totalOutstanding,
    totalLateFees,
    recentPayments,
    recentExpenses
  });
});

// ---- Notices / Announcements ----
app.get('/api/admin/notices', auth, (req,res)=> res.json(readJSON(NOTICES_FILE,[]).sort((a,b)=>String(b.date).localeCompare(String(a.date)))));
app.post('/api/admin/notices', auth, (req,res)=>{
  const b=req.body||{};
  if(!b.title || !b.date) return res.status(400).json({error:'Title and date are required'});
  const rows=readJSON(NOTICES_FILE,[]);
  const n={id:crypto.randomUUID(),title:String(b.title).trim(),description:String(b.description||'').trim(),date:String(b.date),published:!!b.published,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  rows.push(n); writeJSON(NOTICES_FILE,rows); res.json(n);
});
app.put('/api/admin/notices/:id', auth, (req,res)=>{
  const rows=readJSON(NOTICES_FILE,[]), n=rows.find(x=>x.id===req.params.id);
  if(!n) return res.status(404).json({error:'Notice not found'});
  const b=req.body||{};
  if(b.title!==undefined) n.title=String(b.title).trim();
  if(b.description!==undefined) n.description=String(b.description).trim();
  if(b.date!==undefined) n.date=String(b.date);
  if(b.published!==undefined) n.published=!!b.published;
  n.updatedAt=new Date().toISOString();
  writeJSON(NOTICES_FILE,rows); res.json(n);
});
app.delete('/api/admin/notices/:id', auth, (req,res)=>{
  writeJSON(NOTICES_FILE, readJSON(NOTICES_FILE,[]).filter(x=>x.id!==req.params.id)); res.json({ok:true});
});
app.get('/api/notices', (req,res)=>{
  const rows=readJSON(NOTICES_FILE,[]).filter(n=>n.published).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  res.json(rows.map(n=>({id:n.id,title:n.title,description:n.description,date:n.date})));
});

// ---- Member Activity ----
const ACTIVITY_TYPES = ['Meeting Attendance','Volunteer Activity','Event Participation'];
app.get('/api/admin/activities', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), map=new Map(members.map(m=>[m.id,m]));
  let rows=readJSON(ACTIVITIES_FILE,[]).map(a=>({...a,memberName:map.get(a.memberId)?.name||'Deleted member'}));
  const { memberId, type, from, to, search } = req.query || {};
  if (memberId) rows=rows.filter(a=>a.memberId===memberId);
  if (type) rows=rows.filter(a=>a.type===type);
  if (from) rows=rows.filter(a=>a.date>=from);
  if (to) rows=rows.filter(a=>a.date<=to);
  if (search) { const q=String(search).toLowerCase(); rows=rows.filter(a=>a.memberName.toLowerCase().includes(q)||a.memberId.toLowerCase().includes(q)||(a.description||'').toLowerCase().includes(q)); }
  res.json(rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))));
});
app.post('/api/admin/activities', auth, (req,res)=>{
  const b=req.body||{};
  if(!b.memberId || !b.date || !b.type) return res.status(400).json({error:'Member, type and date are required'});
  const members=readJSON(MEMBERS_FILE,[]); if(!members.some(m=>m.id===b.memberId)) return res.status(400).json({error:'Member not found'});
  const rows=readJSON(ACTIVITIES_FILE,[]);
  const a={id:crypto.randomUUID(),memberId:b.memberId,type:String(b.type),date:String(b.date),description:String(b.description||'').trim(),createdAt:new Date().toISOString()};
  rows.push(a); writeJSON(ACTIVITIES_FILE,rows); res.json(a);
});
app.put('/api/admin/activities/:id', auth, (req,res)=>{
  const rows=readJSON(ACTIVITIES_FILE,[]), a=rows.find(x=>x.id===req.params.id);
  if(!a) return res.status(404).json({error:'Activity not found'});
  const b=req.body||{};
  if(b.type!==undefined) a.type=String(b.type);
  if(b.date!==undefined) a.date=String(b.date);
  if(b.description!==undefined) a.description=String(b.description).trim();
  writeJSON(ACTIVITIES_FILE,rows); res.json(a);
});
app.delete('/api/admin/activities/:id', auth, (req,res)=>{
  writeJSON(ACTIVITIES_FILE, readJSON(ACTIVITIES_FILE,[]).filter(x=>x.id!==req.params.id)); res.json({ok:true});
});
app.get('/api/member/activities', memberAuth, (req,res)=>{
  const rows=readJSON(ACTIVITIES_FILE,[]).filter(a=>a.memberId===req.session.memberId).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  res.json(rows);
});

// ---- Certificates ----
app.get('/api/admin/certificates', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), map=new Map(members.map(m=>[m.id,m]));
  let rows=readJSON(CERTIFICATES_FILE,[]).map(c=>({...c,memberName:map.get(c.memberId)?.name||c.memberName||'Deleted member'}));
  const { memberId, search } = req.query || {};
  if (memberId) rows=rows.filter(c=>c.memberId===memberId);
  if (search) { const q=String(search).toLowerCase(); rows=rows.filter(c=>c.memberName.toLowerCase().includes(q)||c.certNo.toLowerCase().includes(q)||c.eventName.toLowerCase().includes(q)); }
  res.json(rows.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))));
});
app.post('/api/admin/certificates', auth, (req,res)=>{
  const b=req.body||{};
  if(!b.memberId || !b.eventName || !b.date) return res.status(400).json({error:'Member, activity/event name and date are required'});
  const members=readJSON(MEMBERS_FILE,[]), m=members.find(x=>x.id===b.memberId);
  if(!m) return res.status(400).json({error:'Member not found'});
  const rows=readJSON(CERTIFICATES_FILE,[]);
  const n=rows.length+1;
  const certNo=`LHN-CERT-${String(n).padStart(4,'0')}`;
  const c={id:crypto.randomUUID(),certNo,memberId:m.id,memberName:m.name,eventName:String(b.eventName).trim(),date:String(b.date),description:String(b.description||'').trim(),issuedAt:new Date().toISOString()};
  rows.push(c); writeJSON(CERTIFICATES_FILE,rows); res.json(c);
});
app.delete('/api/admin/certificates/:id', auth, (req,res)=>{
  writeJSON(CERTIFICATES_FILE, readJSON(CERTIFICATES_FILE,[]).filter(x=>x.id!==req.params.id)); res.json({ok:true});
});
app.get('/api/member/certificates', memberAuth, (req,res)=>{
  res.json(readJSON(CERTIFICATES_FILE,[]).filter(c=>c.memberId===req.session.memberId).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))));
});
// Unified certificate view for printing - admin can view any certificate, a member can only view their own
app.get('/api/certificate/:id', (req,res)=>{
  const c=readJSON(CERTIFICATES_FILE,[]).find(x=>x.id===req.params.id);
  if(!c) return res.status(404).json({error:'Certificate not found'});
  const isAdmin = !!(req.session && req.session.admin);
  const isOwner = !!(req.session && req.session.memberId && req.session.memberId===c.memberId);
  if(!isAdmin && !isOwner) return res.status(401).json({error:'Not authorized to view this certificate'});
  res.json({certificate:c, site:(readSite().site||defaultSite.site)});
});
// Public certificate verification by certificate number (no personal data beyond name/activity)
app.get('/api/certificates/verify/:certNo', (req,res)=>{
  const c=readJSON(CERTIFICATES_FILE,[]).find(x=>x.certNo===req.params.certNo);
  if(!c) return res.json({valid:false});
  res.json({valid:true,memberName:c.memberName,eventName:c.eventName,date:c.date,certNo:c.certNo});
});

// ---- CSV Export ----
app.get('/api/admin/export/members.csv', auth, (req,res)=>{
  const rows=readJSON(MEMBERS_FILE,[]).map(safeMember);
  sendCSV(res,'members.csv',['Member ID','Name','Phone','Email','Join Date','Status'],
    rows.map(m=>[m.id,m.name,m.phone,m.email,m.joinDate,m.active?'Active':'Inactive']));
});
app.get('/api/admin/export/payments.csv', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), map=new Map(members.map(m=>[m.id,m]));
  const rows=readJSON(PAYMENTS_FILE,[]);
  sendCSV(res,'payments.csv',['Member ID','Member Name','Month','Due Date','Paid Date','Contribution','Late Fee','Total','Method','Note'],
    rows.map(p=>{const c=calcContribution(p.month,p.paymentDate);return [p.memberId,map.get(p.memberId)?.name||'Deleted member',p.month,c.dueDate,p.paymentDate,p.amount,p.lateFee,p.total,p.paymentMethod,p.note||''];}));
});
app.get('/api/admin/export/expenses.csv', auth, (req,res)=>{
  const rows=readJSON(EXPENSES_FILE,[]);
  sendCSV(res,'expenses.csv',['Date','Category','Amount','Note'], rows.map(e=>[e.date,e.category,e.amount,e.note||'']));
});
app.get('/api/admin/export/outstanding.csv', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), payments=readJSON(PAYMENTS_FILE,[]);
  const rows=members.filter(m=>m.active!==false).map(m=>{const led=memberLedger(m,payments);return [m.id,m.name,m.phone||'',led.unpaidMonths,led.outstanding];}).filter(r=>r[4]>0);
  sendCSV(res,'outstanding-dues.csv',['Member ID','Name','Phone','Unpaid Months','Outstanding Amount'], rows);
});
app.get('/api/admin/export/activities.csv', auth, (req,res)=>{
  const members=readJSON(MEMBERS_FILE,[]), map=new Map(members.map(m=>[m.id,m]));
  const rows=readJSON(ACTIVITIES_FILE,[]);
  sendCSV(res,'activities.csv',['Member ID','Member Name','Type','Date','Description'],
    rows.map(a=>[a.memberId,map.get(a.memberId)?.name||'Deleted member',a.type,a.date,a.description||'']));
});

app.listen(PORT, () => console.log(`NGO website running at http://localhost:${PORT}`));
