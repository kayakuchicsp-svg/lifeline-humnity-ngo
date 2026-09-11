let S;
const $=id=>document.getElementById(id);
async function load(){
  S=await fetch("/api/site").then(r=>r.json());
  const notices=await fetch("/api/notices").then(r=>r.json()).catch(()=>[]);
  const s=S.site;
  $("reg").textContent=s.registration; $("addressTop").textContent=s.address;
  $("brandName").textContent=s.name; $("brandShort").textContent=s.shortName;
  $("heroEyebrow").textContent=s.name+" • "+s.shortName; $("tagline").textContent=s.tagline; $("heroDesc").textContent=s.description;
  $("focusList").innerHTML=S.objectives.map(o=>`<span>✓ ${esc(o.title)}</span>`).join("");
  const noticesSection=document.getElementById("notices");
  if(notices.length){$("noticesGrid").innerHTML=notices.map(n=>`<article class="card"><div class="icon">📰</div><h3>${esc(n.title)}</h3><p>${esc(n.description||"")}</p><small>${esc(n.date)}</small></article>`).join("");noticesSection.style.display="";}
  else{noticesSection.style.display="none";}
  $("aboutTitle").textContent=S.about.title; $("aboutText").textContent=S.about.text; $("aboutAddress").textContent=s.address; $("aboutReg").textContent=s.registration;
  $("objectivesGrid").innerHTML=S.objectives.map((o,i)=>`<article class="card"><div class="icon">${esc(o.icon||"✦")}</div><h3>${esc(o.title)}</h3><p>${esc(o.description||"")}</p></article>`).join("");
  $("workGrid").innerHTML=(S.work.length?S.work:[{title:"Community Development",description:"Community development activities and programmes."},{title:"Health Initiatives",description:"Health-focused activities and awareness programmes."},{title:"Environment",description:"Environmental awareness and community activities."},{title:"Education",description:"Education and learning-oriented initiatives."},{title:"Science & Technology",description:"Science and technology initiatives."}]).map(w=>`<article class="card"><div class="icon">${esc(w.icon||"✦")}</div><h3>${esc(w.title)}</h3><p>${esc(w.description||"")}</p></article>`).join("");
  $("projectsGrid").innerHTML=S.projects.length?S.projects.map(p=>`<article class="project">${p.image?`<img src="${esc(p.image)}" alt="">`:""}<div class="body"><h3>${esc(p.title)}</h3><p>${esc(p.description||"")}</p>${p.date?`<small>${esc(p.date)}</small>`:""}</div></article>`).join(""):`<p>No projects added yet.</p>`;
  $("galleryGrid").innerHTML=S.gallery.length?S.gallery.map(g=>`<img src="${esc(g.image||g.url)}" alt="${esc(g.title||"NGO activity")}">`).join(""):`<p>No gallery photos added yet.</p>`;
  $("teamGrid").innerHTML=S.team.length?S.team.map(t=>`<article class="person">${t.image?`<img src="${esc(t.image)}" alt="">`:`<div class="logo" style="margin:auto">+</div>`}<h3>${esc(t.name)}</h3><p>${esc(t.role||"")}</p></article>`).join(""):`<p>No team members added yet.</p>`;
  $("volTitle").textContent=S.volunteers.title; $("volText").textContent=S.volunteers.text;
  const ci=[["📍","Office Address",s.address],["📜","Registration",s.registration],["☎","Phone",s.phone],["✉","Email",s.email]].filter(x=>x[2]);
  $("contactInfo").innerHTML=ci.map(x=>`<div><span>${x[0]}</span><p><b>${x[1]}</b><br>${esc(x[2]).replaceAll("\\n","<br>")}</p></div>`).join("");
  const links=["notices","about","objectives","work","projects","gallery","team","volunteer","contact"]; $("nav").innerHTML=`<a href="#home">Home</a>`+links.map(x=>`<a href="#${x}">${x==="work"?"Our Work":x[0].toUpperCase()+x.slice(1)}</a>`).join("");
  $("footName").textContent=s.name; $("footShort").textContent=s.shortName; $("footTag").textContent=s.description; $("footAddress").textContent=s.address; $("copyName").textContent=s.name;
  $("footLinks").innerHTML=links.map(x=>`<a href="#${x}">${x[0].toUpperCase()+x.slice(1)}</a>`).join("");
  const social=[["Facebook",s.facebook],["Instagram",s.instagram],["YouTube",s.youtube]].filter(x=>x[1]); $("socials").innerHTML=social.map(x=>`<a href="${esc(x[1])}" target="_blank" rel="noopener">${x[0]}</a>`).join(" • ");
  $("year").textContent=new Date().getFullYear();
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
$("menu").onclick=()=>{const n=$("nav");n.classList.toggle("open");$("menu").textContent=n.classList.contains("open")?"✕":"☰"};
$("contactForm").onsubmit=e=>{e.preventDefault();const email=S.site.email;if(!email){alert("Admin: please add the official NGO email first.");return}const sub=encodeURIComponent("Website Enquiry from "+$("cName").value);const body=encodeURIComponent("Name: "+$("cName").value+"\\nEmail: "+$("cEmail").value+"\\n\\nMessage:\\n"+$("cMessage").value);location.href=`mailto:${email}?subject=${sub}&body=${body}`};
load();
