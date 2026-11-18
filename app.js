import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1';
import { downloadDeliveryPdf, deliveryFolio } from './receipt-pdf.js';

'use strict';
const conf=window.CENTRAL_RETIROS_CONFIG||{};
const configured=Boolean(/^https:\/\/.+\.supabase\.co\/?$/.test(conf.supabaseUrl||'') && /^sb_publishable_|^eyJ/.test(conf.supabasePublishableKey||''));
const sb=configured?createClient(conf.supabaseUrl,conf.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
const $=id=>document.getElementById(id), root=$('app'),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate=s=>s?new Intl.DateTimeFormat('es-CL',{dateStyle:'medium',timeZone:'America/Santiago'}).format(new Date(s)):'—';
const money=n=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(n)||0);
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const isoDay=s=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s));
const weekNumber=s=>{let d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));return Math.ceil(((d-new Date(Date.UTC(d.getUTCFullYear(),0,1)))/86400000+1)/7)};
const monthName=s=>new Intl.DateTimeFormat('es-CL',{month:'long',timeZone:'UTC'}).format(new Date(s+'T12:00:00Z'));
const brand='<div class="brand"><span class="mark">IC</span><span class="brand-name">Insumos Central Retiros<small>Gestión de insumos</small></span></div>';
function glyph(kind){
 const paths={
 home:'<rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/>',
 orders:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h4"/>',
 inventory:'<path d="m3 8 9-5 9 5v9l-9 5-9-5z"/><path d="m3.5 8 8.5 5 8.5-5M12 13v8"/>',
 products:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 10h16M10 10v10"/>',
 clients:'<path d="M4 21V6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v15M3 21h18M8 9h2m3 0h1M8 13h2m3 0h1M8 17h2m3 0h1M17 11h2a2 2 0 0 1 2 2v8"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14c2.4 0 4 1.6 4 4v2"/>',
 reports:'<path d="M4 20h16M6 17v-5M12 17V7M18 17v-8"/>',
 new:'<path d="M12 4v16M4 12h16"/>',
 warning:'<path d="m11.1 4-8.4 14.5a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L12.9 4a1 1 0 0 0-1.8 0z"/><path d="M12 9v5M12 18h.01"/>',
 check:'<path d="M5 12l4 4L19 6"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 count:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 13h6M9 18h3"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'
 };
 const fallback={"alerts":"bell","📋":"orders","📦":"products","⚠️":"warning","🏢":"clients","✓":"check","▤":"orders","▦":"home","▥":"inventory","▧":"products","◈":"clients","♙":"people","▨":"reports","＋":"new","📥":"inventory","👥":"people"};
 const name=paths[kind]?kind:(fallback[kind]||"home");
 return '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
}
const s={page:'home',profile:null,session:null,clients:[],products:[],prices:[],profiles:[],invites:[],assignments:[],orders:[],lines:[],linePrices:[],movements:[],deliveryNotes:[],counts:[],alerts:null,cart:[],register:false,busy:false,filter:'all',reportFrom:'',reportTo:'',modal:null};
let realtime=null,syncTimer=null,interval=null,lastSync=0,loading=false;
const isAdmin=()=>s.profile?.role==='admin' && s.profile?.active;
const product=id=>s.products.find(p=>p.id===id);
const client=id=>s.clients.find(c=>c.id===id);
const person=id=>s.profiles.find(p=>p.id===id);
const price=id=>s.prices.find(p=>p.product_id===id)?.unit_price??0;
const available=p=>Math.max(0,Number(p.on_hand)-Number(p.reserved));
const shortId=id=>String(id||'').slice(0,8).toUpperCase();
const ownClients=()=>s.clients.filter(c=>c.active&&(isAdmin()||!s.assignments.some(a=>a.user_id===s.profile?.id)||s.assignments.some(a=>a.user_id===s.profile?.id&&a.client_id===c.id)));
const stateText={pending:'Pendiente',approved:'Aprobada',rejected:'Rechazada'};
const deliveryNote=orderId=>s.deliveryNotes.find(n=>n.order_id===orderId);
const badge=(v)=>`<span class="tag ${v==='pending'?'orange':v==='approved'?'green':v==='rejected'?'red':'grey'}">${esc(stateText[v]||v)}</span>`;
function toast(m,bad=false){const el=$('toast');if(!el)return;el.className=bad?'show error':'show';el.textContent=m;setTimeout(()=>{if(el.textContent===m)el.className=''},4400)}
function fail(e){console.error(e);toast(e?.message||String(e)||'Ocurrió un error',true)}
function check(result){if(result.error)throw result.error;return result.data}
function spinner(){root.innerHTML='<main class="loading-screen"><div class="spinner"></div><p>Cargando datos compartidos…</p></main>'}
function setup(){root.innerHTML=`<main class="loading-screen"><div class="setup-card">${brand}<div class="divider"></div><span class="eyebrow">Falta conectar la base de datos</span><h2>Versión lista para sincronizar</h2><p>El diseño y las pantallas ya están preparados. Para activar los datos reales, necesitamos crear un proyecto gratuito en Supabase y completar <code>config.js</code> con la URL y la clave <b>publicable</b>.</p><div class="notice">No ingreses usuarios ni información laboral mientras la conexión no esté configurada.</div></div></main>`}
function login(){root.innerHTML=`<div class="login-wrap"><section class="login-visual">${brand}<div class="hero-text"><h1>El control de insumos, <em>sin complicaciones.</em></h1><p>Una forma sencilla de organizar solicitudes, inventario y entregas. Todo conectado, sin perder claridad.</p></div><div class="hero-perks"><span>Stock compartido</span><span>Gestión simple</span><span>Móvil y escritorio</span></div></section><section class="login-body"><div class="login-card"><span class="eyebrow">Acceso al sistema</span><h2>${s.register?'Configuración inicial':'Bienvenido'}</h2><p>${s.register?'Utiliza el correo de tu cuenta administradora únicamente para asignar tu primer número de ID.':'Ingresa con tu ID y PIN de 4 números. Los administradores usan su contraseña.'}</p><form data-form="${s.register?'signin-admin-setup':'signin'}"><div class="field"><label>${s.register?'Correo de administrador (solo primera vez)':'Número de ID'}</label><input name="${s.register?'email':'employee_id'}" ${s.register?'type="email" autocomplete="email"':'type="text" inputmode="numeric" pattern="[0-9]{1,16}" maxlength="16" autocomplete="username"'} required placeholder="${s.register?'administrador@empresa.com':'Ej.: 1234567'}"></div><div class="field"><label>Contraseña</label><input name="password" required minlength="${s.register?8:4}" type="password" autocomplete="current-password" placeholder="${s.register?'Contraseña':'PIN (solicitante) o contraseña (administrador)'}"></div><button type="submit" class="btn btn-primary btn-full">Ingresar</button></form><button class="link" data-action="switch-auth">${s.register?'Volver al acceso con número de ID':'¿Eres el administrador y aún no tienes ID? Configurarlo'}</button><div class="card-note">🔒 Los precios, el inventario y las aprobaciones tienen permisos separados. Tu número de ID es único.</div></div></section></div>`}
function pending(){root.innerHTML=`<main class="loading-screen"><div class="setup-card">${brand}<div class="divider"></div><span class="eyebrow">Acceso pendiente</span><h2>Tu cuenta aún no está autorizada</h2><p>Solicita al administrador la activación de tu cuenta y número de ID.</p><button class="btn btn-primary" data-action="logout">Cerrar sesión</button></div></main>`}
const NAVADMIN=[['home','Inicio','▦'],['new','Solicitar','＋'],['orders','Solicitudes','▤'],['alerts','Alertas','bell'],['inventory','Inventario','▥'],['products','Insumos','▧'],['clients','Clientes','◈'],['people','Personal','♙'],['reports','Reportes','▨']];
const NAVUSER=[['home','Inicio','▦'],['new','Solicitar','＋'],['orders','Mis solicitudes','▤']];
function shell(){const nav=isAdmin()?NAVADMIN:NAVUSER;const cur=nav.find(x=>x[0]===s.page)||nav[0];root.innerHTML=`<div class="app-shell"><aside class="sidebar">${brand}<nav class="side-nav">${nav.map(([k,name,ico])=>`<button class="nav-btn ${s.page===k?'active':''}" data-page="${k}"><span class="nav-ico">${glyph(k)}</span>${name}</button>`).join('')}</nav><div class="sidebar-foot"><strong>${esc(s.profile.full_name||'Usuario')}</strong><p>ID: ${esc(s.profile.employee_id||'Sin asignar')}</p><span class="tag">${isAdmin()?'Administrador':'Solicitante'}</span><p style="margin-top:15px"><button class="btn btn-small" data-action="change-password">${isAdmin()?'Cambiar contraseña':'Cambiar PIN'}</button> <button class="btn btn-small" data-action="logout">Cerrar sesión</button></p></div></aside><div class="main"><header class="topbar"><div><h1>${esc(cur[1])}</h1><p>Central Retiros · ${isAdmin()?'Administración':'Mis solicitudes'}</p></div><div class="topright">${isAdmin()?`<button class="alert-bell" data-page="alerts" title="Ver alertas" aria-label="Ver alertas">${glyph("bell")}${alertBadgeCount()?`<b>${Math.min(99,alertBadgeCount())}</b>`:""}</button>`:""}<span class="tag green">● En línea</span><button class="btn btn-small" data-action="refresh" title="Actualizar">↻ <span class="only-desktop">Actualizar</span></button><button class="avatar" data-action="change-password" title="Cambiar contraseña">${esc((s.profile.full_name||'U')[0]).toUpperCase()}</button></div></header><main class="content">${renderPage()}<div class="foot-note">Insumos Central Retiros · Stock compartido · Acceso protegido</div></main></div></div><nav class="mobile-nav">${(isAdmin()?[['home','Inicio','▦'],['new','Solicitar','＋'],['orders','Pedidos','▤'],['inventory','Stock','▥']]:NAVUSER).map(([k,name,ico])=>`<button data-page="${k}" class="${s.page===k?'active':''}"><span>${glyph(k)}</span>${name}</button>`).join('')}${isAdmin()?`<button data-action="more"><span>${glyph("more")}</span>Más</button>`:""}</nav>`;if(s.modal)renderModal()}
function header(title,subtitle,extra=''){return `<div class="intro"><div><h2>${title}</h2><p>${subtitle}</p></div><div class="actions">${extra}</div></div>`}
function stat(label,value,ico,sub='',orange=false){return `<div class="stat ${orange?'orange':''}"><div class="emoji">${glyph(ico)}</div><label>${label}</label><strong>${value}</strong><small>${sub}</small></div>`}
function renderPage(){switch(s.page){case 'home':return home();case 'new':return requestPage();case 'orders':return ordersPage();case 'alerts':return alertsPage();case 'inventory':return inventoryPage();case 'products':return productsPage();case 'clients':return clientsPage();case 'people':return peoplePage();case 'reports':return reportsPage();default:return home()}}

