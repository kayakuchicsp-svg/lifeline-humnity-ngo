const $=x=>document.getElementById(x);
let members=[],payments=[];
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
async function api(u,o={}){const r=await fetch(u,{headers:{"Content-Type":"application/json"},...o});const d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
async function load(){
 const a=await api('/api/auth'); if(!a.authenticated){location.href='/admin.html';return}
 const [f,m,p]=await Promise.all([api('/api/admin/finance/settings'),api('/api/admin/members'),api('/api/admin/payments')]);
 members=m;payments=p;
 $('amount').value=f.monthlyContribution;$('day').value=f.dueDay;$('late').value=f.lateFeePerDay;
 $('mc').textContent=m.length;$('tc').textContent=money(p.reduce((s,x)=>s+Number(x.total||0),0));$('lf').textContent=money(p.reduce((s,x)=>s+Number(x.lateFee||0),0));$('pr').textContent=p.length;
 $('pm').innerHTML=m.filter(x=>x.active).map(x=>`<option value="${x.id}">${x.id} — ${x.name}</option>`).join('');
 const memberOptions=m.map(x=>`<option value="${x.id}">${x.id} — ${x.name}</option>`).join('');
 if($('act_member'))$('act_member').innerHTML=memberOptions;
 if($('cert_member'))$('cert_member').innerHTML=memberOptions;
 renderMembers(m);
 renderPayments(p);
}
function renderMembers(m){ $('members').innerHTML=m.map(x=>`<tr><td>${x.id}</td><td>${x.name}</td><td>${x.phone||''}</td><td>${x.joinDate||''}</td><td>${x.active?'Active':'Inactive'}</td><td><button class="${x.active?'danger':''}" onclick="toggleMember('${x.id}',${!x.active})">${x.active?'Deactivate':'Activate'}</button></td></tr>`).join(''); }
function renderPayments(p){ $('payments').innerHTML=p.map(x=>`<tr><td>${x.memberName}<br><small>${x.memberId}</small></td><td>${x.month}</td><td>${x.calc.dueDate}</td><td>${x.paymentDate}</td><td>${money(x.amount)}</td><td>${money(x.lateFee)}</td><td><b>${money(x.total)}</b></td><td>${x.paymentMethod}</td><td><button onclick="receipt('${x.id}')">Receipt</button> <button class="danger" onclick="deletePayment('${x.id}')">Delete</button></td></tr>`).join(''); }
async function filterMembers(){try{const q=new URLSearchParams();if($('memberSearch').value)q.set('search',$('memberSearch').value);if($('memberStatusFilter').value)q.set('status',$('memberStatusFilter').value);renderMembers(await api('/api/admin/members?'+q.toString()))}catch(e){alert(e.message)}}
async function filterPayments(){try{const q=new URLSearchParams();if($('paymentSearch').value)q.set('search',$('paymentSearch').value);if($('paymentMonthFilter').value)q.set('month',$('paymentMonthFilter').value);renderPayments(await api('/api/admin/payments?'+q.toString()))}catch(e){alert(e.message)}}
async function saveRules(){try{await api('/api/admin/finance/settings',{method:'PUT',body:JSON.stringify({monthlyContribution:$('amount').value,dueDay:$('day').value,lateFeePerDay:$('late').value})});$('msg').textContent='Rules saved';load()}catch(e){$('msg').textContent=e.message}}
async function addMember(){try{await api('/api/admin/members',{method:'POST',body:JSON.stringify({id:$('mid').value,name:$('name').value,phone:$('phone').value,email:$('email').value,joinDate:$('join').value,password:$('pw').value})});['mid','name','phone','email','join','pw'].forEach(x=>$(x).value='');load()}catch(e){alert(e.message)}}
async function toggleMember(id,active){await api('/api/admin/members/'+encodeURIComponent(id),{method:'PUT',body:JSON.stringify({active})});load()}
async function pay(){try{await api('/api/admin/payments',{method:'POST',body:JSON.stringify({memberId:$('pm').value,month:$('month').value,paymentDate:$('date').value,paymentMethod:$('method').value})});load()}catch(e){alert(e.message)}}
async function deletePayment(id){if(confirm('Delete payment record?')){await api('/api/admin/payments/'+id,{method:'DELETE'});load()}}
function receipt(id){const p=payments.find(x=>x.id===id),w=open('','_blank');w.document.write(`<h1>LIFELINE HUMNITY NGO</h1><h2>Contribution Receipt</h2><p>Member: ${p.memberName} (${p.memberId})</p><p>Month: ${p.month} | Due: ${p.calc.dueDate} | Paid: ${p.paymentDate}</p><p>Contribution: ${money(p.amount)}</p><p>Late Fee: ${money(p.lateFee)}</p><h3>Total: ${money(p.total)}</h3><p>Method: ${p.paymentMethod}</p><p>Authorized Signature: __________________</p><script>print()<\/script>`);w.document.close()}
load();

async function report(){const month=prompt('Enter month (YYYY-MM), or leave blank for all records:','');if(month===null)return;try{const d=await api('/api/admin/report?month='+encodeURIComponent(month));const w=open('','_blank');w.document.write('<html><head><title>NGO Financial Report</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}td,th{padding:8px;border:1px solid #ddd}th{background:#f2f4f7}</style></head><body><h1>LIFELINE HUMNITY NGO</h1><h2>Financial Report: '+d.month+'</h2><p>Members: '+d.members+' · Records: '+d.paymentRecords+' · Contribution: '+money(d.totalContribution)+' · Late Fees: '+money(d.totalLateFee)+' · Grand Total: '+money(d.grandTotal)+'</p><table><tr><th>Member</th><th>Month</th><th>Paid Date</th><th>Contribution</th><th>Late Fee</th><th>Total</th><th>Method</th></tr>'+d.rows.map(x=>'<tr><td>'+x.memberName+' ('+x.memberId+')</td><td>'+x.month+'</td><td>'+x.paymentDate+'</td><td>'+money(x.contribution)+'</td><td>'+money(x.lateFee)+'</td><td>'+money(x.total)+'</td><td>'+x.method+'</td></tr>').join('')+'</table><script>print()<\\/script></body></html>');w.document.close()}catch(e){alert(e.message)}}
function backup(){location.href='/api/admin/backup'}

async function loadRegistrations(){
 try{const rows=await api('/api/admin/registrations');document.getElementById('regRows').innerHTML=rows.map(r=>`<tr><td>${r.name}</td><td>${r.phone}</td><td>${r.email||''}</td><td>${new Date(r.requestedAt).toLocaleDateString()}</td><td>${r.status}</td><td>${r.status==='PENDING'?`<button onclick="approveReg('${r.id}')">Approve</button> <button class="danger" onclick="rejectReg('${r.id}')">Reject</button>`:(r.memberId||'—')}</td></tr>`).join('')}catch(e){}
}
async function approveReg(id){try{const d=await api('/api/admin/registrations/'+id+'/approve',{method:'POST',body:JSON.stringify({})});alert('Approved. Member ID: '+d.member.id+'\nTemporary password: '+d.temporaryPassword);load();loadRegistrations()}catch(e){alert(e.message)}}
async function rejectReg(id){if(!confirm('Reject this application?'))return;await api('/api/admin/registrations/'+id+'/reject',{method:'POST',body:'{}'});loadRegistrations()}
async function loadDue(){try{const month=document.getElementById('dueMonth').value||new Date().toISOString().slice(0,7);const d=await api('/api/admin/due-list?month='+encodeURIComponent(month));document.getElementById('dueRows').innerHTML=d.rows.map(r=>`<tr><td>${r.name}<br><small>${r.memberId}</small></td><td>${r.phone||'—'}</td><td>${r.dueDate}</td><td>${money(r.amount)}</td><td>${r.paid?'<span class="ok">PAID</span>':'<b>UNPAID</b>'}</td><td>${r.phone&&!r.paid?`<a target="_blank" href="https://wa.me/${String(r.phone).replace(/\D/g,'')}?text=${encodeURIComponent(r.whatsappMessage)}"><button>WhatsApp</button></a>`:'—'}</td></tr>`).join('')}catch(e){alert(e.message)}}
(function(){const x=document.getElementById('dueMonth');if(x)x.value=new Date().toISOString().slice(0,7);loadRegistrations();loadDue()})();

async function loadSummary(){try{const month=document.getElementById('summaryMonth').value;const d=await api('/api/admin/financial-summary?month='+encodeURIComponent(month));$('income').textContent=money(d.totalIncome);$('expensesTotal').textContent=money(d.totalExpenses);$('balance').textContent=money(d.balance);$('expenseCount').textContent=d.expenseRecords;renderExpenses(d.expenses)}catch(e){alert(e.message)}}
function renderExpenses(rows){$('expenses').innerHTML=rows.map(x=>`<tr><td>${x.date}</td><td>${x.category}</td><td>${money(x.amount)}</td><td>${x.note||''}</td><td><button class="danger" onclick="deleteExpense('${x.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="5">No expenses recorded.</td></tr>'}
async function loadExpenses(){try{renderExpenses(await api('/api/admin/expenses'))}catch(e){}}
async function addExpense(){try{await api('/api/admin/expenses',{method:'POST',body:JSON.stringify({date:$('expenseDate').value,category:$('expenseCategory').value,amount:$('expenseAmount').value,note:$('expenseNote').value})});['expenseDate','expenseCategory','expenseAmount','expenseNote'].forEach(x=>$(x).value='');loadExpenses();loadSummary()}catch(e){alert(e.message)}}
async function deleteExpense(id){if(!confirm('Delete this expense?'))return;try{await api('/api/admin/expenses/'+id,{method:'DELETE'});loadExpenses();loadSummary()}catch(e){alert(e.message)}}
(function(){const x=document.getElementById('summaryMonth');if(x)x.value=new Date().toISOString().slice(0,7);loadExpenses();loadSummary()})();
async function filterExpenses(){try{const q=new URLSearchParams();if($('expenseCategoryFilter').value)q.set('category',$('expenseCategoryFilter').value);if($('expenseFrom').value)q.set('from',$('expenseFrom').value);if($('expenseTo').value)q.set('to',$('expenseTo').value);renderExpenses(await api('/api/admin/expenses?'+q.toString()))}catch(e){alert(e.message)}}

// ---------------- PHASE 5: ACTIVITIES & CERTIFICATES ----------------
function renderActivities(rows){$('activityRows').innerHTML=rows.map(a=>`<tr><td>${a.memberName}<br><small>${a.memberId}</small></td><td>${a.type}</td><td>${a.date}</td><td>${a.description||''}</td><td><button class="danger" onclick="deleteActivity('${a.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="5">No activity records.</td></tr>'}
async function loadActivities(){try{renderActivities(await api('/api/admin/activities'))}catch(e){}}
async function addActivity(){try{const memberId=$('act_member').value;if(!memberId)return alert('Add a member first');await api('/api/admin/activities',{method:'POST',body:JSON.stringify({memberId,type:$('act_type').value,date:$('act_date').value,description:$('act_desc').value})});$('act_date').value='';$('act_desc').value='';loadActivities()}catch(e){alert(e.message)}}
async function deleteActivity(id){if(!confirm('Delete this activity record?'))return;try{await api('/api/admin/activities/'+id,{method:'DELETE'});loadActivities()}catch(e){alert(e.message)}}
async function filterActivities(){try{const q=new URLSearchParams();if($('actSearch').value)q.set('search',$('actSearch').value);if($('actTypeFilter').value)q.set('type',$('actTypeFilter').value);if($('actFrom').value)q.set('from',$('actFrom').value);if($('actTo').value)q.set('to',$('actTo').value);renderActivities(await api('/api/admin/activities?'+q.toString()))}catch(e){alert(e.message)}}
loadActivities();

function renderCertificates(rows){$('certRows').innerHTML=rows.map(c=>`<tr><td>${c.certNo}</td><td>${c.memberName}<br><small>${c.memberId}</small></td><td>${c.eventName}</td><td>${c.date}</td><td><button onclick="window.open('/certificate.html?id=${c.id}','_blank')">Print</button> <button class="danger" onclick="deleteCertificate('${c.id}')">Delete</button></td></tr>`).join('')||'<tr><td colspan="5">No certificates issued yet.</td></tr>'}
async function loadCertificates(){try{renderCertificates(await api('/api/admin/certificates'))}catch(e){}}
async function addCertificate(){try{const memberId=$('cert_member').value;if(!memberId)return alert('Add a member first');await api('/api/admin/certificates',{method:'POST',body:JSON.stringify({memberId,eventName:$('cert_event').value,date:$('cert_date').value,description:$('cert_desc').value})});$('cert_event').value='';$('cert_date').value='';$('cert_desc').value='';loadCertificates()}catch(e){alert(e.message)}}
async function deleteCertificate(id){if(!confirm('Delete this certificate?'))return;try{await api('/api/admin/certificates/'+id,{method:'DELETE'});loadCertificates()}catch(e){alert(e.message)}}
async function filterCertificates(){try{const q=new URLSearchParams();if($('certSearch').value)q.set('search',$('certSearch').value);renderCertificates(await api('/api/admin/certificates?'+q.toString()))}catch(e){alert(e.message)}}
loadCertificates();
