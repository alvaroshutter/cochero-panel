'use strict';
/* Panel de coches: datos públicos (data/publico.json) + zona privada cifrada (privado.enc.json, AES-256-GCM + PBKDF2). */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function num(v, dec = 0) {
  if (v === null || v === undefined || v === '' || isNaN(v)) return '—';
  const neg = v < 0; let s = Math.abs(+v).toFixed(dec);
  let [i, d] = s.split('.'); i = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + i + (d ? ',' + d : '');
}
const eur = (v, dec = 0) => (v === null || v === undefined || v === '') ? '—' : num(v, dec) + ' €';
const pct = (v, dec = 1) => (v === null || v === undefined) ? '—' : num(v * 100, dec) + ' %';
const fdate = iso => { if (!iso) return '—'; const [y, m, d] = String(iso).slice(0, 10).split('-'); return d ? `${d}/${m}/${y}` : iso; };
const fmonth = iso => { if (!iso) return '—'; const [y, m] = iso.split('-'); return `${m}/${y}`; };
const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const tsd = iso => new Date(iso + 'T12:00:00').getTime();
const fts = t => { const d = new Date(t); return `${d.getDate()} ${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; };

let D = null;           // datos públicos
let charts = {};
function chartTheme() {
  if (typeof Chart === 'undefined') return;
  const cs = getComputedStyle(document.documentElement);
  Chart.defaults.color = cs.getPropertyValue('--mut').trim();
  Chart.defaults.borderColor = cs.getPropertyValue('--line').trim();
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
}
function setupTheme() {
  const saved = localStorage.getItem('theme'); if (saved) document.documentElement.dataset.theme = saved;
  $('#themebtn').onclick = () => {
    const dark = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim().toLowerCase() === '#0b0f17';
    const t = dark ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('theme', t);
    chartTheme(); if (!$('#tab-evolucion').hidden) drawEvolucion();
  };
  chartTheme();
}

async function init() {
  try {
    const r = await fetch('data/publico.json', {cache: 'no-cache'});
    D = await r.json();
  } catch (e) { $('#loading').textContent = 'No se han podido cargar los datos.'; return; }
  $('#loading').remove();
  $('#gen').textContent = `Generado el ${fdate(D.generado)} a las ${D.generado.slice(11, 16)} (hora de Madrid).`;
  setupTheme(); renderInicio(); setupNuevos(); setupOcasion(); setupEvolucion(); setupPrivado();
  window.addEventListener('hashchange', route); route();
}

function route() {
  const t = (location.hash || '#inicio').slice(1).split('/')[0];
  const tab = ['inicio','nuevos','ocasion','evolucion','privado'].includes(t) ? t : 'inicio';
  $$('.tab').forEach(s => s.hidden = s.id !== 'tab-' + tab);
  $$('#tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
  if (tab === 'evolucion') {
    const k = decodeURIComponent((location.hash.split('/')[1]) || '');
    if (k && D.modelos[k]) { if (!D.modelos[k].ev) $('#ev-onlyev').checked = false; fillModelSelect(); $('#ev-model').value = k; }
    drawEvolucion();
  }
  window.scrollTo(0, 0);
}

/* ------------------------------------------------------------ FOTOS */
// Foto de referencia por marca/modelo (candidatos) para las filas sin foto propia.
const REF_IMG = [
  [/peugeot/i, /5008/, 'e5008'], [/peugeot/i, /3008/, 'e3008'], [/peugeot/i, /408/, 'e408'],
  [/citro/i, /C5 ?AIRCROSS/i, 'ec5'], [/opel/i, /GRANDLAND/i, 'grandland'], [/leapmotor/i, /C10/i, 'c10'],
];
function refImg(x) {
  if (!x.ev) return null;
  const m = REF_IMG.find(([b, r]) => b.test(x.marca || '') && r.test(x.modelo || ''));
  return m && D.specs[m[2]] ? D.specs[m[2]].img : null;
}
const initials = x => esc(String(x.marca || '?').slice(0, 1) + String(x.modelo || '').replace(/^\W+/, '').slice(0, 1));
function photo(src, x, cls = '') {
  return `<div class="ph ${cls}"><div class="placeholder">${initials(x)}</div>${src ? `<img src="${esc(src)}" alt="${esc((x.marca || '') + ' ' + (x.modelo || ''))}" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.remove()" style="position:relative">` : ''}`;
}
const chip = (t, cls = '') => t ? `<span class="chip ${cls}">${t}</span>` : '';
function specChips(sp) {
  if (!sp) return '';
  return [sp.auto && `🔋 ${esc(sp.auto)} WLTP`, sp.bat && `⚡ ${esc(sp.bat)}`, sp.maletero && `🧳 ${esc(sp.maletero)}`, sp.plazas && `👨‍👩‍👧 ${esc(sp.plazas)} plazas`].filter(Boolean).map(t => chip(t)).join('');
}
const roofHTML = sp => sp ? (sp.techo ? `<div class="roof">☀️ <span>${esc(sp.techo)}</span></div>` : `<div class="roof unk">☁️ <span>Techo de cristal: sin confirmar en la ficha oficial</span></div>`) : '';

/* ------------------------------------------------------------ INICIO */
function renderInicio() {
  const f = D.fechas;
  $('#updated').innerHTML = [
    ['Club nuevos', f.club_nuevos], ['Club ocasión', f.club_ocasion], ['Spoticar', f.spoticar],
    ['Último correo', f.correos], ['Carwow/Tesla/BYD', f.carwow_tesla_byd]
  ].map(([l, d]) => `<span class="chip acc">${esc(l)}: <b>${fdate(d)}</b></span>`).join('');

  // mejor precio: el nuevo Club más barato entre los candidatos
  const withNew = D.shortlist.filter(s => s.nuevo[0] && s.nuevo[0].precio);
  const bestId = withNew.length ? withNew.reduce((a, b) => a.nuevo[0].precio <= b.nuevo[0].precio ? a : b).id : null;

  $('#shortlist').innerHTML = D.shortlist.map(s => {
    const sp = s.spec || {};
    const nv = s.nuevo[0];
    const oc = s.ocasion.mejor_libre || s.ocasion.mejor;
    const spo = s.spoticar.mejor;
    const prices = [nv && nv.precio, oc && oc.precio].filter(Boolean);
    const min = prices.length ? Math.min(...prices) : null;
    const rows = [];
    if (nv) {
      rows.push(`<div class="row"><span>Nuevo Club</span><b class="${nv.precio === min ? 'best' : ''}">${eur(nv.precio)}</b></div>`);
      rows.push(`<div class="note">${esc(nv.version)} · PVP ${eur(nv.pvp)}${nv.balloon ? ` · Balloon ${eur(nv.balloon.cuota, 2)}/mes` : ''}</div>`);
      if (s.nuevo.length > 1) rows.push(`<div class="note">+${s.nuevo.length - 1} versión(es) más, desde ${eur(s.nuevo[1].precio)}</div>`);
    } else rows.push(`<div class="row"><span>Nuevo Club</span><b class="muted">no disponible</b></div>`);
    if (oc) {
      rows.push(`<div class="row"><span>Ocasión Club (${s.ocasion.n}, ${s.ocasion.libres} libres)</span><b class="${oc.precio === min ? 'best' : ''}">${eur(oc.precio)}</b></div>`);
      rows.push(`<div class="note">Mejor ${s.ocasion.mejor_libre ? 'libre' : '(reservado)'}: ${esc(oc.version)} · ${num(oc.km)} km · ${fmonth(oc.matric)}</div>`);
    } else rows.push(`<div class="row"><span>Ocasión Club</span><b class="muted">ninguno</b></div>`);
    rows.push(spo ? `<div class="row"><span>Spoticar (${s.spoticar.n})</span><b>${eur(spo.precio)}</b></div>` : `<div class="row"><span>Spoticar</span><b class="muted">ninguno</b></div>`);
    if (s.carwow) {
      rows.push(`<div class="row"><span>Carwow contado / financiado</span><b>${eur(s.carwow.contado)} / ${eur(s.carwow.financiado)}</b></div>`);
      if (s.carwow.club_matric && s.carwow.contado) rows.push(`<div class="note">Club + matriculación ≈ ${eur(s.carwow.club_matric)} → ${s.carwow.contado - s.carwow.club_matric > 0 ? 'el Club ahorra ' + eur(s.carwow.contado - s.carwow.club_matric) + ' al contado' : 'Carwow más barato'}</div>`);
      else if (s.carwow.nota) rows.push(`<div class="note">${esc(s.carwow.nota)}</div>`);
    }
    const isBest = s.id === bestId, isFav = !!sp.fav;
    const headline = nv ? nv.precio : (oc ? oc.precio : null);
    const cuota = nv && nv.balloon ? `${eur(nv.balloon.cuota, 0)}/mes` : null;
    const tags = [isFav && '<span>★ Favorito</span>', isBest && '<span class="val">€ Mejor precio nuevo</span>'].filter(Boolean).join('');
    return `<article class="card car sl ${isFav ? 'fav' : ''} ${isBest && !isFav ? 'val' : ''}" data-k="${esc(s.keys[0] || '')}">
      ${photo(sp.img, {marca: s.nombre.split(' ')[0], modelo: s.nombre.split(' ').slice(1).join(' ')})}
      <div class="tag">${tags}</div>
      <div class="ov"><h4>${esc(s.nombre)}</h4>
        <div class="big">${eur(headline)}<small>${nv ? 'nuevo Club' : oc ? 'ocasión Club' : ''}${cuota ? ' · Balloon ' + cuota : ''}</small></div>
        <div class="chips">${specChips(sp)}</div></div>
      </div>
      <div class="body"><div class="ver">${esc(s.nota)}</div>${roofHTML(sp)}${rows.join('')}
        <div class="note"><a href="#evolucion/${encodeURIComponent(s.keys[0] || '')}">📈 Ver evolución de precio →</a></div></div></article>`;
  }).join('');
  $$('#shortlist .sl').forEach(c => c.addEventListener('click', e => { if (e.target.tagName !== 'A' && c.dataset.k) location.hash = 'evolucion/' + encodeURIComponent(c.dataset.k); }));

  $('#otras').innerHTML = D.otras_marcas.map(o => {
    const sp = /model y/i.test(o.coche) ? D.specs.tesla_y : /sealion 7/i.test(o.coche) ? D.specs.byd_sealion7 : null;
    const [marca, ...rest] = o.coche.split(' ');
    return `<article class="card car">${photo(sp && sp.img, {marca, modelo: rest.join(' ')})}
      <div class="tag"><span class="src">${esc(o.tipo)}</span></div>
      <div class="ov"><h4>${esc(o.coche)}</h4><div class="big">${eur(o.precio)}</div>
        <div class="chips">${sp ? specChips(sp) : ''}</div></div></div>
      <div class="body">${roofHTML(sp)}<div class="note">${esc(o.financiacion || '')}</div>
      <div class="row"><span>Maletero</span><b>${esc(o.maletero || '—')}</b></div>
      <div class="note">${esc(o.espacio || '')}</div></div></article>`;
  }).join('');

  const n = D.novedades;
  const blk = (t, ic, x, withKm) => {
    if (!x) return `<div class="card"><h4>${ic} ${t}</h4><div class="note">Solo hay una captura.</div></div>`;
    const li = (arr, f) => arr.slice(0, 8).map(f).join('') + (arr.length > 8 ? `<li class="muted">… y ${arr.length - 8} más</li>` : '');
    const total = x.altas.length + x.bajas.length + x.cambios.length;
    return `<div class="card"><h4>${ic} ${t}</h4><div class="note">${fdate(x.desde)} → ${fdate(x.hasta)}</div>
      <div class="chips" style="margin:8px 0">${chip('+' + x.altas.length + ' nuevos', 'free')}${chip('−' + x.bajas.length + ' fuera', 'res')}${chip(x.cambios.length + ' cambios', 'acc')}</div>
      ${total === 0 ? '<div>Sin cambios.</div>' : ''}
      ${x.altas.length ? `<div><b>Nuevos (${x.altas.length})</b><ul>${li(x.altas, a => `<li>${esc(a.marca)} ${esc(a.modelo)} · ${eur(a.precio)}${withKm ? ' · ' + num(a.km) + ' km' : ''}</li>`)}</ul></div>` : ''}
      ${x.bajas.length ? `<div><b>Ya no están (${x.bajas.length})</b><ul>${li(x.bajas, a => `<li>${esc(a.marca)} ${esc(a.modelo)} ${esc(a.version)} · ${eur(a.precio)}${withKm ? ' · ' + num(a.km) + ' km' : ''}</li>`)}</ul></div>` : ''}
      ${x.cambios.length ? `<div><b>Cambios (${x.cambios.length})</b><ul>${li(x.cambios, c => `<li>${esc(c.marca)} ${esc(c.modelo)}: ${c.campo === 'reservado' ? (c.ahora ? 'reservado' : 'liberado') : eur(c.antes) + ' → ' + eur(c.ahora)}</li>`)}</ul></div>` : ''}
    </div>`;
  };
  $('#novedades').innerHTML = blk('Nuevos Club', '🆕', n.nuevos) + blk('Ocasión Club', '🔁', n.ocasion, true) + blk('Spoticar', '🏷️', n.spoticar, true);
}

/* ------------------------------------------------------------ filtros comunes */
function readFilters(box) {
  const f = {};
  $$('[data-f]', box).forEach(el => f[el.dataset.f] = el.type === 'checkbox' ? el.checked : el.value.trim());
  return f;
}
function fillSelect(sel, values) {
  const cur = sel.value;
  sel.innerHTML = sel.options[0].outerHTML + values.map(v => `<option>${esc(v)}</option>`).join('');
  sel.value = values.includes(cur) ? cur : '';
}
const uniq = a => [...new Set(a.filter(Boolean))].sort((x, y) => x.localeCompare(y, 'es'));
function sorter(key) {
  const desc = key.startsWith('-'); const k = desc ? key.slice(1) : key;
  const get = x => k === 'balloon' ? (x.balloon ? x.balloon.cuota : null) : x[k];
  return (a, b) => {
    const va = get(a), vb = get(b);
    if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
    return desc ? (vb > va ? 1 : vb < va ? -1 : 0) : (va > vb ? 1 : va < vb ? -1 : 0);
  };
}
function paged(listEl, moreBtn, items, renderFn, step = 60) {
  let shown = step;
  const draw = () => { listEl.innerHTML = items.slice(0, shown).map(renderFn).join('') || '<p class="muted">No hay coches con esos filtros.</p>'; moreBtn.hidden = shown >= items.length; };
  moreBtn.onclick = () => { shown += step; draw(); };
  draw();
}
function persist(box, name) {
  const saved = JSON.parse(localStorage.getItem('f-' + name) || 'null');
  if (saved) $$('[data-f]', box).forEach(el => { if (el.dataset.f in saved) { if (el.type === 'checkbox') el.checked = saved[el.dataset.f]; else el.value = saved[el.dataset.f]; } });
  return () => localStorage.setItem('f-' + name, JSON.stringify(readFilters(box)));
}

/* ------------------------------------------------------------ NUEVOS */
function setupNuevos() {
  const box = $('#f-nuevos');
  fillSelect($('[data-f=marca]', box), uniq(D.nuevos.map(x => x.marca)));
  fillSelect($('[data-f=comb]', box), uniq(D.nuevos.map(x => x.comb)));
  const save = persist(box, 'nuevos');
  const run = () => {
    save();
    const f = readFilters(box); const q = f.q.toLowerCase();
    let it = D.nuevos.filter(x =>
      (!f.marca || x.marca === f.marca) && (!f.comb || x.comb === f.comb) && (!f.ev || x.ev) &&
      (!f.pmin || x.precio >= +f.pmin) && (!f.pmax || x.precio <= +f.pmax) &&
      (!q || `${x.marca} ${x.modelo} ${x.version}`.toLowerCase().includes(q)));
    it.sort(sorter(f.orden || 'precio'));
    $('#c-nuevos').textContent = `${it.length} de ${D.nuevos.length} ofertas · captura del ${fdate(D.fechas.club_nuevos)}`;
    paged($('#l-nuevos'), $('#m-nuevos'), it, cardNuevo);
  };
  box.addEventListener('input', run); run();
}
function cardNuevo(x) {
  const b = x.balloon, r = x.renting;
  const own = x.img, src = own || refImg(x);
  const cuota = b ? `${eur(b.cuota, 0)}/mes Balloon` : r ? `${eur(r.cuota, 0)}/mes renting` : '';
  return `<article class="card car lc">${photo(src, x, own ? 'club' : '')}
    <div class="tag">${x.dto ? `<span class="val">−${num(x.dto, 0)} %</span>` : ''}${!own && src ? '<span class="src">Foto de referencia</span>' : ''}</div>
    <div class="ov"><h4>${esc(x.marca)} ${esc(x.modelo)}</h4><div class="big">${eur(x.precio)}<small>${cuota}</small></div></div></div>
    <div class="body"><div class="ver">${esc(x.version)}</div>
    <div class="chips">${x.ev ? chip('⚡ 100 % eléctrico', 'ev') : chip(esc(x.comb))}${x.badges.map(t => chip(esc(t))).join('')}</div>
    <div class="row"><span>PVP</span><b>${eur(x.pvp)}</b></div>
    <div class="row"><span>Ahorro</span><b class="best">${eur(x.ahorro)} (${num(x.dto, 1)} %)</b></div>
    ${b ? `<div class="row"><span>Balloon ${b.cuotas || ''} cuotas</span><b>${eur(b.cuota, 2)}/mes</b></div><div class="note">Entrada ${eur(b.entrada)} · última ${eur(b.final)} · TAE ${num(b.tae, 2)} % · ${num(b.km)} km · hasta ${esc(b.hasta || '—')}</div>` : ''}
    ${r ? `<div class="row"><span>Renting ${r.meses} m / ${num(r.kmano)} km/año</span><b>${eur(r.cuota, 2)}/mes</b></div>` : ''}
    <div class="note"><a href="#evolucion/${encodeURIComponent(x.k)}">📈 Evolución →</a></div></div></article>`;
}

/* ------------------------------------------------------------ OCASIÓN */
let ocSrc = 'club';
function setupOcasion() {
  const box = $('#f-ocasion');
  const all = () => ocSrc === 'club' ? D.ocasion.map(x => ({...x, src: 'Club'})) : ocSrc === 'spoticar' ? D.spoticar.map(x => ({...x, src: 'Spoticar'})) :
    D.ocasion.map(x => ({...x, src: 'Club'})).concat(D.spoticar.map(x => ({...x, src: 'Spoticar'})));
  const save = persist(box, 'ocasion');
  const run = () => {
    save();
    const src = all();
    fillSelect($('[data-f=marca]', box), uniq(src.map(x => x.marca)));
    fillSelect($('[data-f=comb]', box), uniq(src.map(x => x.comb)));
    const f = readFilters(box); const q = f.q.toLowerCase();
    let it = src.filter(x =>
      (!f.marca || x.marca === f.marca) && (!f.comb || x.comb === f.comb) && (!f.ev || x.ev) && (!f.libres || !x.reservado) &&
      (!f.pmax || x.precio <= +f.pmax) && (!f.kmax || x.km <= +f.kmax) && (!f.amin || (x.anio && x.anio >= +f.amin)) &&
      (!q || `${x.marca} ${x.modelo} ${x.version} ${x.color || ''}`.toLowerCase().includes(q)));
    it.sort(sorter(f.orden || 'precio'));
    const res = it.filter(x => x.reservado).length;
    $('#c-ocasion').textContent = `${it.length} coches${res ? ` (${res} reservados)` : ''} · Club ${fdate(D.fechas.club_ocasion)}, Spoticar ${fdate(D.fechas.spoticar)}`;
    paged($('#l-ocasion'), $('#m-ocasion'), it, cardOcasion);
  };
  $$('#ocasion-src button').forEach(b => b.addEventListener('click', () => {
    ocSrc = b.dataset.src; $$('#ocasion-src button').forEach(x => x.classList.toggle('on', x === b)); run();
  }));
  box.addEventListener('input', run); run();
}
function cardOcasion(x) {
  const sp = x.src === 'Spoticar';
  const src = refImg(x);
  return `<article class="card car lc">${photo(src, x)}
    <div class="tag"><span class="src">${x.src}</span>${!sp && x.reservado ? '<span class="resv">Reservado</span>' : ''}${src ? '<span class="src">Foto de referencia</span>' : ''}</div>
    <div class="ov"><h4>${esc(x.marca)} ${esc(x.modelo)}</h4><div class="big">${eur(x.precio)}<small>${sp && x.cuota ? eur(x.cuota, 0) + '/mes' : ''}</small></div>
      <div class="chips">${chip('🛣️ ' + num(x.km) + ' km')}${chip('📅 ' + fmonth(x.matric))}${sp && x.soh ? chip('🔋 SOH ' + num(x.soh * 100) + ' %') : ''}</div></div></div>
    <div class="body"><div class="ver">${esc(x.version)}</div>
    <div class="chips">${x.ev ? chip('⚡ 100 % eléctrico', 'ev') : chip(esc(x.comb))}
      ${!sp ? (x.reservado ? chip('Reservado', 'res') : chip('Disponible', 'free')) : ''}${x.color ? chip(esc(x.color)) : ''}</div>
    ${sp && x.financiado ? `<div class="row"><span>Precio financiado</span><b>${eur(x.financiado)}</b></div>` : ''}
    ${x.cambio ? `<div class="row"><span>Cambio</span><b>${esc(x.cambio)}</b></div>` : ''}
    ${sp && x.cuota ? `<div class="row"><span>Cuota desde</span><b>${eur(x.cuota, 2)}/mes</b></div><div class="note">Entrada ${eur(x.entrada)} · TAE ${num(x.tae, 2)} %${x.garantia ? ' · garantía ' + x.garantia + ' meses' : ''}${x.ubicacion ? ' · ' + esc(x.ubicacion) : ''}</div>` : ''}
    <div class="note">${sp && x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Ver anuncio ↗</a> · ` : ''}<a href="#evolucion/${encodeURIComponent(x.k)}">📈 Evolución →</a></div></div></article>`;
}

/* ------------------------------------------------------------ EVOLUCIÓN */
const SERIES = [
  ['web_nuevo', 'Club nuevo (web, mínimo)', '#0b6bcb', 'precio'],
  ['web_ocasion', 'Club ocasión (mínimo)', '#7c3aed', 'precio'],
  ['web_spoticar', 'Spoticar (mínimo)', '#0e9f6e', 'precio'],
  ['correo_contado', 'Correo: precio contado', '#e8590c', 'precio'],
  ['correo_financiado', 'Correo: precio financiando', '#d6336c', 'precio'],
  ['web_balloon', 'Club web: Balloon', '#0b6bcb', 'cuota'],
  ['correo_cuota', 'Correo: Balloon/préstamo', '#e8590c', 'cuota'],
  ['correo_renting', 'Correo: renting', '#868e96', 'cuota'],
];
function fillModelSelect() {
  const onlyEv = $('#ev-onlyev').checked; const sel = $('#ev-model'); const cur = sel.value;
  const ks = Object.keys(D.series).filter(k => D.modelos[k] && (!onlyEv || D.modelos[k].ev));
  ks.sort((a, b) => D.modelos[a].nombre.localeCompare(D.modelos[b].nombre, 'es'));
  const shortK = D.shortlist.map(s => s.keys[0]).filter(Boolean);
  const opt = k => `<option value="${esc(k)}">${esc(D.modelos[k].nombre)}${D.modelos[k].ev ? '' : ' (térmico/híbrido)'}</option>`;
  sel.innerHTML = `<optgroup label="Candidatos">${shortK.filter(k => D.series[k]).map(opt).join('')}</optgroup><optgroup label="Todos">${ks.map(opt).join('')}</optgroup>`;
  sel.value = ks.includes(cur) || shortK.includes(cur) ? cur : (shortK[0] || ks[0]);
}
function setupEvolucion() {
  fillModelSelect();
  $('#ev-model').addEventListener('change', () => { history.replaceState(null, '', '#evolucion/' + encodeURIComponent($('#ev-model').value)); drawEvolucion(); });
  $('#ev-onlyev').addEventListener('change', () => { fillModelSelect(); drawEvolucion(); });
}
function lineChart(id, datasets, yLabel, extra = {}) {
  if (charts[id]) charts[id].destroy();
  if (typeof Chart === 'undefined') return;
  charts[id] = new Chart($('#' + id), {
    type: 'line',
    data: {datasets},
    options: Object.assign({
      responsive: true, maintainAspectRatio: false, parsing: false, interaction: {mode: 'nearest', intersect: false},
      plugins: {legend: {position: 'bottom', labels: {boxWidth: 12, usePointStyle: true}},
        tooltip: {callbacks: {title: it => it.length ? fdate(new Date(it[0].parsed.x).toISOString().slice(0, 10)) : '', label: c => `${c.dataset.label}: ${eur(c.parsed.y, c.parsed.y < 2000 ? 2 : 0)}`}},
        title: {display: true, text: yLabel, font: {size: 14, weight: '700'}}},
      scales: {x: {type: 'linear', grid: {display: false}, ticks: {callback: v => fts(v), maxTicksLimit: 7}}, y: {ticks: {callback: v => num(v)}}}
    }, extra)
  });
}
function drawEvolucion() {
  const k = $('#ev-model').value; const s = D.series[k] || {};
  const mk = kind => SERIES.filter(x => x[3] === kind && s[x[0]] && s[x[0]].length).map(([id, label, color]) => ({
    label, borderColor: color, backgroundColor: color + '33', fill: false, pointRadius: 4, pointHoverRadius: 7, borderWidth: 2.5, tension: .25, spanGaps: true,
    borderDash: id.startsWith('correo') ? [5, 4] : [], showLine: s[id].length > 1,
    data: s[id].map(([d, v]) => ({x: tsd(d), y: v}))
  }));
  const name = D.modelos[k] ? D.modelos[k].nombre : '';
  const p = mk('precio'), c = mk('cuota');
  const last = id => s[id] && s[id].length ? s[id][s[id].length - 1] : null;
  const first = id => s[id] && s[id].length ? s[id][0] : null;
  const tile = (l, id, dec = 0, suf = '') => { const a = first(id), z = last(id); if (!z) return '';
    const d = a && a !== z ? z[1] - a[1] : null;
    return `<div class="kpi ${d === null ? '' : d <= 0 ? 'ok' : 'warn'}"><div class="l">${l}</div><div class="v">${eur(z[1], dec)}${suf}</div><div class="note">${fdate(z[0])}${d === null ? '' : ` · ${d <= 0 ? '▼' : '▲'} ${eur(Math.abs(d), dec)} desde ${fdate(a[0])}`}</div></div>`; };
  const shortSp = D.shortlist.find(x => x.keys.includes(k));
  const img = shortSp && shortSp.spec ? shortSp.spec.img : refImg({marca: name.split(' ')[0], modelo: name.split(' ').slice(1).join(' '), ev: D.modelos[k] && D.modelos[k].ev});
  $('#ev-kpis').innerHTML = (img ? `<div class="kpi" style="padding:0;min-height:96px;background:url('${esc(img)}') center/cover"></div>` : '') +
    tile('Club nuevo (mín.)', 'web_nuevo') + tile('Club ocasión (mín.)', 'web_ocasion') + tile('Spoticar (mín.)', 'web_spoticar') + tile('Correo contado', 'correo_contado') + tile('Balloon web', 'web_balloon', 2, '/mes') || '<p class="muted">Sin datos para este modelo.</p>';
  lineChart('ch-precio', p, `${name}: precio (€)` + (p.length ? '' : ' — sin datos'));
  lineChart('ch-cuota', c, `${name}: cuota mensual (€/mes)` + (c.length ? '' : ' — sin datos'));
  const rows = D.correos.filter(x => x.k === k);
  $('#t-correos').innerHTML = rows.length ? `<thead><tr><th>Fecha</th><th>Versión</th><th>Tipo</th><th>Contado</th><th>Financiando</th><th>Cuota</th><th>Entrada</th><th>Última</th><th>TAE</th><th>Meses</th><th>Km</th><th>Válida hasta</th></tr></thead><tbody>` +
    rows.map(x => `<tr><td>${fdate(x.fecha)}</td><td>${esc(x.version)}</td><td>${esc(x.tipo)}</td><td class="n">${eur(x.contado)}</td><td class="n">${eur(x.financiado)}</td><td class="n">${eur(x.cuota, 2)}</td><td class="n">${eur(x.entrada)}</td><td class="n">${eur(x.ultima)}</td><td class="n">${esc(x.tae || '')}</td><td class="n">${esc(x.plazo || '')}</td><td class="n">${num(x.km)}</td><td>${esc(x.hasta || '')}</td></tr>`).join('') + '</tbody>'
    : '<tbody><tr><td class="muted">No hay ofertas por correo de este modelo.</td></tr></tbody>';
}

/* ------------------------------------------------------------ PRIVADO */
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64e = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function deriveKey(pw, enc) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt: b64(enc.salt), iterations: enc.iter}, base, {name: 'AES-GCM', length: 256}, true, ['decrypt']);
}
async function decryptWith(key, enc) {
  const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64(enc.iv), additionalData: new TextEncoder().encode(enc.aad || '')}, key, b64(enc.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
let ENC = null;
async function loadEnc() { if (!ENC) ENC = await (await fetch('privado.enc.json', {cache: 'no-cache'})).json(); return ENC; }
function setupPrivado() {
  if (!window.crypto || !crypto.subtle) { $('#pwmsg').textContent = 'Este navegador no permite descifrar (hace falta HTTPS).'; }
  $('#pwform').addEventListener('submit', async e => {
    e.preventDefault(); const msg = $('#pwmsg'); msg.style.color = ''; msg.textContent = 'Descifrando…';
    try {
      const enc = await loadEnc(); const key = await deriveKey($('#pw').value, enc);
      const data = await decryptWith(key, enc);
      if ($('#remember').checked) localStorage.setItem('pk', JSON.stringify({salt: enc.salt, k: b64e(await crypto.subtle.exportKey('raw', key))}));
      $('#pw').value = ''; msg.textContent = ''; showPriv(data);
    } catch (err) { msg.textContent = 'Contraseña incorrecta.'; }
  });
  (async () => {   // clave recordada (solo vale mientras no cambie la sal del cifrado)
    const saved = JSON.parse(localStorage.getItem('pk') || 'null'); if (!saved) return;
    try {
      const enc = await loadEnc(); if (saved.salt !== enc.salt) { localStorage.removeItem('pk'); return; }
      const key = await crypto.subtle.importKey('raw', b64(saved.k), {name: 'AES-GCM'}, false, ['decrypt']);
      showPriv(await decryptWith(key, enc));
    } catch (e) { localStorage.removeItem('pk'); }
  })();
}
function lockPriv() { localStorage.removeItem('pk'); $('#priv').innerHTML = ''; $('#priv').hidden = true; $('#lock').hidden = false; if (charts['ch-km']) charts['ch-km'].destroy(); }

function tableHTML(cab, filas, opts = {}) {
  const isNum = v => typeof v === 'number';
  const fmt = (v, h) => {
    if (v === null || v === undefined) return '';
    if (isNum(v)) { const hh = String(h || ''); if (/%/.test(hh) && Math.abs(v) <= 1.5) return pct(v); if (/TIN|TAE/.test(hh) && v < 1) return pct(v, 2); return num(v, Math.abs(v) < 100 && v % 1 ? 2 : 0); }
    return esc(v);
  };
  return `<div class="tablewrap"><table class="tbl"><thead><tr>${cab.map(h => `<th>${esc(h ?? '')}</th>`).join('')}</tr></thead><tbody>` +
    filas.map((r, i) => `<tr class="${opts.hl && opts.hl(r, i) ? 'hl' : ''}">${cab.map((h, j) => `<td class="${isNum(r[j]) ? 'n' : ''}">${fmt(r[j], h)}</td>`).join('')}</tr>`).join('') + '</tbody></table></div>';
}

function showPriv(P) {
  $('#lock').hidden = true; const el = $('#priv'); el.hidden = false;
  const r = P.renting, pr = P.proyeccion, bu = P.presupuesto, cal = P.calendario;
  const t3 = r.tramos.find(t => t.precio_km > 0);
  const penal = km => km <= 26000 ? 0 : (km - r.km_contratados) * t3.precio_km * (1 + r.iva);
  const pctUsed = Math.min(100, (r.odometro.km / 26000) * 100);
  const KMMAX = Math.max(28000, Math.ceil((pr.fin + 1000) / 1000) * 1000);
  const pctOf = km => Math.min(100, Math.max(0, km / KMMAX * 100));
  const hoy = new Date(); const fin = new Date(r.fecha_devolucion + 'T12:00:00');
  const mesesQ = Math.max(0, (fin - hoy) / (1000 * 3600 * 24 * 30.44));
  el.innerHTML = `
  <button class="lockbtn" id="lockbtn">Bloquear</button>
  <h2>🚘 Mi renting actual</h2>
  <div class="kpis">
    <div class="kpi"><div class="l">Coche</div><div class="v">${esc(r.coche)}</div><div class="note">${esc(r.matricula)} · contrato ${esc(r.contrato)}</div></div>
    <div class="kpi"><div class="l">Cuota</div><div class="v">${eur(r.cuota_mes, 2)}/mes</div></div>
    <div class="kpi"><div class="l">Devolución</div><div class="v">${fdate(r.fecha_devolucion)}</div><div class="note">quedan ≈${num(mesesQ, 1)} meses</div></div>
    <div class="kpi"><div class="l">Km contratados</div><div class="v">${num(r.km_contratados)} km</div></div>
    <div class="kpi"><div class="l">Cuentakilómetros</div><div class="v">${num(r.odometro.km)} km</div><div class="note">a ${fdate(r.odometro.fecha)}</div></div>
    <div class="kpi ${pr.fin <= 26000 ? 'ok' : 'warn'}"><div class="l">Proyección al devolver</div><div class="v">≈${num(Math.round(pr.fin / 100) * 100)} km</div><div class="note">margen ≈${num(Math.round(pr.margen / 100) * 100)} km hasta 26.000 · penalización ${eur(penal(pr.fin))}</div></div>
  </div>
  <div class="box"><b>Kilómetros: dónde estás y dónde acabarías</b>
    <div class="kmbar" style="margin-left:4px;margin-right:4px">
      <div class="proj" style="left:${pctOf(r.odometro.km)}%;width:${Math.max(0, pctOf(pr.fin) - pctOf(r.odometro.km))}%"></div>
      <div class="fill" style="width:${pctOf(r.odometro.km)}%"></div>
      <div class="mk low" style="left:${pctOf(r.km_contratados)}%"><span>${num(r.km_contratados)} contratados</span></div>
      <div class="mk bad" style="left:${pctOf(26000)}%"><span>26.000 → se paga</span></div>
      <div class="mk" style="left:${pctOf(pr.fin)}%;background:var(--warn)"></div>
    </div>
    <div class="legend"><span><i style="background:linear-gradient(90deg,var(--ok),var(--acc))"></i>Hecho: ${num(r.odometro.km)} km (${fdate(r.odometro.fecha)})</span><span><i style="background:var(--warn)"></i>Previsto al devolver: ≈${num(Math.round(pr.fin / 100) * 100)} km</span><span><i style="background:var(--bad)"></i>Desde 26.000 km se paga todo el exceso</span></div>
    <div class="note">Llevas ${num(r.odometro.km)} de 26.000 km sin coste (${num(pctUsed)} %).</div>
    <b>Tramos de km adicionales</b>
    <ul>${r.tramos.map(t => `<li><b>${esc(t.nombre)}:</b> ${esc(t.texto)}</li>`).join('')}</ul>
    <div class="note">Ejemplo: pasar de 26.000 km por 1 km ya cuesta ≈${eur(penal(26001))} (IVA incl.). Con 26.500 km serían ≈${eur(penal(26500))}.</div>
    <p>${esc(r.anexo_30k)}</p>
  </div>
  <div class="chartbox"><canvas id="ch-km"></canvas></div>
  <div class="box"><b>Puntos de control</b>
    ${tableHTML(['Fecha', 'Control acordado (km)', 'Proyección con el calendario (km)', 'Máximo para no pasar de 26.000 (km)'], pr.hitos.map(h => [fdate(h.fecha), h.control, h.proyeccion, h.maximo_seguro]))}
    <p class="note">La proyección usa ${cal.km_jornada} km por jornada de trabajo (ida y vuelta) más ≈${cal.km_otros_mes} km/mes de otros usos:</p>
    <ul>${cal.segmentos.map(s => `<li>${fdate(s.desde)}–${fdate(s.hasta)}: ${s.jornadas} jornadas (${num(s.jornadas * cal.km_jornada)} km) · ${esc(s.texto)}</li>`).join('')}</ul>
    <p class="note">Si a esas fechas vas por debajo del control acordado, no hay riesgo. Si superas el "máximo", al ritmo previsto acabarías por encima de 26.000 km.</p>
  </div>

  <h2>💶 Presupuesto</h2>
  <div class="kpis">
    <div class="kpi"><div class="l">Neto mensual</div><div class="v">≈${eur(bu.neto_mes)}</div></div>
    <div class="kpi"><div class="l">Objetivo coche</div><div class="v">${eur(bu.coche_objetivo_min)}–${eur(bu.coche_objetivo_max)}/mes</div><div class="note">guía ${num(bu.pct_ingresos_min * 100)}–${num(bu.pct_ingresos_max * 100)} % del neto = ${eur(bu.neto_mes * bu.pct_ingresos_min)}–${eur(bu.neto_mes * bu.pct_ingresos_max)}</div></div>
    <div class="kpi"><div class="l">Piso (compartido)</div><div class="v">${eur(bu.piso.precio_total)}</div><div class="note">tu mitad ${eur(bu.piso.su_mitad)}</div></div>
    <div class="kpi warn"><div class="l">Entrada del piso</div><div class="v">${eur(bu.piso.entrada)}</div><div class="note">${esc(bu.piso.plazo)}</div></div>
    <div class="kpi"><div class="l">Renting actual</div><div class="v">${pct(r.cuota_mes / bu.neto_mes)}</div><div class="note">del neto</div></div>
  </div>

  <h2>🏦 Financiación disponible</h2>
  ${tableHTML(['Entidad / producto', 'Tipo', 'Nota'], P.financiacion.map(f => [f.entidad, f.tipo, f.nota]))}

  <h2>📊 Coste total al mes (TCO) y recomendación</h2>
  ${P.hoja_recomendacion.intro.map(t => `<p class="note">${esc(t)}</p>`).join('')}
  ${tableHTML(P.hoja_recomendacion.cab, P.hoja_recomendacion.filas, {hl: (r, i) => i === 0})}
  ${P.hoja_recomendacion.notas.map(t => `<p class="note">${esc(t)}</p>`).join('')}

  <h2>🧮 Financiación comparada a 5 años</h2>
  ${P.hoja_financiacion.intro.map(t => `<p class="note">${esc(t)}</p>`).join('')}
  ${P.hoja_financiacion.secciones.map((s, i) => `<details class="box" ${i === 2 ? 'open' : ''}><summary>${esc(s.titulo)} (${s.filas.length})</summary>
    ${s.cab ? tableHTML(s.cab, s.filas) : ''}</details>`).join('')}
  <p class="note">Descifrado en este navegador · datos generados el ${fdate(P.generado)}.</p>`;
  $('#lockbtn').onclick = lockPriv;

  if (typeof Chart === 'undefined') return;
  if (charts['ch-km']) charts['ch-km'].destroy();
  const P2 = a => a.map(([d, v]) => ({x: tsd(d), y: v}));
  const x0 = tsd(pr.puntos[0][0]), x1 = tsd(pr.puntos[pr.puntos.length - 1][0]);
  const flat = (y, label, color, dash) => ({label, data: [{x: x0, y}, {x: x1, y}], borderColor: color, borderDash: dash, pointRadius: 0, borderWidth: 1.5});
  charts['ch-km'] = new Chart($('#ch-km'), {
    type: 'line',
    data: {datasets: [
      {label: 'Proyección', data: P2(pr.puntos), borderColor: '#4f8cff', backgroundColor: 'rgba(79,140,255,.18)', fill: 'origin', pointRadius: 2, tension: .25, borderWidth: 3},
      {label: 'Máximo para no pasar de 26.000', data: P2(pr.maximo_seguro), borderColor: '#e8590c', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5},
      {label: 'Puntos de control', data: pr.hitos.map(h => ({x: tsd(h.fecha), y: h.control})), borderColor: '#7c3aed', backgroundColor: '#7c3aed', showLine: false, pointRadius: 6, pointStyle: 'rectRot'},
      {label: 'Hoy (cuentakilómetros)', data: [{x: tsd(r.odometro.fecha), y: r.odometro.km}], borderColor: '#22c55e', backgroundColor: '#22c55e', showLine: false, pointRadius: 6},
      flat(20000, '20.000 contratados', '#868e96', [2, 3]), flat(26000, '26.000 (desde aquí se paga)', '#b42318', []),
    ]},
    options: {responsive: true, maintainAspectRatio: false, parsing: false,
      plugins: {legend: {position: 'bottom', labels: {boxWidth: 12, usePointStyle: true}}, title: {display: true, text: 'Kilómetros previstos hasta la devolución'},
        tooltip: {callbacks: {title: it => it.length ? fdate(new Date(it[0].parsed.x).toISOString().slice(0, 10)) : '', label: c => `${c.dataset.label}: ${num(c.parsed.y)} km`}}},
      scales: {x: {type: 'linear', ticks: {callback: v => fts(v), maxTicksLimit: 8}}, y: {suggestedMin: 15000, suggestedMax: 27000, ticks: {callback: v => num(v)}}}}
  });
}

init();