function alertBadgeCount(){
 if(!isAdmin()||!s.alerts)return 0;
 return Number(s.alerts.pending||0)+Number(s.alerts.low_count||0)+Number(s.alerts.unusual_count||0);
}
function alertsPage(){
 if(!isAdmin())return home();
 const a=s.alerts||{},low=Array.isArray(a.stock)?a.stock:[],unusual=Array.isArray(a.unusual)?a.unusual:[];
 const pending=Number(a.pending||0),delayed=Number(a.delayed||0);
 const urgent=low.filter(p=>p.severity==='critical');
 const normal=low.filter(p=>p.severity!=='critical');
 const stockRow=(p,critical)=>`<div class="alert-list-row"><div class="alert-dot ${critical?'critical':'warning'}"></div><div class="alert-item-info"><b>${esc(p.name)}</b><small>${esc(p.sku)} · Mínimo ${Number(p.min_stock)} ${esc(p.unit)}</small></div><div class="alert-quantity">${Number(p.available)}<small>disponibles</small></div><button class="btn btn-small" data-page="inventory">Ver stock</button></div>`;
 return `${header('Alertas','Avisos de stock, pedidos y consumo.','<button class="btn" data-action="refresh">↻ Actualizar</button>')}
 <div class="alert-summary"><div><span class="alert-counter">${pending}</span><span>Solicitudes pendientes</span>${delayed?`<small>${delayed} con más de 24 horas</small>`:''}<button class="alert-link" data-page="orders">Revisar pedidos ↗</button></div><div><span class="alert-counter">${Number(a.critical_count||0)}</span><span>Insumos agotados</span><small>Disponible = 0</small></div><div><span class="alert-counter">${Number(a.low_count||0)}</span><span>En nivel mínimo</span><small>Stock disponible ≤ mínimo</small></div><div><span class="alert-counter">${Number(a.unusual_count||0)}</span><span>Consumo inusual</span><small>Últimos 7 días</small></div></div>
 <section class="panel"><div class="panel-head"><h3>Reposición de stock</h3><span class="tag ${low.length?'orange':'green'}">${low.length?low.length+' alertas':'Sin alertas'}</span></div>${urgent.map(p=>stockRow(p,true)).join('')}${normal.map(p=>stockRow(p,false)).join('')}${low.length?'':'<div class="empty">No hay insumos agotados o bajo el mínimo.</div>'}</section>
 <section class="panel"><div class="panel-head"><h3>Consumo inusual</h3><span class="hint">Comparación con las 4 semanas anteriores</span></div>${unusual.map(p=>`<div class="alert-list-row"><div class="alert-dot unusual"></div><div class="alert-item-info"><b>${esc(p.name)}</b><small>${esc(p.sku)} · Habitual: ${Number(p.weekly_reference)} ${esc(p.unit)}/semana</small></div><div class="alert-quantity">${Number(p.last7)}<small>últimos 7 días</small></div></div>`).join('')||'<div class="empty">Sin variaciones relevantes. Se requieren datos de consumo histórico para comparar.</div>'}<p class="hint">Se alerta si el consumo de 7 días supera el doble del promedio semanal anterior (con historial suficiente).</p></section>`;
}
function home(){
 const admin=isAdmin();
 const pendingCount=s.orders.filter(o=>o.status==='pending').length;
 const low=s.products.filter(p=>p.active&&available(p)<=p.min_stock).length;
 const approvedCount=s.orders.filter(o=>o.status==='approved').length;
 const pendingPct=s.orders.length?Math.round(pendingCount/s.orders.length*100):0;
 const activeProducts=s.products.filter(p=>p.active).length;
 const activeClients=s.clients.filter(c=>c.active).length;
 const firstName=esc((s.profile.full_name||'').split(' ')[0]||'Equipo');
 const heroMain=admin?`${pendingCount} <span>pendientes</span>`:`${s.orders.length} <span>solicitudes</span>`;
 const caption=admin?'Solicitudes que necesitan tu revisión':'Todos tus pedidos, en un solo lugar';
 const cta=admin?'<button class="flow-cta" data-page="orders">Revisar solicitudes <span aria-hidden="true">↗</span></button>':'<button class="flow-cta" data-page="new">Crear solicitud <span aria-hidden="true">↗</span></button>';
 const metrics=admin?[
  ['Insumos activos',activeProducts,'Catálogo actualizado'],
  ['Stock por reponer',low,'Productos bajo mínimo'],
  ['Clientes',activeClients,'Destinos configurados'],
  ['Aprobadas',approvedCount,'Solicitudes confirmadas']
 ]:[
  ['Pendientes',pendingCount,'En revisión'],
  ['Aprobadas',approvedCount,'Confirmadas'],
  ['Disponibles',s.products.filter(p=>p.active&&available(p)>0).length,'Productos con stock'],
  ['Historial',s.orders.length,'Solicitudes realizadas']
 ];
 const actions=admin?[
  ['new','Solicitar insumos','new'],['alerts','Ver alertas','bell'],['inventory','Ingresar stock','inventory'],['products','Nuevo insumo','products'],['people','Personal','people']
 ]:[['new','Nueva solicitud','new'],['orders','Mis solicitudes','orders']];
 const stockList=(admin?s.products.filter(p=>p.active&&available(p)<=p.min_stock):s.products.filter(p=>p.active&&available(p)>0)).slice(0,6);
 const stockMarkup=stockList.length?stockList.map(p=>{
   const count=available(p);
   const pct=Math.min(100,Math.max(2,Math.round((count/Math.max(p.on_hand,p.min_stock*2,1))*100)));
   return `<div class="flow-stock-row"><div class="flow-stock-top"><div><b>${esc(p.name)}</b><small>${esc(p.sku)}</small></div><span class="flow-quantity">${count} <small>${esc(p.unit)}</small></span></div><div class="flow-stock-track"><div class="flow-stock-bar ${count<=p.min_stock?'low':''}" style="width:${pct}%"></div></div></div>`;
 }).join(''):`<div class="flow-empty"><div>✓</div><b>${admin?'Todo en orden':'Sin existencias para mostrar'}</b><span>${admin?'No hay insumos que reponer por ahora.':'Los productos disponibles aparecerán aquí.'}</span></div>`;
 return `<div class="flow-dashboard">
   <div class="flow-greeting"><div><p class="flow-overline">INICIO <span> / CENTRAL RETIROS</span></p><h2>Hola, ${firstName}<span class="flow-wave">✳</span></h2><p>Todo lo que importa, a simple vista.</p></div><div class="flow-today"><span class="flow-online-dot"></span> Operación conectada</div></div>
   <section class="flow-hero" aria-label="Resumen destacado">
     <div class="flow-hero-copy"><span class="flow-hero-kicker"><span class="flow-kicker-dot"></span> TU RESUMEN DE HOY</span><h3>Una operación<br><em>que fluye.</em></h3><p>${caption}</p>${cta}</div>
     <div class="flow-hero-art"><div class="flow-orbit orbit-one"></div><div class="flow-orbit orbit-two"></div><div class="flow-orb" style="--progress:${pendingPct}%"><div class="flow-orb-inner"><b>${pendingCount}</b><span>${admin?'por revisar':'pendientes'}</span></div></div><p>${heroMain}</p></div>
   </section>
   <section class="flow-metrics" aria-label="Indicadores de operación">${metrics.map(([label,value,note],i)=>`<div class="flow-metric"><span class="flow-metric-index">0${i+1}</span><strong>${value}</strong><span class="flow-metric-name">${label}</span><small>${note}</small></div>`).join('')}</section>
   ${admin&&alertBadgeCount()?`<button class="alert-home-strip" data-page="alerts"><span>${glyph('bell')}</span><b>${Number(s.alerts?.low_count||0)} de stock · ${Number(s.alerts?.pending||0)} pendientes · ${Number(s.alerts?.unusual_count||0)} de consumo</b><span>Revisar ↗</span></button>`:''}
   <section class="flow-shortcuts"><div class="flow-section-heading"><div><span class="flow-overline">ACCESOS RÁPIDOS</span><h3>Tu espacio de trabajo</h3></div></div><div class="flow-shortcut-row">${actions.map(([page,label,icon])=>`<button class="flow-shortcut" data-page="${page}"><span class="flow-shortcut-icon">${glyph(icon)}</span><span>${label}</span><span class="flow-shortcut-arrow" aria-hidden="true">↗</span></button>`).join('')}</div></section>
   <div class="flow-columns">
     <section class="flow-stream"><div class="flow-section-heading"><div><span class="flow-overline">MOVIMIENTOS</span><h3>${admin?'Solicitudes recientes':'Mi actividad'}</h3></div><button class="flow-viewall" data-page="orders">Ver todas <span aria-hidden="true">↗</span></button></div>
     <div class="flow-list">${s.orders.length?s.orders.slice(0,5).map(o=>`<div class="flow-list-row"><div class="flow-list-icon">${glyph('orders')}</div><div class="flow-list-copy"><b>${esc(client(o.client_id)?.name||'Cliente')}</b><small>#${shortId(o.id)} · ${fmtDate(o.created_at)}</small></div>${badge(o.status)}</div>`).join(''):'<div class="flow-empty"><div>✳</div><b>Todo está al día</b><span>Las solicitudes aparecerán aquí.</span></div>'}</div>
     </section>
     <section class="flow-stream"><div class="flow-section-heading"><div><span class="flow-overline">DISPONIBILIDAD</span><h3>${admin?'Necesitan reposición':'Insumos disponibles'}</h3></div><button class="flow-viewall" data-page="${admin?'inventory':'new'}">${admin?'Ver inventario':'Solicitar'} <span aria-hidden="true">↗</span></button></div>
     <div class="flow-list">${stockMarkup}</div>
     </section>
   </div>
 </div>`;
}
function requestPage(){const clients=ownClients(),products=s.products.filter(p=>p.active);return `${header('Nueva solicitud','Selecciona cliente, insumos y cantidades. El stock se reservará inmediatamente al enviar.')}<section class="panel"><h3>Preparar pedido</h3><p>Selecciona los insumos disponibles y envía tu solicitud.</p><div class="field"><label>Cliente</label><select id="requestClient"><option value="">Seleccionar cliente…</option>${clients.map(c=>`<option value="${c.id}" ${s.clientId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="product-picker"><div class="field product-wide"><label>Insumo</label><select id="requestProduct"><option value="">Seleccionar…</option>${products.map(p=>`<option value="${p.id}" ${available(p)<=0?'disabled':''}>${esc(p.sku)} · ${esc(p.name)} — ${available(p)>0?available(p)+' '+esc(p.unit):'AGOTADO'}</option>`).join('')}</select></div><div class="field"><label>Cantidad</label><input type="number" id="requestQty" min="1" step="1" value="1"></div><button class="btn btn-light" data-action="cart-add">＋ Agregar</button></div><div class="divider"></div><div class="panel-head"><h3>Mi pedido (${s.cart.length})</h3>${s.cart.length?'<button class="btn btn-small" data-action="cart-clear">Limpiar</button>':''}</div>${s.cart.length?s.cart.map(item=>{const p=product(item.product_id);return `<div class="cart-line"><div><b>${esc(p?.name||'Insumo')}</b><small>${esc(p?.sku)} · ${item.quantity} ${esc(p?.unit)}</small></div><div class="right"><span class="tag">${item.quantity}</span><button class="btn btn-small btn-danger" data-action="cart-remove" data-id="${item.product_id}">Quitar</button></div></div>`}).join(''):'<div class="empty"><span class="empty-icon">🛒</span>Agrega insumos para preparar tu solicitud.</div>'}<div class="field"><label>Observaciones (opcional)</label><textarea id="requestNote" rows="2" maxlength="500" placeholder="Instrucciones de despacho">${esc(s.note||'')}</textarea></div><button class="btn btn-orange btn-full" data-action="send-order" ${!s.cart.length?'disabled':''}>Enviar solicitud y reservar stock</button><p class="hint" style="margin-top:12px">Al aprobar no se descontará de nuevo. Si se rechaza, la reserva se liberará automáticamente.</p></section>`}
function ordersPage(){const rows=s.orders.filter(o=>s.filter==='all'||o.status===s.filter);return `${header(isAdmin()?'Solicitudes recibidas':'Mis solicitudes',isAdmin()?'Revisa y aprueba las solicitudes del personal.':'Consulta el estado de tus pedidos.','<button class="btn btn-orange" data-page="new">＋ Nueva solicitud</button>')}<section class="panel"><div class="filters"><select data-filter="orders"><option value="all" ${s.filter==='all'?'selected':''}>Todos los estados</option><option value="pending" ${s.filter==='pending'?'selected':''}>Pendientes</option><option value="approved" ${s.filter==='approved'?'selected':''}>Aprobadas</option><option value="rejected" ${s.filter==='rejected'?'selected':''}>Rechazadas</option></select><span class="hint">${rows.length} solicitud(es)</span></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Cliente / solicitante</th><th>Detalle</th><th>Estado</th>${isAdmin()?'<th>Acciones</th>':''}</tr></thead><tbody>${rows.map(o=>`<tr><td class="tiny">${fmtDate(o.created_at)}<br><small>#${shortId(o.id)}</small></td><td><b>${esc(client(o.client_id)?.name||'Cliente')}</b><br><small>${esc(person(o.requester_id)?.full_name||'Usuario')}</small></td><td>${s.lines.filter(l=>l.order_id===o.id).map(l=>`<div class="tiny">${esc(l.sku_snapshot)} · ${esc(l.name_snapshot)} · <b>${l.quantity} ${esc(l.unit_snapshot)}</b></div>`).join('')}<small>${esc(o.note||'')}</small></td><td>${badge(o.status)}${o.decision_note?`<br><small>${esc(o.decision_note)}</small>`:''}</td>${isAdmin()?`<td><div class="actions">${o.status==='pending'?`<button class="btn btn-small btn-primary" data-action="approve" data-id="${o.id}">Aprobar</button><button class="btn btn-small btn-danger" data-action="reject" data-id="${o.id}">Rechazar</button>`:o.status==='approved'?`<button class="btn btn-small btn-primary" data-action="download-note" data-id="${o.id}">↓ PDF de salida</button>`:'<span class="hint">Sin salida</span>'}</div></td>`:''}</tr>`).join('')||`<tr><td colspan="${isAdmin()?5:4}" class="empty">No se encontraron solicitudes.</td></tr>`}</tbody></table></div></section>`}
function inventoryPage(){
 if(!isAdmin())return home();
 const total=s.products.reduce((n,p)=>n+Number(p.on_hand),0),reserved=s.products.reduce((n,p)=>n+Number(p.reserved),0);
 const logs=s.counts||[];
 return `${header('Control de inventario','Stock compartido y conteos físicos.',`<button class="btn" data-action="new-count">${glyph('count')} Nuevo conteo</button><button class="btn btn-orange" data-action="add-stock-global">＋ Ingresar stock</button>`)}
 <div class="stats">${[stat('Stock físico',total,'📦','En inventario'),stat('Reservado',reserved,'🔒','Pedidos pendientes',true),stat('Disponible',total-reserved,'✓','Para solicitar'),stat('Bajo mínimo',s.products.filter(p=>p.active&&available(p)<=p.min_stock).length,'⚠️','Por revisar',true)].join('')}</div>
 <section class="panel"><div class="panel-head"><h3>Existencias por insumo</h3><span class="hint">${s.products.length} registros</span></div><div class="table-wrap"><table><thead><tr><th>Código</th><th>Insumo</th><th>Físico</th><th>Reservado</th><th>Disponible</th><th>Acciones</th></tr></thead><tbody>${s.products.map(p=>`<tr><td><b>${esc(p.sku)}</b></td><td>${esc(p.name)}<br><small>${esc(p.unit)}</small></td><td>${p.on_hand}</td><td>${p.reserved}</td><td><span class="tag ${available(p)===0?'red':available(p)<=p.min_stock?'orange':'green'}">${available(p)}</span></td><td><div class="actions"><button class="btn btn-small" data-action="stock" data-id="${p.id}">Ajustar</button><button class="btn btn-small btn-light" data-action="count" data-id="${p.id}">Contar</button></div></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Primero agrega insumos</td></tr>'}</tbody></table></div></section>
 <section class="panel" id="inventory-history"><div class="panel-head"><h3>Historial de conteos</h3><span class="hint">Últimos ${logs.length}</span></div><div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Insumo</th><th>Sistema</th><th>Contado</th><th>Diferencia</th><th>Responsable / observación</th></tr></thead><tbody>${logs.map(c=>`<tr><td>${fmtDate(c.created_at)}</td><td><b>${esc(c.sku_snapshot)}</b><br><small>${esc(c.product_name_snapshot)}</small></td><td>${c.system_quantity}</td><td>${c.counted_quantity}</td><td><span class="tag ${Number(c.difference)===0?'green':Number(c.difference)<0?'red':'orange'}">${Number(c.difference)>0?'+':''}${c.difference}</span></td><td>${esc(person(c.performed_by)?.full_name||'Administrador')}<br><small>${esc(c.note)}</small></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Todavía no hay conteos registrados.</td></tr>'}</tbody></table></div></section>`;
}
function productsPage(){if(!isAdmin())return home();return `${header('Catálogo de insumos','Crea, edita y desactiva insumos. Los precios solo son visibles para ti.','<button class="btn btn-primary" data-action="product-new">＋ Agregar insumo</button>')}<section class="panel"><div class="table-wrap"><table><thead><tr><th>Código</th><th>Insumo</th><th>Unidad</th><th>Precio unitario</th><th>Estado</th><th>Editar</th></tr></thead><tbody>${s.products.map(p=>`<tr><td><b>${esc(p.sku)}</b></td><td>${esc(p.name)}</td><td>${esc(p.unit)}</td><td><b>${money(price(p.id))}</b></td><td><span class="tag ${p.active?'green':'red'}">${p.active?'Activo':'Inactivo'}</span></td><td><button class="btn btn-small" data-action="product-edit" data-id="${p.id}">Editar</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Sin insumos. Agrega el primero.</td></tr>'}</tbody></table></div></section>`}
function clientsPage(){if(!isAdmin())return home();return `${header('Clientes','Agrega, modifica o desactiva los destinos de entrega.','<button class="btn btn-primary" data-action="client-new">＋ Agregar cliente</button>')}<section class="panel"><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${s.clients.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td><span class="tag ${c.active?'green':'red'}">${c.active?'Activo':'Inactivo'}</span></td><td><button class="btn btn-small" data-action="client-edit" data-id="${c.id}">Editar</button></td></tr>`).join('')||'<tr><td colspan="3" class="empty">Sin clientes.</td></tr>'}</tbody></table></div></section>`}
function peoplePage(){if(!isAdmin())return home();return `${header('Personal y accesos','Asigna un número de ID único y el perfil de cada trabajador.','<button class="btn btn-primary" data-action="invite-new">＋ Añadir personal</button>')}<section class="panel"><h3>Personal registrado</h3><p>Crea cada cuenta con nombre, ID y perfil. El PIN temporal aparece una sola vez.</p><div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Nombre</th><th>N.º de ID</th><th>Perfil</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${s.profiles.map(p=>`<tr><td><b>${esc(p.full_name)}</b></td><td><strong>${esc(p.employee_id||'Sin asignar')}</strong></td><td>${p.role==='admin'?'Administrador':'Solicitante'}</td><td><span class="tag ${p.active?'green':'orange'}">${p.active?'Activo':'Pendiente'}</span></td><td><button class="btn btn-small" data-action="user-edit" data-id="${p.id}">Gestionar</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Sin personal registrado.</td></tr>'}</tbody></table></div></section><section class="panel"><h3>Cómo funciona el ingreso</h3><p>El administrador asigna un ID numérico a cada persona. Los solicitantes ingresan con PIN de 4 números. Los administradores usan contraseña. Los números no pueden repetirse, y los IDs que empiezan con cero se conservan tal cual.</p></section>`}
function reportsPage(){if(!isAdmin())return home();const r=reportRows();return `${header('Reportes de salidas','Excel semanal y comprobantes PDF desde Solicitudes.')}<div class="stats">${[stat('Entregas en período',new Set(r.map(x=>x.orderId)).size,'📄','Aprobaciones'),stat('Líneas de insumos',r.length,'📦','Artículos despachados'),stat('Costo total',money(r.reduce((n,x)=>n+x.total,0)),'▨','Solo administrador'),stat('Clientes atendidos',new Set(r.map(x=>x.client)).size,'🏢','Destinos')].join('')}</div><section class="panel"><div class="panel-head"><h3>Exportar movimientos</h3></div><div class="filters"><label>Desde<input type="date" id="reportFrom" value="${s.reportFrom}"></label><label>Hasta<input type="date" id="reportTo" value="${s.reportTo}"></label><button class="btn btn-primary" data-action="xlsx">↓ Descargar Excel</button><button class="btn" data-action="print-report">Imprimir / PDF</button></div><div class="notice purple">Excel con costos. PDF de salida sin precios, disponible al aprobar cada solicitud.</div><div class="table-wrap" style="margin-top:16px"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Insumo</th><th>Cantidad</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>${r.slice(0,50).map(x=>`<tr><td>${esc(x.date)}</td><td>${esc(x.client)}</td><td>${esc(x.sku)} · ${esc(x.name)}</td><td>${x.qty}</td><td>${money(x.price)}</td><td>${money(x.total)}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">Sin salidas aprobadas en este período.</td></tr>'}</tbody></table></div></section>`}
function reportRows(){return s.orders.filter(o=>o.status==='approved'&&o.decided_at).flatMap(o=>{const day=isoDay(o.decided_at);if(s.reportFrom&&day<s.reportFrom||s.reportTo&&day>s.reportTo)return [];return s.lines.filter(l=>l.order_id===o.id).map(l=>{const unit=s.linePrices.find(p=>p.order_line_id===l.id)?.unit_price??0;return {orderId:o.id,day,date:day.split('-').reverse().join('-'),client:client(o.client_id)?.name||'',sku:l.sku_snapshot,name:l.name_snapshot,qty:l.quantity,price:unit,total:l.quantity*unit}})}).sort((a,b)=>a.day.localeCompare(b.day))}
function openModal(title,body,form='',submitLabel='Guardar',footer=''){
 s.modal={title,body,form,submitLabel,footer};render();
}
function renderModal(){if(!s.modal)return;const m=s.modal;root.insertAdjacentHTML('beforeend',`<div class="modal-backdrop" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(m.title)}"><h3>${esc(m.title)}</h3>${m.form?`<form data-form="${esc(m.form)}">${m.body}<div class="modal-footer"><button type="button" class="btn" data-action="close-modal">Cancelar</button><button type="submit" class="btn btn-primary">${esc(m.submitLabel)}</button></div></form>`:`${m.body}<div class="modal-footer">${m.footer}<button class="btn" data-action="close-modal">Cerrar</button></div>`}</div></div>`)}
function closeModal(){s.modal=null;render()}
function showProduct(id=null){const p=product(id),v=p?price(p.id):0;openModal(p?'Editar insumo':'Agregar nuevo insumo',`<input type="hidden" name="id" value="${p?.id||''}"><div class="form-grid"><div class="field"><label>Código</label><input name="sku" required maxlength="45" value="${esc(p?.sku||'')}" placeholder="FE21510"></div><div class="field"><label>Unidad</label><input name="unit" list="units-list" required maxlength="35" value="${esc(p?.unit||'rollos')}"><datalist id="units-list"><option value="rollos"><option value="unidades"><option value="cajas"><option value="pallets"><option value="paquetes"></datalist></div></div><div class="field"><label>Descripción del insumo</label><input name="name" required maxlength="180" value="${esc(p?.name||'')}" placeholder="ETIQUETA TÉRMICA BLANCA 100 × 150"></div><div class="form-grid"><div class="field"><label>Precio unitario ($ CLP) · Solo administrador</label><input name="unit_price" type="number" required min="0" step="1" value="${v}"></div><div class="field"><label>Alerta de stock mínimo</label><input name="min_stock" type="number" required min="0" step="1" value="${p?.min_stock||0}"></div></div><label><input type="checkbox" name="active" style="width:auto;min-height:0" ${!p||p.active?'checked':''}> Insumo activo</label><p class="hint">Las existencias se registran desde Inventario, no en este formulario.</p>`,'product-save')}
function showClient(id=null){const c=client(id);openModal(c?'Editar cliente':'Nuevo cliente',`<input name="id" type="hidden" value="${c?.id||''}"><div class="field"><label>Nombre del cliente</label><input name="name" required maxlength="150" value="${esc(c?.name||'')}" placeholder="Nombre del cliente"></div><label><input type="checkbox" name="active" style="width:auto;min-height:0" ${!c||c.active?'checked':''}> Cliente activo</label>`,'client-save')}
function showStock(id=null){const p=product(id);openModal('Registrar movimiento de stock',`<div class="field"><label>Insumo</label><select name="product_id" required><option value="">Seleccionar…</option>${s.products.map(v=>`<option value="${v.id}" ${v.id===p?.id?'selected':''}>${esc(v.sku)} · ${esc(v.name)} (${available(v)} disponibles)</option>`).join('')}</select></div><div class="field"><label>Cantidad a ingresar (usa negativo para descontar)</label><input name="delta" type="number" required step="1" placeholder="Ejemplo: 20" value=""></div><div class="field"><label>Motivo</label><input name="reason" maxlength="250" value="Ingreso de insumos" required></div><div class="notice purple">Los ingresos y ajustes se registrarán con usuario y fecha. No es posible descontar existencias ya reservadas.</div>`,'stock-adjust','Registrar movimiento')}
function showInvitation(){openModal('Añadir personal',`<div class="field"><label>Nombre y apellido</label><input name="full_name" required minlength="2" maxlength="120" placeholder="Nombre del trabajador"></div><div class="field"><label>Número de ID asignado</label><input name="employee_id" type="text" inputmode="numeric" pattern="[0-9]{1,16}" maxlength="16" required placeholder="Ej.: 0012345"></div><div class="field"><label>Tipo de acceso</label><select name="role"><option value="requester">Solicitante</option><option value="admin">Administrador</option></select></div><div class="notice purple">No necesitas correo. Se generará un PIN de 4 números para cada solicitante.</div>`,'invite-save','Crear cuenta')}
function showCount(id=null){
 const p=product(id);
 if(!p){
  openModal('Nuevo conteo',`<div class="field"><label>Insumo</label><select id="countSelectProduct"><option value="">Seleccionar…</option>${s.products.filter(x=>x.active).map(x=>`<option value="${x.id}">${esc(x.sku)} · ${esc(x.name)}</option>`).join('')}</select></div>`,'','','<button class="btn btn-primary" data-action="count-select">Continuar</button>');return;
 }
 openModal('Conteo físico · '+p.sku,`<input type="hidden" name="product_id" value="${p.id}"><input type="hidden" name="expected_system" value="${Number(p.on_hand)}"><input type="hidden" name="expected_reserved" value="${Number(p.reserved)}"><div class="count-snapshot"><div><small>En sistema</small><b>${Number(p.on_hand)}</b></div><div><small>Reservado</small><b>${Number(p.reserved)}</b></div><div><small>Disponible</small><b>${available(p)}</b></div></div><p class="hint">Cuenta todas las unidades físicas, incluidas las reservadas.</p><div class="field"><label>Cantidad física contada (${esc(p.unit)})</label><input name="counted_quantity" id="countQty" type="number" inputmode="numeric" min="0" max="100000000" step="1" required placeholder="Cantidad real"></div><div class="count-difference" id="countDifference">Ingresa el conteo para calcular la diferencia.</div><div class="field"><label>Observación</label><textarea name="note" rows="2" minlength="3" maxlength="250" required placeholder="Conteo físico, ubicación o motivo de diferencia"></textarea></div><div class="notice">No se puede dejar el stock por debajo de ${Number(p.reserved)} unidades reservadas. Los ajustes quedan registrados.</div>`,'inventory-count-save','Guardar conteo');
}
function showUser(id){const p=person(id);if(!p)return;openModal('Gestionar persona',`<input type="hidden" name="user_id" value="${p.id}"><div class="field"><label>Número de ID</label><input type="text" name="employee_id" inputmode="numeric" pattern="[0-9]{1,16}" maxlength="16" required value="${esc(p.employee_id||'')}" placeholder="Asignar ID único"></div><div class="field"><label>Nombre</label><input name="full_name" value="${esc(p.full_name)}" required></div><div class="field"><label>Perfil</label><select name="role"><option value="requester" ${p.role==='requester'?'selected':''}>Solicitante</option><option value="admin" ${p.role==='admin'?'selected':''}>Administrador</option></select></div><label><input type="checkbox" name="active" style="width:auto;min-height:0" ${p.active?'checked':''}> Cuenta activa</label><div class="divider"></div><label>Clientes asignados (ninguno seleccionado = acceso a todos)</label><div style="max-height:155px;overflow:auto;border:1px solid var(--border);border-radius:11px;padding:9px">${s.clients.filter(c=>c.active).map(c=>`<label style="display:flex;gap:8px;align-items:center;padding:5px;font-weight:500"><input type="checkbox" name="client_${c.id}" style="width:auto;min-height:0" ${s.assignments.some(a=>a.user_id===p.id&&a.client_id===c.id)?'checked':''}>${esc(c.name)}</label>`).join('')||'<p>Sin clientes</p>'}</div><p class="hint">Si seleccionas clientes, este usuario solo podrá crear solicitudes para ellos.</p><button class="btn btn-small" type="button" data-action="reset-user-password" data-id="${p.id}">Restablecer PIN / contraseña</button>`,'user-save')}
function showDecision(id,approve){const o=s.orders.find(o=>o.id===id);if(!o||o.status!=='pending')return;openModal(approve?'Aprobar solicitud':'Rechazar solicitud',`<input type="hidden" name="order_id" value="${id}"><input type="hidden" name="approve" value="${approve?'true':'false'}"><p>Solicitud #${shortId(id)} para <b>${esc(client(o.client_id)?.name||'Cliente')}</b>.</p><div class="notice ${approve?'purple':''}">${approve?'La reserva pasará a salida definitiva; no se descontará dos veces.':'Los insumos reservados volverán a quedar disponibles.'}</div><div class="field"><label>Comentario (opcional)</label><textarea name="reason" maxlength="500" rows="2" placeholder="Motivo u observación"></textarea></div>`,'decision-save',approve?'Aprobar y despachar':'Rechazar solicitud')}
function showMore(){openModal('Administración',`<div class="quick-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">${NAVADMIN.filter(([k])=>!['home','new','orders','inventory'].includes(k)).map(([k,name,ico])=>`<button data-page="${k}" class="quick-btn"><span>${glyph(k)}</span><b>${esc(name)}</b></button>`).join('')}</div><p class="hint">Instala Insumos Central Retiros desde el menú del navegador: Android, Chrome / Edge o Safari en iPhone.</p><button class="btn" data-action="change-password">${isAdmin()?'Cambiar contraseña':'Cambiar PIN'}</button>`)}
function render(){if(!configured){setup();return}if(!s.session){login();return}if(!s.profile||!s.profile.active){pending();return}shell()}
const openPage=p=>{s.page=p;s.modal=null;render();window.scrollTo({top:0,behavior:'instant'})};
async function refresh({silent=false}={}){
 if(!sb||loading)return;
 loading=true;
 try{
  const {data:{session},error:sesErr}=await sb.auth.getSession();if(sesErr)throw sesErr;
  s.session=session;
  if(!session){s.profile=null;s.orders=[];s.cart=[];render();return}
  const me=check(await sb.from('profiles').select('*').eq('id',session.user.id).maybeSingle());
  s.profile=me;
  if(!me?.active){render();return}
  const admin=me.role==='admin';
  const queries=[
   sb.from('clients').select('*').order('name'),
   sb.from('products').select('*').order('name'),
   sb.from('orders').select('*').order('created_at',{ascending:false}).limit(400),
   sb.from('order_lines').select('*').limit(2000),
   sb.from('profiles').select('*').order('full_name'),
   sb.from('user_clients').select('*'),
  ];
  if(admin)queries.push(sb.from('product_prices').select('*'),sb.from('order_line_prices').select('*'),sb.from('invitations').select('*').order('created_at',{ascending:false}),sb.from('stock_movements').select('*').order('created_at',{ascending:false}).limit(150),sb.from('delivery_notes').select('*').order('id',{ascending:false}).limit(500),sb.from('inventory_counts').select('*').order('created_at',{ascending:false}).limit(150),sb.rpc('admin_supply_alerts'));
  const r=await Promise.all(queries);r.forEach(check);
  [s.clients,s.products,s.orders,s.lines,s.profiles,s.assignments]=r.slice(0,6).map(x=>x.data||[]);
  [s.prices,s.linePrices,s.invites,s.movements,s.deliveryNotes,s.counts,s.alerts]=admin?r.slice(6).map((x,i)=>i===6?(x.data||null):(x.data||[])):[[],[],[],[],[],[],null];
  s.cart=s.cart.filter(it=>{const p=product(it.product_id);return p?.active&&available(p)>=it.quantity});
  lastSync=Date.now();
  if(!s.reportFrom){const d=new Date();const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);s.reportFrom=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);s.reportTo=today()}
  // Evita perder datos a medio rellenar si llega un evento en tiempo real.
  if(!silent||!s.modal&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))render();
 }catch(e){fail(e);if(!silent)render()}
 finally{loading=false}
}
function scheduleRefresh(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>refresh({silent:true}),650)}
async function connectRealtime(){if(!sb)return;if(realtime)await sb.removeChannel(realtime);
 realtime=sb.channel('central-retiros').on('postgres_changes',{event:'*',schema:'public',table:'orders'},scheduleRefresh).on('postgres_changes',{event:'*',schema:'public',table:'products'},scheduleRefresh).subscribe();
}
async function rpc(name,params){const {data,error}=await sb.rpc(name,params);if(error)throw error;return data}
async function handleForm(form){const values=Object.fromEntries(new FormData(form).entries()),type=form.dataset.form;
 if(s.busy)return;s.busy=true;let btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
 try{
  if(type==='signin'){
   const employeeId=String(values.employee_id||'').trim();
   if(!/^[0-9]{1,16}$/.test(employeeId))throw new Error('Ingresa un ID numérico válido');
   const response=await fetch(conf.supabaseUrl.replace(/\/$/,'')+'/functions/v1/login-with-id',{
    method:'POST',headers:{'Content-Type':'application/json','apikey':conf.supabasePublishableKey},
    body:JSON.stringify({employee_id:employeeId,password:values.password}),cache:'no-store'
   });
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(data.error||'No se pudo iniciar sesión');
   check(await sb.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token}));
   s.register=false;await refresh();await connectRealtime();toast('Sesión iniciada');return;
  }
  if(type==='signin-admin-setup'){
   check(await sb.auth.signInWithPassword({email:values.email.trim().toLowerCase(),password:values.password}));
   const identity=check(await sb.auth.getUser());
   const p=check(await sb.from('profiles').select('role,active,employee_id').eq('id',identity.user.id).single());
   if(!p.active||p.role!=='admin'||p.employee_id){await sb.auth.signOut();throw new Error('Usa tu número de ID para ingresar. El acceso de configuración es solo para el administrador sin ID.');}
   s.register=false;s.page='people';await refresh();await connectRealtime();toast('Asigna tu número de ID desde Personal → Gestionar');return;
  }
  if(type==='change-password'){
   if(!isAdmin()){
    const current=String(values.current_pin||''),next=String(values.new_pin||''),confirm=String(values.confirm_pin||'');
    if(!/^[0-9]{4}$/.test(current)||!/^[0-9]{4}$/.test(next))throw new Error('El PIN debe tener 4 números');
    if(next!==confirm)throw new Error('Los PIN no coinciden');
    if(next===current)throw new Error('El nuevo PIN debe ser distinto');
    const {data,error}=await sb.functions.invoke('change-staff-pin',{body:{current_pin:current,new_pin:next}});
    if(error||!data?.updated)throw new Error(data?.error||error?.message||'No se pudo cambiar el PIN');
    s.modal=null;render();toast('PIN actualizado');return;
   }
   if(!values.password || values.password.length<10)throw new Error('Usa al menos 10 caracteres');
   if(values.password!==values.password_confirm)throw new Error('Las contraseñas no coinciden');
   check(await sb.auth.updateUser({password:values.password}));
   s.modal=null;render();toast('Contraseña actualizada');return;
  }
  if(!isAdmin())throw new Error('Acceso exclusivo de administrador');
  if(type==='product-save')await rpc('admin_save_product',{p_id:values.id||null,p_sku:values.sku,p_name:values.name,p_unit:values.unit,p_unit_price:Number(values.unit_price),p_min_stock:Number(values.min_stock),p_active:Boolean(values.active)});
  if(type==='client-save')await rpc('admin_save_client',{p_id:values.id||null,p_name:values.name,p_active:Boolean(values.active)});
  if(type==='stock-adjust')await rpc('admin_adjust_stock',{p_product_id:values.product_id,p_delta:Number(values.delta),p_reason:values.reason});
  if(type==='inventory-count-save'){
   const q=Number(values.counted_quantity),before=Number(values.expected_system),reserved=Number(values.expected_reserved);
   if(!Number.isSafeInteger(q)||q<0||q>100000000)throw new Error('Ingresa una cantidad física válida');
   if(q<reserved)throw new Error('No puedes contabilizar menos de las unidades reservadas. Revisa las solicitudes pendientes.');
   if(!String(values.note||'').trim()||String(values.note).trim().length<3)throw new Error('Escribe una observación del conteo');
   await rpc('admin_record_inventory_count',{p_product_id:values.product_id,p_counted_quantity:q,p_expected_system:before,p_expected_reserved:reserved,p_note:String(values.note).trim()});
   s.modal=null;await refresh();toast(q===before?'Conteo registrado sin diferencias':'Conteo guardado. Diferencia: '+(q-before));return;
  }
   if(type==='invite-save'){
    const id=String(values.employee_id||'').trim();
    if(!/^[0-9]{1,16}$/.test(id))throw new Error('El ID debe contener entre 1 y 16 números');
    const {data,error}=await sb.functions.invoke('create-staff-account',{body:{employee_id:id,full_name:values.full_name,role:values.role}});
    if(error)throw new Error(data?.error||error.message||'No fue posible crear la cuenta');
    if(!data?.created)throw new Error(data?.error||'No fue posible crear la cuenta');
    s.tempAccess={employee_id:id,password:data.temporary_password,pin:Boolean(data.pin)};
    await refresh({silent:true});
    openModal('Cuenta creada',`<div class="notice purple">Entrega estos datos solo al trabajador.</div><div class="field"><label>ID</label><input readonly value="${esc(id)}"></div><div class="field"><label>${data.pin?'PIN de 4 números':'Contraseña temporal'}</label><input readonly value="${esc(data.temporary_password)}"></div>`,'','','<button class="btn btn-primary" data-action="copy-access">Copiar acceso</button>');
    toast('Cuenta creada con ID '+id);return;
   }
  if(type==='decision-save'){
    const approved=values.approve==='true',orderId=values.order_id;
    await rpc('admin_decide_order',{p_order_id:orderId,p_approve:approved,p_reason:values.reason||''});
    s.modal=null;await refresh();
    if(approved){
      // La salida queda registrada en Supabase por un trigger en la misma transacción.
      const {data:doc,error:docErr}=await sb.from('delivery_notes').select('*').eq('order_id',orderId).maybeSingle();
      if(docErr||!doc)throw new Error('Solicitud aprobada. Recarga la página y descarga el PDF desde Solicitudes.');
      s.deliveryNotes=s.deliveryNotes.filter(x=>x.order_id!==orderId).concat(doc);
      openModal('Salida aprobada',`<div class="notice purple"><b>${esc(deliveryFolio(doc.id))}</b> · Documento listo para imprimir.</div><p>El PDF no contiene precios.</p>`,'','',`<button class="btn btn-primary" data-action="download-note" data-id="${orderId}">↓ Descargar PDF</button>`);
      toast('Salida registrada: '+deliveryFolio(doc.id));
    } else toast('Solicitud rechazada. Reserva liberada.');
    return;
   }
   if(type==='user-save'){
    const current=person(values.user_id);
    const newId=String(values.employee_id||'').trim();
    if(!/^[0-9]{1,16}$/.test(newId))throw new Error('El ID debe tener entre 1 y 16 números');
    if(newId!==current?.employee_id)await rpc('admin_set_employee_id',{p_user_id:values.user_id,p_employee_id:newId});
    await rpc('admin_manage_user',{p_user_id:values.user_id,p_active:Boolean(values.active),p_role:values.role,p_name:values.full_name});
   for(const c of s.clients.filter(x=>x.active)){
    const allow=Boolean(values['client_'+c.id]);const previous=s.assignments.some(x=>x.user_id===values.user_id&&x.client_id===c.id);
    if(allow!==previous)await rpc('admin_assign_client',{p_user_id:values.user_id,p_client_id:c.id,p_allow:allow});
   }
  }
  s.modal=null;await refresh();toast('Cambios guardados correctamente');
 }catch(e){fail(e)}finally{s.busy=false;if(btn)btn.disabled=false}
}
root.addEventListener('submit',e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();handleForm(f)});
root.addEventListener('change',e=>{
 if(e.target.dataset.filter==='orders'){s.filter=e.target.value;render()}
 if(e.target.id==='reportFrom'){s.reportFrom=e.target.value;render()}
 if(e.target.id==='reportTo'){s.reportTo=e.target.value;render()}
 if(e.target.id==='requestClient')s.clientId=e.target.value;
});
root.addEventListener('input',e=>{
 if(e.target.id==='requestNote')s.note=e.target.value;
 if(e.target.id==='countQty'){
  const output=$('countDifference'),form=e.target.closest('form');
  if(!output||!form)return;
  const current=Number(form.querySelector('[name=expected_system]')?.value||0);
  const counted=Number(e.target.value);
  if(e.target.value===''||!Number.isSafeInteger(counted)){output.textContent='Ingresa el conteo para calcular la diferencia.';output.className='count-difference';return}
  const difference=counted-current;
  output.textContent=difference===0?'Sin diferencias':`Diferencia: ${difference>0?'+':''}${difference} unidades`;
  output.className='count-difference '+(difference<0?'negative':difference>0?'positive':'equal');
 }
});
root.addEventListener('click',async e=>{
 const pg=e.target.closest('[data-page]');if(pg){openPage(pg.dataset.page);return}
 const b=e.target.closest('[data-action]');if(!b)return;
 if(b.dataset.action==='close-modal'&&e.target!==b&&b.classList.contains('modal-backdrop'))return;
 const a=b.dataset.action,id=b.dataset.id;
 try{switch(a){
 case 'switch-auth':s.register=!s.register;login();break;
 case 'change-password':
  if(isAdmin())openModal('Cambiar contraseña',`<div class="field"><label>Nueva contraseña</label><input name="password" type="password" minlength="10" required autocomplete="new-password"></div><div class="field"><label>Repetir contraseña</label><input name="password_confirm" type="password" minlength="10" required autocomplete="new-password"></div>`,'change-password','Guardar');
  else openModal('Cambiar PIN',`<div class="field"><label>PIN actual</label><input name="current_pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required autocomplete="off"></div><div class="field"><label>Nuevo PIN (4 números)</label><input name="new_pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required autocomplete="new-password"></div><div class="field"><label>Repetir nuevo PIN</label><input name="confirm_pin" type="password" inputmode="numeric" pattern="[0-9]{4}" minlength="4" maxlength="4" required autocomplete="new-password"></div>`,'change-password','Guardar PIN');
  break;
 case 'copy-access':if(s.tempAccess){await navigator.clipboard.writeText('ID: '+s.tempAccess.employee_id+'\n'+(s.tempAccess.pin?'PIN: ':'Contraseña temporal: ')+s.tempAccess.password);toast('Datos de acceso copiados')}break;
 case 'logout':s.modal=null;s.profile=null;await sb.auth.signOut();if(realtime){await sb.removeChannel(realtime);realtime=null}s.session=null;s.cart=[];s.page='home';render();break;
 case 'refresh':await refresh();toast('Datos actualizados');break;
 case 'more':showMore();break;
 case 'product-new':showProduct();break;case 'product-edit':showProduct(id);break;
 case 'client-new':showClient();break;case 'client-edit':showClient(id);break;
 case 'stock':showStock(id);break;case 'add-stock-global':showStock();break;case 'count':showCount(id);break;case 'new-count':showCount();break;case 'count-select':{const pick=$('countSelectProduct')?.value;if(!pick)throw new Error('Selecciona un insumo');showCount(pick);break;}
 case 'invite-new':showInvitation();break;case 'user-edit':showUser(id);break;
 case 'reset-user-password':{
  if(!isAdmin())throw new Error('Solo el administrador puede restablecer contraseñas');
  const worker=person(id);if(!worker?.employee_id)throw new Error('Asigna un ID a esta persona primero');
  const {data,error}=await sb.functions.invoke('reset-staff-password',{body:{user_id:id}});
  if(error||!data?.updated)throw new Error(data?.error||error?.message||'No se pudo restablecer la contraseña');
  s.tempAccess={employee_id:worker.employee_id,password:data.temporary_password,pin:Boolean(data.pin)};
  openModal(data.pin?'Nuevo PIN':'Nueva contraseña',`<div class="notice purple">Entrega este acceso solo al trabajador.</div><div class="field"><label>ID</label><input readonly value="${esc(worker.employee_id)}"></div><div class="field"><label>${data.pin?'PIN de 4 números':'Contraseña temporal'}</label><input readonly value="${esc(data.temporary_password)}"></div>`,'','','<button class="btn btn-primary" data-action="copy-access">Copiar acceso</button>');
  break;
 }

 case 'approve':showDecision(id,true);break;case 'reject':showDecision(id,false);break;
 case 'close-modal':closeModal();break;
 case 'cart-add':addCart();break;
 case 'cart-clear':s.cart=[];render();break;
 case 'cart-remove':s.cart=s.cart.filter(x=>x.product_id!==id);render();break;
 case 'send-order':await sendOrder();break;
 case 'xlsx':downloadExcel();break;
 case 'download-note':await downloadNote(id);break;
 case 'print-report':printReport();break;
 default:break;
 }}catch(err){fail(err)}
});
function addCart(){if(!s.profile?.active)return;const clientId=$('requestClient')?.value||s.clientId,id=$('requestProduct')?.value,q=Number($('requestQty')?.value);if(!clientId)throw new Error('Selecciona un cliente');const p=product(id);if(!p)throw new Error('Selecciona un insumo');const existing=s.cart.find(x=>x.product_id===id);const current=existing?.quantity||0;if(!Number.isInteger(q)||q<1||current+q>available(p))throw new Error('Cantidad superior al stock disponible');s.clientId=clientId;s.note=$('requestNote')?.value||s.note||'';if(existing)existing.quantity+=q;else s.cart.push({product_id:id,quantity:q});render();toast('Insumo añadido al pedido')}
async function sendOrder(){if(s.busy)return;const clientId=$('requestClient')?.value||s.clientId;if(!clientId)throw new Error('Selecciona un cliente');if(!s.cart.length)throw new Error('Agrega al menos un insumo');s.busy=true;try{
 const code=await rpc('submit_order',{p_client_id:clientId,p_items:s.cart,p_note:$('requestNote')?.value||s.note||''});s.cart=[];s.clientId='';s.note='';s.page='orders';await refresh();toast('Solicitud #'+shortId(code)+' enviada. Stock reservado.');
 }finally{s.busy=false}}
