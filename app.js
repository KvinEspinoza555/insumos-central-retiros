/* Insumos Central Retiros v0.6: DEMO PÚBLICA con datos ficticios. No usar para producción. */
'use strict';
const KEY='central-retiros-web-demo-v06';
const SESSION_KEY='central-retiros-web-session-v06';
const NAV={dashboard:'Inicio',requests:'Solicitudes',new:'Nueva solicitud',inventory:'Inventario',clients:'Clientes',users:'Usuarios',reports:'Reportes'};
let db, sessionId, page='dashboard', newLines=[1], nextLineId=2, toastTimer;
let pendingInstallPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingInstallPrompt=event});
const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeHtml;
const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const now=()=>new Date().toISOString();
const localYmd=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const toLocalDate=str=>new Date(str+'T12:00:00');
const fmt=str=>str?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeStyle:'short'}).format(new Date(str)):'—';
const fmtD=str=>str?new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(toLocalDate(str)):'—';
const clp=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
function isoWeek(dateString){const d=new Date(dateString+'T12:00:00Z');d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));const y=new Date(Date.UTC(d.getUTCFullYear(),0,1));return Math.ceil((((d-y)/86400000)+1)/7)}
function monthLabel(dateString){return new Intl.DateTimeFormat('es-CL',{month:'long',timeZone:'UTC'}).format(new Date(dateString+'T12:00:00Z'))}
function weekRange(dateString){let d=toLocalDate(dateString||localYmd());if(Number.isNaN(d.getTime()))d=new Date();const wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);let a=localYmd(d);d.setDate(d.getDate()+6);return {start:a,end:localYmd(d)};}
function inWeek(iso,range){const day=localYmd(new Date(iso));return day>=range.start&&day<=range.end}
function getUser(id){return db.users.find(u=>u.id===id)}
function currentUser(){return getUser(sessionId)}
function getClient(id){return db.clients.find(c=>c.id===id)}
function getProduct(id){return db.products.find(p=>p.id===id)}
function isAdmin(){return currentUser()?.role==='admin'}
const save=()=>{localStorage.setItem(KEY,JSON.stringify(db))};
function toast(message){const box=$('toast');if(!box)return;box.textContent=message;box.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>box.classList.remove('show'),3800)}
async function hashPassword(password,salt){const data=new TextEncoder().encode(`${salt}:${password}`);const digest=await crypto.subtle.digest('SHA-256',data);return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function userRecord(name,username,password,role,clientIds=[]){const salt=uid();return {id:uid(),name,username:username.toLowerCase().trim(),salt,passwordHash:await hashPassword(password,salt),role,clientIds,active:true,createdAt:now()}}
async function seed(){
  if(localStorage.getItem(KEY)){try{
    db=JSON.parse(localStorage.getItem(KEY));
    // Base local exclusivamente ficticia, independiente de otras versiones.
    return
  }catch{}}
  // Datos ficticios. Esta carpeta está preparada para publicarse como vista previa pública.
  const clientsData = ['CLIENTE DEMOSTRACION A','CLIENTE DEMOSTRACION B','CLIENTE DEMOSTRACION C'];
  const productsData = [
    ['DEMO-001','ETIQUETA TERMICA BLANCA 100 x 150','rollos',12,0],
    ['DEMO-002','FILM PALETIZADOR TRANSPARENTE','rollos',8,0],
    ['DEMO-003','CINTA DE EMBALAJE','unidades',24,0],
    ['DEMO-004','SELLOS DE SEGURIDAD','unidades',35,0],
    ['DEMO-005','VENTANAS PARA GUIAS','unidades',40,0]
  ];
  const initialClients=clientsData.map(name=>({id:uid(),name,active:true,createdAt:now()}));
  const initialProducts=productsData.map(([sku,name,unit,stock,unitPrice])=>({id:uid(),sku,name,unit,unitPrice,stock,min:3,active:true}));
  const admin=await userRecord('Administrador demo','admin','demo1234','admin');
  const requester=await userRecord('Solicitante demo','solicita','demo1234','requester',[initialClients[0].id]);
  db={version:4,users:[admin,requester],clients:initialClients,products:initialProducts,requests:[],movements:[]};
  save();
}
function navItems(){const items=[['dashboard','▦'],['requests','▤'],['new','＋'],['inventory','▧'],['clients','◈'],['users','♙'],['reports','▥']];return items.filter(([id])=>isAdmin()||['dashboard','requests','new'].includes(id)).map(([id,icon])=>`<button class="nav-btn ${page===id?'active':''}" onclick="App.nav('${id}')"><span class="nav-symbol">${icon}</span>${NAV[id]}</button>`).join('')}
function shell(){const u=currentUser();$('app').innerHTML=`<div class="layout">
  <aside class="sidebar" id="sidebar"><div class="logo"><span class="logo-mark">IC</span><span class="brand-name">Insumos Central Retiros</span><span class="badge-demo">Demo</span></div>
    <div><div class="side-label">Navegación</div><nav class="nav-list">${navItems()}</nav></div>
    <div class="side-bottom"><div class="warning">Prueba local: los datos solo existen en este navegador.</div><div class="side-person"><div class="avatar">${esc(u.name.slice(0,1))}</div><div><strong>${esc(u.name)}</strong><span>${isAdmin()?'Administrador':'Solicitante'}</span></div></div><button class="btn btn-ghost" style="color:#bcd2e9;width:100%" onclick="App.logout()">↪ Cerrar sesión</button></div>
  </aside>
  <div class="main"><header class="topbar"><div class="topbar-right"><button class="btn mobile-menu" onclick="App.menu()" aria-label="Abrir menú">☰</button><div class="topbar-title"><h1>${NAV[page]}</h1><p>Vista previa · Datos ficticios · ${esc(u.name)}</p></div></div><div class="topbar-right"><button class="btn btn-sm" onclick="App.installHelp()" title="Cómo instalar Insumos Central Retiros">Instalar app</button><span class="desktop-chip">● Demo pública, sin sincronización</span><span class="avatar" style="background:#dfeeff;color:#2364bb">${esc(u.name.slice(0,1))}</span></div></header>
  <main class="content">${renderPage()}<div class="footer-note">Insumos Central Retiros · Versión web de demostración con datos ficticios · NO usar para pedidos reales</div></main></div></div>`;
}
function loginPage(){
  $('app').innerHTML=`<div class="login-page"><section class="login-hero"><div class="logo"><span class="logo-mark">IC</span> Insumos Central Retiros <span class="badge-demo">Demo</span></div><div class="hero-main"><h1>El control de tus <span>insumos</span> en un solo lugar.</h1><p>Crea usuarios, clientes e insumos desde tu panel. Registra stock, aprueba solicitudes y descarga reportes, todo en un solo lugar.</p></div><div class="hero-facts"><div><b>01</b>Consulta stock</div><div><b>02</b>Solicita y reserva</div><div><b>03</b>Aprueba</div><div><b>04</b>Exporta</div></div></section>
    <section class="login-right"><div class="login-card"><div class="eyebrow">Acceso al sistema</div><h2>Iniciar sesión</h2><p>Prueba la app en Android, iPhone o PC. Los datos son ficticios y no están sincronizados.</p><form id="loginForm"><div class="form-field"><label for="username">Usuario</label><input id="username" autocomplete="username" required placeholder="Nombre de usuario" /></div><div class="form-field"><label for="password">Contraseña</label><input id="password" type="password" autocomplete="current-password" required placeholder="Tu contraseña" /></div><button class="btn btn-primary btn-full" type="submit">Ingresar al sistema</button></form><div style="margin:12px 0"><button type="button" class="btn btn-sm" onclick="App.installHelp()">📲 Instalar la app en este dispositivo</button></div><div class="demo-credentials"><b>Credenciales de demostración</b><div>Administrador: <b>admin</b> · Contraseña: <b>demo1234</b></div><div>Solicitante: <b>solicita</b> · Contraseña: <b>demo1234</b></div></div><p class="warning" style="margin-top:14px">DEMOSTRACIÓN PÚBLICA: datos ficticios. Cada dispositivo guarda sus propios cambios; los pedidos no llegan a otros equipos. No ingresar datos reales ni información sensible.</p></div></section></div>`;
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();const u=db.users.find(x=>x.username===$('username').value.trim().toLowerCase()&&x.active);if(!u||await hashPassword($('password').value,u.salt)!==u.passwordHash){toast('Usuario o contraseña incorrectos');return}sessionId=u.id;sessionStorage.setItem(SESSION_KEY,sessionId);page='dashboard';shell()});
}
function render(){const u=currentUser();if(!u||!u.active){sessionId=null;sessionStorage.removeItem(SESSION_KEY);loginPage();return}if(!isAdmin()&&!['dashboard','requests','new'].includes(page))page='dashboard';shell()}
function renderPage(){return ({dashboard:renderDashboard,requests:renderRequests,new:renderNew,inventory:renderInventory,clients:renderClients,users:renderUsers,reports:renderReports}[page]||renderDashboard)()}
const statusLabel={pending:'Pendiente',approved:'Aprobada',rejected:'Rechazada'};
function statusTag(s){return `<span class="status ${s}">${statusLabel[s]||esc(s)}</span>`}
function accessibleRequests(){return isAdmin()?db.requests:db.requests.filter(r=>r.createdBy===sessionId)}
function recentRequestRows(rs,max=100){return rs.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,max).map(r=>`<tr><td><b>${esc(r.number)}</b><div class="meta">${fmt(r.createdAt)}</div></td><td>${esc(getClient(r.clientId)?.name||'Cliente no disponible')}</td><td>${esc(getUser(r.createdBy)?.name||'—')}</td><td>${r.items.length} tipo(s)</td><td>${statusTag(r.status)}</td><td class="td-right nowrap">${isAdmin()&&r.status==='pending'?`<button class="btn btn-sm btn-mint" onclick="App.approve('${r.id}')">Aprobar</button> <button class="btn btn-sm btn-danger" onclick="App.reject('${r.id}')">Rechazar</button>`:''}${isAdmin()&&r.status==='approved'?`<button class="btn btn-sm" onclick="App.printRequest('${r.id}')">PDF / Imprimir</button>`:''}<button class="btn btn-sm btn-ghost" onclick="App.details('${r.id}')">Ver</button></td></tr>`).join('')}
const reqTable=rs=>`<div class="table-wrap"><table><thead><tr><th>N.º / Fecha</th><th>Cliente</th><th>Solicitante</th><th>Insumos</th><th>Estado</th><th class="td-right">Acciones</th></tr></thead><tbody>${recentRequestRows(rs)||`<tr><td colspan="6" class="empty">No hay solicitudes registradas.</td></tr>`}</tbody></table></div>`;
function renderDashboard(){const rs=accessibleRequests();const pending=rs.filter(r=>r.status==='pending');const w=weekRange(localYmd());const approved=rs.filter(r=>r.status==='approved'&&r.approvedAt&&inWeek(r.approvedAt,w));const low=db.products.filter(p=>p.active&&p.stock<=p.min);return `<div class="page-intro"><div><h2>Resumen operativo</h2><p>Vista general del movimiento de insumos y las solicitudes</p></div><div class="actions"><button class="btn btn-primary" onclick="App.nav('new')">＋ Nueva solicitud</button></div></div>
${isAdmin()?`<section class="quick-panel"><div class="quick-head"><div><h3>Acciones rápidas</h3><p>Administra todo directamente en la aplicación</p></div><span class="admin-label">Panel administrador</span></div><div class="quick-grid"><button class="quick-btn" onclick="App.nav('inventory')"><span>↗</span><b>Ingresar stock</b><small>Registrar entradas o salidas</small></button><button class="quick-btn" onclick="App.jumpTo('inventory','newProduct')"><span>＋</span><b>Agregar insumo</b><small>Código, unidad y precio privado</small></button><button class="quick-btn" onclick="App.jumpTo('clients','newClient')"><span>◈</span><b>Agregar cliente</b><small>Crear o editar destinatarios</small></button><button class="quick-btn" onclick="App.jumpTo('users','newUser')"><span>♙</span><b>Agregar personal</b><small>Usuarios y permisos</small></button><button class="quick-btn" onclick="App.nav('reports')"><span>▥</span><b>Exportar reportes</b><small>Excel y comprobantes PDF</small></button></div></section>`:``}<div class="stat-grid"><div class="stat"><div class="icon-bg">▧</div><span>Insumos registrados</span><strong>${db.products.filter(p=>p.active).length}</strong><small>Tipos de insumo</small></div><div class="stat"><div class="icon-bg">◷</div><span>Solicitudes pendientes</span><strong>${pending.length}</strong><small>En espera de revisión</small></div><div class="stat"><div class="icon-bg">✓</div><span>Aprobadas esta semana</span><strong>${approved.length}</strong><small>${fmtD(w.start)} – ${fmtD(w.end)}</small></div><div class="stat"><div class="icon-bg">!</div><span>Stock bajo o mínimo</span><strong>${low.length}</strong><small>Insumos que revisar</small></div></div>
<div class="grid-2"><section class="panel"><div class="panel-header"><div><h3>Solicitudes recientes</h3><p class="desc">Últimos movimientos visibles para tu cuenta</p></div><button class="btn btn-sm" onclick="App.nav('requests')">Ver todas</button></div>${reqTable(rs.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5))}</section><section class="panel"><h3>Alertas de inventario</h3><p class="desc">Productos con existencias en el mínimo o bajo él</p>${low.length?low.map(p=>`<div class="status-card"><span class="leading">!</span><span><strong>${esc(p.name)}</strong><small>${esc(p.sku)} · mínimo ${p.min} ${esc(p.unit)}</small></span><span class="trailing status low">${p.stock} ${esc(p.unit)}</span></div>`).join(''):`<div class="empty"><strong>Todo en orden</strong>Sin alertas de stock mínimo.</div>`}</section></div>
<div class="section-note"><b>Control de existencias:</b> al enviar un pedido, el stock solicitado se <b>reserva inmediatamente</b>. Si se aprueba, no se vuelve a descontar; si se rechaza, la reserva se libera.</div>`}
function renderRequests(){const rs=accessibleRequests();return `<div class="page-intro"><div><h2>Solicitudes de insumos</h2><p>${isAdmin()?'Revisa, aprueba o rechaza las solicitudes de tu equipo':'Consulta el estado de tus solicitudes'}</p></div><button class="btn btn-primary" onclick="App.nav('new')">＋ Crear solicitud</button></div><section class="panel"><div class="filters"><label class="strong small" for="requestStatus">Mostrar</label><select id="requestStatus" onchange="App.refreshRequests()"><option value="all">Todas</option><option value="pending">Pendientes</option><option value="approved">Aprobadas</option><option value="rejected">Rechazadas</option></select><span class="meta">${rs.length} solicitud(es) en total</span></div><div id="requestTable">${reqTable(rs)}</div></section>`}
function availableClients(){const u=currentUser();return db.clients.filter(c=>c.active&&(isAdmin()||(u.clientIds||[]).includes(c.id)))}
function itemLine(lineId){
  const opts=db.products.filter(p=>p.active).map(p=>`<option value="${p.id}" ${p.stock<=0?'disabled':''}>${esc(p.sku)} · ${esc(p.name)} · ${esc(p.unit)} · ${p.stock>0?`${p.stock} disponibles`:'AGOTADO'}</option>`).join('');
  return `<div class="select-line" data-line="${lineId}"><select aria-label="Insumo" class="input" id="item_${lineId}" required><option value="">Seleccionar insumo...</option>${opts}</select><input class="input" type="number" id="qty_${lineId}" min="1" step="1" value="1" required aria-label="Cantidad" /><button class="btn btn-sm btn-danger" type="button" onclick="App.removeLine(${lineId})" aria-label="Quitar insumo">×</button></div>`;
}
function renderNew(){
  const clients=availableClients();
  const available=db.products.filter(p=>p.active&&p.stock>0);
  return `<div class="page-intro"><div><h2>Crear una solicitud</h2><p>Elige un cliente y solicita únicamente cantidades disponibles</p></div></div>
  <div class="grid-2"><section class="panel"><form id="requestForm">
    <div class="form-field"><label for="clientId">Cliente destinatario</label><select id="clientId" required><option value="">Seleccionar cliente...</option>${clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
    <div class="separator"></div><h3>Detalle de insumos</h3><p class="desc">El catálogo muestra las existencias disponibles. Los productos agotados no pueden seleccionarse.</p>
    <div class="select-line line-head"><span>Insumo</span><span>Cantidad</span><span></span></div>
    <div id="itemLines">${newLines.map(itemLine).join('')}</div>
    <button type="button" class="btn btn-sm" onclick="App.addLine()" ${available.length?'':'disabled'}>＋ Agregar otro insumo</button>
    <div id="stockFeedback" class="stock-feedback" aria-live="polite"></div>
    <div class="form-field" style="margin-top:20px"><label for="requestNotes">Observaciones (opcional)</label><textarea id="requestNotes" maxlength="500" placeholder="Información para preparar el pedido..."></textarea></div>
    <div class="separator"></div><button type="submit" id="submitRequest" class="btn btn-primary btn-full" ${(!clients.length||!available.length)?'disabled':''}>Enviar solicitud y reservar stock</button>
  </form></section>
  <section class="panel"><h3>¿Qué ocurre después?</h3><p class="desc">Proceso de reserva y autorización</p>
    <div class="status-card"><span class="leading">1</span><span><strong>Seleccionas el insumo</strong><small>Solo puedes solicitar lo disponible.</small></span></div>
    <div class="status-card"><span class="leading">2</span><span><strong>Envías y reservas</strong><small>La cantidad se descuenta inmediatamente del stock disponible.</small></span></div>
    <div class="status-card"><span class="leading">3</span><span><strong>El administrador decide</strong><small>Aprueba sin descontar dos veces, o rechaza y devuelve la reserva.</small></span></div>
    <div class="status-card"><span class="leading">4</span><span><strong>Comprobante y reporte</strong><small>Los pedidos aprobados quedan disponibles en PDF y Excel.</small></span></div>
  </section></div>`;
}
function renderInventory(){if(!isAdmin())return '';return `<div class="page-intro"><div><h2>Inventario de insumos</h2><p>Catálogo ficticio para pruebas · Actualiza existencias, controla movimientos y registra insumos desde esta pantalla</p></div></div><div class="panel"><div class="panel-header"><h3>Existencias actuales</h3><span class="pill">${db.products.length} insumos</span></div><div class="table-wrap"><table><thead><tr><th>Código</th><th>Insumo</th><th>Unidad</th><th>Valor UNI (CLP)</th><th>Stock</th><th>Mín.</th><th>Estado</th><th class="td-right">Movimiento / Edición</th></tr></thead><tbody>${db.products.map(p=>`<tr><td>${esc(p.sku)}</td><td><b>${esc(p.name)}</b>${!p.active?'<div class="meta">Inactivo</div>':''}</td><td>${esc(p.unit)}</td><td><b>${clp(p.unitPrice)}</b></td><td><b>${p.stock}</b></td><td>${p.min}</td><td><span class="status ${p.stock===0?'low':p.stock<=p.min?'low':'ok'}">${p.stock===0?'Agotado':p.stock<=p.min?'Stock bajo':'Disponible'}</span></td><td><div class="inventory-row"><input id="adjust_${p.id}" type="number" min="1" step="1" placeholder="Cant." aria-label="Cantidad movimiento ${esc(p.name)}" class="input"/><button class="btn btn-sm btn-mint" onclick="App.adjust('${p.id}',1)">＋ Ingreso</button><button class="btn btn-sm" onclick="App.adjust('${p.id}',-1)">− Salida</button><button class="btn btn-sm" onclick="App.editProduct('${p.id}')">Editar</button><button class="btn btn-sm" onclick="App.toggleProduct('${p.id}')">${p.active?'Desactivar':'Activar'}</button></div></td></tr>`).join('')}</tbody></table></div></div><div class="grid-2"><section class="panel"><h3>Registrar nuevo insumo</h3><p class="desc">Puedes agregar más códigos y fijar su precio y stock</p><form id="newProduct"><div class="form-grid"><div class="form-field"><label for="productSku">Código del insumo</label><input id="productSku" required maxlength="30" placeholder="Código" /></div><div class="form-field"><label for="productName">Nombre del insumo</label><input id="productName" required maxlength="100" placeholder="Descripción" /></div><div class="form-field"><label for="productUnit">Unidad de control</label><select id="productUnit"><option value="por definir">Por definir</option><option value="unidades">Unidades</option><option value="rollos">Rollos</option><option value="cajas">Cajas</option><option value="paquetes">Paquetes</option><option value="metros">Metros</option><option value="pallets">Pallets</option></select></div><div class="form-field"><label for="productPrice">Valor unitario (CLP)</label><input id="productPrice" type="number" min="0" step="1" value="0" required /></div><div class="form-field"><label for="productStock">Stock inicial</label><input id="productStock" type="number" min="0" step="1" value="0" required /></div><div class="form-field"><label for="productMin">Alerta de stock mínimo</label><input id="productMin" type="number" min="0" step="1" value="0" required /></div></div><button class="btn btn-primary" type="submit">Guardar insumo</button></form></section><section class="panel"><h3>Movimientos recientes</h3><p class="desc">Entradas, reservas de solicitudes y devoluciones por rechazo</p>${db.movements.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8).map(m=>`<div class="status-card"><span class="leading">${m.delta>=0?'＋':'−'}</span><span><strong>${esc(getProduct(m.productId)?.name||'Insumo eliminado')}</strong><small>${fmt(m.date)} · ${esc(m.reference)}</small></span><span class="trailing strong" style="color:${m.delta>=0?'#0c8f77':'#a65639'}">${m.delta>0?'+':''}${m.delta}</span></div>`).join('')||'<div class="empty">Aún no hay movimientos registrados.</div>'}</section></div>`}
function renderClients(){if(!isAdmin())return '';return `<div class="page-intro"><div><h2>Clientes destinatarios</h2><p>Administra los clientes que pueden recibir insumos</p></div></div><div class="grid-2"><section class="panel"><h3>Clientes registrados</h3><p class="desc">Estos nombres aparecerán en las solicitudes</p><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th class="td-right">Acción</th></tr></thead><tbody>${db.clients.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td><span class="status ${c.active?'approved':'rejected'}">${c.active?'Activo':'Inactivo'}</span></td><td class="td-right"><button class="btn btn-sm" onclick="App.toggleClient('${c.id}')">${c.active?'Desactivar':'Activar'}</button> <button class="btn btn-sm" onclick="App.editClient('${c.id}')">Renombrar</button></td></tr>`).join('')}</tbody></table></div></section><section class="panel"><h3>Agregar cliente</h3><p class="desc">El nuevo cliente quedará disponible para seleccionar</p><form id="newClient"><div class="form-field"><label for="clientName">Nombre del cliente</label><input id="clientName" required maxlength="120" placeholder="Nombre o razón social" /></div><button class="btn btn-primary" type="submit">Guardar cliente</button></form></section></div>`}
function renderUsers(){if(!isAdmin())return '';return `<div class="page-intro"><div><h2>Usuarios y permisos</h2><p>Crea usuarios, asigna clientes y administra los accesos desde aquí</p></div></div><div class="grid-2"><section class="panel"><h3>Usuarios</h3><p class="desc">El administrador puede activar o desactivar cuentas</p><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Perfil</th><th>Estado</th><th class="td-right">Acceso</th></tr></thead><tbody>${db.users.map(u=>`<tr><td><b>${esc(u.name)}</b><div class="meta">${esc(u.username)}</div><div class="meta">${u.role==='requester'?((u.clientIds||[]).map(id=>getClient(id)?.name).filter(Boolean).map(esc).join(' · ')||'Sin clientes'):'Todos los clientes'}</div></td><td>${u.role==='admin'?'Administrador':'Solicitante'}</td><td><span class="status ${u.active?'approved':'rejected'}">${u.active?'Activo':'Desactivado'}</span></td><td class="td-right"><button class="btn btn-sm" onclick="App.editUser('${u.id}')">Editar</button> <button class="btn btn-sm" onclick="App.resetPassword('${u.id}')">Restablecer clave</button> ${u.id!==sessionId?`<button class="btn btn-sm" onclick="App.toggleUser('${u.id}')">${u.active?'Desactivar':'Activar'}</button>`:'<span class="meta">Cuenta actual</span>'}</td></tr>`).join('')}</tbody></table></div></section><section class="panel"><h3>Agregar nuevo usuario</h3><p class="desc">En la versión definitiva se crearán cuentas seguras y sincronizadas</p><form id="newUser"><div class="form-grid"><div class="form-field"><label for="userName">Nombre completo</label><input id="userName" required maxlength="100" /></div><div class="form-field"><label for="userLogin">Nombre de usuario</label><input id="userLogin" required maxlength="40" pattern="[a-zA-Z0-9._-]+" /></div><div class="form-field"><label for="userPassword">Contraseña (mínimo 8 caracteres)</label><input id="userPassword" type="password" required minlength="8" autocomplete="new-password" /></div><div class="form-field"><label for="userRole">Perfil</label><select id="userRole" onchange="App.roleChanged()"><option value="requester">Solicitante</option><option value="admin">Administrador</option></select></div></div><div id="userClientSelector"><div class="form-field"><label>Clientes autorizados (al menos uno)</label><div class="user-clients">${db.clients.filter(c=>c.active).map(c=>`<label class="check-pill"><input type="checkbox" name="clientAccess" value="${c.id}">${esc(c.name)}</label>`).join('')}</div></div></div><button class="btn btn-primary" type="submit">Crear usuario</button></form></section></div><div class="section-note">La autorización de esta demo se limita al navegador. Antes de permitir acceso a empleados desde sus teléfonos debemos habilitar autenticación real, permisos seguros y una base de datos central.</div>`}
function renderReports(){if(!isAdmin())return '';const w=weekRange(localYmd());return `<div class="page-intro"><div><h2>Reportes y exportación</h2><p>Consulta las salidas aprobadas por semana y exporta los movimientos a Excel</p></div></div><div class="grid-2"><section class="panel"><h3>Reporte semanal de salidas</h3><p class="desc">Elige cualquier fecha de la semana que deseas revisar</p><div class="form-field"><label for="reportDate">Fecha de referencia</label><input id="reportDate" type="date" value="${localYmd()}" onchange="App.reportPreview()" /></div><div class="section-note" id="reportRange">Semana: ${fmtD(w.start)} – ${fmtD(w.end)}</div><div class="actions"><button class="btn btn-primary" onclick="App.exportWeekly()">↓ Descargar Excel (.xlsx)</button><button class="btn" onclick="App.printWeekly()">Imprimir resumen / PDF</button></div><p class="secondary-note">Reporte en el formato indicado: FECHA, AÑO, WEEK, MES, CLIENTE, COD, DETALLE, CANTIDAD, VALOR UNI, VALOR TOTAL y Status. Se incluyen además resúmenes por insumo y cliente.</p></section><section class="panel"><h3>Vista previa semanal</h3><p class="desc">Salidas confirmadas dentro de la semana</p><div id="reportStats">${reportPreviewMarkup(w)}</div><div class="separator"></div><h3>Respaldo de demostración</h3><p class="desc">Copia de los datos locales para no perder pruebas al limpiar el navegador</p><button class="btn" onclick="App.backup()">↓ Descargar respaldo (.json)</button></section></div>`}
function reportData(range){return db.requests.filter(r=>r.status==='approved'&&r.approvedAt&&inWeek(r.approvedAt,range)).sort((a,b)=>a.approvedAt.localeCompare(b.approvedAt))}
function reportPreviewMarkup(range){const rs=reportData(range);return `<div class="stat-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:5px"><div class="stat"><span>Solicitudes aprobadas</span><strong>${rs.length}</strong></div><div class="stat"><span>Líneas despachadas</span><strong>${rs.reduce((n,r)=>n+r.items.length,0)}</strong></div></div>${rs.length?`<p class="hint-block">Clientes: ${[...new Set(rs.map(r=>getClient(r.clientId)?.name||'—'))].map(esc).join(', ')}</p>`:'<div class="empty">Todavía no hay salidas aprobadas esta semana.</div>'}`}
function bindForms(){if(page==='new'){$('requestForm')?.addEventListener('submit',requestSubmit);$('itemLines')?.addEventListener('input',updateStockHints);$('itemLines')?.addEventListener('change',updateStockHints);updateStockHints();}if(page==='inventory')$('newProduct')?.addEventListener('submit',newProduct);if(page==='clients')$('newClient')?.addEventListener('submit',newClient);if(page==='users')$('newUser')?.addEventListener('submit',newUser)}
function afterRender(){bindForms()}
function update(){render();afterRender()}
function updateStockHints(){
  if(page!=='new')return;
  const feedback=$('stockFeedback'),button=$('submitRequest');
  if(!feedback||!button)return;
  const totals=new Map();
  let problem='';
  for(const line of newLines){
    const id=$(`item_${line}`)?.value;
    const qty=Number($(`qty_${line}`)?.value);
    if(!id)continue;
    if(!Number.isSafeInteger(qty)||qty<=0){problem='Ingresa una cantidad entera mayor que cero.';continue;}
    totals.set(id,(totals.get(id)||0)+qty);
  }
  for(const [id,total] of totals){
    const p=getProduct(id);
    if(!p||!p.active||p.stock<=0){problem=`${p?.name||'Insumo'} está agotado.`;break;}
    if(total>p.stock){problem=`${p.name}: estás solicitando ${total} ${p.unit} y solo quedan ${p.stock}.`;break;}
  }
  for(const line of newLines){
    const p=getProduct($(`item_${line}`)?.value);
    const input=$(`qty_${line}`);
    if(!input)continue;
    if(p&&p.stock>0){
      const own=Number(input.value)||0;
      const usedElsewhere=(totals.get(p.id)||0)-own;
      input.max=String(Math.max(0,p.stock-usedElsewhere));
    }else input.removeAttribute('max');
  }
  feedback.className='stock-feedback '+(problem?'stock-error':'stock-ok');
  feedback.textContent=problem||'El stock se reservará al enviar. Si el administrador rechaza, la cantidad se devolverá.';
  button.disabled=Boolean(problem)||!db.products.some(p=>p.active&&p.stock>0)||!availableClients().length;
}
function requestSubmit(e){
  e.preventDefault();
  const clientId=$('clientId').value;
  if(!availableClients().some(c=>c.id===clientId)){toast('Selecciona un cliente autorizado');return;}
  const items=[];
  for(const line of newLines){
    const prod=$(`item_${line}`)?.value,qty=Number($(`qty_${line}`)?.value);
    if(!prod||!Number.isSafeInteger(qty)||qty<=0){toast('Selecciona un insumo y una cantidad válida');return;}
    const existing=items.find(x=>x.productId===prod);
    if(existing)existing.qty+=qty;else items.push({productId:prod,qty});
  }
  // Validación de todo el pedido ANTES de alterar ningún insumo: o se reserva completo o no se reserva.
  for(const item of items){
    const p=getProduct(item.productId);
    if(!p||!p.active||p.stock<=0){toast(`${p?.name||'El insumo'} no tiene stock disponible`);return;}
    if(item.qty>p.stock){toast(`${p.name}: disponibles ${p.stock}, solicitados ${item.qty}. No se envió el pedido.`);updateStockHints();return;}
  }
  const serial=db.requests.length+1;
  const number=`SOL-${new Date().getFullYear()}-${String(serial).padStart(4,'0')}`;
  const date=now(),id=uid();
  for(const item of items){
    const p=getProduct(item.productId);
    p.stock-=item.qty;
    db.movements.push({id:uid(),productId:p.id,delta:-item.qty,type:'reservation',reference:`Reserva ${number}`,date,actorId:sessionId,requestId:id});
  }
  db.requests.push({id,number,createdAt:date,createdBy:sessionId,clientId,status:'pending',reserved:true,notes:$('requestNotes').value.trim(),items,approvedAt:null,approvedBy:null,rejectedAt:null,rejectedBy:null,rejectionReason:null});
  save();newLines=[nextLineId++];page='requests';update();toast(`Solicitud ${number} enviada. Stock reservado correctamente.`);
}
function newProduct(e){e.preventDefault();const sku=$('productSku').value.trim().toUpperCase(),name=$('productName').value.trim(),unit=$('productUnit').value,stock=Number($('productStock').value),min=Number($('productMin').value),unitPrice=Number($('productPrice').value);if(!sku||!name||!Number.isSafeInteger(stock)||stock<0||!Number.isSafeInteger(min)||min<0||!Number.isSafeInteger(unitPrice)||unitPrice<0){toast('Verifica los datos ingresados');return}if(db.products.some(p=>p.sku.toLowerCase()===sku.toLowerCase())){toast('Ya existe un insumo con ese código');return}const id=uid();db.products.push({id,sku,name,unit,unitPrice,stock,min,active:true});if(stock)db.movements.push({id:uid(),productId:id,delta:stock,type:'initial',reference:'Stock inicial',date:now(),actorId:sessionId});save();update();toast('Insumo creado correctamente')}
function newClient(e){e.preventDefault();const name=$('clientName').value.trim();if(name.length<2){toast('Escribe el nombre del cliente');return}if(db.clients.some(c=>c.name.toLowerCase()===name.toLowerCase())){toast('Ese cliente ya existe');return}db.clients.push({id:uid(),name,active:true,createdAt:now()});save();update();toast('Cliente agregado')}
async function newUser(e){e.preventDefault();const name=$('userName').value.trim(),username=$('userLogin').value.trim().toLowerCase(),password=$('userPassword').value,role=$('userRole').value,clientIds=Array.from(document.querySelectorAll('input[name="clientAccess"]:checked')).map(x=>x.value);if(!name||!/^[a-z0-9._-]+$/.test(username)||password.length<8){toast('Revisa el nombre, usuario y contraseña');return}if(db.users.some(u=>u.username===username)){toast('Este nombre de usuario ya existe');return}if(role==='requester'&&!clientIds.length){toast('Asigna al menos un cliente al solicitante');return}db.users.push(await userRecord(name,username,password,role,role==='admin'?[]:clientIds));save();update();toast(`Acceso de demostración creado para ${name}`)}
function approve(id){
  if(!isAdmin())return;
  const r=db.requests.find(r=>r.id===id);
  if(!r||r.status!=='pending')return;
  // Compatibilidad: solicitudes antiguas (anteriores a v0.5) todavía no tenían reserva.
  if(!r.reserved){
    for(const item of r.items){const p=getProduct(item.productId);if(!p||!p.active||p.stock<item.qty){toast(`No hay stock suficiente para ${p?.name||'un insumo'}`);return;}}
  }
  if(!confirm(`¿Aprobar ${r.number}? ${r.reserved?'El stock ya está reservado; no se descontará nuevamente.':'Solicitud anterior: se descontará el stock ahora.'}`))return;
  const date=now();
  for(const item of r.items){
    const p=getProduct(item.productId);
    item.unitPrice=p?.unitPrice||0;item.sku=p?.sku||'';item.name=p?.name||'';
    if(!r.reserved){
      p.stock-=item.qty;
      db.movements.push({id:uid(),productId:p.id,delta:-item.qty,type:'legacy_approval',reference:r.number,date,actorId:sessionId,requestId:r.id});
    }
  }
  r.status='approved';r.approvedAt=date;r.approvedBy=sessionId;
  save();update();toast(`Solicitud ${r.number} aprobada, sin doble descuento.`);
}
function reject(id){
  if(!isAdmin())return;
  const r=db.requests.find(r=>r.id===id);
  if(!r||r.status!=='pending')return;
  const reason=prompt(`Motivo de rechazo de ${r.number}:`);
  if(reason===null)return;
  if(!reason.trim()){toast('Indica un motivo para rechazar');return;}
  const date=now();
  if(r.reserved){
    for(const item of r.items){
      const p=getProduct(item.productId);
      if(!p)continue;
      p.stock+=item.qty;
      db.movements.push({id:uid(),productId:p.id,delta:item.qty,type:'reservation_released',reference:`Devolución ${r.number}`,date,actorId:sessionId,requestId:r.id});
    }
  }
  r.status='rejected';r.rejectedAt=date;r.rejectedBy=sessionId;r.rejectionReason=reason.trim().slice(0,500);
  save();update();toast(r.reserved?'Solicitud rechazada: stock devuelto automáticamente.':'Solicitud anterior rechazada; no tenía stock reservado.');
}
function details(id){const r=accessibleRequests().find(r=>r.id===id);if(!r)return;const names=r.items.map(i=>`${getProduct(i.productId)?.name||'Insumo'}: ${i.qty} ${getProduct(i.productId)?.unit||'un.'}`).join('\n');alert(`${r.number}\nCliente: ${getClient(r.clientId)?.name||'—'}\nSolicitó: ${getUser(r.createdBy)?.name||'—'}\nFecha: ${fmt(r.createdAt)}\nEstado: ${statusLabel[r.status]}${r.status==='pending'?(r.reserved?'\nStock reservado':'\nSolicitud antigua sin reserva'):''}${r.approvedAt?'\nAprobado: '+fmt(r.approvedAt):''}${r.rejectionReason?'\nMotivo: '+r.rejectionReason:''}\n\nDetalle:\n${names}${r.notes?'\n\nObservaciones: '+r.notes:''}`)}
function printableDocument(title,body){const win=window.open('','_blank','width=960,height=760');if(!win){toast('Permite ventanas emergentes para imprimir');return}win.document.open();win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:13px Arial,sans-serif;color:#1c2b44;margin:30px}header{border-bottom:3px solid #1a4778;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:center}.brand{font-size:25px;font-weight:800;color:#16467c}.meta{font-size:12px;color:#627086}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0}.field{padding:12px;border:1px solid #d8e1ec;border-radius:7px}.field b{display:block;font-size:11px;color:#64738a;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}table{width:100%;border-collapse:collapse;margin:24px 0}th{text-align:left;background:#ebf2fa}td,th{padding:12px;border-bottom:1px solid #dce4ef}.footer{display:flex;gap:50px;margin-top:70px}.signature{border-top:1px solid #8091a8;flex:1;text-align:center;padding-top:8px}.note{font-size:11px;color:#5d6d82;line-height:1.5;margin-top:25px}@media print{body{margin:14mm}button{display:none}}.actions{margin-top:20px}</style></head><body>${body}<div class="actions"><button onclick="window.print()" style="padding:11px 18px;background:#2873dd;border:0;border-radius:7px;color:white;cursor:pointer">Imprimir o guardar como PDF</button></div></body></html>`);win.document.close();win.focus()}
function printRequest(id){if(!isAdmin())return;const r=accessibleRequests().find(r=>r.id===id&&r.status==='approved');if(!r)return;const rows=r.items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(getProduct(it.productId)?.sku||'—')}</td><td>${esc(getProduct(it.productId)?.name||'—')}</td><td>${it.qty}</td><td>${esc(getProduct(it.productId)?.unit||'—')}</td></tr>`).join('');printableDocument(`Comprobante ${r.number}`,`<header><div><div class="brand">Insumos Central Retiros</div><div class="meta">Comprobante de entrega de insumos</div></div><div><b>${esc(r.number)}</b><div class="meta">Fecha de aprobación: ${fmt(r.approvedAt)}</div></div></header><h2>Solicitud de insumos aprobada</h2><div class="two"><div class="field"><b>Cliente destinatario</b>${esc(getClient(r.clientId)?.name||'—')}</div><div class="field"><b>Estado</b>Aprobada</div><div class="field"><b>Solicitado por</b>${esc(getUser(r.createdBy)?.name||'—')}</div><div class="field"><b>Aprobado por</b>${esc(getUser(r.approvedBy)?.name||'—')}</div><div class="field"><b>Fecha de solicitud</b>${fmt(r.createdAt)}</div><div class="field"><b>Fecha de salida</b>${fmt(r.approvedAt)}</div></div><table><thead><tr><th>N.º</th><th>Código</th><th>Descripción del insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>${rows}</tbody></table><div class="note">Observaciones: ${esc(r.notes||'Sin observaciones')}</div><div class="footer"><div class="signature">Preparado por</div><div class="signature">Recibido por</div></div><p class="note">Documento generado desde Insumos Central Retiros (prototipo local). Formato referencial sujeto a personalización.</p>`)}
function reportDateRange(){return weekRange($('reportDate')?.value||localYmd())}
function printWeekly(){if(!isAdmin())return;const range=reportDateRange(),rs=reportData(range);const lines=rs.flatMap(r=>r.items.map(it=>({r,it})));const body=`<header><div><div class="brand">Insumos Central Retiros</div><div class="meta">Informe de salidas aprobadas</div></div><div>Semana: <b>${fmtD(range.start)} – ${fmtD(range.end)}</b></div></header><h2>Reporte semanal de insumos</h2><p>Total solicitudes aprobadas: <b>${rs.length}</b> · Total líneas despachadas: <b>${lines.length}</b></p><table><thead><tr><th>Fecha</th><th>Solicitud</th><th>Cliente</th><th>Insumo</th><th>Cantidad</th><th>Unidad</th></tr></thead><tbody>${lines.map(({r,it})=>`<tr><td>${fmtD(localYmd(new Date(r.approvedAt)))}</td><td>${esc(r.number)}</td><td>${esc(getClient(r.clientId)?.name||'—')}</td><td>${esc(getProduct(it.productId)?.name||'—')}</td><td>${it.qty}</td><td>${esc(getProduct(it.productId)?.unit||'—')}</td></tr>`).join('')||'<tr><td colspan="6">Sin salidas esta semana</td></tr>'}</tbody></table><p class="note">Reporte generado el ${fmt(now())}. Contiene únicamente solicitudes aprobadas durante este período.</p>`;printableDocument('Reporte semanal de insumos',body)}
// Generador XLSX sin bibliotecas ni conexión: ZIP (STORE) + OpenXML.
const xmlEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
function sheetXml(rows,sheetName){
  const isDetail=sheetName==='Detalle semanal';
  const widths=isDetail?[15,10,10,15,37,16,40,14,18,19,15]:sheetName==='Resumen clientes'?[36,16,40,15,20]:[16,40,15,20];
  const columns=widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
  const content=rows.map((row,idx)=>`<row r="${idx+1}" ht="${idx===0?28:21}" customHeight="1">${row.map((v,col)=>{
    const ref=`${excelCol(col+1)}${idx+1}`;
    const currency=idx>0&&(isDetail?(col===8||col===9):col===row.length-1);
    const style=idx===0?(isDetail&&(col===4||col===7)?2:1):(currency?(idx%2===0?5:4):(idx%2===0?3:0));
    if(typeof v==='number'&&Number.isFinite(v)){
      const formula=(isDetail&&col===9&&idx>0)?`<f>H${idx+1}*I${idx+1}</f>`:'';
      return `<c r="${ref}" s="${style}">${formula}<v>${v}</v></c>`;
    }
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const lastCol=excelCol(widths.length),lastRow=Math.max(1,rows.length);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${columns}</cols><sheetData>${content}</sheetData><autoFilter ref="A1:${lastCol}${lastRow}"/></worksheet>`;
}
function excelCol(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26)}return s}
function zipFiles(entries){const encoder=new TextEncoder(),chunks=[],central=[];let offset=0;const append=bytes=>{chunks.push(bytes);offset+=bytes.length};const u16=(a,v)=>{a.push(v&255,(v>>>8)&255)},u32=(a,v)=>{a.push(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255)};const crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);crcTable[n]=c>>>0}const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};for(const [name,contents] of entries){const nameBytes=encoder.encode(name),data=encoder.encode(contents),crc=crc32(data),locOffset=offset;const local=[];u32(local,0x04034b50);u16(local,20);u16(local,0x0800);u16(local,0);u16(local,0);u16(local,0);u32(local,crc);u32(local,data.length);u32(local,data.length);u16(local,nameBytes.length);u16(local,0);append(new Uint8Array(local));append(nameBytes);append(data);const cen=[];u32(cen,0x02014b50);u16(cen,20);u16(cen,20);u16(cen,0x0800);u16(cen,0);u16(cen,0);u16(cen,0);u32(cen,crc);u32(cen,data.length);u32(cen,data.length);u16(cen,nameBytes.length);u16(cen,0);u16(cen,0);u16(cen,0);u16(cen,0);u32(cen,0);u32(cen,locOffset);central.push({header:new Uint8Array(cen),name:nameBytes})}const start=offset;for(const c of central){append(c.header);append(c.name)}const centralSize=offset-start;const end=[];u32(end,0x06054b50);u16(end,0);u16(end,0);u16(end,central.length);u16(end,central.length);u32(end,centralSize);u32(end,start);u16(end,0);append(new Uint8Array(end));return new Blob(chunks,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
function makeXlsx(sheets){const entries=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],['xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF365A79"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD96C0C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F4F8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]];sheets.forEach((s,i)=>entries.push([`xl/worksheets/sheet${i+1}.xml`,sheetXml(s.rows,s.name)]));return zipFiles(entries)}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function exportWeekly(){if(!isAdmin())return;const range=reportDateRange(),rs=reportData(range),detail=[['FECHA','AÑO','WEEK','MES','CLIENTE','COD','DETALLE','CANTIDAD','VALOR UNI','VALOR TOTAL','Status']];const sumItems=new Map(),sumClients=new Map();for(const r of rs){const client=getClient(r.clientId)?.name||'—';const date=localYmd(new Date(r.approvedAt));for(const it of r.items){const p=getProduct(it.productId);const sku=it.sku||p?.sku||'—',name=it.name||p?.name||'—',price=it.unitPrice??p?.unitPrice??0,total=it.qty*price;const formattedDate=date.slice(8,10)+'-'+date.slice(5,7)+'-'+date.slice(0,4);detail.push([formattedDate,Number(date.slice(0,4)),isoWeek(date),monthLabel(date),client,sku,name,it.qty,price,total,'Entregas']);const k=sku;if(!sumItems.has(k))sumItems.set(k,{sku,name,qty:0,total:0});sumItems.get(k).qty+=it.qty;sumItems.get(k).total+=total;const ck=client+'|'+sku;if(!sumClients.has(ck))sumClients.set(ck,{client,sku,name,qty:0,total:0});sumClients.get(ck).qty+=it.qty;sumClients.get(ck).total+=total}}const itemSummary=[['COD','DETALLE','CANTIDAD','VALOR TOTAL'],...Array.from(sumItems.values()).map(v=>[v.sku,v.name,v.qty,v.total])];const clientSummary=[['CLIENTE','COD','DETALLE','CANTIDAD','VALOR TOTAL'],...Array.from(sumClients.values()).map(v=>[v.client,v.sku,v.name,v.qty,v.total])];downloadBlob(makeXlsx([{name:'Detalle semanal',rows:detail},{name:'Resumen insumos',rows:itemSummary},{name:'Resumen clientes',rows:clientSummary}]),`Insumos Central Retiros_salidas_${range.start}_al_${range.end}.xlsx`);toast(`Excel semanal generado (${rs.length} solicitudes aprobadas)`)}
function backup(){if(!isAdmin())return;downloadBlob(new Blob([JSON.stringify({...db,backupAt:now()},null,2)],{type:'application/json'}),`Insumos Central Retiros_respaldo_${localYmd()}.json`);toast('Respaldo local descargado. Guarda el archivo en un lugar seguro.')} // Contiene hashes demo, no compartir
window.App={
 async installHelp(){
   if(window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone){this.showInstallGuide('¡Ya está instalada!', 'Estás utilizando Insumos Central Retiros como aplicación. Puedes abrirla desde tu pantalla de inicio o escritorio.');return;}
   if(pendingInstallPrompt){
     pendingInstallPrompt.prompt();
     try{await pendingInstallPrompt.userChoice}catch{}
     pendingInstallPrompt=null;return;
   }
   const ua=navigator.userAgent||'';
   let title='Instalar Insumos Central Retiros', instructions='';
   if(/iPhone|iPad|iPod/.test(ua)){
     title='Instalar en iPhone o iPad';
     instructions='1. Abre esta dirección en Safari.\n2. Toca Compartir (cuadro con flecha hacia arriba).\n3. Toca «Agregar a pantalla de inicio».\n4. Activa «Abrir como app» si aparece y pulsa «Agregar».';
   }else if(/Android/.test(ua)){
     title='Instalar en Android';
     instructions='1. Abre esta dirección en Google Chrome.\n2. Toca el menú de tres puntos (⋮).\n3. Elige «Instalar app» o «Agregar a pantalla principal».\n4. Confirma la instalación.';
   }else if(/Macintosh/.test(ua)){
     title='Instalar en Mac';
     instructions='1. Abre esta página en Safari y usa Archivo → Agregar al Dock.\n2. También puedes abrirla en Chrome y elegir Instalar en el menú del navegador.';
   }else{
     title='Instalar en Windows o PC';
     instructions='1. Abre este sitio en Chrome o Microsoft Edge.\n2. Pulsa el icono Instalar en la barra de direcciones; o usa el menú ⋮ → Instalar como aplicación.\n3. Confirma para crear el acceso directo.';
   }
   this.showInstallGuide(title,instructions);
 },
 showInstallGuide(title,instructions){
   let modal=document.getElementById('installGuide');
   if(!modal){modal=document.createElement('div');modal.id='installGuide';modal.className='install-overlay';modal.innerHTML='<div class="install-modal" role="dialog" aria-modal="true" aria-labelledby="installGuideTitle"><div class="install-modal-top"><div><span class="install-eyebrow">INSTALACIÓN GRATUITA</span><h2 id="installGuideTitle"></h2></div><button type="button" class="install-close" aria-label="Cerrar" onclick="App.closeInstallGuide()">×</button></div><div class="install-icon">▣</div><p id="installGuideContent" class="install-guide-text"></p><div class="install-notice">Esta es una demostración. Los cambios se guardan solo en tu navegador y no se comparten entre usuarios.</div><button type="button" class="btn btn-primary btn-full" onclick="App.closeInstallGuide()">Entendido</button></div>';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)this.closeInstallGuide()})}
   modal.querySelector('#installGuideTitle').textContent=title;
   modal.querySelector('#installGuideContent').textContent=instructions;
   modal.classList.add('visible');modal.querySelector('.install-close').focus();
 },
 closeInstallGuide(){document.getElementById('installGuide')?.classList.remove('visible');},
 nav(id){page=id;update()}, menu(){$('sidebar')?.classList.toggle('open')}, logout(){sessionId=null;sessionStorage.removeItem(SESSION_KEY);page='dashboard';render()},
 addLine(){newLines.push(nextLineId++);$('itemLines').insertAdjacentHTML('beforeend',itemLine(newLines[newLines.length-1]));updateStockHints()},
 removeLine(id){if(newLines.length===1){toast('Debe quedar al menos un insumo');return}newLines=newLines.filter(x=>x!==id);document.querySelector(`[data-line="${id}"]`)?.remove();updateStockHints()},
 approve,reject,details,printRequest,exportWeekly,printWeekly,backup,
 refreshRequests(){const filter=$('requestStatus')?.value||'all';$('requestTable').innerHTML=reqTable(accessibleRequests().filter(r=>filter==='all'||r.status===filter))},
 adjust(id,sign){if(!isAdmin())return;const p=getProduct(id),qty=Number($(`adjust_${id}`)?.value);if(!p||!Number.isSafeInteger(qty)||qty<=0){toast('Ingresa una cantidad positiva');return}const delta=qty*sign;if(p.stock+delta<0){toast('No puedes descontar más que el stock disponible');return}p.stock+=delta;db.movements.push({id:uid(),productId:id,delta,type:sign>0?'entry':'manual_exit',reference:sign>0?'Ingreso manual':'Salida manual',date:now(),actorId:sessionId});save();update();toast('Inventario actualizado')},
 editClient(id){if(!isAdmin())return;const c=getClient(id);if(!c)return;const name=prompt('Nuevo nombre del cliente:',c.name);if(name===null)return;const clean=name.trim();if(clean.length<2||db.clients.some(x=>x.id!==id&&x.name.toLowerCase()===clean.toLowerCase())){toast('Nombre inválido o repetido');return}c.name=clean;save();update();toast('Cliente actualizado')},
  editProduct(id){if(!isAdmin())return;const p=getProduct(id);if(!p)return;const name=prompt('Descripción del insumo:',p.name);if(name===null)return;if(!name.trim()){toast('La descripción no puede quedar vacía');return}const priceText=prompt('Precio unitario CLP (número entero, sin puntos):',String(p.unitPrice??0));if(priceText===null)return;const unit=prompt('Unidad de control (ej.: rollos, cajas, unidades):',p.unit||'por definir');if(unit===null)return;const price=Number(priceText);if(!Number.isSafeInteger(price)||price<0||!unit.trim()){toast('Precio o unidad inválidos');return}p.name=name.trim();p.unitPrice=price;p.unit=unit.trim();save();update();toast('Insumo actualizado')},
  async editUser(id){if(!isAdmin())return;const u=getUser(id);if(!u)return;
    const name=prompt('Nombre del trabajador:',u.name);if(name===null)return;
    if(name.trim().length<2){toast('Indica un nombre válido');return}
    let role=u.role;
    if(u.id!==sessionId){const roleText=prompt('Rol del usuario (admin o requester):',u.role);if(roleText===null)return;role=roleText.trim().toLowerCase();if(!['admin','requester'].includes(role)){toast('Rol inválido: admin o requester');return}}
    let clientIds=[];
    if(role==='requester'){
      const all=db.clients.filter(c=>c.active);
      const current=(u.clientIds||[]).map(x=>getClient(x)?.name).filter(Boolean).join(', ');
      const names=prompt('Clientes asignados, separados por coma (escribe el nombre exacto):',current);if(names===null)return;
      const parts=names.split(',').map(x=>x.trim()).filter(Boolean);
      clientIds=parts.map(n=>all.find(c=>c.name.toLowerCase()===n.toLowerCase())?.id);
      if(!parts.length||clientIds.some(x=>!x)){toast('Cliente no encontrado. Revisa los nombres exactos');return}
    }
    u.name=name.trim();u.role=role;u.clientIds=clientIds;
    save();update();toast('Usuario y permisos actualizados');
  },
  async resetPassword(id){if(!isAdmin())return;const u=getUser(id);if(!u)return;const pass=prompt('Nueva contraseña de demostración (mínimo 8 caracteres):');if(pass===null)return;if(pass.length<8){toast('Mínimo 8 caracteres');return}u.salt=uid();u.passwordHash=await hashPassword(pass,u.salt);save();toast('Clave demo actualizada')},
  jumpTo(id,formId){page=id;update();requestAnimationFrame(()=>{const el=$(formId);el?.scrollIntoView({behavior:'smooth',block:'center'});el?.querySelector('input')?.focus({preventScroll:true})})},
  toggleProduct(id){if(!isAdmin())return;const p=getProduct(id);if(!p)return;p.active=!p.active;save();update();toast(p.active?'Insumo activado':'Insumo desactivado')},
  toggleClient(id){if(!isAdmin())return;const c=getClient(id);if(c){c.active=!c.active;save();update()}},
 toggleUser(id){if(!isAdmin()||id===sessionId)return;const u=getUser(id);if(u){u.active=!u.active;save();update()}},
 roleChanged(){const selector=$('userClientSelector');if(selector)selector.style.display=$('userRole').value==='admin'?'none':''},
 reportPreview(){const range=reportDateRange();$('reportRange').innerHTML=`Semana: ${fmtD(range.start)} – ${fmtD(range.end)}`;$('reportStats').innerHTML=reportPreviewMarkup(range)}
};
(async()=>{try{await seed();sessionId=sessionStorage.getItem(SESSION_KEY);render();afterRender();if('serviceWorker'in navigator&&location.protocol!=='file:'){navigator.serviceWorker.register('./sw.js').catch(()=>{})}}catch(err){console.error(err);$('app').textContent='No se pudo iniciar la demostración. Abre la aplicación desde un servidor HTTPS o localhost.'}})();
