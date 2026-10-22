(function(){
const KEY='mvStudioContent', PROMO='mvStudioPromo';
const defaults={packages:[{name:'Landing Page',price:'449',regular:'499'},{name:'Company Website',price:'989',regular:'1099'},{name:'E-Commerce',price:'1709',regular:'1899'},{name:'Customise',price:'',regular:''}],projects:[{name:'APMoodle',detail:'Learning management system · ASP.NET Core, C#, PostgreSQL',url:'APMoodle.html'},{name:'HyperText Edu',detail:'Gamified HTML learning platform · JavaScript, CSS',url:'hypertextedu.html'},{name:'Psychology Consultation',detail:'Consultation and booking management system',url:'PsychologyConsultationManagementSystem.html'}]};
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))||f}catch(e){return f}};
let data=read(KEY,defaults);if(!data.packages)data.packages=defaults.packages;if(!data.projects)data.projects=defaults.projects;
const promo=read(PROMO,{enabled:true,title:'A better website starts here.',copy:'Get 10% off your first website project with MV Studio.',link:'#services'});
const $=s=>document.querySelector(s), toast=$('#adminToast');let timer;
function notify(s){toast.textContent=s;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2000)}
function persist(){localStorage.setItem(KEY,JSON.stringify(data));}
function renderPackages(){ $('#packageEditor').innerHTML=data.packages.map((p,i)=>`<div class="admin-package-row"><div><b>${esc(p.name)}</b><small>Starting price (RM)</small></div><input class="admin-price-input" aria-label="${esc(p.name)} price" value="${esc(p.price)}" placeholder="Quote"><button class="btn btn-secondary btn-sm admin-row-action" data-save-package="${i}">Save price</button></div>`).join('');$('#packageCount').textContent=data.packages.length; }
function renderProjects(){ $('#projectEditor').innerHTML=data.projects.map((p,i)=>`<div class="admin-project-row"><div><b>${esc(p.name)}</b><small>${esc(p.detail||'Portfolio project')} · ${esc(p.url||'#')}</small></div><button data-remove-project="${i}">Remove</button></div>`).join('');$('#projectCount').textContent=data.projects.length; }
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
renderPackages();renderProjects();$('#promoEnabled').checked=promo.enabled!==false;$('#promoTitle').value=promo.title;$('#promoCopy').value=promo.copy;$('#promoLink').value=promo.link;$('#promoStatus').textContent=promo.enabled===false?'Off':'On';
$('#packageEditor').addEventListener('click',e=>{const i=e.target.dataset.savePackage;if(i===undefined)return;data.packages[i].price=$$('#packageEditor .admin-price-input')[Number(i)].value.trim();persist();notify('Package price saved');});
function $$(s){return Array.from(document.querySelectorAll(s))}
$('#addProject').addEventListener('click',()=>{const name=prompt('Project name');if(!name?.trim())return;const detail=prompt('Short description and technologies','Website project')||'';const url=prompt('Project demo or case study URL','#projects')||'#projects';data.projects.push({name:name.trim(),detail,url});persist();renderProjects();notify('Project added');});
$('#projectEditor').addEventListener('click',e=>{const i=e.target.dataset.removeProject;if(i===undefined)return;data.projects.splice(Number(i),1);persist();renderProjects();notify('Project removed');});
$('#promoForm').addEventListener('submit',e=>{e.preventDefault();const p={enabled:$('#promoEnabled').checked,title:$('#promoTitle').value.trim(),copy:$('#promoCopy').value.trim(),link:$('#promoLink').value.trim()};localStorage.setItem(PROMO,JSON.stringify(p));$('#promoStatus').textContent=p.enabled?'On':'Off';notify('Promotion saved');});
$('#resetData').addEventListener('click',()=>{localStorage.removeItem(KEY);localStorage.removeItem(PROMO);notify('Demo content reset');setTimeout(()=>location.reload(),500);});
})();