async function downloadNote(orderId){
 if(!isAdmin())throw new Error('Solo el administrador puede descargar salidas');
 const order=s.orders.find(o=>o.id===orderId);
 if(!order||order.status!=='approved')throw new Error('Solo las solicitudes aprobadas generan documento de salida');
 let doc=deliveryNote(orderId);
 if(!doc){const r=await sb.from('delivery_notes').select('*').eq('order_id',orderId).maybeSingle();doc=check(r);}
 if(!doc)throw new Error('Comprobante no encontrado. Actualiza la página.');
 downloadDeliveryPdf(doc);
 toast('PDF de salida '+deliveryFolio(doc.id));
}
function printStyles(){return `<style>body{font:13px Arial,sans-serif;color:#231936;margin:36px}h1{font-size:21px;color:#4D148C}h2{font-size:15px}hr{border:0;border-top:3px solid #FF6600}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}th{background:#F1E9FA}.meta{margin:5px 0;color:#555}.sign{display:flex;gap:35px;margin-top:70px}.sign div{flex:1;border-top:1px solid #666;padding-top:9px;text-align:center}.noprint{margin-top:20px}@media print{.noprint{display:none}}@page{size:A4;margin:15mm}</style>`}
function printable(html){const popup=window.open('','_blank');if(!popup){toast('El navegador bloqueó la impresión. Permite las ventanas emergentes.',true);return}popup.document.open();popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Insumos Central Retiros</title>${printStyles()}</head><body>${html}<button class="noprint" onclick="window.print()">Imprimir / guardar PDF</button></body></html>`);popup.document.close();popup.focus();setTimeout(()=>popup.print(),300)}
function printReport(){if(!isAdmin())return;const rows=reportRows();printable(`<h1>Insumos Central Retiros</h1><hr><h2>Resumen de entregas · ${esc(s.reportFrom||'Inicio')} a ${esc(s.reportTo||'Hoy')}</h2><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Insumo</th><th>Cantidad</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date}</td><td>${esc(r.client)}</td><td>${esc(r.sku)} · ${esc(r.name)}</td><td>${r.qty}</td></tr>`).join('')}</tbody></table><p>Total de líneas: ${rows.length}</p>`)}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800)}
function downloadExcel(){if(!isAdmin())throw new Error('Solo administrador');if(s.reportFrom&&s.reportTo&&s.reportFrom>s.reportTo)throw new Error('Fechas incorrectas');const rows=reportRows();const header=['FECHA','AÑO','WEEK','MES','CLIENTE','COD','DETALLE','CANTIDAD','VALOR UNI','VALOR TOTAL','Status'];const detail=[header,...rows.map(x=>[x.date,Number(x.day.slice(0,4)),weekNumber(x.day),monthName(x.day),x.client,x.sku,x.name,x.qty,x.price,x.total,'Entregas'])];downloadBlob(makeXlsx([{name:'Detalle semanal',rows:detail}]),`Insumos_Central_Retiros_${s.reportFrom||'inicio'}_${s.reportTo||today()}.xlsx`)}

async function boot(){
 if(!configured){setup();return}
 spinner();
 await refresh();
 sb.auth.onAuthStateChange((event)=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event))setTimeout(()=>{refresh({silent:true});if(event==='SIGNED_IN')connectRealtime()},0)});
 if(s.session)await connectRealtime();
 interval=setInterval(()=>{if(document.visibilityState==='visible'&&s.session&&Date.now()-lastSync>18000)refresh({silent:true})},22000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&s.session)scheduleRefresh()});
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
boot().catch(fail);

// Generador Excel OpenXML: archivo .xlsx auténtico, sin servicios de terceros.
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
function makeXlsx(sheets){const entries=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],['_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xmlEsc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],['xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot; #,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF4D148C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF6600"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F4F8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]];sheets.forEach((s,i)=>entries.push([`xl/worksheets/sheet${i+1}.xml`,sheetXml(s.rows,s.name)]));return zipFiles(entries)}
