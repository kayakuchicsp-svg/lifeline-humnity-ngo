let S;
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||"Request failed");return r.json()}
async function start(){const a=await api("/api/auth");if(a.authenticated)showApp();else $("login").classList.remove("hidden")}
function showApp(){$("login").classList.add("hidden");$("app").classList.remove("hidden");load()}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify({username:$("username").value,password:$("password").value})});showApp()}catch(e){$("loginMsg").textContent=e.message}}
$("logout").onclick=async()=>{await api("/api/logout",{method:"POST"});location.reload()};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));b.classList.add("active");$(b.dataset.tab).classList.add("active")});
document.querySelectorAll("[data-save]").forEach(b=>b.onclick=save);
$("saveTop").onclick=save;
async function load(){S=await api("/api/site");fillSettings();renderObjectives();renderWork();renderProjects();renderGallery();renderTeam();fillVolunteer();loadDashboard();loadNotices()}
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
async function loadDashboard(){
  try{
    const d=await api("/api/admin/dashboard");
    $("db_totalMembers").textContent=d.totalMembers;
    $("db_activeMembers").textContent=d.activeMembers;
    $("db_pendingRegistrations").textContent=d.pendingRegistrations;
    $("db_currentMonthCollection").textContent=money(d.currentMonthCollection);
    $("db_currentMonthExpenses").textContent=money(d.currentMonthExpenses);
    $("db_currentMonthBalance").textContent=money(d.currentMonthBalance);
    $("db_totalOutstanding").textContent=money(d.totalOutstanding);
    $("db_totalLateFees").textContent=money(d.totalLateFees);
    $("db_recentPayments").innerHTML=d.recentPayments.map(p=>`<tr><td>${esc(p.memberName)}</td><td>${esc(p.month)}</td><td>${money(p.total)}</td><td>${esc(p.paymentDate||"")}</td></tr>`).join("")||'<tr><td colspan="4">No payments yet.</td></tr>';
    $("db_recentExpenses").innerHTML=d.recentExpenses.map(e=>`<tr><td>${esc(e.date)}</td><td>${esc(e.category)}</td><td>${money(e.amount)}</td><td>${esc(e.note||"")}</td></tr>`).join("")||'<tr><td colspan="4">No expenses yet.</td></tr>';
  }catch(e){}
}
let NOTICES=[];
async function loadNotices(){
  try{NOTICES=await api("/api/admin/notices");renderNotices()}catch(e){}
}
function renderNotices(){
  $("noticeList").innerHTML=NOTICES.map(n=>`<div class="noticecard"><div class="nbody"><b>${esc(n.title)}</b><small>${esc(n.date)} · <span class="${n.published?'badge-pub':'badge-unpub'}" style="padding:2px 7px;border-radius:8px">${n.published?'PUBLISHED':'UNPUBLISHED'}</span></small><p>${esc(n.description||"")}</p></div><div class="nactions"><button onclick="toggleNoticePublish('${n.id}',${!n.published})">${n.published?'Unpublish':'Publish'}</button><button onclick="deleteNotice('${n.id}')" style="background:#fff0ee;color:#c0392b">Delete</button></div></div>`).join("")||"<p>No notices added yet.</p>";
}
async function addNotice(){
  try{
    const title=$("nt_title").value.trim(), date=$("nt_date").value;
    if(!title||!date) return toast("Title and date are required");
    await api("/api/admin/notices",{method:"POST",body:JSON.stringify({title,date,description:$("nt_desc").value,published:true})});
    $("nt_title").value="";$("nt_date").value="";$("nt_desc").value="";
    loadNotices();toast("Notice added");
  }catch(e){toast(e.message)}
}
async function toggleNoticePublish(id,published){try{await api("/api/admin/notices/"+id,{method:"PUT",body:JSON.stringify({published})});loadNotices()}catch(e){toast(e.message)}}
async function deleteNotice(id){if(!confirm("Delete this notice?"))return;try{await api("/api/admin/notices/"+id,{method:"DELETE"});loadNotices()}catch(e){toast(e.message)}}
function fillSettings(){const s=S.site;["name","shortName","tagline","registration","phone","email","whatsapp","facebook","instagram","youtube","address","description"].forEach(k=>{$("site_"+k).value=s[k]||""});$("about_title").value=S.about.title||"";$("about_text").value=S.about.text||""}
function fillVolunteer(){$("vol_title").value=S.volunteers.title||"";$("vol_text").value=S.volunteers.text||""}
function renderObjectives(){$("objectiveList").innerHTML=S.objectives.map((o,i)=>`<div class="item"><button class="remove" onclick="del('objectives',${i})">Delete</button><div class="itemgrid"><label>Icon<input data-o="${i}" data-k="icon" value="${esc(o.icon)}"></label><label>Title<input data-o="${i}" data-k="title" value="${esc(o.title)}"></label><label>Description<input data-o="${i}" data-k="description" value="${esc(o.description)}"></label></div></div>`).join("")}
function renderWork(){$("workList").innerHTML=S.work.map((o,i)=>`<div class="item"><button class="remove" onclick="del('work',${i})">Delete</button><div class="itemgrid"><label>Icon<input data-w="${i}" data-k="icon" value="${esc(o.icon||"🌱")}"></label><label>Title<input data-w="${i}" data-k="title" value="${esc(o.title)}"></label><label>Description<input data-w="${i}" data-k="description" value="${esc(o.description||"")}"></label></div></div>`).join("")}
function renderProjects(){$("projectList").innerHTML=S.projects.map((p,i)=>`<div class="item"><button class="remove" onclick="del('projects',${i})">Delete</button><div class="itemgrid"><label>Title<input data-p="${i}" data-k="title" value="${esc(p.title)}"></label><label>Date<input data-p="${i}" data-k="date" value="${esc(p.date||"")}"></label><label class="wide">Description<textarea data-p="${i}" data-k="description">${esc(p.description||"")}</textarea></label><label class="wide">Image URL<input data-p="${i}" data-k="image" value="${esc(p.image||"")}"></label></div></div>`).join("")}
function renderTeam(){$("teamList").innerHTML=S.team.map((t,i)=>`<div class="item"><button class="remove" onclick="del('team',${i})">Delete</button><div class="itemgrid"><label>Name<input data-t="${i}" data-k="name" value="${esc(t.name)}"></label><label>Role<input data-t="${i}" data-k="role" value="${esc(t.role||"")}"></label><label>Photo URL<input data-t="${i}" data-k="image" value="${esc(t.image||"")}"></label></div></div>`).join("")}
function renderGallery(){$("galleryList").innerHTML=S.gallery.map((g,i)=>`<div class="gitem"><img src="${esc(g.image||g.url)}"><div class="gbody"><input data-g="${i}" value="${esc(g.title||"")}"><button onclick="delGallery(${i})">Delete</button></div></div>`).join("")}
function sync(){document.querySelectorAll("[data-o]").forEach(x=>S.objectives[+x.dataset.o][x.dataset.k]=x.value);document.querySelectorAll("[data-w]").forEach(x=>S.work[+x.dataset.w][x.dataset.k]=x.value);document.querySelectorAll("[data-p]").forEach(x=>S.projects[+x.dataset.p][x.dataset.k]=x.value);document.querySelectorAll("[data-t]").forEach(x=>S.team[+x.dataset.t][x.dataset.k]=x.value);document.querySelectorAll("[data-g]").forEach(x=>S.gallery[+x.dataset.g].title=x.value)}
async function save(){try{sync();const s=S.site;["name","shortName","tagline","registration","phone","email","whatsapp","facebook","instagram","youtube","address","description"].forEach(k=>s[k]=$("site_"+k).value);S.about.title=$("about_title").value;S.about.text=$("about_text").value;S.volunteers.title=$("vol_title").value;S.volunteers.text=$("vol_text").value;S=await api("/api/site",{method:"PUT",body:JSON.stringify(S)});toast("Changes saved successfully");}catch(e){toast(e.message)}}
function addObjective(){S.objectives.push({id:Date.now(),title:"New Objective",icon:"✦",description:"Add description"});renderObjectives()}
function addWork(){S.work.push({title:"New Work Area",icon:"✦",description:"Add description"});renderWork()}
function addProject(){S.projects.push({title:"New Project",date:"",description:"Add project description",image:""});renderProjects()}
function addTeam(){S.team.push({name:"New Team Member",role:"Designation",image:""});renderTeam()}
function del(key,i){S[key].splice(i,1);key==="objectives"?renderObjectives():key==="work"?renderWork():key==="projects"?renderProjects():renderTeam()}
async function uploadGallery(){const f=$("galleryFile").files[0];if(!f)return toast("Choose an image first");const fd=new FormData();fd.append("image",f);const r=await fetch("/api/upload",{method:"POST",body:fd});const d=await r.json();if(!r.ok)return toast(d.error||"Upload failed");S.gallery.push({title:f.name,image:d.url});renderGallery();await save();$("galleryFile").value="";toast("Photo uploaded")}
async function delGallery(i){const g=S.gallery[i];S.gallery.splice(i,1);renderGallery();await save();if(g.image&&g.image.startsWith("/uploads/")){await api("/api/upload",{method:"DELETE",body:JSON.stringify({filename:g.image.split("/").pop()})}).catch(()=>{})}}
function toast(m){$("toast").textContent=m;$("toast").style.display="block";setTimeout(()=>$("toast").style.display="none",2200)}
start();
