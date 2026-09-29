/*!
 * Motor de Dashboards de Mídia Paga
 * Um único arquivo para todos os clientes. Cada página define window.DASH
 * (cliente, fontes, PIN, idioma, moeda) e carrega este arquivo.
 */
(function () {
'use strict';

var VERSION = '1.9.2';
var D = window.DASH || {};
var ROOT = document.getElementById(D.elemento || 'dash');
if (!ROOT) return;

/* ============================== ARMAZENAMENTO ============================== */
var CLIENT_KEY = String(D.cliente || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\W+/g, '_').toLowerCase();
var store = {
  k: function (n) { return 'dash_' + CLIENT_KEY + '_' + n; },
  get: function (n, def) { try { var v = localStorage.getItem(this.k(n)); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set: function (n, v) { try { localStorage.setItem(this.k(n), JSON.stringify(v)); } catch (e) {} },
  del: function (n) { try { localStorage.removeItem(this.k(n)); } catch (e) {} }
};

/* ============================== IDIOMA E FORMATO ============================== */
var LANGS = (D.idiomas && D.idiomas.length) ? D.idiomas : ['pt'];
var LANG = store.get('lang', LANGS[0]);
if (LANGS.indexOf(LANG) < 0) LANG = LANGS[0];
function L(pt, es) { return (LANG === 'es' && es != null) ? es : pt; }
function LOC() { return LANG === 'es' ? 'es-AR' : 'pt-BR'; }
var CUR = D.moeda || 'BRL';

function ok(v) { return v != null && isFinite(v); }
function nf(v, d) { d = d || 0; return new Intl.NumberFormat(LOC(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0); }
function money(v) {
  if (!ok(v)) return '—';
  var a = Math.abs(v), d = a < 100 ? 2 : 0;
  try { return new Intl.NumberFormat(LOC(), { style: 'currency', currency: CUR, minimumFractionDigits: d, maximumFractionDigits: d }).format(v); }
  catch (e) { return CUR + ' ' + nf(v, d); }
}
function moneyShort(v) {
  if (!ok(v)) return '—';
  var a = Math.abs(v);
  if (a >= 1e6) return money(v / 1e6).replace(/[,.]00(?=\D*$)/, '') + 'M';
  if (a >= 1e4) return money(Math.round(v / 1e3)).replace(/[,.]00(?=\D*$)/, '') + 'k';
  return money(v);
}
function count(v) { if (!ok(v)) return '—'; return nf(v, (Math.abs(v - Math.round(v)) > 0.05 && Math.abs(v) < 100) ? 1 : 0); }
function pctf(v, d) { if (!ok(v)) return '—'; if (d == null) d = Math.abs(v) < 0.1 ? 2 : 1; return nf(v * 100, d) + '%'; }
function xf(v) { return ok(v) ? nf(v, 2) + 'x' : '—'; }
function deltaTxt(c, p) {
  if (!ok(c) || !ok(p) || p === 0) return null;
  var d = (c - p) / Math.abs(p);
  return { v: d, txt: (d > 0 ? '+' : '') + nf(d * 100, 0) + '%' };
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function $(s, c) { return (c || ROOT).querySelector(s); }
function $$(s, c) { return Array.prototype.slice.call((c || ROOT).querySelectorAll(s)); }

/* ============================== DATAS (sempre ISO AAAA-MM-DD) ============================== */
function p2(n) { return String(n).padStart(2, '0'); }
function isoOf(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
function todayISO() { return isoOf(new Date()); }
function addDays(iso, n) { var a = iso.split('-').map(Number); return isoOf(new Date(a[0], a[1] - 1, a[2] + n)); }
function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5); }
function monthStart(iso) { return iso.slice(0, 8) + '01'; }
function monthEnd(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return iso.slice(0, 8) + p2(new Date(y, m, 0).getDate()); }
function prevMonthStart(iso) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7); return isoOf(new Date(y, m - 2, 1)); }
function fmtD(iso, year) { if (!iso) return '—'; var s = iso.slice(8, 10) + '/' + iso.slice(5, 7); return year ? s + '/' + iso.slice(0, 4) : s; }
function parseDate(v) {
  if (v == null) return null;
  var s = String(v).trim(), m;
  if (!s) return null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + p2(m[2]) + '-' + p2(m[3]);
  if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/))) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + p2(m[2]) + '-' + p2(m[1]); }
  var d = new Date(s);
  return isNaN(d) ? null : isoOf(d);
}

/* ============================== ESTILO ============================== */
var AC = D.cor || '#c9a96a';
function injectStyle() {
  if (!document.getElementById('dz-font')) {
    var l = document.createElement('link'); l.id = 'dz-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap';
    document.head.appendChild(l);
  }
  var css = '\
.dz{--bg:#0c0c0e;--card:#18181c;--card2:#1f1f24;--line:#28282e;--tx:#f3f3f5;--mut:#9a9aa6;--ac:' + AC + ';--ok:#3ecf8e;--bad:#ff6b6b;--warn:#f5b94a;\
container-type:inline-size;max-width:1120px;margin:0 auto;background:var(--bg);color:var(--tx);font-family:Poppins,system-ui,-apple-system,Segoe UI,sans-serif;font-size:14px;line-height:1.45;padding:20px;border-radius:14px;position:relative;min-height:300px;box-sizing:border-box}\
.dz *{box-sizing:border-box}\
.dz h1{font-size:22px;font-weight:600;margin:0}.dz h2{font-size:17px;font-weight:600;margin:0 0 4px}.dz h3{font-size:15px;font-weight:600;margin:0 0 6px}\
.dz p{margin:0 0 8px}.dz small,.dz .mut{color:var(--mut)}\
.dz button{font-family:inherit;cursor:pointer}\
.dz .head{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:flex-start;margin-bottom:16px}\
.dz .brand{display:flex;gap:12px;align-items:center}.dz .logo{width:38px;height:38px;border-radius:10px;border:1px solid var(--ac);color:var(--ac);display:grid;place-items:center;font-weight:600;font-size:18px}\
.dz .btn{background:var(--card);color:var(--tx);border:1px solid var(--line);border-radius:10px;padding:9px 14px;font-size:13px;font-weight:500}\
.dz .btn.pri{background:var(--ac);color:#111;border-color:var(--ac)}.dz .btn:hover{filter:brightness(1.15)}\
.dz .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:14px}\
.dz .card.hl{border-top:3px solid var(--ac)}\
.dz .bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between}\
.dz .pills{display:flex;flex-wrap:wrap;gap:6px}\
.dz .pill{background:transparent;color:var(--tx);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px}\
.dz .pill.on{border-color:var(--ac);color:var(--ac);background:color-mix(in srgb,var(--ac) 12%,transparent)}\
.dz select,.dz input[type=date],.dz input[type=number],.dz input[type=text],.dz input[type=password],.dz textarea{background:var(--card2);color:var(--tx);border:1px solid var(--line);border-radius:8px;padding:7px 10px;font-family:inherit;font-size:13px}\
.dz textarea{width:100%;min-height:90px}\
.dz .tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:1px solid var(--line);margin:16px 0;scrollbar-width:none}\
.dz .tabs button{background:none;border:0;color:var(--mut);padding:11px 13px;font-size:13.5px;font-weight:500;white-space:nowrap;border-bottom:2px solid transparent}\
.dz .tabs button.on{color:var(--tx);border-bottom-color:var(--ac)}\
.dz .view{display:none}.dz .view.on{display:block}\
.dz .grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}\
.dz .grid.g2{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}\
.dz .kpi{background:var(--card2);border:1px solid var(--line);border-radius:12px;padding:13px 14px;min-width:0}\
.dz .kpi .n{font-size:12.5px;color:var(--tx);font-weight:500}.dz .kpi .h{font-size:11.5px;color:var(--mut);margin-top:1px;line-height:1.35}\
.dz .kpi .v{font-size:22px;font-weight:600;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.dz .kpi .c{font-size:12px;color:var(--mut);margin-top:4px;display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap}\
.dz .up{color:var(--ok)}.dz .down{color:var(--bad)}.dz .warn{color:var(--warn)}\
.dz .tag{display:inline-block;font-size:11px;line-height:1.5;padding:1px 8px;border-radius:999px;border:1px solid var(--line);color:var(--mut);margin:0 4px 4px 0;white-space:nowrap;vertical-align:middle}\
.dz .tag.real{border-color:var(--ok);color:var(--ok)}.dz .tag.hip{border-color:var(--warn);color:var(--warn)}.dz .tag.ac{border-color:var(--ac);color:var(--ac)}\
.dz .legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;color:var(--mut);background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:12px}\
.dz .legend b{color:var(--tx);white-space:nowrap}.dz .ll{display:inline-block;width:22px;border-top:2px dashed #6c6c76;vertical-align:middle;margin-right:6px}.dz .ll.now{border-top:2.5px solid var(--ac)}.dz .ll.proj{border-top:2px dotted var(--ac)}\
.dz .note{font-size:12.5px;border:1px solid color-mix(in srgb,var(--warn) 40%,transparent);background:color-mix(in srgb,var(--warn) 8%,transparent);color:#e9d3a3;border-radius:10px;padding:10px 14px;margin-bottom:12px}\
.dz .hero{font-size:17px;line-height:1.55;font-weight:400}.dz .hero b{font-weight:600;color:var(--ac)}\
.dz .sec{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin:22px 0 10px;font-weight:500}\
.dz .tw{position:relative;border:1px solid var(--line);border-radius:12px;overflow:hidden}\
.dz .tw .sc{overflow-x:auto;-webkit-overflow-scrolling:touch}\
.dz .tw-hint{display:none;font-size:11.5px;color:var(--ac);text-align:right;padding:6px 10px 0}\
.dz .tw.scroll .tw-hint{display:block}\
.dz .tw.scroll:not(.end)::after{content:"";position:absolute;top:0;right:0;bottom:0;width:28px;background:linear-gradient(90deg,transparent,rgba(0,0,0,.55));pointer-events:none}\
.dz table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}\
.dz th,.dz td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap;background:var(--card)}\
.dz th:first-child,.dz td:first-child{text-align:left;position:sticky;left:0;z-index:1;white-space:normal;min-width:140px;max-width:220px;box-shadow:1px 0 0 var(--line)}\
.dz th{color:var(--mut);font-weight:500;font-size:12px;background:var(--card2)}\
.dz th[data-col]{cursor:pointer}.dz tr:last-child td{border-bottom:0}\
.dz td.prev,.dz th.prev{color:var(--mut)}\
.dz .vf{display:flex;flex-direction:column;align-items:center;gap:0;margin:8px 0}\
.dz .vf .bar{width:100%;display:flex;justify-content:center}\
.dz table.split th.gstart,.dz table.split td.gstart{border-left:2px solid var(--bd)}\
.dz table.split tr.grp th{font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut);padding-bottom:2px;border-bottom:0;cursor:default}\
.dz table.split tr.grp th small{font-weight:400;text-transform:none;letter-spacing:0;font-size:11px}\
.dz th.sorted{color:var(--ac)}\
.dz .sar{margin-left:5px;font-size:10px}\
.dz .flow .fn{font-size:11.5px;margin-top:3px}\
.dz .fsel{width:100%;max-width:560px;background:var(--card2);border:1px solid var(--bd);border-radius:10px;padding:11px 12px;font-size:14px;color:var(--tx);min-height:44px}\
.dz .fsel:focus{outline:2px solid var(--ac);outline-offset:1px}\
.dz .nt{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;border:1px solid var(--bd);color:var(--mut);font-size:10px;line-height:1;margin-left:6px;cursor:help;position:relative;vertical-align:middle;user-select:none}\
.dz .nt:hover,.dz .nt.on{border-color:var(--ac);color:var(--ac)}\
.dz .nt .ntx{display:none;position:absolute;bottom:22px;left:50%;transform:translateX(-50%);width:250px;background:#08080a;border:1px solid var(--bd);border-radius:10px;padding:10px 12px;font-size:12.5px;line-height:1.5;color:var(--mut);text-align:left;z-index:20;box-shadow:0 10px 30px rgba(0,0,0,.6);cursor:auto}\
.dz .nt.on .ntx{display:block}\
.dz .nt:focus{outline:2px solid var(--ac);outline-offset:2px}\
.dz .donut{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-top:12px}\
.dz .donut svg{flex:none}\
.dz .dtx{fill:var(--tx);font-size:22px;font-weight:600}\
.dz .dtx2{fill:var(--mut);font-size:11px}\
.dz .dleg{flex:1;min-width:190px;display:flex;flex-direction:column;gap:7px}\
.dz .dlg{display:flex;align-items:center;gap:9px;font-size:13px}\
.dz .dlg .dot{width:10px;height:10px;border-radius:3px;flex:none}\
.dz .dlg .dl{flex:1;min-width:0}\
.dz .dlg .dn{color:var(--mut);font-size:12px;min-width:26px;text-align:right}\
.dz .inp{position:relative;display:block}\
.dz .inp .pfx{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--mut);font-size:13px;pointer-events:none}\
.dz .inp.hasp input{padding-left:52px}\
.dz .vf .blk{box-sizing:border-box}\
.dz .vf .blk{border-radius:10px;padding:10px 14px;transition:width .25s ease;background:color-mix(in srgb,var(--ac) 16%,var(--card2));border:1px solid color-mix(in srgb,var(--ac) 45%,transparent);display:flex;justify-content:space-between;align-items:baseline;gap:10px;min-width:210px;max-width:100%}\
.dz .vf .blk .l{font-size:13px}.dz .vf .blk .x{font-size:20px;font-weight:600;white-space:nowrap}\
.dz .vf .blk .d{font-size:11.5px;white-space:nowrap}\
.dz .vf .arrow{font-size:12.5px;color:var(--mut);padding:6px 0;text-align:center}.dz .vf .arrow b{color:var(--tx)}\
.dz .vf .fog{background:repeating-linear-gradient(45deg,var(--card2),var(--card2) 8px,var(--card) 8px,var(--card) 16px);border:1px dashed #4a4a52}\
.dz .vf .fog .x{color:var(--mut)}\
.dz .ladder{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 0}\
.dz .step{border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12px;color:var(--mut)}\
.dz .step.done{border-color:var(--ac);color:var(--tx);background:color-mix(in srgb,var(--ac) 10%,transparent)}\
.dz .ins{border-left:3px solid var(--line);padding:10px 14px;margin-bottom:8px;background:var(--card2);border-radius:0 10px 10px 0}\
.dz .ins.att{border-left-color:var(--bad)}.dz .ins.pos{border-left-color:var(--ok)}.dz .ins.dado{border-left-color:var(--warn)}\
.dz .ins b{display:block;margin-bottom:3px}.dz .ins .act{font-size:12.5px;color:var(--mut);margin-top:4px}\
.dz .q{margin:14px 0}.dz .q .ql{display:flex;justify-content:space-between;gap:12px;align-items:flex-end}.dz .q .ql span{flex:1;min-width:0}\
.dz .q .ql span{font-size:14px}.dz .q .ql b{font-size:18px;color:var(--ac);white-space:nowrap}.dz .q small{display:block;margin-top:2px}\
.dz input[type=range]{width:100%;accent-color:var(--ac);margin:8px 0 0}\
.dz .q input[type=number]{width:100%;margin-top:6px;font-size:15px;padding:9px 12px}\
.dz .seg{display:flex;background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:3px;gap:3px;margin-bottom:12px}\
.dz .seg button{flex:1;background:none;border:0;color:var(--mut);padding:8px 6px;border-radius:8px;font-size:12.5px;font-weight:500}\
.dz .seg button.on{background:var(--ac);color:#111}\
.dz .flow .fs{display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:10px 0}\
.dz .flow .ic{width:34px;height:34px;border-radius:10px;background:var(--card2);display:grid;place-items:center;font-size:16px}\
.dz .flow .fl{font-size:13.5px}.dz .flow .fh{font-size:11.5px;color:var(--mut)}\
.dz .flow .fv{font-size:18px;font-weight:600;text-align:right;white-space:nowrap}\
.dz .flow .con{margin-left:16px;border-left:2px dotted var(--line);height:10px}.dz .flow .con:last-child{display:none}\
.dz .verdict{border-radius:12px;padding:14px 16px;margin-top:12px;font-size:14px}\
.dz .verdict.good{background:color-mix(in srgb,var(--ok) 12%,transparent);border:1px solid color-mix(in srgb,var(--ok) 45%,transparent)}\
.dz .verdict.bad{background:color-mix(in srgb,var(--bad) 10%,transparent);border:1px solid color-mix(in srgb,var(--bad) 45%,transparent)}\
.dz .verdict.neu{background:var(--card2);border:1px solid var(--line)}\
.dz .verdict .big{font-size:18px;font-weight:600;margin-bottom:4px}\
.dz .why{border:1px solid color-mix(in srgb,var(--warn) 45%,transparent);border-radius:14px;padding:18px;background:color-mix(in srgb,var(--warn) 5%,var(--card))}\
.dz .vs{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}\
.dz .vs .kpi .v{font-size:19px}.dz .win{border-color:var(--ok)!important}\
.dz .ccard{border-bottom:1px solid var(--line);padding:12px 2px}.dz .ccard:last-child{border-bottom:0}\
.dz .ccard .cn{font-weight:500;margin:4px 0 8px;word-break:normal;overflow-wrap:break-word}\
.dz .ccard .cg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px}\
.dz .ccard .cg b{display:block;font-size:14.5px;color:var(--tx)}.dz .ccard .cg span{color:var(--mut)}\
.dz .brow{margin:10px 0}.dz .brow .bl{display:flex;justify-content:space-between;gap:10px;font-size:13px;margin-bottom:4px}\
.dz .brow .bl span:first-child{overflow-wrap:break-word;min-width:0}.dz .brow .bl span:last-child{color:var(--mut);white-space:nowrap}\
.dz .form{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}\
.dz .form label{font-size:12px;color:var(--mut);display:block}.dz .form input,.dz .form select{width:100%;margin-top:4px}\
.dz .chart svg{width:100%;height:auto;display:block}.dz .chart{position:relative}\
.dz .axis{fill:#7d7d88;font-size:11px;font-family:inherit}.dz .grid-l{stroke:#26262c}\
.dz .tipbg{fill:#0b0b0d;stroke:#3a3a42}.dz .tiptx{fill:#fff;font-size:12px;font-family:inherit}\
.dz .paceBar{height:12px;background:var(--card2);border-radius:999px;overflow:hidden;display:flex;margin:8px 0}\
.dz .paceBar span{display:block;height:100%}\
.dz .lock{position:absolute;inset:0;z-index:5;display:flex;align-items:flex-start;padding-top:80px;justify-content:center;background:var(--bg);border-radius:14px}\
.dz .lock .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:26px;text-align:center;width:min(340px,90%)}\
.dz .lock input{width:100%;font-size:20px;text-align:center;letter-spacing:6px;margin:14px 0 8px}\
.dz .empty{color:var(--mut);padding:24px;text-align:center}\
.dz .foot{color:var(--mut);font-size:11px;margin-top:18px;text-align:right}\
.dz .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}\
.dz details summary{cursor:pointer;color:var(--ac);font-size:13px;margin-top:10px}\
.dz .only-narrow{display:none}\
.dz button,.dz select,.dz input,.dz h1,.dz h2,.dz h3,.dz p,.dz summary{text-transform:none;letter-spacing:normal;font-family:inherit}\
.dz .logo img{max-height:40px;max-width:130px;display:block;border-radius:6px}.dz .logo.img{border:0;width:auto;height:auto}\
.dz details.alert{border:1px solid color-mix(in srgb,var(--warn) 45%,transparent);background:color-mix(in srgb,var(--warn) 7%,var(--card));border-radius:14px;margin-bottom:14px}\
.dz details.alert>summary{list-style:none;padding:14px 16px;color:#e9d3a3;font-size:13.5px;margin:0;display:flex;gap:10px;align-items:center;justify-content:space-between}\
.dz details.alert>summary::-webkit-details-marker{display:none}.dz details.alert>summary u{color:var(--ac);white-space:nowrap}\
.dz details.alert[open]>summary{border-bottom:1px solid var(--line)}.dz details.alert .why{border:0;background:transparent;border-radius:0}\
.dz .more{display:none}.dz .showall .more{display:block}.dz .showall tr.more{display:table-row}\
.dz .hsw{position:relative}.dz .hsw .tw-hint{padding:0 2px 4px}\
.dz .hsw.scroll .tw-hint{display:block}.dz .hsw.scroll:not(.end)::after{content:"";position:absolute;right:0;bottom:0;height:44px;width:36px;background:linear-gradient(90deg,transparent,var(--bg));pointer-events:none}\
.dz .tabs.hs{margin:0}.dz .tabsw{margin:16px 0}\
.dz .kpi .n{display:flex;justify-content:space-between;gap:6px;align-items:flex-start}\
.dz .kpi .i{background:none;border:1px solid var(--line);color:var(--mut);border-radius:999px;width:18px;height:18px;font-size:11px;line-height:16px;padding:0;flex:none}\
.dz .kpi .h{display:none}.dz .kpi.showh .h{display:block}\
.dz .box{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:14px}\
.dz .box h3{margin-bottom:12px}.dz .box .grid .kpi{background:var(--card2)}\
.dz .cols{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))}.dz .cols>.box{margin-bottom:0}\
.dz .ccard:nth-child(odd){background:color-mix(in srgb,var(--tx) 3%,transparent)}.dz .ccard{padding:12px 10px;border-radius:10px;border-bottom:0}\
.dz tbody tr:nth-child(even) td{background:var(--card2)}\
.dz .hero-t{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);margin-bottom:6px}\
.dz.locked{min-height:420px}.dz.locked>:not(.lock){display:none}.dz.locked .lock{position:static;padding:60px 0;background:transparent}\
.dz .pills.scrollx{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.dz .pills.scrollx .pill{white-space:nowrap}\
@container (max-width:640px){.dz{padding:12px;font-size:13.5px}.dz h1{font-size:17px}.dz .hero{font-size:15.5px}\
.dz .grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.dz .grid.g2{grid-template-columns:1fr}\
.dz .kpi{padding:11px}.dz .kpi .v{font-size:18px}.dz .kpi .c{font-size:11px}\
.dz .ladder{grid-template-columns:1fr 1fr}.dz .card{padding:14px}.dz .vf .blk{min-width:0}.dz .vf .blk .x{font-size:17px}\
.dz .only-wide{display:none}.dz .only-narrow{display:block}.dz .vs .kpi .n{font-size:11.5px}.dz .cols{grid-template-columns:1fr}.dz .vs .kpi .v{font-size:17px}\
.dz .head .row{width:100%}.dz details.alert>summary{flex-direction:column;align-items:flex-start;gap:4px}.dz .bar select{flex:1}}\
';
  var st = document.getElementById('dz-style');
  if (!st) { st = document.createElement('style'); st.id = 'dz-style'; document.head.appendChild(st); }
  st.textContent = css;
}

function reportHeight() {
  try { window.parent && window.parent !== window && window.parent.postMessage({ type: 'dash-height', height: document.documentElement.scrollHeight }, '*'); } catch (e) {}
}

/* ============================== CSV ============================== */
function detectDelim(text) {
  var lines = text.split(/\r?\n/).slice(0, 8), best = ',', bestScore = -1;
  [',', ';', '\t'].forEach(function (d) {
    var counts = lines.map(function (l) { return l.split(d).length - 1; }).filter(function (n) { return n > 0; });
    var score = counts.length ? counts.reduce(function (a, b) { return a + b; }, 0) / counts.length : 0;
    if (score > bestScore) { bestScore = score; best = d; }
  });
  return best;
}
function csvRows(text, delim) {
  var rows = [], row = [], cell = '', q = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i], n = text[i + 1];
    if (q) { if (c === '"' && n === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && n === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
}

/* ============================== MAPA DE COLUNAS ============================== */
var NOT_COST = /custo|cost|costo|\bcpc\b|\bcpm\b|\bctr\b|taxa|tasa|\brate\b|\/ /;
var RULES = {
  date: { exact: ['dia', 'data', 'fecha', 'day', 'date', 'data real', 'created time', 'created_time', 'data de cadastro', 'data de inscricao', 'timestamp', 'horario de envio', 'submitted at'], re: [/^(dia|data|fecha|date|day)\b/, /created|timestamp|cadastro|inscri|envio/], not: [/atualiz|nascim/] },
  campaign: { exact: ['campanha', 'nome da campanha', 'campana', 'nombre de la campana', 'campaign', 'campaign name'], re: [/campanha|campana|campaign/], not: [/^id|\bid\b|tipo|objetiv|objective|status|estado|orcamento|budget/] },
  account: { exact: ['conta', 'nome da conta', 'nome da conta de anuncios', 'account', 'account name', 'cuenta', 'nombre de la cuenta'], re: [/nome da conta|account name|nombre de la cuenta/], not: [/\bid\b/] },
  objective: { exact: ['objetivo', 'objective', 'objetivo da campanha', 'objetivo de la campana'], re: [/^objetivo/, /objective/] },
  adset: { exact: ['nome do conjunto de anuncios', 'conjunto de anuncios', 'nombre del conjunto de anuncios', 'ad set name', 'grupo de anuncios'], re: [/conjunto de anuncio|ad set name|grupo de anuncio/], not: [/\bid\b/] },
  ad: { exact: ['nome do anuncio', 'anuncio', 'nombre del anuncio', 'ad name'], re: [/nome do anuncio|nombre del anuncio|^ad name$/], not: [/\bid\b/] },
  spend: { exact: ['valor gasto', 'valor gasto (brl)', 'valor gasto (ars)', 'valor usado', 'valor usado (brl)', 'importe gastado', 'importe gastado (ars)', 'amount spent', 'custo', 'cost', 'investimento', 'inversion'], re: [/^valor (gasto|usado)/, /^importe gastado/, /^custo$/, /^cost$/, /amount spent/, /^investimento$/], not: [/por |\/|cpc|cpm|conv|lead|resultado/] },
  impressions: { exact: ['impr', 'impr.', 'impressoes', 'impresiones', 'impressions'], re: [/^impr/, /impression/], not: [/%|ctr|custo|cost|cpm|taxa|parcela|share/] },
  clicks: { exact: ['cliques no link', 'clics en el enlace', 'link clicks', 'cliques', 'clics', 'clicks'], re: [/cliques no link|clics en el enlace|link clicks/, /^cliques/, /^clics/, /^clicks/], not: [/unicos|unique|ctr|custo|costo|cost|cpc|taxa|saida|outbound/] },
  reach: { exact: ['alcance', 'reach'], re: [/^alcance/, /^reach/], not: [/custo|cost|costo|por /] },
  frequency: { exact: ['frequencia', 'frecuencia', 'frequency'], re: [/^frequen|^frecuen/] },
  lpv: { exact: ['visualizacoes da pagina de destino', 'visualizaciones de la pagina de destino', 'landing page views'], re: [/pagina de destino|landing page view/], not: [NOT_COST] },
  conversations: { exact: ['conversas por mensagem iniciadas', 'conversas por mensagens iniciadas', 'conversas iniciadas por mensagem', 'conversas iniciadas por mensagens', 'conversas iniciadas', 'conversas', 'messaging conversations started', 'messaging conversation started', 'conversations started', 'conversaciones con mensajes iniciadas', 'conversaciones iniciadas'], re: [/\bconversas?\b|conversaciones|mensag|messaging conv/], not: [NOT_COST, /valor|value|compra|conversao|conversion/] },
  leads: { exact: ['leads', 'lead', 'cadastros', 'leads de formulario', 'leads no formulario', 'form leads', 'clientes potenciales', 'registros'], re: [/^leads?\b/, /cadastro/, /clientes? potencial/], not: [NOT_COST, /qualific|conversa|mensag/] },
  purchases: { exact: ['compras', 'purchases', 'conversoes', 'conversiones', 'conversions', 'conv.'], re: [/^compras$/, /^purchases$/, /^conversoes$/, /^conversiones$/, /^conversions$/, /^conv\.?$/], not: [NOT_COST, /valor|value|vista|view/] },
  revenue: { exact: ['valor conv', 'valor conv.', 'valor de conversao', 'valor de conversao da compra', 'valor de conversion de compras', 'conversion value', 'purchase conversion value', 'receita'], re: [/valor (de )?conv/, /conversion value/, /^receita$/], not: [/carrinho|carrito|cart|finaliza|checkout|\/ ?cust|\/ ?cost|por cust|pagina|page/] },
  cart: { exact: ['adicoes ao carrinho', 'articulos agregados al carrito', 'adds to cart', 'agregar al carrito'], re: [/carrinho|carrito|add to cart|adds to cart/], not: [/valor|custo|costo|cost|por /] },
  checkout: { exact: ['finalizacoes de compra iniciadas', 'pagos iniciados', 'checkouts initiated', 'inicio de pago'], re: [/finaliza|checkout|pagos iniciados/], not: [/valor|custo|costo|cost|por /] },
  views: { exact: ['media insights total views', 'total views', 'page insights media view', 'visualizacoes', 'visualizaciones', 'views', 'media insights views', 'impressoes do perfil'], re: [/total views|media view|^visualizac|^views$/], not: [/custo|cost|taxa|rate|skip/] },
  interactions: { exact: ['media insights total interactions', 'total interactions', 'page insights post engagements', 'action post engagement', 'post engagements', 'interacoes', 'interacciones', 'engajamento', 'engagement'], re: [/total interactions|post engagement|^interac|^engaj/], not: [/custo|cost|page engagement|taxa|rate/] },
  pageEng: { exact: ['action page engagement', 'page engagement', 'page insights engagement'], re: [/page engagement/], not: [/custo|cost|post/] },
  likes: { exact: ['media insights total likes', 'total likes', 'curtidas', 'me gusta', 'likes'], re: [/total likes|^curtidas|^likes$/], not: [/custo|cost|page like/] },
  comments: { exact: ['media insights total comments', 'total comments', 'action post comments', 'comentarios', 'comments'], re: [/total comments|post comments|^comentario|^comments$/], not: [/custo|cost/] },
  shares: { exact: ['media insights shares', 'shares', 'compartilhamentos', 'compartidos'], re: [/^shares$|compartilh|compartid/], not: [/custo|cost/] },
  saves: { exact: ['media insights saved', 'saved', 'saves', 'salvamentos', 'guardados', 'action post save (onsite conversion)', 'action post save'], re: [/^saved$|^saves$|salvament|guardado|post save/], not: [/custo|cost/] },
  followersNew: { exact: ['new followers (last 30 days only)', 'new followers', 'novos seguidores', 'seguidores ganhos', 'action page likes', 'page likes'], re: [/new followers|novos seguidores|seguidores ganhos|page likes/], not: [/custo|cost|total/] },
  followersTotal: { exact: ['total followers (all time)', 'total followers', 'page insights follows', 'seguidores', 'followers', 'follows'], re: [/total followers|page insights follows|^seguidores$|^followers$|^follows$/], not: [/custo|cost|new|novos|ganhos/] },
  convAction: { exact: ['acao de conversao', 'tipo de conversao', 'accion de conversion', 'tipo de conversion', 'conversion action', 'conversion type'], re: [/acao de conv|tipo de conv|accion de conv|conversion (action|type)/] }
};
// Ordem importa: valor de conversão e compras são resolvidos antes de conversas/cadastros
var MEDIA_FIELDS = ['date', 'campaign', 'account', 'objective', 'adset', 'ad', 'spend', 'impressions', 'clicks', 'reach', 'frequency', 'lpv', 'revenue', 'purchases', 'cart', 'checkout', 'conversations', 'leads'];
var NUM_FIELDS = ['spend', 'impressions', 'clicks', 'reach', 'frequency', 'lpv', 'conversations', 'leads', 'purchases', 'revenue', 'cart', 'checkout'];
/* Redes sociais: uma linha por dia. followersTotal é um retrato (não se soma),
   o resto são contagens do dia (somam). */
var SOC_FIELDS = ['views', 'interactions', 'pageEng', 'likes', 'comments', 'shares', 'saves', 'followersNew', 'followersTotal'];
var SOC_SUM = ['views', 'interactions', 'pageEng', 'likes', 'comments', 'shares', 'saves', 'followersNew'];

function mapColumns(header, wanted) {
  var normed = header.map(norm), map = {}, used = {};
  wanted.forEach(function (f) {
    var rule = RULES[f]; if (!rule) return;
    var idx = -1;
    for (var i = 0; i < rule.exact.length && idx < 0; i++) { var j = normed.indexOf(rule.exact[i]); if (j > -1 && !used[j]) idx = j; }
    if (idx < 0) for (var r = 0; r < rule.re.length && idx < 0; r++) {
      for (var k = 0; k < normed.length; k++) {
        if (used[k]) continue;
        if (rule.re[r].test(normed[k]) && !(rule.not || []).some(function (nr) { return nr.test(normed[k]); })) { idx = k; break; }
      }
    }
    if (idx > -1) { map[f] = idx; used[idx] = 1; }
  });
  return map;
}
function findHeaderRow(rows) {
  for (var i = 0; i < Math.min(rows.length, 12); i++) {
    var normed = rows[i].map(norm), filled = normed.filter(Boolean).length;
    if (filled >= 2 && normed.some(function (h) { return RULES.date.exact.indexOf(h) > -1 || /^(dia|data|fecha|date|day)\b|created|timestamp/.test(h); })) return i;
  }
  return 0;
}
/* "12.686" é ambíguo: pode ser doze mil e seiscentos em pt-BR ou doze vírgula
   seiscentos em inglês. Já "4272778.196689775" e "1.234.567,89" não deixam
   dúvida. Por isso a evidência inequívoca vale 4 e a ambígua vale 1: basta um
   punhado de números com muitas casas para decidir o arquivo inteiro. */
function detectLocale(values) {
  var comma = 0, dot = 0;
  values.forEach(function (v) {
    var s = String(v).replace(/[^\d,.\-]/g, '');
    if (!s || !/\d/.test(s)) return;
    if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(s)) { comma += 4; return; }   // 1.234.567,89
    if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(s)) { dot += 4; return; }     // 1,234,567.89
    if (/^-?\d+,\d{4,}$/.test(s)) { comma += 4; return; }               // 123,456789
    if (/^-?\d+\.\d{4,}$/.test(s)) { dot += 4; return; }                // 123.456789
    if (/^-?\d+,\d{1,2}$/.test(s)) { comma += 2; return; }              // 123,45
    if (/^-?\d+\.\d{1,2}$/.test(s)) { dot += 2; return; }               // 123.45
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) { comma += 1; return; }        // 12.686 (ambíguo)
    if (/^-?\d{1,3}(,\d{3})+$/.test(s)) { dot += 1; return; }           // 12,686 (ambíguo)
  });
  return comma > dot ? 'comma' : 'dot';
}
function makeNum(locale) {
  return function (v) {
    if (v == null) return 0;
    var s = String(v).trim(); if (!s || s === '-' || s === '--') return 0;
    s = s.replace(/[^\d,.\-]/g, '');
    if (locale === 'comma') s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/,/g, '');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  };
}

/* ============================== CLASSIFICAÇÃO POR OBJETIVO ============================== */
var FUNNEL_ORDER = ['vendas', 'cadastro', 'whatsapp', 'trafego', 'outros'];
function funnelFromText(t) {
  var n = norm(t);
  if (!n) return null;
  if (/whats|wpp|\bzap\b|mensag|messag|conversa|direct|\bdm\b|\bmsg\b/.test(n)) return 'whatsapp';
  if (/lead|cadastro|formul|potencial|registro|captac/.test(n)) return 'cadastro';
  if (/engag|engaj|interac|awareness|reconhec|alcance|reach|video|view|seguidor|perfil|brand|branding/.test(n)) return 'outros';
  if (/traffic|trafego|trafico|landing|visita/.test(n)) return 'trafego';
  if (/sales|\bvendas\b|\bventas\b|compras?\b|catalog|shopping|pmax|performance max|ecommerce|e-commerce|conversion|conversao|conversiones/.test(n)) return 'vendas';
  return null;
}
/* Funis que fazem sentido para este cliente: lista em DASH.funis, ou automático pelas colunas existentes. */
function allowedFunnels() {
  if (D.funis && D.funis.length) return D.funis.concat(['outros']);
  var a = ['cadastro', 'whatsapp', 'outros'];
  if (STATE.has.purchases) a.push('vendas');
  if (STATE.has.lpv) a.push('trafego');
  return a;
}
function classifyCampaigns(rows) {
  var agg = {};
  rows.forEach(function (r) {
    var k = r.key, a = agg[k] || (agg[k] = { campaign: r.campaign, platform: r.platform, objective: '', purchases: 0, leads: 0, conversations: 0, lpv: 0, clicks: 0, forced: r.forcedFunnel || null });
    a.purchases += r.purchases; a.leads += r.leads; a.conversations += r.conversations; a.lpv += r.lpv; a.clicks += r.clicks;
    if (r.objective) a.objective = r.objective;
  });
  var overrides = D.objetivos || {}, out = {}, allow = allowedFunnels();
  Object.keys(agg).forEach(function (k) {
    var a = agg[k], f = null, why = '';
    // 1) regra manual  2) fonte  3) resultado que a campanha gerou  4) nome  5) objetivo da planilha
    Object.keys(overrides).some(function (sub) { if (norm(a.campaign).indexOf(norm(sub)) > -1) { f = overrides[sub]; why = 'regra da configuração'; return true; } });
    if (!f && a.forced) { f = a.forced; why = 'definido na fonte'; }
    if (!f) {
      var res = [['vendas', a.purchases], ['cadastro', a.leads], ['whatsapp', a.conversations]].filter(function (x) { return allow.indexOf(x[0]) > -1; }).sort(function (x, y) { return y[1] - x[1]; });
      if (res.length && res[0][1] > 0) { f = res[0][0]; why = 'resultado gerado'; }
    }
    if (!f) { f = funnelFromText(a.campaign); if (f) why = 'nome da campanha'; }
    if (!f) { f = funnelFromText(a.objective); if (f) why = 'objetivo da campanha'; }
    if (!f) { f = a.lpv > 0 ? 'trafego' : 'outros'; why = 'sem resultado de conversão'; }
    if (allow.indexOf(f) < 0) { why += ' → ' + FNAME(f) + ' não se aplica a este cliente'; f = 'outros'; }
    out[k] = { funnel: f, why: why };
  });
  return out;
}

/* ============================== ESTADO ============================== */
var STATE = {
  sources: [], rows: [], crm: [], gconv: [], social: [], has: {}, hasSoc: {}, socRedes: {}, camp: {},
  preset: store.get('preset', 'mtd'), from: null, to: null, incToday: false,
  plat: 'all', acct: 'all', chartMetric: 'spend', sort: { col: 'spendNow', dir: -1 },
  loadedAt: null
};

/* ============================== PROCESSAMENTO POR FONTE ============================== */
function processMedia(src, text) {
  var st = src.status;
  var rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], map = mapColumns(header, MEDIA_FIELDS);
  st.headers = header; st.map = map; st.headerRow = h;
  var miss = ['date', 'campaign', 'spend'].filter(function (f) { return map[f] == null; });
  if (miss.length) { st.error = L('Colunas essenciais não encontradas: ', 'Columnas esenciales no encontradas: ') + miss.join(', '); return []; }
  var body = rows.slice(h + 1), sample = [];
  NUM_FIELDS.forEach(function (f) { if (map[f] != null) body.slice(0, 300).forEach(function (r) { if (r[map[f]]) sample.push(r[map[f]]); }); });
  st.locale = src.decimal || detectLocale(sample);
  var num = makeNum(st.locale), out = [], seen = {}, dup = 0, skipped = 0;
  var platform = src.plataforma || 'meta', have = {};
  NUM_FIELDS.forEach(function (f) { have[f] = map[f] != null; });
  if (src.conversaoComo === 'cadastro') { have.leads = have.leads || have.purchases; have.purchases = false; have.revenue = false; }
  body.forEach(function (r) {
    var date = parseDate(r[map.date]);
    if (!date) { skipped++; return; }
    var o = {
      date: date, platform: platform,
      account: (map.account != null && r[map.account]) ? String(r[map.account]).trim() : (src.conta || (platform === 'google' ? 'Google Ads' : 'Meta Ads')),
      campaign: String(r[map.campaign] || '(sem nome)').trim(),
      objective: map.objective != null ? String(r[map.objective] || '') : '',
      adset: map.adset != null ? String(r[map.adset] || '') : '',
      ad: map.ad != null ? String(r[map.ad] || '') : '',
      forcedFunnel: src.funil || null, _h: have
    };
    NUM_FIELDS.forEach(function (f) { o[f] = map[f] != null ? num(r[map[f]]) : 0; });
    if (src.conversaoComo === 'cadastro') { o.leads += o.purchases; o.purchases = 0; o.revenue = 0; }
    o.key = o.platform + '||' + o.account + '||' + o.campaign;
    var dk = [date, o.key, o.adset, o.ad].join('|'), sig = NUM_FIELDS.map(function (f) { return Math.round(o[f] * 100); }).join(',');
    if (seen[dk] === sig) { dup++; return; }
    seen[dk] = sig;
    out.push(o);
  });
  NUM_FIELDS.forEach(function (f) { if (map[f] != null) STATE.has[f] = true; });
  if (src.conversaoComo === 'cadastro' && map.purchases != null) STATE.has.leads = true;
  st.rows = out.length; st.dup = dup; st.skipped = skipped;
  return out;
}
var SALE_RE = /vend|vendid|fechad|ganh|\bwon\b|compr|contrat|matricul|cerrad|cliente fechado/;
var QUAL_RE = /qualific|visita|agend|proposta|negoci|oportun|reuni|atendid|interesse|calificad/;
function processCRM(src, text) {
  var st = src.status;
  var rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], normed = header.map(norm);
  var map = mapColumns(header, ['date']);
  /* O nome da coluna não basta: já apareceu planilha com "Data de entrada"
     totalmente vazia e a data real em "Data de qualificação". Aqui o motor
     testa quantas linhas cada coluna candidata consegue virar data de verdade
     e fica com a melhor. Sem isso, a fonte inteira sumiria em silêncio. */
  var amostra = rows.slice(h + 1, h + 400);
  function taxaData(idx) {
    if (idx == null || idx < 0) return 0;
    var vivos = 0, bons = 0;
    amostra.forEach(function (r) {
      var t = String(r[idx] == null ? '' : r[idx]).trim();
      if (!t) return;
      vivos++;
      if (parseDate(t)) bons++;
    });
    return amostra.length ? bons / amostra.length : 0;
  }
  if (src.colunaData) {
    var forc = normed.indexOf(norm(src.colunaData));
    if (forc > -1) map.date = forc;
  } else {
    var melhor = map.date, melhorTaxa = taxaData(map.date);
    if (melhorTaxa < 0.5) {
      header.forEach(function (_, j) {
        var t = taxaData(j);
        if (t > melhorTaxa + 0.05) { melhorTaxa = t; melhor = j; }
      });
      map.date = melhor;
    }
    st.dateScore = melhorTaxa;
  }
  st.dateCol = map.date != null && map.date > -1 ? header[map.date] : null;
  /* "Data de qualificação" contém "qualific" e era escolhida como coluna de
     status. Agora: primeiro quem tem "status" no nome, depois os outros termos,
     sempre descartando colunas de data. */
  var naoStatus = function (x) { return /^data|fecha|^date|horario|timestamp/.test(x); };
  var statusIdx = -1;
  if (src.colunaStatus) statusIdx = normed.indexOf(norm(src.colunaStatus));
  else {
    statusIdx = normed.findIndex(function (x) { return /status/.test(x) && !naoStatus(x); });
    if (statusIdx < 0) statusIdx = normed.findIndex(function (x) { return /etapa|situac|fase|stage|qualific|resultado/.test(x) && !naoStatus(x); });
  }
  // quando a própria planilha JÁ é a lista de qualificados (ou de vendas), não há
  // coluna de status: a etapa vem declarada na fonte
  var forcaQual = src.etapa === 'qualificado' || src.etapa === 'qual';
  var forcaVenda = src.etapa === 'venda' || src.etapa === 'vendido';
  var utmIdx = src.colunaCampanha ? normed.indexOf(norm(src.colunaCampanha)) : normed.findIndex(function (x) { return /utm[_ ]?campaign|utm[_ ]?campanha|^campanha$|^campaign$|origem da campanha/.test(x); });
  var valueIdx = src.colunaValor ? normed.indexOf(norm(src.colunaValor)) : normed.findIndex(function (x) { return /valor da venda|valor venda|receita|ticket|valor fechado/.test(x); });
  st.headers = header; st.map = { date: map.date, status: statusIdx > -1 ? statusIdx : undefined, value: valueIdx > -1 ? valueIdx : undefined }; st.headerRow = h;
  if (map.date == null) { st.error = L('Nenhuma coluna de data encontrada.', 'No se encontró columna de fecha.'); return []; }
  var sampleC = [];
  rows.slice(h + 1, h + 200).forEach(function (r) { r.forEach(function (cell) { if (cell) sampleC.push(cell); }); });
  var num = makeNum(src.decimal === 'comma' || src.decimal === 'dot' ? src.decimal : detectLocale(sampleC));
  var out = [];
  rows.slice(h + 1).forEach(function (r) {
    var d = parseDate(r[map.date]); if (!d) return;
    var s = statusIdx > -1 ? norm(r[statusIdx]) : '';
    var sale = forcaVenda || (statusIdx > -1 && SALE_RE.test(s));
    var qual = sale || forcaQual || (statusIdx > -1 && QUAL_RE.test(s));
    var raw = {}; header.forEach(function (hh, j) { raw[hh] = r[j] == null ? '' : r[j]; });
    out.push({ date: d, funnel: src.funil || 'cadastro', sale: sale, qual: qual, value: (sale && valueIdx > -1) ? num(r[valueIdx]) : 0, status: statusIdx > -1 ? String(r[statusIdx]).trim() : '', utm: (utmIdx > -1 && !valorVazio(r[utmIdx])) ? String(r[utmIdx]).trim() : '', etapa: src.etapa || '', raw: raw, src: src.nome || '' });
  });
  st.rows = out.length; st.hasStatus = statusIdx > -1 || forcaQual || forcaVenda;
  st.map.campanha = utmIdx > -1 ? utmIdx : undefined;
  st.etapa = src.etapa || '';
  return out;
}
function processGConv(src, text) {
  var st = src.status, rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], map = mapColumns(header, ['date', 'campaign', 'convAction', 'purchases', 'revenue']);
  st.headers = header; st.map = map; st.headerRow = h;
  if (map.date == null || map.convAction == null) { st.error = L('Faltam colunas de data ou ação de conversão.', 'Faltan columnas de fecha o acción de conversión.'); return []; }
  var body = rows.slice(h + 1), num = makeNum(detectLocale(body.slice(0, 300).map(function (r) { return r[map.purchases]; })));
  var out = [], seen = {}, dup = 0;
  body.forEach(function (r) {
    var d = parseDate(r[map.date]); if (!d) return;
    var o = { date: d, campaign: map.campaign != null ? String(r[map.campaign] || '').trim() : '', action: String(r[map.convAction] || '—').trim(), conv: map.purchases != null ? num(r[map.purchases]) : 0, value: map.revenue != null ? num(r[map.revenue]) : 0 };
    // mesma dedupe da mídia: planilha que soma em vez de substituir dobra os números
    var dk = [o.date, o.campaign, o.action].join('|'), sig = Math.round(o.conv * 100) + ',' + Math.round(o.value * 100);
    if (seen[dk] === sig) { dup++; return; }
    seen[dk] = sig;
    out.push(o);
  });
  st.rows = out.length; st.dup = dup;
  return out;
}

/* ============================== REDES SOCIAIS ============================== */
function processSocial(src, text) {
  var st = src.status, rows = csvRows(text, detectDelim(text));
  if (!rows.length) { st.error = L('Planilha vazia.', 'Planilla vacía.'); return []; }
  var h = findHeaderRow(rows), header = rows[h], map = mapColumns(header, ['date'].concat(SOC_FIELDS));
  st.headers = header; st.map = map; st.headerRow = h;
  if (map.date == null) { st.error = L('Não encontrei a coluna de data.', 'No encontré la columna de fecha.'); return []; }

  var body = rows.slice(h + 1), sample = [];
  SOC_FIELDS.forEach(function (f) { if (map[f] != null) body.slice(0, 300).forEach(function (r) { if (r[map[f]]) sample.push(r[map[f]]); }); });
  var loc = src.decimal === 'comma' || src.decimal === 'dot' ? src.decimal : detectLocale(sample);
  st.locale = loc;
  var num = makeNum(loc);

  var origem = src.origem || (src.tipo === 'engajamento' ? 'pago' : 'organico');
  var rede = norm(src.rede || (origem === 'pago' ? 'meta' : '')) || 'rede';
  var byDate = {}, dup = 0;

  body.forEach(function (r) {
    var d = parseDate(r[map.date]); if (!d) return;
    var o = { date: d, rede: rede, origem: origem, fonte: src.nome || src.rede || src.tipo };
    SOC_FIELDS.forEach(function (f) { o[f] = map[f] != null ? num(r[map[f]]) : null; });
    // sem coluna de total, engajamento é a soma das partes que existirem
    if (o.interactions == null) {
      var partes = ['likes', 'comments', 'shares', 'saves'].filter(function (f) { return ok(o[f]); });
      if (partes.length) o.interactions = partes.reduce(function (a, f) { return a + o[f]; }, 0);
    }
    // uma linha por dia por fonte: se vier repetida (planilha que sobrescreve
    // em vez de substituir), a última vence e a anterior é contada como duplicata
    if (byDate[d]) dup++;
    byDate[d] = o;
  });

  var out = Object.keys(byDate).sort().map(function (k) { return byDate[k]; });
  // o campo de total de seguidores às vezes vem congelado (a extração repete o
  // total de hoje em todas as linhas). Nesse caso ele só serve como retrato.
  var tots = out.map(function (x) { return x.followersTotal; }).filter(function (v) { return v != null && v > 0; });
  st.followersFrozen = tots.length > 2 && tots.every(function (v) { return v === tots[0]; });
  st.rows = out.length; st.dup = dup; st.origem = origem; st.rede = rede;
  SOC_FIELDS.forEach(function (f) { if (map[f] != null) STATE.hasSoc[f] = true; });
  if (out.length && out.some(function (x) { return ok(x.interactions); })) STATE.hasSoc.interactions = true;
  if (out.length) STATE.socRedes[rede] = true;
  return out;
}
function socIn(from, to, filter) {
  return STATE.social.filter(function (r) { return inRange(r.date, from, to) && (!filter || filter(r)); });
}
function socAgg(rows) {
  var o = { n: rows.length };
  SOC_SUM.forEach(function (f) { o[f] = 0; });
  var lastTot = {};
  rows.forEach(function (r) {
    SOC_SUM.forEach(function (f) { if (ok(r[f])) o[f] += r[f]; });
    if (ok(r.followersTotal) && r.followersTotal > 0) lastTot[r.rede] = r.followersTotal;
  });
  o.followersTotal = Object.keys(lastTot).reduce(function (a, k) { return a + lastTot[k]; }, 0);
  return o;
}
/** Ganho de seguidores: usa o campo diário quando existe; senão, a diferença do retrato. */
function followersGain(rede, from, to) {
  var rows = socIn(from, to, function (r) { return r.rede === rede; });
  if (!rows.length) return null;
  var hasNew = rows.some(function (r) { return ok(r.followersNew); });
  if (hasNew) return rows.reduce(function (a, r) { return a + (ok(r.followersNew) ? r.followersNew : 0); }, 0);
  var tot = rows.filter(function (r) { return ok(r.followersTotal) && r.followersTotal > 0; });
  if (tot.length < 2) return null;
  var d = tot[tot.length - 1].followersTotal - tot[0].followersTotal;
  return d;
}
function hasSocial() { return STATE.social.length > 0; }

/* ============================== CARREGAMENTO ============================== */
function initSources() {
  STATE.sources = (D.fontes || []).map(function (f, i) {
    var tipo = f.tipo || (f.plataforma ? 'midia' : 'crm');
    return Object.assign({}, f, { id: 'f' + i, tipo: tipo, status: {} });
  });
}
function fetchText(url) {
  var u = url + (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now();
  return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
}
function loadAll() {
  STATE.rows = []; STATE.crm = []; STATE.gconv = []; STATE.social = []; STATE.has = {}; STATE.hasSoc = {}; STATE.socRedes = {};
  return Promise.all(STATE.sources.map(function (src) {
    src.status = {};
    var pasted = store.get('paste_' + src.id, '');
    var p = pasted ? Promise.resolve(pasted).then(function (t) { src.status.fromPaste = true; return t; }) : fetchText(src.url);
    return p.then(function (text) {
      if (src.tipo === 'midia') STATE.rows = STATE.rows.concat(processMedia(src, text));
      else if (src.tipo === 'conversoes_google') STATE.gconv = STATE.gconv.concat(processGConv(src, text));
      else if (src.tipo === 'social' || src.tipo === 'engajamento') STATE.social = STATE.social.concat(processSocial(src, text));
      else STATE.crm = STATE.crm.concat(processCRM(src, text));
      src.status.ok = !src.status.error;
    }).catch(function (e) { src.status.ok = false; src.status.error = L('Não foi possível ler a planilha publicada: ', 'No se pudo leer la planilla publicada: ') + e.message; });
  })).then(function () {
    STATE.camp = classifyCampaigns(STATE.rows);
    STATE.rows.forEach(function (r) { r.funnel = STATE.camp[r.key].funnel; });
    STATE.loadedAt = new Date();
  });
}

/* ============================== AGREGAÇÃO ============================== */
function blank() { var o = { n: 0, freqW: 0, freqImpr: 0 }; NUM_FIELDS.forEach(function (f) { o[f] = 0; }); return o; }
function agg(rows) {
  var s = blank();
  rows.forEach(function (r) {
    NUM_FIELDS.forEach(function (f) { if (f !== 'frequency') s[f] += r[f]; });
    if (r.frequency > 0) { s.freqW += r.frequency * r.impressions; s.freqImpr += r.impressions; }
    s.n++;
  });
  s.freq = s.freqImpr > 0 ? s.freqW / s.freqImpr : null;
  s.ctr = s.impressions > 0 ? s.clicks / s.impressions : null;
  s.cpm = s.impressions > 0 ? s.spend / s.impressions * 1000 : null;
  s.cpc = s.clicks > 0 ? s.spend / s.clicks : null;
  s.roas = s.spend > 0 && s.revenue > 0 ? s.revenue / s.spend : null;
  return s;
}
function inRange(d, from, to) { return d >= from && d <= to; }
function filtered(from, to, extra) {
  return STATE.rows.filter(function (r) {
    return inRange(r.date, from, to) && (STATE.plat === 'all' || r.platform === STATE.plat) && (STATE.acct === 'all' || r.account === STATE.acct) && (!extra || extra(r));
  });
}
function crmIn(from, to, funnel) { return STATE.crm.filter(function (c) { return inRange(c.date, from, to) && (!funnel || c.funnel === funnel); }); }
function funnelsPresent() {
  var per = resolvePeriod(), set = {};
  STATE.rows.forEach(function (r) {
    if ((STATE.plat !== 'all' && r.platform !== STATE.plat) || (STATE.acct !== 'all' && r.account !== STATE.acct)) return;
    if (r.spend > 0 && (inRange(r.date, per.from, per.to) || inRange(r.date, per.pFrom, per.pTo))) set[r.funnel] = 1;
  });
  return FUNNEL_ORDER.filter(function (f) { return set[f]; });
}

/* ============================== PERÍODOS ============================== */
function lastDataDate() { var m = ''; STATE.rows.forEach(function (r) { if (r.date > m) m = r.date; }); return m || null; }
function resolvePeriod() {
  var today = todayISO(), end = STATE.incToday ? today : addDays(today, -1), p = STATE.preset, from, to, pFrom, pTo;
  if (p === 'custom' && STATE.from && STATE.to) { from = STATE.from; to = STATE.to; var n = daysBetween(from, to) + 1; pTo = addDays(from, -1); pFrom = addDays(pTo, -(n - 1)); }
  else if (p === 'mtd') { from = monthStart(today); to = end < from ? from : end; pFrom = prevMonthStart(today); pTo = addDays(from, -1); }
  else if (p === 'lastmonth') { to = addDays(monthStart(today), -1); from = monthStart(to); pTo = addDays(from, -1); pFrom = monthStart(pTo); }
  else { var len = parseInt(p, 10) || 30; to = end; from = addDays(to, -(len - 1)); pTo = addDays(from, -1); pFrom = addDays(pTo, -(len - 1)); }
  return { from: from, to: to, pFrom: pFrom, pTo: pTo, len: daysBetween(from, to) + 1, pLen: daysBetween(pFrom, pTo) + 1, isMtd: p === 'mtd' };
}
function daySeries(from, to, extra) {
  var map = {}, out = [];
  filtered(from, to, extra).forEach(function (r) { (map[r.date] = map[r.date] || []).push(r); });
  for (var d = from; d <= to; d = addDays(d, 1)) out.push({ date: d, s: agg(map[d] || []) });
  return out;
}

/* ============================== FUNIS ============================== */
function FNAME(f) {
  return {
    vendas: L('Vendas no site', 'Ventas en el sitio'), cadastro: L('Cadastros', 'Registros'), whatsapp: 'WhatsApp',
    trafego: L('Tráfego para o site', 'Tráfico al sitio'), outros: L('Alcance e engajamento', 'Alcance e interacción')
  }[f] || f;
}
function RESULT(f) {
  return { vendas: 'purchases', cadastro: 'leads', whatsapp: 'conversations', trafego: 'lpv', outros: null }[f];
}
function RNAME(f, plural) {
  var n = { vendas: [L('compra', 'compra'), L('compras', 'compras')], cadastro: [L('cadastro', 'registro'), L('cadastros', 'registros')], whatsapp: [L('conversa', 'conversación'), L('conversas', 'conversaciones')], trafego: [L('visita', 'visita'), L('visitas', 'visitas')] }[f];
  return n ? n[plural === false ? 0 : 1] : L('resultados', 'resultados');
}
/* Referências de mercado (Meta). Faixas amplas, servem de sanidade — o histórico da conta vale mais. */
var BENCH = {
  ctr: [0.01, 0.02], lpvRate: [0.70, 0.85], cartRate: [0.04, 0.10], chkRate: [0.45, 0.70], buyRate: [0.30, 0.50],
  qualRate: [0.15, 0.30], saleRate: [0.15, 0.30]
};

/* Monta as etapas de um funil com números do período atual e anterior. */
function buildFunnel(f, per, camp) {
  var ext = function (r) { return r.funnel === f && (!camp || r.key === camp); };
  var cur = agg(filtered(per.from, per.to, ext)), prev = agg(filtered(per.pFrom, per.pTo, ext));
  var crmSrc = STATE.sources.some(function (s) { return s.tipo === 'crm' && (s.funil || 'cadastro') === f; });
  var crmStatus = STATE.sources.some(function (s) { return s.tipo === 'crm' && (s.funil || 'cadastro') === f && s.status.hasStatus; });
  /* Com uma campanha selecionada, os contatos só entram se a UTM registrada
     no cadastro bater com o nome dela. Quem chegou sem UTM não é atribuível a
     campanha nenhuma e fica de fora, por isso a ressalva no cabeçalho. */
  var nomeCamp = camp && STATE.camp[camp] ? norm(camp.split('||')[2] || '') : '';
  var casaUtm = function (x) {
    if (!camp) return true;
    var u = norm(x.utm || '');
    if (!u || !nomeCamp) return false;
    return u === nomeCamp || u.indexOf(nomeCamp) > -1 || nomeCamp.indexOf(u) > -1;
  };
  var cc = crmIn(per.from, per.to, f).filter(casaUtm), cp = crmIn(per.pFrom, per.pTo, f).filter(casaUtm);
  var crmCur = { n: cc.length, qual: cc.filter(function (x) { return x.qual; }).length, sale: cc.filter(function (x) { return x.sale; }).length, value: cc.reduce(function (a, x) { return a + x.value; }, 0) };
  var crmPrev = { n: cp.length, qual: cp.filter(function (x) { return x.qual; }).length, sale: cp.filter(function (x) { return x.sale; }).length, value: cp.reduce(function (a, x) { return a + x.value; }, 0) };
  var useLpv = STATE.has.lpv && cur.lpv + prev.lpv > 0 && (f === 'vendas' || f === 'trafego' || (f === 'cadastro' && cur.lpv > 0));
  var S = [];
  function st(key, label, c, p, from, bench, extra) { S.push(Object.assign({ key: key, label: label, cur: c, prev: p, from: from, bench: bench || null }, extra || {})); }
  st('impressions', L('Aparições do anúncio', 'Apariciones del anuncio'), cur.impressions, prev.impressions, null);
  st('clicks', L('Cliques', 'Clics'), cur.clicks, prev.clicks, 'impressions', f === 'outros' ? null : BENCH.ctr, { rateKey: 'ctr' });
  if (useLpv) st('lpv', L('Chegaram na página', 'Llegaron a la página'), cur.lpv, prev.lpv, 'clicks', BENCH.lpvRate, { rateKey: 'lpv' });
  var base = useLpv ? 'lpv' : 'clicks';
  if (f === 'vendas') {
    if (STATE.has.cart) st('cart', L('Colocaram no carrinho', 'Agregaron al carrito'), cur.cart, prev.cart, base, useLpv ? BENCH.cartRate : null, { rateKey: 'cart' });
    if (STATE.has.checkout) st('checkout', L('Foram para o pagamento', 'Fueron al pago'), cur.checkout, prev.checkout, STATE.has.cart ? 'cart' : base, STATE.has.cart ? BENCH.chkRate : null, { rateKey: 'checkout' });
    st('purchases', L('Compraram', 'Compraron'), cur.purchases, prev.purchases, STATE.has.checkout ? 'checkout' : (STATE.has.cart ? 'cart' : base), STATE.has.checkout ? BENCH.buyRate : null, { rateKey: 'purchases', final: true, sale: true });
  } else if (f === 'cadastro') {
    st('leads', L('Preencheram o formulário', 'Completaron el formulario'), cur.leads, prev.leads, base, null, { rateKey: 'leads', final: true });
  } else if (f === 'whatsapp') {
    st('conversations', L('Chamaram no WhatsApp', 'Escribieron por WhatsApp'), cur.conversations, prev.conversations, base, null, { rateKey: 'conversations', final: true });
  }
  var resKey = RESULT(f);
  if (f === 'cadastro' || f === 'whatsapp') {
    if (crmSrc) st('crm', L('Chegaram ao comercial', 'Llegaron a ventas'), crmCur.n, crmPrev.n, resKey, null, { rateKey: 'crm' });
    else st('crm', L('Chegaram ao comercial', 'Llegaron a ventas'), null, null, resKey, null, { missing: 'crm' });
    if (crmStatus) {
      var fonteQual = STATE.sources.filter(function (x) { return x.tipo === 'crm' && x.status && x.status.etapa; })[0];
      st('qual', L('Qualificados', 'Calificados') + (fonteQual ? nota(L('Os qualificados vêm de uma lista própria (', 'Los calificados vienen de una lista propia (') + esc(fonteQual.nome || fonteQual.etapa) + L('), separada da lista de cadastros. Se um contato qualificado não estiver também na lista de cadastros, a taxa de passagem entre as duas etapas fica subestimada.', '), separada de la lista de registros. Si un contacto calificado no está también en la lista de registros, la tasa de paso entre las dos etapas queda subestimada.')) : ''), crmCur.qual, crmPrev.qual, 'crm', BENCH.qualRate, { rateKey: 'qual' });
      st('sale', L('Compraram', 'Compraron'), crmCur.sale, crmPrev.sale, 'qual', BENCH.saleRate, { rateKey: 'sale', sale: true });
    } else {
      st('qual', L('Qualificados', 'Calificados'), null, null, 'crm', null, { missing: 'qual' });
      st('sale', L('Compraram', 'Compraron'), null, null, 'qual', null, { missing: 'sale' });
    }
  }
  var byKey = {}; S.forEach(function (s) { byKey[s.key] = s; });
  var curRows = filtered(per.from, per.to, ext), prevRows = filtered(per.pFrom, per.pTo, ext);
  // Taxa entre duas etapas só usa linhas de fontes que medem AS DUAS etapas
  // (ex: Google sem "visitas à página" não entra no cálculo clique → visita).
  function pairRate(rows, k, b) {
    var num = 0, den = 0;
    rows.forEach(function (r) { if (r._h[k] && r._h[b]) { num += r[k]; den += r[b]; } });
    return { rate: den > 0 ? num / den : null, base: den };
  }
  var MEDIA_KEYS = { impressions: 1, clicks: 1, lpv: 1, cart: 1, checkout: 1, purchases: 1, leads: 1, conversations: 1 };
  S.forEach(function (s) {
    var b = s.from && byKey[s.from];
    if (b && MEDIA_KEYS[s.key] && MEDIA_KEYS[b.key]) {
      var c = pairRate(curRows, s.key, b.key), p = pairRate(prevRows, s.key, b.key);
      s.rate = c.rate; s.pRate = p.rate; s.base = c.base; s.pBase = p.base;
    } else {
      s.rate = b && ok(s.cur) && b.cur > 0 ? s.cur / b.cur : null;
      s.pRate = b && ok(s.prev) && b.prev > 0 ? s.prev / b.prev : null;
      s.base = b ? b.cur : null; s.pBase = b ? b.prev : null;
    }
  });
  var level = 1;
  if (resKey && cur[resKey] + prev[resKey] > 0) level = 2;
  if (crmSrc && (f === 'cadastro' || f === 'whatsapp')) level = 3;
  if (f === 'vendas' && cur.purchases + prev.purchases > 0) level = 4;
  if (crmStatus && crmCur.sale + crmPrev.sale > 0) level = 4;
  var salesReal = f === 'vendas' ? cur.purchases : (crmStatus ? crmCur.sale : null);
  var revenueReal = f === 'vendas' ? (cur.revenue || null) : (crmStatus && crmCur.value ? crmCur.value : null);
  return { f: f, cur: cur, prev: prev, stages: S, by: byKey, level: level, crmSrc: crmSrc, crmStatus: crmStatus, crmCur: crmCur, crmPrev: crmPrev, resKey: resKey, salesReal: salesReal, revenueReal: revenueReal };
}

/* ============================== RECOMENDAÇÕES POR ETAPA ============================== */
function REC(key) {
  return ({
    ctr: L('Teste ganchos novos nos 3 primeiros segundos, deixe a oferta explícita no primeiro quadro e renove criativos que estão rodando há muito tempo.', 'Probá ganchos nuevos en los primeros 3 segundos, dejá la oferta explícita en el primer cuadro y renová creativos que llevan mucho tiempo activos.'),
    lpv: L('Muitos cliques não viram visita: confira a velocidade da página no celular e se o link leva ao lugar certo.', 'Muchos clics no llegan a la página: revisá la velocidad en el celular y que el enlace lleve al lugar correcto.'),
    cart: L('Quem chega não adiciona ao carrinho: alinhe anúncio e página (mesmo produto e oferta), reveja preço, fotos e prova social.', 'Quien llega no agrega al carrito: alineá anuncio y página (mismo producto y oferta), revisá precio, fotos y prueba social.'),
    checkout: L('Carrinho abandonado costuma ser frete, prazo ou custo surpresa: mostre o frete cedo e simplifique o carrinho.', 'El carrito abandonado suele ser envío, plazo o costo sorpresa: mostrá el envío antes y simplificá el carrito.'),
    purchases: L('Checkout que não fecha: meios de pagamento, parcelamento, erros no formulário e selos de confiança.', 'Pago que no se concreta: medios de pago, cuotas, errores en el formulario y sellos de confianza.'),
    leads: L('Poucos cadastros por clique: reduza campos do formulário e deixe a promessa clara na tela do formulário.', 'Pocos registros por clic: reducí campos del formulario y dejá clara la promesa en la pantalla del formulario.'),
    conversations: L('Cliques que não viram conversa: revise a mensagem pré-preenchida, o botão e o horário de atendimento.', 'Clics que no se convierten en conversación: revisá el mensaje prellenado, el botón y el horario de atención.'),
    crm: L('Cadastros da plataforma que não chegam ao CRM: confira a integração ou a planilha de leads. Lead que não chega ao comercial é verba perdida.', 'Registros que no llegan al CRM: revisá la integración o la planilla de leads. Un lead que no llega a ventas es inversión perdida.'),
    qual: L('Poucos qualificados: ajuste público e mensagem do anúncio para filtrar melhor antes do cadastro.', 'Pocos calificados: ajustá público y mensaje del anuncio para filtrar mejor antes del registro.'),
    sale: L('Qualificados que não compram: tempo de resposta do comercial e follow-up costumam ser os maiores fatores.', 'Calificados que no compran: el tiempo de respuesta de ventas y el seguimiento suelen ser los factores principales.')
  })[key] || '';
}

/* ============================== INSIGHTS ============================== */
function insights(per) {
  var out = [], fs = funnelsPresent();
  fs.forEach(function (f) {
    if (f === 'outros') return;
    var F = buildFunnel(f, per), name = FNAME(f);
    var finalStage = F.stages.filter(function (s) { return s.final; })[0];
    // 1) maior gargalo: etapa cuja taxa abaixo da referência mais custa em resultado final
    var best = null;
    F.stages.forEach(function (s) {
      if (s.rate == null || s.missing || !finalStage) return;
      var minBase = s.key === 'clicks' ? 2000 : 30;
      if ((s.base || 0) < minBase) return;
      var refs = [];
      if (s.pRate != null && (s.pBase || 0) >= minBase) refs.push({ v: s.pRate, src: L('seu período anterior', 'tu período anterior') });
      if (s.bench) refs.push({ v: s.bench[0], src: L('o piso da referência de mercado', 'el piso de referencia del mercado') });
      refs.forEach(function (ref) {
        if (s.rate >= ref.v) return;
        var chainIdx = F.stages.indexOf(s), finIdx = F.stages.indexOf(finalStage);
        if (chainIdx > finIdx) return;
        var gain = (finalStage.cur || 0) * (ref.v / s.rate - 1);
        if (!best || gain > best.gain) best = { s: s, ref: ref, gain: gain };
      });
    });
    if (best && best.gain >= 1) {
      out.push({ t: 'att', f: f, prio: 3,
        title: name + ': ' + L('maior perda na etapa “', 'mayor pérdida en la etapa “') + best.s.label + '”',
        body: L('A taxa até esta etapa está em ', 'La tasa hasta esta etapa está en ') + pctf(best.s.rate) + L(', contra ', ', contra ') + pctf(best.ref.v) + L(' em ', ' en ') + best.ref.src + '. ' +
          L('Se voltasse a esse nível, seriam cerca de ', 'Si volviera a ese nivel, serían cerca de ') + count(Math.round(best.gain)) + ' ' + RNAME(f) + L(' a mais no período.', ' más en el período.'),
        act: REC(best.s.rateKey || best.s.key) });
    }
    // 2) variações relevantes etapa a etapa
    F.stages.forEach(function (s) {
      if (s.missing || s.rate == null || s.pRate == null || s === (best && best.s)) return;
      var minBase = s.key === 'clicks' ? 2000 : 30;
      if ((s.base || 0) < minBase || (s.pBase || 0) < minBase) return;
      var d = (s.rate - s.pRate) / s.pRate;
      if (d <= -0.2) out.push({ t: 'att', f: f, prio: 2, title: name + ': ' + L('etapa “', 'etapa “') + s.label + L('” caiu ', '” cayó ') + nf(Math.abs(d) * 100, 0) + '%', body: L('Taxa foi de ', 'La tasa pasó de ') + pctf(s.pRate) + L(' para ', ' a ') + pctf(s.rate) + L(' em relação à etapa anterior.', ' respecto a la etapa anterior.'), act: REC(s.rateKey || s.key) });
      else if (d >= 0.2) out.push({ t: 'pos', f: f, prio: 1, title: name + ': ' + L('etapa “', 'etapa “') + s.label + L('” melhorou ', '” mejoró ') + nf(d * 100, 0) + '%', body: L('Taxa foi de ', 'La tasa pasó de ') + pctf(s.pRate) + L(' para ', ' a ') + pctf(s.rate) + '.' });
    });
    // 3) custo por resultado
    if (F.resKey) {
      var cpr = F.cur[F.resKey] > 0 ? F.cur.spend / F.cur[F.resKey] : null, ppr = F.prev[F.resKey] > 0 ? F.prev.spend / F.prev[F.resKey] : null;
      var dc = deltaTxt(cpr, ppr);
      if (dc && dc.v <= -0.1) out.push({ t: 'pos', f: f, prio: 2, title: name + ': ' + L('custo por ', 'costo por ') + RNAME(f, false) + L(' caiu ', ' bajó ') + nf(Math.abs(dc.v) * 100, 0) + '%', body: money(ppr) + ' → ' + money(cpr) + '.' });
      if (dc && dc.v >= 0.15) out.push({ t: 'att', f: f, prio: 2, title: name + ': ' + L('custo por ', 'costo por ') + RNAME(f, false) + L(' subiu ', ' subió ') + nf(dc.v * 100, 0) + '%', body: money(ppr) + ' → ' + money(cpr) + '. ' + L('Veja no funil qual etapa puxou o custo.', 'Mirá en el embudo qué etapa empujó el costo.') });
    }
    // 4) fadiga: frequência subindo com CTR caindo
    if (F.cur.freq && F.prev.freq && F.cur.ctr && F.prev.ctr && F.cur.impressions > 5000) {
      var df = (F.cur.freq - F.prev.freq) / F.prev.freq, dctr = (F.cur.ctr - F.prev.ctr) / F.prev.ctr;
      if (df > 0.15 && dctr < -0.1) out.push({ t: 'att', f: f, prio: 3, title: name + ': ' + L('sinal de fadiga de criativo', 'señal de fatiga de creativos'), body: L('Frequência subiu ', 'La frecuencia subió ') + nf(df * 100, 0) + L('% e o CTR caiu ', '% y el CTR bajó ') + nf(Math.abs(dctr) * 100, 0) + L('%: o mesmo público está vendo os mesmos anúncios.', '%: el mismo público ve los mismos anuncios.'), act: L('Renove criativos e, se possível, amplie o público.', 'Renová creativos y, si es posible, ampliá el público.') });
    }
    // 5) CPM subindo
    if (F.cur.cpm && F.prev.cpm && F.cur.impressions > 5000) {
      var dm = (F.cur.cpm - F.prev.cpm) / F.prev.cpm;
      if (dm > 0.25) out.push({ t: 'att', f: f, prio: 1, title: name + ': ' + L('CPM subiu ', 'el CPM subió ') + nf(dm * 100, 0) + '%', body: money(F.prev.cpm) + ' → ' + money(F.cur.cpm) + L(' por mil impressões.', ' por mil impresiones.'), act: L('Pode ser concorrência sazonal ou público saturado. Teste públicos mais amplos e reveja sobreposição entre conjuntos.', 'Puede ser competencia estacional o público saturado. Probá públicos más amplios y revisá superposición entre conjuntos.') });
    }
    // 6) dado que falta (didático)
    if ((f === 'cadastro' || f === 'whatsapp') && F.level < 4 && F.cur[F.resKey] > 0) {
      out.push({ t: 'dado', f: f, prio: 2, title: name + ': ' + L('sem saber quais ', 'sin saber qué ') + RNAME(f) + L(' viraram venda', ' se convirtieron en venta'),
        body: count(F.cur[F.resKey]) + ' ' + RNAME(f) + L(' no período. Sem o registro do comercial, não é possível dizer se esta campanha dá lucro — só quanto custa cada contato.', ' en el período. Sin el registro de ventas, no se puede saber si esta campaña da ganancia — solo cuánto cuesta cada contacto.'),
        act: L('Uma planilha simples (data, nome, status) já libera custo por venda e retorno real. Veja a simulação no Simulador.', 'Una planilla simple (fecha, nombre, estado) ya habilita costo por venta y retorno real. Mirá la simulación en el Simulador.') });
    }
  });
  // 7) campanhas com verba e sem resultado
  var per2 = per, byC = {};
  filtered(per2.from, per2.to).forEach(function (r) {
    if (r.funnel === 'outros' || r.funnel === 'trafego') return;
    var k = r.key, c = byC[k] || (byC[k] = { name: r.campaign, f: r.funnel, spend: 0, res: 0 });
    c.spend += r.spend; c.res += r[RESULT(r.funnel)] || 0;
  });
  // 8) o que foi bem: resultado, custo e melhor campanha
  fs.forEach(function (f) {
    if (f === 'outros' || f === 'trafego') return;
    var F = buildFunnel(f, per), rk = F.resKey; if (!rk) return;
    var c = F.cur[rk], pv = F.prev[rk], nm = FNAME(f);
    var dr = deltaTxt(c, pv);
    if (dr && dr.v >= 0.1 && c >= 3) out.push({ t: 'pos', f: f, prio: 4,
      title: nm + ': ' + cap(RNAME(f)) + L(' cresceram ', ' crecieron ') + nf(dr.v * 100, 0) + '%',
      body: count(pv) + ' → ' + count(c) + L(' no mesmo número de dias.', ' en la misma cantidad de días.') });
    if (f === 'vendas' && F.cur.revenue > 0 && F.prev.revenue > 0) {
      var dv = deltaTxt(F.cur.revenue, F.prev.revenue);
      if (dv && dv.v >= 0.05) out.push({ t: 'pos', f: f, prio: 5, title: L('Faturamento cresceu ', 'La facturación creció ') + nf(dv.v * 100, 0) + '%', body: money(F.prev.revenue) + ' → ' + money(F.cur.revenue) + (ok(F.cur.roas) ? L('. Cada ', '. Cada ') + money(1) + L(' investido devolveu ', ' invertido devolvió ') + money(F.cur.roas) + '.' : '.') });
    }
    // melhor campanha do funil pelo custo por resultado
    var m = {};
    filtered(per.from, per.to, function (r) { return r.funnel === f; }).forEach(function (r) { var x = m[r.key] || (m[r.key] = { name: r.campaign, spend: 0, res: 0 }); x.spend += r.spend; x.res += r[rk] || 0; });
    var tot = Object.keys(m).reduce(function (a, k) { return a + m[k].spend; }, 0);
    var cand = Object.keys(m).map(function (k) { return m[k]; }).filter(function (x) { return x.res >= 3 && x.spend >= tot * 0.05; }).sort(function (a, b) { return a.spend / a.res - b.spend / b.res; })[0];
    if (cand && tot > 0) out.push({ t: 'pos', f: f, prio: 3,
      title: L('Destaque: ', 'Destacado: ') + esc(cand.name),
      body: L('Trouxe ', 'Trajo ') + plural(cand.res, RNAME(f, false), RNAME(f)) + L(' a ', ' a ') + money(cand.spend / cand.res) + L(' cada, o melhor custo do período.', ' cada uno, el mejor costo del período.') });
  });

  var zero = Object.keys(byC).map(function (k) { return byC[k]; }).filter(function (c) { return c.spend > 0 && c.res === 0; }).sort(function (a, b) { return b.spend - a.spend; });
  if (zero.length) out.push({ t: 'att', prio: 2, title: L('Verba que ainda não virou resultado', 'Inversión que todavía no dio resultado'), body: zero.slice(0, 3).map(function (c) { return esc(c.name) + ' (' + money(c.spend) + ')'; }).join(' · '), act: L('Confira se o evento de conversão está configurado e se a campanha ainda está em aprendizado.', 'Revisá si el evento de conversión está configurado y si la campaña sigue en aprendizaje.') });
  out.sort(function (a, b) { var o = { pos: 0, dado: 1, att: 2 }; return (o[a.t] - o[b.t]) || (b.prio - a.prio); });
  // o cliente lê isto: primeiro o que foi bem, e no máximo dois pontos de atenção,
  // sempre os de maior impacto. O resto continua visível na aba Diagnóstico.
  var pos = out.filter(function (i) { return i.t === 'pos'; }).slice(0, 4);
  var dado = out.filter(function (i) { return i.t === 'dado'; }).slice(0, 1);
  var att = out.filter(function (i) { return i.t === 'att'; }).slice(0, 2);
  return pos.concat(dado, att);
}

/* ============================== CENÁRIOS (dados reais) ============================== */
function quantile(arr, q) { if (!arr.length) return null; var s = arr.slice().sort(function (a, b) { return a - b; }), i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
function scenarioRates(f, per) {
  var resKey = RESULT(f), ext = function (r) { return r.funnel === f; };
  var real = agg(filtered(per.from, per.to, ext));
  var R = { cpm: real.cpm, ctr: real.ctr, c2r: real.clicks > 0 ? real[resKey] / real.clicks : null };
  // semanas completas das últimas 8, para medir a variação real da conta
  var end = per.to, weeks = [];
  for (var w = 0; w < 8; w++) {
    var wt = addDays(end, -7 * w), wf = addDays(wt, -6), s = agg(filtered(wf, wt, ext));
    if (s.clicks >= 30 && s.impressions > 0) weeks.push({ cpm: s.cpm, ctr: s.ctr, c2r: s[resKey] / s.clicks });
  }
  var P, O, method;
  if (weeks.length >= 3) {
    method = L('variação das últimas ', 'variación de las últimas ') + weeks.length + L(' semanas da conta', ' semanas de la cuenta');
    // pessimista nunca melhor que o realista, otimista nunca pior
    P = { cpm: Math.max(quantile(weeks.map(function (x) { return x.cpm; }), 0.75), R.cpm), ctr: Math.min(quantile(weeks.map(function (x) { return x.ctr; }), 0.25), R.ctr), c2r: Math.min(quantile(weeks.map(function (x) { return x.c2r; }), 0.25), R.c2r) };
    O = { cpm: Math.min(quantile(weeks.map(function (x) { return x.cpm; }), 0.25), R.cpm), ctr: Math.max(quantile(weeks.map(function (x) { return x.ctr; }), 0.75), R.ctr), c2r: Math.max(quantile(weeks.map(function (x) { return x.c2r; }), 0.75), R.c2r) };
  } else {
    method = L('±20% sobre o período (pouco histórico para medir variação)', '±20% sobre el período (poco historial para medir variación)');
    P = { cpm: R.cpm * 1.2, ctr: R.ctr * 0.8, c2r: R.c2r * 0.8 };
    O = { cpm: R.cpm * 0.8, ctr: R.ctr * 1.2, c2r: R.c2r * 1.2 };
  }
  return { P: P, R: R, O: O, method: method, real: real };
}
/* Imposto da plataforma: fixo, nunca pedido ao cliente. Meta no Brasil cobra ~12,15% sobre a mídia; Google não cobra.
   Pode ser sobrescrito em window.DASH.impostoMeta (ex: 0.1215) quando o país for outro. */
function metaTaxRate() { return D.impostoMeta != null ? +D.impostoMeta : (CUR === 'BRL' ? 0.1215 : 0); }
function taxShare(f, per) {
  var rows = filtered(per.from, per.to, function (r) { return r.funnel === f; }), meta = 0, all = 0;
  rows.forEach(function (r) { all += r.spend; if (r.platform === 'meta') meta += r.spend; });
  return metaTaxRate() * (all > 0 ? meta / all : 1);
}
/* verba = total pago no mês (anúncio + imposto). net = parte que vira anúncio. */
function project(r, sim, saleRate, tax) {
  var net = sim.verba / (1 + tax), taxes = sim.verba - net;
  var impr = r.cpm > 0 ? net / r.cpm * 1000 : 0, clicks = impr * (r.ctr || 0), res = clicks * (r.c2r || 0);
  // Pessoas e vendas são inteiras: arredonda para mostrar e para calcular faturamento
  impr = Math.round(impr); clicks = Math.round(clicks); res = Math.round(res);
  var salesExact = res * saleRate, sales = Math.round(salesExact), hasTk = sim.ticket > 0, rev = hasTk ? sales * sim.ticket : null, marg = sim.margem / 100;
  var perSale = saleRate > 0 ? Math.ceil(1 / saleRate) : null;
  return {
    net: net, taxes: taxes, impr: impr, clicks: clicks, res: res, sales: sales, salesExact: salesExact, rev: rev,
    resPerSale: perSale, costPerSale: res > 0 && perSale ? sim.verba / res * perSale : null,
    cpr: res > 0 ? sim.verba / res : null, cac: sales > 0 ? sim.verba / sales : null,
    roas: hasTk && sim.verba > 0 ? rev / sim.verba : null, be: marg > 0 ? 1 / marg : null,
    profit: hasTk ? rev * marg - sim.verba : null, roi: hasTk && sim.verba > 0 ? (rev * marg - sim.verba) / sim.verba : null,
    breakEvenSales: hasTk && marg > 0 ? Math.ceil(sim.verba / (sim.ticket * marg)) : null
  };
}
function reverse(r, sim, saleRate, tax) {
  var sales = sim.meta, res = saleRate > 0 ? Math.ceil(sales / saleRate) : 0, clicks = r.c2r > 0 ? Math.ceil(res / r.c2r) : 0, impr = r.ctr > 0 ? clicks / r.ctr : 0;
  var net = impr * (r.cpm || 0) / 1000, gross = net * (1 + tax), rev = sim.ticket > 0 ? sales * sim.ticket : null, marg = sim.margem / 100;
  return { res: res, clicks: clicks, impr: impr, net: net, gross: gross, cac: sales > 0 ? gross / sales : null, roas: gross > 0 && rev != null ? rev / gross : null, be: marg > 0 ? 1 / marg : null, rev: rev, profit: rev != null ? rev * marg - gross : null };
}

/* ============================== ESTRUTURA ============================== */
/* Ordem pensada para quem não é de mídia: o que aconteceu → por quê → detalhes → planejamento → técnico */
var TABS = [
  ['overview', function () { return L('Visão geral', 'Resumen'); }],
  ['funnels', function () { return L('Funil', 'Embudo'); }],
  ['camp', function () { return L('Campanhas', 'Campañas'); }],
  ['crm', function () { return L('Cadastros', 'Registros'); }],
  ['social', function () { return L('Redes sociais', 'Redes sociales'); }],
  ['pace', function () { return L('Ritmo de verba', 'Ritmo de inversión'); }],
  ['sim', function () { return L('Simulador', 'Simulador'); }],
  ['wa', function () { return L('Resumo WhatsApp', 'Resumen WhatsApp'); }],
  ['diag', function () { return L('Diagnóstico', 'Diagnóstico'); }]
];
var CUR_TAB = 'overview';
/* Cliente de geração de leads: Cadastros vem antes de Campanhas */
function orderedTabs() {
  var list = TABS.filter(function (t) { return (t[0] !== 'crm' || hasCrmSource()) && (t[0] !== 'social' || hasSocialSource()); });
  var leads = hasCrmSource() && !(D.funis && D.funis.indexOf('vendas') > -1);
  if (!leads) return list;
  var crm = list.filter(function (t) { return t[0] === 'crm'; })[0], rest = list.filter(function (t) { return t[0] !== 'crm'; }), i = rest.findIndex(function (t) { return t[0] === 'camp'; });
  rest.splice(i, 0, crm); return rest;
}
function hasCrmSource() { return (D.fontes || []).some(function (f) { return (f.tipo || (f.plataforma ? 'midia' : 'crm')) === 'crm'; }); }
/* Olha a CONFIGURAÇÃO, não os dados: a barra de abas é montada antes das
   planilhas carregarem, então checar STATE.social aqui esconderia a aba. */
function hasSocialSource() { return (D.fontes || []).some(function (f) { return f.tipo === 'social' || f.tipo === 'engajamento'; }); }

function shell() {
  ROOT.classList.add('dz');
  var initial = String(D.cliente || 'D').trim().charAt(0).toUpperCase();
  var logo = D.logo ? '<div class="logo img"><img src="' + esc(D.logo) + '" alt="' + esc(D.cliente || '') + '"></div>' : '<div class="logo">' + esc(initial) + '</div>';
  ROOT.innerHTML =
    '<div class="head"><div><div class="brand"><div class="logo">' + esc(initial) + '</div><h1>' + esc(D.cliente || '') + ' · ' + L('Mídia paga', 'Medios pagos') + '</h1></div>' +
    '<small id="dzUpd"></small></div><div class="row">' +
    (LANGS.length > 1 ? '<div class="pills">' + LANGS.map(function (l) { return '<button class="pill' + (l === LANG ? ' on' : '') + '" data-lang="' + l + '">' + l.toUpperCase() + '</button>'; }).join('') + '</div>' : '') +
    '<button class="btn pri" id="dzReload">↻ ' + L('Atualizar', 'Actualizar') + '</button></div></div>' +
    '<div class="card"><div class="pills" id="dzPresets">' +
    [['7', L('7 dias', '7 días')], ['14', L('14 dias', '14 días')], ['30', L('30 dias', '30 días')], ['mtd', L('Este mês', 'Este mes')], ['lastmonth', L('Mês passado', 'Mes pasado')], ['custom', L('Escolher datas', 'Elegir fechas')]].map(function (p) { return '<button class="pill" data-p="' + p[0] + '">' + p[1] + '</button>'; }).join('') +
    '</div><div class="row" style="margin-top:10px"><span id="dzCustom" style="display:none"><input type="date" id="dzFrom"> → <input type="date" id="dzTo"></span>' +
    '<select id="dzPlat"></select><select id="dzAcct"></select>' +
    '<label class="mut" style="font-size:12.5px"><input type="checkbox" id="dzToday"> ' + L('Incluir hoje', 'Incluir hoy') + '</label></div>' +
    '<div id="dzPer" class="mut" style="font-size:12.5px;margin-top:10px"></div></div>' +
    '<div class="hsw tabsw"><div class="tw-hint">' + L('arraste para ver mais abas →', 'deslizá para ver más pestañas →') + '</div><div class="tabs hs" id="dzTabs">' + orderedTabs().map(function (t) { return '<button data-tab="' + t[0] + '">' + t[1]() + '</button>'; }).join('') + '</div></div>' +
    TABS.map(function (t) { return '<div class="view" id="v-' + t[0] + '"></div>'; }).join('') +
    '<div class="foot">' + L('Motor', 'Motor') + ' v' + VERSION + '</div>';
  bindShell();
}
function bindShell() {
  $('#dzReload').onclick = function () { run(); };
  $$('[data-lang]').forEach(function (b) { b.onclick = function () { LANG = b.dataset.lang; store.set('lang', LANG); shell(); renderAll(); }; });
  $$('#dzPresets .pill').forEach(function (b) { b.onclick = function () { STATE.preset = b.dataset.p; store.set('preset', STATE.preset); renderAll(); }; });
  $('#dzFrom').onchange = $('#dzTo').onchange = function () { STATE.from = $('#dzFrom').value; STATE.to = $('#dzTo').value; if (STATE.from && STATE.to) renderAll(); };
  $('#dzToday').onchange = function () { STATE.incToday = this.checked; renderAll(); };
  $('#dzPlat').onchange = function () { STATE.plat = this.value; STATE.acct = 'all'; renderAll(); };
  $('#dzAcct').onchange = function () { STATE.acct = this.value; renderAll(); };
  $$('#dzTabs button').forEach(function (b) { b.onclick = function () { goTab(b.dataset.tab); }; });
  showTab();
}
function goTab(t) { CUR_TAB = t; showTab(); try { $('#dzTabs').scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {} }
function showTab() {
  $$('#dzTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === CUR_TAB); });
  $$('.view').forEach(function (v) { v.classList.toggle('on', v.id === 'v-' + CUR_TAB); });
  setTimeout(function () { enhanceTables(); reportHeight(); }, 30);
}
/* ============================== TRAVA ============================== */
function lockThen(cb) {
  if (!D.pin || sessionStorage.getItem('dash_ok_' + CLIENT_KEY) === '1') return cb();
  ROOT.classList.add('locked');
  var box = document.createElement('div');
  box.className = 'lock';
  box.innerHTML = '<div class="box"><h2>🔒 ' + esc(D.cliente || '') + '</h2><p class="mut">' + L('Digite a senha para ver os números.', 'Ingresá la contraseña para ver los números.') + '</p><input type="password" inputmode="numeric" id="dzPin" autocomplete="off"><div class="down" id="dzPinErr" style="display:none;font-size:12.5px">' + L('Senha incorreta.', 'Contraseña incorrecta.') + '</div><button class="btn pri" id="dzPinBtn" style="width:100%;margin-top:8px">' + L('Entrar', 'Entrar') + '</button></div>';
  ROOT.appendChild(box);
  var inp = box.querySelector('#dzPin');
  function go() { if (inp.value === String(D.pin)) { sessionStorage.setItem('dash_ok_' + CLIENT_KEY, '1'); box.remove(); ROOT.classList.remove('locked'); cb(); setTimeout(reportHeight, 300); } else { box.querySelector('#dzPinErr').style.display = 'block'; inp.value = ''; } }
  box.querySelector('#dzPinBtn').onclick = go;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
  setTimeout(function () { inp.focus(); }, 100);
}


/* ============================== COMPONENTES ============================== */
/* Explicação em linguagem simples de cada métrica, para quem não é de mídia */
function HELP(k) {
  return ({
    spend: L('total pago às plataformas', 'total pagado a las plataformas'),
    impressions: L('vezes que os anúncios apareceram', 'veces que aparecieron los anuncios'),
    clicks: L('pessoas que clicaram no anúncio', 'personas que hicieron clic'),
    ctr: L('de cada 100 que viram, quantas clicaram', 'de cada 100 que vieron, cuántas hicieron clic'),
    cpc: L('custo médio de cada clique', 'costo promedio de cada clic'),
    cpm: L('custo para aparecer 1.000 vezes', 'costo para aparecer 1.000 veces'),
    leads: L('formulários preenchidos', 'formularios completados'),
    conversations: L('pessoas que chamaram no WhatsApp', 'personas que escribieron por WhatsApp'),
    purchases: L('compras feitas no site', 'compras en el sitio'),
    lpv: L('pessoas que chegaram na página', 'personas que llegaron a la página'),
    revenue: L('valor vendido pelo site', 'valor vendido en el sitio'),
    roas: L('quanto voltou em vendas para cada 1 investido', 'cuánto volvió en ventas por cada 1 invertido'),
    crm: L('contatos que chegaram ao comercial', 'contactos que llegaron a ventas')
  })[k] || '';
}
function kpi(name, cur, prev, fmt, betterDown, help) {
  var d = deltaTxt(cur, prev), cls = '';
  if (d) { var good = betterDown ? d.v < 0 : d.v > 0; cls = Math.abs(d.v) < 0.005 ? '' : (good ? 'up' : 'down'); }
  return '<div class="kpi"><div class="n"><span>' + name + '</span>' + (help ? '<button class="i" aria-label="?">i</button>' : '') + '</div>' + (help ? '<div class="h">' + help + '</div>' : '') + '<div class="v">' + fmt(cur) + '</div><div class="c"><span>' + L('antes', 'antes') + ' ' + fmt(prev) + '</span><span class="' + cls + '">' + (d ? d.txt : '') + '</span></div></div>';
}
function kpiSimple(n, v, cls, sub, help) { return '<div class="kpi"><div class="n"><span>' + n + '</span>' + (help ? '<button class="i">i</button>' : '') + '</div>' + (help ? '<div class="h">' + help + '</div>' : '') + '<div class="v ' + (cls || '') + '">' + v + '</div>' + (sub ? '<div class="c"><span class="' + (cls || '') + '">' + sub + '</span></div>' : '') + '</div>'; }
/* "0,1 por dia" não existe: vira "1 a cada 10 dias" */
function perDayTxt(v, one, many) {
  if (!ok(v) || v <= 0) return '0';
  if (v >= 0.95) return nf(Math.round(v), 0) + ' ' + (Math.round(v) === 1 ? one : many) + L(' por dia', ' por día');
  return '1 ' + one + L(' a cada ', ' cada ') + Math.round(1 / v) + L(' dias', ' días');
}
function plural(n, one, many) { return nf(n, 0) + ' ' + (Math.round(n) === 1 ? one : many); }
function legendHTML(per, proj) {
  return '<div class="legend"><span><span class="ll"></span>' + L('antes', 'antes') + ' <b>' + fmtD(per.pFrom) + ' → ' + fmtD(per.pTo) + '</b></span>' +
    '<span><span class="ll now"></span>' + L('agora', 'ahora') + ' <b>' + fmtD(per.from) + ' → ' + fmtD(per.to) + '</b></span>' +
    (proj ? '<span><span class="ll proj"></span>' + L('projeção', 'proyección') + '</span>' : '') + '</div>';
}
function insightShort(i) {
  return '<div class="ins ' + i.t + '"><b>' + (i.t === 'att' ? '⚠ ' : i.t === 'pos' ? '✓ ' : '◐ ') + esc(i.title) + '</b>' + (i.act ? '<div class="act">→ ' + esc(i.act) + '</div>' : '') + '</div>';
}
function insightHTML(i) {
  return '<div class="ins ' + i.t + '"><b>' + (i.t === 'att' ? '⚠ ' : i.t === 'pos' ? '✓ ' : '◐ ') + esc(i.title) + '</b><div>' + i.body + '</div>' + (i.act ? '<div class="act">→ ' + esc(i.act) + '</div>' : '') + '</div>';
}
/* Tabela com 1ª coluna fixa e aviso de "arraste" quando não cabe na tela */
/* Marcador discreto de ressalva. Fica quase invisível na leitura normal e só
   explica quando a pessoa passa o mouse (ou toca, no celular). A ideia é usar o
   dado que existe em vez de esconder o bloco, mas sem deixar quem lê achar que
   o número é mais firme do que é. */
function nota(txt) {
  if (!txt) return '';
  return '<span class="nt" tabindex="0" role="button" title="' + esc(String(txt).replace(/<[^>]+>/g, '')) + '">?<span class="ntx">' + txt + '</span></span>';
}
function tableWrap(inner) { return '<div class="tw"><div class="tw-hint">' + L('arraste para o lado →', 'deslizá hacia el costado →') + '</div><div class="sc">' + inner + '</div></div>'; }
function enhanceTables() {
  $$('.tw, .hsw').forEach(function (w) {
    var sc = w.querySelector('.sc, .hs'); if (!sc) return;
    var upd = function () { w.classList.toggle('scroll', sc.scrollWidth > sc.clientWidth + 4); w.classList.toggle('end', sc.scrollLeft + sc.clientWidth >= sc.scrollWidth - 4); };
    if (!sc._dz) { sc.addEventListener('scroll', upd, { passive: true }); sc._dz = 1; }
    upd();
  });
  $$('.kpi .i').forEach(function (b) { if (!b._dz) { b._dz = 1; b.onclick = function () { b.closest('.kpi').classList.toggle('showh'); reportHeight(); }; } });
  $$('.nt').forEach(function (b) {
    if (b._dz) return; b._dz = 1;
    b.onclick = function (e) { e.stopPropagation(); var abrir = !b.classList.contains('on'); $$('.nt').forEach(function (x) { x.classList.remove('on'); }); if (abrir) b.classList.add('on'); };
  });
  if (!ROOT._ntbind) { ROOT._ntbind = 1; ROOT.addEventListener('click', function () { $$('.nt').forEach(function (x) { x.classList.remove('on'); }); }); }
}
/* Nomes longos quebram só nos separadores, nunca no meio da palavra */
function nameHTML(n) { return esc(n).replace(/\]/g, ']<wbr>').replace(/\|/g, '|<wbr>').replace(/_/g, '_<wbr>'); }
function pretty(s) {
  s = String(s == null ? '' : s).trim();
  if (/^[a-z0-9áéíóúâêôãõç]+(_[a-z0-9áéíóúâêôãõç]+)+$/i.test(s)) s = s.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function per100(v) { return ok(v) ? nf(v * 100, v * 100 < 10 ? 1 : 0) : '—'; }
/* ============================== GRÁFICO ============================== */
function svgEl(tag, attrs) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
function niceMax(v) { if (!(v > 0)) return 1; var p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; }
function drawChart(el, o) {
  el.innerHTML = '';
  if (!o.now.length) { el.innerHTML = '<div class="empty">' + L('Sem dados no período.', 'Sin datos en el período.') + '</div>'; return; }
  var W = Math.max(300, Math.round(el.clientWidth || 1000)), narrow = W < 560, H = narrow ? 220 : 280, Lm = narrow ? 52 : 64, R = 12, T = 12, B = 28, PW = W - Lm - R, PH = H - T - B;
  var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H }); el.appendChild(svg);
  var vals = o.now.concat(o.prev, o.proj || []).filter(function (v) { return ok(v); });
  var max = niceMax(Math.max.apply(null, vals.length ? vals : [1]) * 1.08);
  for (var i = 0; i <= 4; i++) {
    var val = max * i / 4, y = T + PH - (val / max) * PH;
    svg.appendChild(svgEl('line', { class: 'grid-l', x1: Lm, y1: y, x2: W - R, y2: y }));
    if (i % 2 === 0 || !narrow) { var tx = svgEl('text', { class: 'axis', x: Lm - 8, y: y + 4, 'text-anchor': 'end' }); tx.textContent = o.fmtAxis(val); svg.appendChild(tx); }
  }
  var n = o.labels.length, X = function (i) { return n <= 1 ? Lm + PW / 2 : Lm + PW * i / (n - 1); }, Y = function (v) { return T + PH - (v / max) * PH; };
  var every = Math.ceil(n / (narrow ? 5 : 8));
  o.labels.forEach(function (l, i) { if (!l || (i % every !== 0 && i !== n - 1)) return; var t = svgEl('text', { class: 'axis', x: X(i), y: H - 8, 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }); t.textContent = l; svg.appendChild(t); });
  function path(s) { var d = '', on = false; s.forEach(function (v, i) { if (!ok(v)) { on = false; return; } d += (on ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1) + ' '; on = true; }); return d; }
  svg.appendChild(svgEl('path', { d: path(o.prev), fill: 'none', stroke: '#5c5c66', 'stroke-width': 1.6, 'stroke-dasharray': '4 4' }));
  if (o.proj) svg.appendChild(svgEl('path', { d: path(o.proj), fill: 'none', stroke: AC, 'stroke-width': 2, 'stroke-dasharray': '2 5', opacity: 0.8 }));
  svg.appendChild(svgEl('path', { d: path(o.now), fill: 'none', stroke: AC, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }));
  // Toque/mouse: linha vertical mostrando o dia atual E o dia correspondente do período anterior
  var guide = svgEl('line', { y1: T, y2: T + PH, stroke: '#77777f', 'stroke-width': 1, style: 'visibility:hidden' });
  var dNow = svgEl('circle', { r: 4.5, fill: AC, style: 'visibility:hidden' }), dPrev = svgEl('circle', { r: 4, fill: '#9a9aa6', style: 'visibility:hidden' });
  var tip = svgEl('g', { style: 'visibility:hidden;pointer-events:none' }), bg = svgEl('rect', { class: 'tipbg', rx: 8, ry: 8 });
  var lines = [0, 1, 2].map(function (k) { var t = svgEl('text', { class: 'tiptx', 'font-weight': k === 0 ? 600 : 400 }); tip.appendChild(t); return t; });
  tip.insertBefore(bg, tip.firstChild);
  [guide, dPrev, dNow].forEach(function (x) { svg.appendChild(x); }); svg.appendChild(tip);
  var hit = svgEl('rect', { x: Lm, y: T, width: PW, height: PH, fill: 'transparent', style: 'cursor:crosshair' }); svg.appendChild(hit);
  function at(clientX) {
    var r = svg.getBoundingClientRect(), x = (clientX - r.left) * (W / r.width), i = Math.round((x - Lm) / PW * (n - 1));
    i = Math.max(0, Math.min(n - 1, i));
    var t = [], vN = o.now[i], vP = o.prev[i], vJ = o.proj ? o.proj[i] : null;
    if (ok(vN)) t.push('● ' + (o.labels[i] || '') + ': ' + o.fmt(vN)); else if (ok(vJ)) t.push('┈ ' + (o.labels[i] || '') + ' ' + L('(projeção)', '(proyección)') + ': ' + (o.fmtProj || o.fmt)(vJ));
    if (ok(vP)) t.push('- - ' + (o.prevLabels[i] || '') + ' ' + L('(antes)', '(antes)') + ': ' + o.fmt(vP));
    if (!t.length) return hide();
    guide.setAttribute('x1', X(i)); guide.setAttribute('x2', X(i)); guide.style.visibility = 'visible';
    var yN = ok(vN) ? vN : vJ;
    if (ok(yN)) { dNow.setAttribute('cx', X(i)); dNow.setAttribute('cy', Y(yN)); dNow.style.visibility = 'visible'; } else dNow.style.visibility = 'hidden';
    if (ok(vP)) { dPrev.setAttribute('cx', X(i)); dPrev.setAttribute('cy', Y(vP)); dPrev.style.visibility = 'visible'; } else dPrev.style.visibility = 'hidden';
    lines.forEach(function (ln, k) { ln.textContent = t[k] || ''; });
    var w = 20 + Math.max.apply(null, lines.map(function (ln) { try { return ln.getComputedTextLength(); } catch (e) { return ln.textContent.length * 6.5; } })), h = 14 + t.length * 17;
    var tx = X(i) + 12; if (tx + w > W - R) tx = X(i) - 12 - w; if (tx < 0) tx = 2;
    bg.setAttribute('x', tx); bg.setAttribute('y', T + 2); bg.setAttribute('width', w); bg.setAttribute('height', h);
    lines.forEach(function (ln, k) { ln.setAttribute('x', tx + 10); ln.setAttribute('y', T + 20 + k * 17); });
    tip.style.visibility = 'visible';
  }
  function hide() { [guide, dNow, dPrev, tip].forEach(function (x) { x.style.visibility = 'hidden'; }); }
  hit.addEventListener('mousemove', function (e) { at(e.clientX); });
  hit.addEventListener('mouseleave', hide);
  hit.addEventListener('touchstart', function (e) { at(e.touches[0].clientX); }, { passive: true });
  hit.addEventListener('touchmove', function (e) { at(e.touches[0].clientX); }, { passive: true });
}
function chartMetrics() {
  var list = [
    { k: 'spend', n: L('Investimento', 'Inversión'), get: function (s) { return s.spend; }, fmt: money, add: true },
    { k: 'clicks', n: L('Cliques', 'Clics'), get: function (s) { return s.clicks; }, fmt: count, add: true },
    { k: 'ctr', n: 'CTR', get: function (s) { return s.ctr; }, fmt: function (v) { return pctf(v); }, ratio: function (s) { return s.ctr; } },
    { k: 'cpm', n: 'CPM', get: function (s) { return s.cpm; }, fmt: money, ratio: function (s) { return s.cpm; } }
  ];
  funnelsPresent().forEach(function (f) {
    var rk = RESULT(f); if (!rk || f === 'trafego') return;
    list.push({ k: 'res_' + f, n: RNAME(f).charAt(0).toUpperCase() + RNAME(f).slice(1), get: function (s) { return s[rk]; }, fmt: count, add: true, f: f });
    list.push({ k: 'cpr_' + f, n: L('Custo por ', 'Costo por ') + RNAME(f, false), get: function (s) { return s[rk] > 0 ? s.spend / s[rk] : null; }, fmt: money, f: f, ratio: function (s) { return s[rk] > 0 ? s.spend / s[rk] : null; } });
  });
  if (STATE.has.revenue && funnelsPresent().indexOf('vendas') > -1) list.push({ k: 'roas', n: 'ROAS', get: function (s) { return s.roas; }, fmt: xf, f: 'vendas', ratio: function (s) { return s.roas; } });
  return list;
}
function renderChart(host, per) {
  var ms = chartMetrics(), m = ms.filter(function (x) { return x.k === STATE.chartMetric; })[0] || ms[0];
  STATE.chartMetric = m.k;
  var ext = m.f ? function (r) { return r.funnel === m.f; } : null;
  var a = daySeries(per.from, per.to, ext), b = daySeries(per.pFrom, per.pTo, ext);
  var labels = a.map(function (x) { return fmtD(x.date); }), now = a.map(function (x) { return m.get(x.s); });
  var prev = a.map(function (_, i) { return b[i] ? m.get(b[i].s) : null; }), prevLabels = a.map(function (_, i) { return b[i] ? fmtD(b[i].date) : ''; });
  // mês cheio anterior pode ser mais longo que o período atual: mostra os dias restantes do anterior também
  for (var i = a.length; i < b.length; i++) { prev.push(m.get(b[i].s)); prevLabels.push(fmtD(b[i].date)); labels.push(''); now.push(null); }
  var proj = null;
  if (per.isMtd && per.to < monthEnd(per.from)) {
    var tot = agg(filtered(per.from, per.to, ext)), avg = m.add ? m.get(tot) / per.len : (m.ratio ? m.ratio(tot) : null);
    var extra = [], d = addDays(per.to, 1), me = monthEnd(per.from);
    while (d <= me) { extra.push(fmtD(d)); d = addDays(d, 1); }
    var realN = a.length;
    for (var j = 0; j < extra.length; j++) { var idx = realN + j; if (idx < labels.length) labels[idx] = extra[j]; else { labels.push(extra[j]); now.push(null); prev.push(null); prevLabels.push(''); } }
    proj = labels.map(function (_, i) { return i >= realN - 1 && ok(avg) ? avg : null; });
    if (ok(now[realN - 1])) proj[realN - 1] = now[realN - 1];
  }
  var oldPills = host.querySelector('.hs'), keepScroll = oldPills ? oldPills.scrollLeft : 0;
  host.innerHTML = '<div class="hsw"><div class="tw-hint">' + L('arraste para ver mais →', 'deslizá para ver más →') + '</div><div class="pills scrollx hs" style="margin-bottom:10px">' + ms.map(function (x) { return '<button class="pill' + (x.k === m.k ? ' on' : '') + '" data-m="' + x.k + '">' + x.n + '</button>'; }).join('') + '</div></div>' + legendHTML(per, !!proj) + '<div class="chart"></div>';
  $$('[data-m]', host).forEach(function (b) { b.onclick = function () { STATE.chartMetric = b.dataset.m; renderChart(host, per); }; });
  var np = host.querySelector('.hs'); if (np) np.scrollLeft = keepScroll;
  enhanceTables();
  drawChart($('.chart', host), { labels: labels, prevLabels: prevLabels, now: now, prev: prev, proj: proj, fmt: m.fmt, fmtAxis: m.fmt === money ? moneyShort : m.fmt,
    fmtProj: m.fmt === count ? function (x) { return x >= 0.95 ? '~' + nf(Math.round(x), 0) + L(' por dia', ' por día') : '~1 ' + L('a cada ', 'cada ') + Math.round(1 / x) + L(' dias', ' días'); } : null });
}


/* ============================== VISÃO GERAL ============================== */
function heroSentence(per, fs) {
  var cur = agg(filtered(per.from, per.to)), parts = [], cmp = null, maxSpend = -1;
  fs.forEach(function (f) {
    if (f === 'outros' || f === 'trafego') return;
    var F = buildFunnel(f, per), rk = F.resKey, n = F.cur[rk], cpr = n > 0 ? F.cur.spend / n : null;
    var label = f === 'whatsapp' ? L('conversas no WhatsApp', 'conversaciones por WhatsApp') : RNAME(f);
    parts.push('<b>' + count(n) + ' ' + label + '</b>' + (cpr ? ' (' + money(cpr) + ' ' + L('cada', 'cada una') + ')' : ''));
    if (f === 'vendas' && F.cur.revenue > 0) parts[parts.length - 1] += L(', somando ', ', sumando ') + '<b>' + money(F.cur.revenue) + '</b>' + L(' em vendas', ' en ventas');
    var ppr = F.prev[rk] > 0 ? F.prev.spend / F.prev[rk] : null, d = deltaTxt(cpr, ppr);
    if (F.cur.spend > maxSpend && d && Math.abs(d.v) >= 0.05) { maxSpend = F.cur.spend; cmp = { f: f, d: d }; }
  });
  var s = L('Entre ', 'Entre ') + fmtD(per.from) + L(' e ', ' y ') + fmtD(per.to) + L(', foram investidos ', ', se invirtieron ') + '<b>' + money(cur.spend) + '</b>';
  s += parts.length ? L('. Isso gerou ', '. Eso generó ') + parts.join(L(' e ', ' y ')) + '.' : '.';
  if (cmp) s += ' ' + L('Em relação ao período anterior, o custo por ', 'Respecto al período anterior, el costo por ') + RNAME(cmp.f, false) + ' ' + (cmp.d.v < 0 ? L('caiu ', 'bajó ') : L('subiu ', 'subió ')) + '<b>' + nf(Math.abs(cmp.d.v) * 100, 0) + '%</b>' + (cmp.d.v < 0 ? ' ✓' : '') + '.';
  return s;
}
function renderOverview(per) {
  var v = $('#v-overview'), cur = agg(filtered(per.from, per.to)), prev = agg(filtered(per.pFrom, per.pTo)), fs = funnelsPresent();
  var html = '<div class="card hl"><div class="hero-t">' + L('Resumo do período', 'Resumen del período') + '</div><p class="hero" style="margin:0">' + heroSentence(per, fs) + '</p></div>';
  var boxes = '';
  fs.forEach(function (f) {
    if (f === 'outros') return;
    var F = buildFunnel(f, per), rk = F.resKey, c = F.cur, p = F.prev;
    var cpr = c[rk] > 0 ? c.spend / c[rk] : null, ppr = p[rk] > 0 ? p.spend / p[rk] : null;
    boxes += '<div class="box"><h3>' + FNAME(f) + '</h3><div class="grid">' +
      kpi(cap(RNAME(f)), c[rk], p[rk], count, false, HELP(rk)) +
      kpi(L('Custo por ', 'Costo por ') + RNAME(f, false), cpr, ppr, money, true, L('investimento ÷ ', 'inversión ÷ ') + RNAME(f)) +
      kpi(L('Investido', 'Invertido'), c.spend, p.spend, money, false, L('só nas campanhas deste objetivo', 'solo en campañas de este objetivo'));
    if (f === 'vendas' && STATE.has.revenue) boxes += kpi(L('Vendido', 'Vendido'), c.revenue, p.revenue, money, false, HELP('revenue')) + kpi('ROAS', c.roas, p.roas, xf, false, HELP('roas'));
    if ((f === 'cadastro' || f === 'whatsapp') && F.crmSrc) boxes += kpi(L('No comercial', 'En ventas'), F.crmCur.n, F.crmPrev.n, count, false, HELP('crm'));
    if (F.crmStatus) boxes += kpi(L('Vendas', 'Ventas'), F.crmCur.sale, F.crmPrev.sale, count, false, L('registradas pelo comercial', 'registradas por ventas'));
    boxes += '</div></div>';
  });
  if (boxes) html += '<div class="cols">' + boxes + '</div>';
  html += '<div class="box" style="margin-top:14px"><h3>' + L('Dia a dia', 'Día a día') + '</h3><div id="dzChart"></div><small class="mut">' + L('Toque ou passe o mouse no gráfico para ver o dia e o mesmo dia do período anterior.', 'Tocá o pasá el mouse para ver el día y el mismo día del período anterior.') + '</small></div>';
  html += '<div class="box"><h3>' + L('Mídia', 'Medios') + '</h3><div class="grid">' +
    kpi(L('Investido', 'Invertido'), cur.spend, prev.spend, money, false, HELP('spend')) + kpi(L('Aparições', 'Apariciones'), cur.impressions, prev.impressions, count, false, HELP('impressions')) +
    kpi(L('Cliques', 'Clics'), cur.clicks, prev.clicks, count, false, HELP('clicks')) + kpi('CTR', cur.ctr, prev.ctr, pctf, false, HELP('ctr')) +
    kpi(L('Custo por clique', 'Costo por clic'), cur.cpc, prev.cpc, money, true, HELP('cpc')) + kpi('CPM', cur.cpm, prev.cpm, money, true, HELP('cpm')) + '</div></div>';
  var ins = insights(per).slice(0, 3);
  if (ins.length) html += '<div class="box"><h3>' + L('Destaques', 'Destacados') + '</h3>' + ins.map(insightShort).join('') + '<button class="btn" id="dzGoFun" style="margin-top:6px">' + L('Ver funil completo →', 'Ver embudo completo →') + '</button></div>';
  v.innerHTML = html;
  if ($('#dzGoFun')) $('#dzGoFun').onclick = function () { goTab('funnels'); };
  renderChart($('#dzChart'), per);
}

/* ============================== FUNIL ============================== */
var LEVELS = function () { return [L('Mídia', 'Medios'), L('Contato gerado', 'Contacto generado'), L('Chegou ao comercial', 'Llegó a ventas'), L('Venda registrada', 'Venta registrada')]; };
function missingLine(key) {
  return ({
    crm: L('Sem lista própria de contatos conectada.', 'Sin lista propia de contactos conectada.'),
    qual: L('Ninguém anota quem era um bom contato.', 'Nadie anota quién era un buen contacto.'),
    sale: L('Ninguém anota quem comprou.', 'Nadie anota quién compró.')
  })[key] || '';
}
/* Largura de cada degrau: mistura a proporção real (raiz quadrada, para o
   último degrau não sumir) com uma forma de funil garantida, e força cada
   degrau a ser mais estreito que o anterior. Sem isso, etapas de ordens de
   grandeza diferentes acabavam todas na largura mínima, viravam retângulos
   iguais e o desenho não parecia um funil. */
function funnelWidth(F, i) {
  if (F._w) return F._w[i];
  var n = F.stages.length, base = F.stages[0] && F.stages[0].cur || 0, w = [];
  for (var k = 0; k < n; k++) {
    var s = F.stages[k];
    var shape = 100 - (n > 1 ? (k / (n - 1)) * 62 : 0);
    var real = (base > 0 && !s.missing && ok(s.cur)) ? Math.sqrt(Math.max(s.cur, 0) / base) * 100 : shape;
    var val = Math.round(real * 0.45 + shape * 0.55);
    if (k > 0) val = Math.min(val, w[k - 1] - 6);
    w.push(Math.max(34, Math.min(100, val)));
  }
  F._w = w;
  return w[i];
}
function visualFunnel(F) {
  var html = '<div class="vf">';
  F.stages.forEach(function (s, i) {
    if (i > 0) {
      var prevS = F.stages[i - 1];
      if (s.missing || prevS.missing) html += '<div class="arrow">↓ ?</div>';
      else if (s.rate != null) html += '<div class="arrow">↓ <b>' + per100(s.rate) + L(' de cada 100', ' de cada 100') + '</b> ' + L('seguiram', 'siguieron') + (s.pRate != null ? ' · ' + L('antes ', 'antes ') + per100(s.pRate) : '') + '</div>';
      else html += '<div class="arrow">↓</div>';
    }
    if (s.missing) { html += '<div class="bar"><div class="blk fog" style="width:' + funnelWidth(F, i) + '%"><span class="l">' + s.label + '<br><small class="mut">' + missingLine(s.missing) + '</small></span><span class="x">?</span></div></div>'; return; }
    var w = funnelWidth(F, i), d = deltaTxt(s.cur, s.prev);
    html += '<div class="bar"><div class="blk" style="width:' + w + '%"><span class="l">' + s.label + (d ? ' <span class="d ' + (d.v >= 0 ? 'up' : 'down') + '">' + d.txt + '</span>' : '') + '</span><span class="x">' + count(s.cur) + '</span></div></div>';
  });
  return html + '</div>';
}
function renderFunnels(per) {
  var v = $('#v-funnels'), fs = funnelsPresent().filter(function (f) { return f !== 'outros'; }), html = '';

  /* Só as campanhas que investiram DENTRO do período selecionado. Se o período
     muda, a lista muda junto: não faz sentido oferecer filtro de campanha que
     não rodou. */
  var noPeriodo = {};
  filtered(per.from, per.to).forEach(function (r) {
    if (r.spend <= 0 || fs.indexOf(r.funnel) < 0) return;
    var c = noPeriodo[r.key] || (noPeriodo[r.key] = { key: r.key, name: r.campaign, f: r.funnel, spend: 0 });
    c.spend += r.spend;
  });
  var opcoes = Object.keys(noPeriodo).map(function (k) { return noPeriodo[k]; }).sort(function (a, b) { return b.spend - a.spend; });
  var camp = STATE.funCamp && noPeriodo[STATE.funCamp] ? STATE.funCamp : null;
  if (STATE.funCamp && !camp) STATE.funCamp = null;   // campanha não rodou neste período

  if (opcoes.length > 1) {
    html += '<div class="card"><h3>' + L('Campanha', 'Campaña') + '</h3>' +
      '<p class="mut" style="font-size:12.5px">' + L('Só aparecem campanhas que investiram no período selecionado. Escolher uma recalcula o funil inteiro só com ela.', 'Solo aparecen campañas que invirtieron en el período seleccionado. Elegir una recalcula el embudo entero solo con ella.') + '</p>' +
      '<select class="fsel" data-fc style="margin-top:10px"><option value="all"' + (camp ? '' : ' selected') + '>' + L('Todas as campanhas', 'Todas las campañas') + ' (' + opcoes.length + ')</option>' +
      opcoes.map(function (c) { return '<option value="' + esc(c.key) + '"' + (camp === c.key ? ' selected' : '') + '>' + esc(c.name) + ' · ' + moneyShort(c.spend) + '</option>'; }).join('') +
      '</select></div>';
  }

  if (!fs.length) html += '<div class="card empty">' + L('Nenhuma campanha com objetivo de conversão no filtro atual.', 'Ninguna campaña con objetivo de conversión en el filtro actual.') + '</div>';

  fs.forEach(function (f) {
    if (camp && noPeriodo[camp].f !== f) return;   // a campanha escolhida pertence a um funil só
    var F = buildFunnel(f, per, camp);
    var ntCamp = '';
    if (camp) {
      var totCrm = crmIn(per.from, per.to, f).length, usados = F.crmCur.n;
      if (totCrm > 0) ntCamp = nota(L('Com uma campanha selecionada, só entram os contatos cuja UTM bate com o nome dela: ', 'Con una campaña seleccionada, solo entran los contactos cuya UTM coincide con su nombre: ') +
        usados + L(' de ', ' de ') + totCrm + L(' cadastros do período. Quem chegou sem UTM não é atribuível a nenhuma campanha e fica de fora desta visão.', ' registros del período. Quien llegó sin UTM no es atribuible a ninguna campaña y queda fuera de esta vista.'));
    }
    html += '<div class="card hl"><div class="bar"><h2>' + FNAME(f) + (camp ? ' <span class="tag ac">' + nameHTML(noPeriodo[camp].name) + '</span>' : '') + ntCamp + '</h2><span class="mut" style="font-size:12.5px">' + L('investido', 'invertido') + ' <b style="color:var(--tx)">' + money(F.cur.spend) + '</b></span></div>' +
      visualFunnel(F) +
      '<div class="sec" style="margin-top:14px">' + L('O que conseguimos medir', 'Lo que podemos medir') + '</div><div class="ladder">' + LEVELS().map(function (l, i) { return '<div class="step' + (F.level > i ? ' done' : '') + '">' + (F.level > i ? '✓ ' : '') + l + '</div>'; }).join('') + '</div></div>';
  });

  if (!camp) html += whyAlertHTML(fs.filter(function (f) { return (f === 'cadastro' || f === 'whatsapp') && buildFunnel(f, per).level < 4; }), per);
  v.innerHTML = html;
  $$('select[data-fc]', v).forEach(function (b) { b.onchange = function () { STATE.funCamp = b.value === 'all' ? null : b.value; renderFunnels(per); enhanceTables(); reportHeight(); }; });
  bindWhy(v);
}

function whyDataHTML(f, per) {
  var rk = RESULT(f), m = {};
  filtered(per.from, per.to, function (r) { return r.funnel === f; }).forEach(function (r) { var c = m[r.key] || (m[r.key] = { name: r.campaign, spend: 0, res: 0 }); c.spend += r.spend; c.res += r[rk]; });
  var list = Object.keys(m).map(function (k) { return m[k]; }).filter(function (c) { return c.res > 0; }).sort(function (a, b) { return b.spend - a.spend; }).slice(0, 2);
  var example = false;
  if (!list.length) return '';
  if (list.length === 1) { example = true; list.push({ name: L('Outra campanha (exemplo)', 'Otra campaña (ejemplo)'), spend: list[0].spend, res: list[0].res / 1.4 }); }
  list.forEach(function (c) { c.cpr = c.spend / c.res; });
  list.sort(function (a, b) { return a.cpr - b.cpr; });
  var data = { a: list[0], b: list[1], rn: RNAME(f, false), rns: RNAME(f) };
  return '<div class="why" data-why=\'' + esc(JSON.stringify(data)) + '\'>' +
    '<h2>💡 ' + L('Por que anotar o que acontece depois do contato?', '¿Por qué anotar lo que pasa después del contacto?') + '</h2>' +
    '<p class="mut">' + L('Hoje o painel só enxerga até o ', 'Hoy el panel solo ve hasta la ') + data.rn + '. ' + L('Veja por que isso importa:', 'Mirá por qué importa:') + '</p>' +
    '<div class="sec">1. ' + L('Olhando só a plataforma', 'Mirando solo la plataforma') + (example ? ' <span class="tag hip">' + L('2ª campanha é exemplo', '2ª campaña es ejemplo') + '</span>' : '') + '</div>' +
    '<div class="vs"><div class="kpi win"><div class="n">' + nameHTML(data.a.name) + '</div><div class="v">' + money(data.a.cpr) + '</div><div class="c"><span>' + L('por ', 'por ') + data.rn + '</span></div></div>' +
    '<div class="kpi"><div class="n">' + nameHTML(data.b.name) + '</div><div class="v">' + money(data.b.cpr) + '</div><div class="c"><span>' + L('por ', 'por ') + data.rn + '</span></div></div></div>' +
    '<p class="mut">→ ' + L('A 1ª parece melhor. A verba iria para ela.', 'La 1ª parece mejor. La inversión iría para ella.') + '</p>' +
    '<div class="sec">2. ' + L('Agora imagine que o comercial anotou quem tinha perfil', 'Ahora imaginá que ventas anotó quién tenía perfil') + '</div>' +
    '<div class="q"><div class="ql"><span>' + L('Na 1ª campanha, de cada 10 contatos, tinham perfil:', 'En la 1ª campaña, de cada 10 contactos, tenían perfil:') + '</span><b data-o="qa">1</b></div><input type="range" min="1" max="10" step="1" value="1" data-i="qa"></div>' +
    '<div class="q"><div class="ql"><span>' + L('Na 2ª campanha, de cada 10 contatos, tinham perfil:', 'En la 2ª campaña, de cada 10 contactos, tenían perfil:') + '</span><b data-o="qb">4</b></div><input type="range" min="1" max="10" step="1" value="4" data-i="qb"></div>' +
    '<div class="vs"><div class="kpi" data-k="a"><div class="n">' + L('1ª · custo por contato com perfil', '1ª · costo por contacto con perfil') + '</div><div class="v" data-o="ca"></div></div><div class="kpi" data-k="b"><div class="n">' + L('2ª · custo por contato com perfil', '2ª · costo por contacto con perfil') + '</div><div class="v" data-o="cb"></div></div></div>' +
    '<div class="verdict" data-o="vd"></div>' +
    '<details><summary>' + L('O que o comercial precisa anotar?', '¿Qué tiene que anotar ventas?') + '</summary><p style="margin-top:8px">' + L('Uma planilha simples já resolve: <b>data</b>, <b>nome</b>, <b>de qual campanha veio</b> e um <b>status</b> que avança: novo → tem perfil → em negociação → comprou (ou perdido, com o motivo). Conectada aqui, o painel passa a mostrar o custo por venda e quanto cada campanha realmente retorna.', 'Una planilla simple alcanza: <b>fecha</b>, <b>nombre</b>, <b>de qué campaña vino</b> y un <b>estado</b> que avanza: nuevo → tiene perfil → en negociación → compró (o perdido, con el motivo). Conectada acá, el panel muestra el costo por venta y cuánto retorna cada campaña.') + '</p></details></div>';
}
/* Alerta recolhido: só abre a explicação interativa quando o visitante clica */
function whyAlertHTML(list, per) {
  var blocks = list.map(function (f) { var h = whyDataHTML(f, per); return h ? { f: f, h: h } : null; }).filter(Boolean);
  if (!blocks.length) return '';
  var seg = blocks.length > 1 ? '<div class="seg" data-wseg style="margin:14px 16px 0">' + blocks.map(function (b, i) { return '<button data-v="' + b.f + '" class="' + (i ? '' : 'on') + '">' + FNAME(b.f) + '</button>'; }).join('') + '</div>' : '';
  return '<details class="alert"><summary><span>⚠ ' + L('Não sabemos o que acontece depois do contato', 'No sabemos qué pasa después del contacto') + '</span><u>' + L('entenda por que importa', 'entendé por qué importa') + '</u></summary>' + seg +
    blocks.map(function (b, i) { return '<div data-wf="' + b.f + '"' + (i ? ' style="display:none"' : '') + '>' + b.h + '</div>'; }).join('') + '</details>';
}
function bindWhy(host) {
  $$('[data-wseg]', host).forEach(function (seg) {
    $$('button', seg).forEach(function (b) { b.onclick = function () { $$('button', seg).forEach(function (x) { x.classList.toggle('on', x === b); }); $$('[data-wf]', seg.parentNode).forEach(function (d) { d.style.display = d.dataset.wf === b.dataset.v ? '' : 'none'; }); reportHeight(); }; });
  });
  $$('details.alert', host).forEach(function (d) { d.addEventListener('toggle', function () { setTimeout(reportHeight, 50); }); });
  $$('.why', host).forEach(function (box) {
    var d = JSON.parse(box.getAttribute('data-why'));
    function upd() {
      var qa = +box.querySelector('[data-i="qa"]').value, qb = +box.querySelector('[data-i="qb"]').value;
      var ca = d.a.cpr / (qa / 10), cb = d.b.cpr / (qb / 10);
      box.querySelector('[data-o="qa"]').textContent = qa; box.querySelector('[data-o="qb"]').textContent = qb;
      box.querySelector('[data-o="ca"]').textContent = money(ca); box.querySelector('[data-o="cb"]').textContent = money(cb);
      box.querySelector('[data-k="a"]').classList.toggle('win', ca <= cb); box.querySelector('[data-k="b"]').classList.toggle('win', cb < ca);
      var vd = box.querySelector('[data-o="vd"]');
      if (cb < ca) { vd.className = 'verdict good'; vd.innerHTML = '<div class="big">' + L('Entendeu o ponto?', '¿Se entiende?') + '</div>' + L('A campanha que parecia mais cara é ', 'La campaña que parecía más cara es ') + '<b>' + nf(ca / cb, 1) + 'x ' + L('mais eficiente', 'más eficiente') + '</b>' + L(' quando olhamos quem realmente tinha perfil. Sem essa anotação, a verba iria para a campanha errada.', ' cuando miramos quién realmente tenía perfil. Sin esa anotación, la inversión iría a la campaña equivocada.'); }
      else { vd.className = 'verdict neu'; vd.innerHTML = L('Neste cenário, a 1ª campanha continua melhor. Mas só dá para ter certeza com o dado anotado — mexa nos controles acima e veja como a decisão pode virar.', 'En este escenario la 1ª sigue siendo mejor. Pero solo se puede tener certeza con el dato anotado — mové los controles y mirá cómo puede cambiar la decisión.'); }
    }
    $$('input[type=range]', box).forEach(function (i) { i.oninput = upd; });
    upd();
  });
}

/* ============================== SIMULADOR ============================== */
function simFunnels() { return funnelsPresent().filter(function (f) { return f === 'vendas' || f === 'cadastro' || f === 'whatsapp'; }); }
function simDefaults(per) {
  var fs = simFunnels(), f0 = fs[0] || 'vendas', F = fs.length ? buildFunnel(f0, per) : null;
  var last30 = agg(filtered(addDays(per.to, -29), per.to));
  var tk = F && F.f === 'vendas' && F.cur.purchases > 0 && F.cur.revenue > 0 ? Math.round(F.cur.revenue / F.cur.purchases) : 0;
  var vb = 0; Object.keys(D.verbas || {}).forEach(function (k) { vb += +D.verbas[k] || 0; });
  var mt = F && F.f === 'vendas' && F.cur.purchases > 0 ? Math.max(1, Math.round(F.cur.purchases / per.len * 30 * 1.1)) : 10;
  return { funil: f0, verba: vb || Math.round(last30.spend / 100) * 100 || 1000, ticket: tk, margem: 30, meta: mt, metaFat: tk ? mt * tk : 0, metaTipo: 'vendas', hipCad: 5, hipWa: 5, cen: 'R' };
}
function vendasLbl(n) { return Math.round(n) === 1 ? L('venda', 'venta') : L('vendas', 'ventas'); }
function renderSim(per) {
  var v = $('#v-sim'), fs = simFunnels();
  if (!fs.length) { v.innerHTML = '<div class="card empty">' + L('Nenhum funil de conversão no filtro atual para simular.', 'Ningún embudo de conversión para simular.') + '</div>'; return; }
  var sim = Object.assign(simDefaults(per), store.get('sim', {}));
  if (fs.indexOf(sim.funil) < 0) sim.funil = fs[0];
  var f = sim.funil, F = buildFunnel(f, per), SR = scenarioRates(f, per), tax = taxShare(f, per);
  var saleRate, saleReal = false;
  if (f === 'vendas') { saleRate = 1; saleReal = true; }
  else if (F.crmStatus && F.cur[F.resKey] > 0 && F.crmCur.sale > 0) { saleRate = F.crmCur.sale / F.cur[F.resKey]; saleReal = true; }
  else saleRate = (f === 'cadastro' ? sim.hipCad : sim.hipWa) / 100;
  var tkReal = f === 'vendas' && F.cur.purchases > 0 && F.cur.revenue > 0 ? F.cur.revenue / F.cur.purchases : null;
  var rn = RNAME(f), rn1 = RNAME(f, false), hipKey = f === 'cadastro' ? 'hipCad' : 'hipWa';
  if (sim.metaTipo === 'fat' && sim.ticket > 0) sim.meta = Math.max(1, Math.round((sim.metaFat || 0) / sim.ticket));
  else if (sim.metaTipo !== 'fat' && sim.ticket > 0) sim.metaFat = Math.round(sim.meta * sim.ticket);
  var scen = { P: SR.P, R: SR.R, O: SR.O }[sim.cen] || SR.R, X = project(scen, sim, saleRate, tax);

  function q(key, label, val, shown, help, range, kind) {
    if (range) return '<div class="q"><div class="ql"><span>' + label + '</span><b data-show="' + key + '">' + shown + '</b></div>' + (help ? '<small class="mut">' + help + '</small>' : '') +
      '<input type="range" data-s="' + key + '" min="' + range[0] + '" max="' + range[1] + '" step="' + range[2] + '" value="' + val + '"></div>';
    // campo de texto formatado (1.234.567) com prefixo de moeda quando for dinheiro
    var pref = kind === 'money' ? '<span class="pfx">' + CUR + '</span>' : '';
    return '<div class="q"><div class="ql"><span>' + label + '</span><b data-show="' + key + '">' + shown + '</b></div>' + (help ? '<small class="mut">' + help + '</small>' : '') +
      '<div class="inp' + (pref ? ' hasp' : '') + '">' + pref + '<input type="text" inputmode="decimal" data-s="' + key + '" data-kind="' + (kind || 'num') + '" value="' + (val ? nf(val, 0) : '') + '"></div></div>';
  }
  var html = '<div class="card hl"><h2>🧭 ' + L('Simule o mês', 'Simulá el mes') + '</h2><p class="mut">' + L('Responda com os números do seu negócio. O resto vem dos resultados reais das campanhas. Nada do que você mexer aqui altera as campanhas — fica salvo só neste aparelho.', 'Respondé con los números de tu negocio. El resto viene de los resultados reales de las campañas. Nada de lo que muevas acá cambia las campañas — queda guardado solo en este dispositivo.') + '</p>';
  if (fs.length > 1) html += '<div class="seg" data-seg="funil">' + fs.map(function (x) { return '<button data-v="' + x + '" class="' + (x === f ? 'on' : '') + '">' + FNAME(x) + '</button>'; }).join('') + '</div>';
  html += q('verba', '💰 ' + L('Quanto vai investir no mês?', '¿Cuánto vas a invertir en el mes?'), sim.verba, money(sim.verba), L('Total pago às plataformas.', 'Total pagado a las plataformas.'), null, 'money') +
    q('ticket', '🧾 ' + L('Quanto vale uma venda, em média?', '¿Cuánto vale una venta, en promedio?'), sim.ticket, sim.ticket ? money(sim.ticket) : '—', tkReal ? L('Nas vendas do site no período, a média foi ', 'En las ventas del período, el promedio fue ') + money(tkReal) + '.' : '', null, 'money') +
    q('margem', '📊 ' + L('De cada 100 vendidos, quanto sobra depois dos custos?', 'De cada 100 vendidos, ¿cuánto queda después de los costos?'), sim.margem, nf(sim.margem, 0) + '%', L('Depois de custos, impostos e comissões. Sem a mídia.', 'Después de costos, impuestos y comisiones. Sin los medios.'), [1, 90, 1]) +
    (sim.metaTipo === 'fat'
      ? q('metaFat', '🎯 ' + L('Quanto você quer faturar no mês?', '¿Cuánto querés facturar en el mes?'), sim.metaFat, money(sim.metaFat), sim.ticket ? L('Equivale a ', 'Equivale a ') + count(sim.meta) + ' ' + vendasLbl(sim.meta) + L(' com o ticket acima.', ' con el ticket de arriba.') : L('Informe quanto vale uma venda para converter em vendas.', 'Informá cuánto vale una venta para convertir en ventas.'), null, 'money')
      : q('meta', '🎯 ' + L('Quantas vendas você quer no mês?', '¿Cuántas ventas querés en el mes?'), sim.meta, count(sim.meta), sim.ticket ? L('Equivale a ', 'Equivale a ') + money(sim.meta * sim.ticket) + L(' de faturamento.', ' de facturación.') : '')) +
    '<div class="seg" data-seg="metaTipo" style="margin-top:-4px"><button data-v="vendas" class="' + (sim.metaTipo === 'fat' ? '' : 'on') + '">' + L('Definir por vendas', 'Definir por ventas') + '</button><button data-v="fat" class="' + (sim.metaTipo === 'fat' ? 'on' : '') + '">' + L('Definir por faturamento', 'Definir por facturación') + '</button></div>';
  if (!saleReal) html += q(hipKey, '🤝 ' + L('De cada 100 ', 'De cada 100 ') + rn + L(', quantos viram venda?', ', ¿cuántos se convierten en venta?'), sim[hipKey], nf(sim[hipKey], sim[hipKey] % 1 ? 1 : 0) + ' <span class="tag hip">' + L('palpite', 'estimación') + '</span>', L('Palpite: ninguém registra isso hoje.', 'Estimación: nadie lo registra hoy.'), [0.5, 40, 0.5]);
  html += '</div>';

  // O caminho do dinheiro
  var cenNames = { P: L('Cauteloso', 'Cauteloso'), R: L('Provável', 'Probable'), O: L('Otimista', 'Optimista') };
  var cenHelp = { P: L('usa as semanas de pior desempenho do período', 'usa las semanas de peor rendimiento del período'), R: L('usa a média do período', 'usa el promedio del período'), O: L('usa as semanas de melhor desempenho do período', 'usa las semanas de mejor rendimiento del período') };
  function fstep(ic, label, help, val, tag, note) { return '<div class="fs"' + (note ? ' title="' + esc(note.replace(/<[^>]+>/g, '')) + '"' : '') + '><div class="ic">' + ic + '</div><div><div class="fl">' + label + (tag || '') + '</div><div class="fh">' + help + '</div>' + (note ? '<div class="fn">' + note + '</div>' : '') + '</div><div class="fv">' + val + '</div></div><div class="con"></div>'; }
  /* Diz, em cada etapa, o que teria de mudar em relação ao cenário Provável para
     este cenário acontecer. Sem isso, "Otimista" é só um número maior sem causa. */
  function cenNote(metric, better) {
    if (sim.cen === 'R' || !ok(scen[metric]) || !ok(SR.R[metric]) || SR.R[metric] === 0) return '';
    var d = (scen[metric] - SR.R[metric]) / SR.R[metric];
    if (Math.abs(d) < 0.01) return '';
    var fmtv = metric === 'cpm' ? money : function (x) { return per100(x) + '%'; };
    var sobe = d > 0, bom = sobe === !!better;
    var verbo = sobe ? L('subir ', 'subir ') : L('cair ', 'bajar ');
    var txt = (sim.cen === 'O' ? L('Para chegar aqui, precisa ', 'Para llegar acá, tiene que ') : L('Este cenário assume ', 'Este escenario asume ')) +
      verbo + nf(Math.abs(d) * 100, 0) + '% (' + fmtv(SR.R[metric]) + ' → ' + fmtv(scen[metric]) + ')';
    return '<span class="' + (bom ? 'up' : 'down') + '">' + txt + '</span>';
  }
  var chip = function (real) { return ' <span class="tag ' + (real ? 'real' : 'hip') + '">' + (real ? L('dado real', 'dato real') : L('palpite', 'estimación')) + '</span>'; };
  html += '<div class="card"><h2>' + L('O caminho do seu dinheiro', 'El camino de tu dinero') + '</h2>' +
    '<p class="mut">' + L('Cada linha é uma etapa do caminho entre o que você paga às plataformas e o que entra no caixa. As porcentagens vêm do desempenho real das suas campanhas no período.', 'Cada línea es una etapa del camino entre lo que pagás a las plataformas y lo que entra en caja. Los porcentajes vienen del rendimiento real de tus campañas en el período.') + '</p>' +
    '<div class="seg" data-seg="cen">' + ['P', 'R', 'O'].map(function (k) { return '<button data-v="' + k + '" class="' + (k === sim.cen ? 'on' : '') + '">' + cenNames[k] + '</button>'; }).join('') + '</div><p class="mut" style="font-size:12.5px;margin:8px 0 0">' + cenNames[sim.cen] + ': ' + cenHelp[sim.cen] + '.</p><div class="flow">' +
    fstep('💰', L('Você investe', 'Invertís'), X.taxes > 1 ? L('sendo ', 'de los cuales ') + money(X.taxes) + L(' de imposto cobrado pela plataforma', ' son impuesto de la plataforma') : L('total no mês', 'total del mes'), money(sim.verba)) +
    fstep('👀', L('Os anúncios aparecem', 'Los anuncios aparecen'), money(scen.cpm) + L(' a cada mil', ' cada mil'), nf(X.impr, 0) + L(' vezes', ' veces'), '', cenNote('cpm', false)) +
    fstep('👆', L('Pessoas clicam', 'Personas hacen clic'), per100(scen.ctr) + L(' de cada 100 que veem', ' de cada 100 que ven'), nf(X.clicks, 0), '', cenNote('ctr', true)) +
    fstep(f === 'whatsapp' ? '💬' : f === 'vendas' ? '🛒' : '📝', cap(rn), per100(scen.c2r) + L(' de cada 100 que clicam', ' de cada 100 que hacen clic'), nf(X.res, 0), chip(true), cenNote('c2r', true)) +
    (f !== 'vendas' ? fstep('🤝', L('Viram venda', 'Se convierten en venta'), per100(saleRate) + L(' de cada 100 ', ' de cada 100 ') + rn, nf(X.sales, 0), chip(saleReal)) : '') +
    fstep('💵', L('Faturamento', 'Facturación'), sim.ticket ? nf(X.sales, 0) + ' × ' + money(sim.ticket) : L('informe quanto vale uma venda', 'informá cuánto vale una venta'), money(X.rev)) + '</div>';
  var vendaW = function (n) { return plural(n, L('venda', 'venta'), L('vendas', 'ventas')); };
  if (X.sales < 1 && X.resPerSale) {
    // Menos de 1 venda: explica o que falta para a primeira, em vez de mostrar "0,3 vendas"
    var falta = Math.max(X.resPerSale - X.res, 0);
    html += '<div class="verdict bad"><div class="big">' + L('Menos de 1 venda prevista', 'Menos de 1 venta prevista') + '</div>' +
      L('Com ', 'Con ') + plural(X.res, rn1, rn) + L(' no mês, ainda não chega na 1ª venda: ela precisa de uns ', ' en el mes, todavía no llega a la 1ª venta: necesita unos ') + '<b>' + plural(X.resPerSale, rn1, rn) + '</b>' +
      (falta > 0 ? ' (' + L('faltam ', 'faltan ') + plural(falta, rn1, rn) + ')' : '') + L(', ou cerca de ', ', o cerca de ') + '<b>' + money(X.costPerSale) + '</b>' + L(' de investimento.', ' de inversión.') + '</div>';
  } else if (X.profit == null) html += '<div class="verdict neu">' + L('Informe quanto vale uma venda para ver se o investimento se paga.', 'Informá cuánto vale una venta para ver si la inversión se paga.') + '</div>';
  else {
    var good = X.profit >= 0;
    var retorno = sim.verba > 0 ? (X.rev / sim.verba) : null;
    html += '<div class="verdict ' + (good ? 'good' : 'bad') + '"><div class="big">' + (good ? '✅ ' + L('Se paga', 'Se paga') + ': ' + money(X.profit) + L(' de lucro', ' de ganancia') : '❌ ' + L('Ainda não se paga', 'Todavía no se paga') + ': ' + L('faltam ', 'faltan ') + money(-X.profit)) +
      (saleReal ? '' : ' <span class="tag hip">' + L('cenário', 'escenario') + '</span>') + '</div>' +
      (ok(retorno) ? L('Em resumo: investindo ', 'En resumen: invirtiendo ') + '<b>' + money(sim.verba) + '</b>' + L(', o mês fecharia com ', ', el mes cerraría con ') + '<b>' + money(X.rev) + '</b>' + L(' de faturamento (', ' de facturación (') + nf(retorno, 1) + L('x o investido). Desse faturamento, ', 'x lo invertido). De esa facturación, ') + nf(sim.margem, 0) + L('% sobra depois dos custos do produto, e é daí que sai o lucro acima.', '% queda después de los costos del producto, y de ahí sale la ganancia de arriba.') + '<br>' : '') +
      L('Para empatar: ', 'Para empatar: ') + '<b>' + vendaW(X.breakEvenSales) + '</b>' + L(' no mês. Neste cenário: ', ' en el mes. En este escenario: ') + '<b>' + vendaW(X.sales) + '</b>.' +
      (f !== 'vendas' && X.resPerSale ? '<br><small class="mut">' + L('Cada venda precisa de ~', 'Cada venta necesita ~') + plural(X.resPerSale, rn1, rn) + ' (' + money(X.costPerSale) + ').</small>' : '') + '</div>';
  }
  if (!saleReal) html += '<div class="note" style="margin-top:12px">' + L('Vendas são um <b>palpite</b>: ninguém registra quantos ', 'Las ventas son una <b>estimación</b>: nadie registra cuántos ') + rn + L(' compram. ', ' compran. ') + '<a href="#" data-go="funnels" style="color:var(--ac)">' + L('Entenda por que isso importa →', 'Entendé por qué importa →') + '</a></div>';
  html += '<details><summary>' + L('Ver os três cenários lado a lado', 'Ver los tres escenarios lado a lado') + '</summary><div style="margin-top:10px">' + scenTable(SR, sim, saleRate, tax, saleReal, rn, rn1, f) + '</div></details></div>';

  // Da meta para a verba
  var RV = reverse(SR.R, sim, saleRate, tax);
  html += '<div class="card"><h2>🎯 ' + L('Para vender ', 'Para vender ') + count(sim.meta) + L(' no mês', ' en el mes') + (saleReal ? '' : nota(L('Esta conta usa o palpite de ', 'Esta cuenta usa la estimación de ') + nf(saleRate * 100, saleRate * 100 % 1 ? 1 : 0) + L(' venda(s) a cada 100 ', ' venta(s) cada 100 ') + RNAME(f) + L('. Enquanto o comercial não registrar quem comprou, ela é um exercício, não uma previsão.', '. Mientras ventas no registre quién compró, es un ejercicio, no una previsión.'))) + '</h2><p class="hero" style="font-size:15px">' + L('Com o desempenho atual, seria preciso investir cerca de ', 'Con el rendimiento actual, habría que invertir cerca de ') + '<b>' + money(RV.gross) + '</b>' + L(', gerando uns ', ', generando unos ') + '<b>' + plural(RV.res, rn1, rn) + '</b>.' +
    (sim.verba > 0 ? ' ' + L('É ', 'Es ') + '<b>' + nf(RV.gross / sim.verba, 1) + 'x</b>' + L(' o valor que você colocou acima.', ' el valor que pusiste arriba.') : '') + '</p>' +
    (RV.profit != null ? '<p class="' + (RV.profit >= 0 ? 'up' : 'down') + '" style="margin:0">' + (RV.profit >= 0 ? L('Nesse volume, o investimento se paga, com lucro de ', 'En ese volumen, la inversión se paga, con ganancia de ') + money(RV.profit) + '.' : L('Nesse volume, o investimento ainda não se paga (faltariam ', 'En ese volumen, la inversión todavía no se paga (faltarían ') + money(-RV.profit) + ').') + '</p>' : '') + '</div>';

  // Ritmo da meta
  var ms = monthStart(todayISO()), me = monthEnd(ms), end = STATE.incToday ? todayISO() : addDays(todayISO(), -1);
  if (end >= ms) {
    var mtd = buildFunnel(f, { from: ms, to: end, pFrom: ms, pTo: end }), days = daysBetween(ms, end) + 1, left = daysBetween(end, me);
    var done = Math.round(f === 'vendas' ? mtd.cur.purchases : (saleReal && mtd.crmStatus ? mtd.crmCur.sale : mtd.cur[mtd.resKey] * saleRate));
    var pace = done / days, proj = done + pace * left, pct = sim.meta > 0 ? Math.min(done / sim.meta, 1) : 0, pp = sim.meta > 0 ? Math.min(Math.max(proj - done, 0) / sim.meta, 1 - pct) : 0;
    /* Sem registro de venda, "vendas" aqui é resultado × palpite. O número não
       pode aparecer com a mesma cara de um número medido: quem lê tem que saber
       de onde ele saiu antes de levar para a reunião. */
    var baseMtd = Math.round(mtd.cur[mtd.resKey] || 0);
    var ntEst = saleReal ? '' : nota(L('Não é venda registrada: é uma conta. ', 'No es venta registrada: es una cuenta. ') +
      count(baseMtd) + ' ' + RNAME(f) + L(' no mês × ', ' en el mes × ') + nf(saleRate * 100, saleRate * 100 % 1 ? 1 : 0) + L(' de cada 100 que você estimou acima. Ninguém registra hoje quantos ', ' de cada 100 que estimaste arriba. Nadie registra hoy cuántos ') + RNAME(f) + L(' viraram venda, então esse valor muda junto com o palpite e não deve ser usado como resultado.', ' se convirtieron en venta, así que ese valor cambia junto con la estimación y no debe usarse como resultado.'));
    var rotulo = saleReal ? vendaW(sim.meta) : L('vendas estimadas', 'ventas estimadas') + L(' de ', ' de ') + count(sim.meta);
    html += '<div class="card"><h2>📅 ' + L('Como está o mês', 'Cómo va el mes') + (saleReal ? '' : ' <span class="tag hip">' + L('estimativa, não medição', 'estimación, no medición') + '</span>') + ntEst + '</h2>' +
      '<div class="paceBar"><span style="width:' + (pct * 100) + '%;background:var(--ac)"></span><span style="width:' + (pp * 100) + '%;background:color-mix(in srgb,var(--ac) 35%,transparent)"></span></div>' +
      '<p style="margin:0">' + '<b>' + nf(done, 0) + '</b> ' + (saleReal ? L('de ', 'de ') + vendaW(sim.meta) : rotulo) + L(' até agora. No ritmo atual, fecha com ~', ' hasta ahora. Al ritmo actual, cierra con ~') + '<b class="' + (proj >= sim.meta ? 'up' : 'down') + '">' + nf(Math.round(proj), 0) + '</b>' +
      (left > 0 && proj < sim.meta ? L('. Para bater a meta: ', '. Para llegar a la meta: ') + '<b>' + perDayTxt(Math.max(sim.meta - done, 0) / left, L('venda', 'venta'), L('vendas', 'ventas')) + '</b>.' : '.') + '</p>' +
      (saleReal ? '' : '<p class="mut" style="font-size:12.5px;margin:10px 0 0">' + L('Base medida no mês: ', 'Base medida en el mes: ') + '<b style="color:var(--tx)">' + count(baseMtd) + ' ' + RNAME(f) + '</b>.</p>') + '</div>';
  }
  v.innerHTML = html;
  bindSim(v, per);
}
function scenTable(SR, sim, saleRate, tax, saleReal, rn, rn1, f) {
  var P = project(SR.P, sim, saleRate, tax), R = project(SR.R, sim, saleRate, tax), O = project(SR.O, sim, saleRate, tax);
  function row(label, a, b, c, fmt) { return '<tr><td>' + label + '</td><td>' + fmt(a) + '</td><td>' + fmt(b) + '</td><td>' + fmt(c) + '</td></tr>'; }
  return tableWrap('<table><thead><tr><th></th><th>' + L('Cauteloso', 'Cauteloso') + '</th><th>' + L('Provável', 'Probable') + '</th><th>' + L('Otimista', 'Optimista') + '</th></tr></thead><tbody>' +
    row(L('Custo por mil aparições', 'Costo por mil apariciones'), SR.P.cpm, SR.R.cpm, SR.O.cpm, money) + row(L('Taxa de clique', 'Tasa de clic'), SR.P.ctr, SR.R.ctr, SR.O.ctr, pctf) +
    row(L('Clique → ', 'Clic → ') + rn1, SR.P.c2r, SR.R.c2r, SR.O.c2r, pctf) + row(L('Aparições', 'Apariciones'), P.impr, R.impr, O.impr, count) + row(L('Cliques', 'Clics'), P.clicks, R.clicks, O.clicks, count) +
    row(cap(rn), P.res, R.res, O.res, count) + row(L('Custo por ', 'Costo por ') + rn1, P.cpr, R.cpr, O.cpr, money) + row(L('Vendas', 'Ventas'), P.sales, R.sales, O.sales, count) +
    row(L('Faturamento', 'Facturación'), P.rev, R.rev, O.rev, money) + row(L('Custo por venda', 'Costo por venta'), P.cac, R.cac, O.cac, money) + row('ROAS', P.roas, R.roas, O.roas, xf) +
    row(L('Lucro', 'Ganancia'), P.profit, R.profit, O.profit, money) + '</tbody></table>');
}
function simParse(str) {
  var s = String(str == null ? '' : str).replace(/[^\d,.\-]/g, '');
  if (!s) return 0;
  var ld = s.lastIndexOf('.'), lc = s.lastIndexOf(',');
  if (ld > -1 && lc > -1) s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (lc > -1) s = (s.length - lc - 1) === 3 && s.split(',').length === 2 ? s.replace(',', '') : s.replace(',', '.');
  else if (ld > -1) s = (s.length - ld - 1) === 3 && s.split('.').length === 2 ? s.replace('.', '') : s;
  return parseFloat(s) || 0;
}
function bindSim(v, per) {
  $$('input[data-s]', v).forEach(function (el) {
    var key = el.dataset.s, isTxt = el.type === 'text';
    if (isTxt) el.onblur = function () { var n = simParse(el.value); el.value = n ? nf(n, 0) : ''; };
    el.oninput = function () {
      var val = isTxt ? simParse(el.value) : (parseFloat(el.value) || 0), sh = $('[data-show="' + key + '"]', v);
      if (sh) sh.innerHTML = key === 'margem' ? nf(val, 0) + '%' : key === 'verba' || key === 'ticket' ? money(val) : key === 'meta' ? count(val) : nf(val, 1) + ' <span class="tag hip">' + L('palpite', 'estimación') + '</span>';
    };
    el.onchange = function () { var s = store.get('sim', {}); s[key] = isTxt ? simParse(el.value) : (parseFloat(el.value) || 0); store.set('sim', s); renderSim(per); enhanceTables(); };
  });
  $$('[data-seg]', v).forEach(function (seg) { $$('button', seg).forEach(function (b) { b.onclick = function () { var s = store.get('sim', {}); s[seg.dataset.seg] = b.dataset.v; store.set('sim', s); renderSim(per); enhanceTables(); }; }); });
  $$('[data-go]', v).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); goTab(a.dataset.go); }; });
}

/* ============================== CAMPANHAS ============================== */
function renderCamp(per) {
  var v = $('#v-camp');
  function byCamp(rows) { var m = {}; rows.forEach(function (r) { var c = m[r.key] || (m[r.key] = { key: r.key, name: r.campaign, acct: r.account, plat: r.platform, f: r.funnel, spend: 0, res: 0, rev: 0 }); c.spend += r.spend; var rk = RESULT(r.funnel); c.res += rk ? r[rk] : 0; c.rev += r.revenue; }); return m; }
  var now = byCamp(filtered(per.from, per.to)), prev = byCamp(filtered(per.pFrom, per.pTo)), keys = {};
  Object.keys(now).concat(Object.keys(prev)).forEach(function (k) { keys[k] = 1; });
  var rows = Object.keys(keys).map(function (k) {
    var n = now[k] || { spend: 0, res: 0, rev: 0 }, p = prev[k] || { spend: 0, res: 0, rev: 0 }, b = now[k] || prev[k];
    return { name: b.name, acct: b.acct, plat: b.plat, f: b.f, spendPrev: p.spend, spendNow: n.spend, resPrev: p.res, resNow: n.res, cprPrev: p.res ? p.spend / p.res : null, cprNow: n.res ? n.spend / n.res : null, roasNow: n.spend && n.rev ? n.rev / n.spend : null, isNew: !prev[k], ended: !now[k], why: (STATE.camp[k] || {}).why };
  });
  var c = STATE.sort.col, d = STATE.sort.dir;
  rows.sort(function (a, b) { var x = a[c], y = b[c]; if (typeof x === 'string') return x.localeCompare(y) * d; x = ok(x) ? x : -Infinity; y = ok(y) ? y : -Infinity; return (x - y) * d; });
  var hasRev = STATE.has.revenue, multiAcct = Object.keys(rows.reduce(function (a, r) { a[r.acct] = 1; return a; }, {})).length > 1;
  function tags(r) { return (multiAcct || STATE.has.revenue ? '<span class="tag">' + (r.plat === 'google' ? 'Google' : 'Meta') + (multiAcct && !/^(meta|google)( ads)?$/i.test(r.acct) ? ' · ' + esc(r.acct) : '') + '</span>' : '') + '<span class="tag ac" title="' + esc(L('Critério: ', 'Criterio: ') + (r.why || '')) + '">' + FNAME(r.f) + '</span>' + (r.isNew ? '<span class="tag real">' + L('nova', 'nueva') + '</span>' : '') + (r.ended ? '<span class="tag">' + L('parada', 'pausada') + '</span>' : ''); }
  var html = '<div class="card' + (STATE.campAll ? ' showall' : '') + '" id="dzCampBox"><h2>' + L('Campanhas', 'Campañas') + '</h2>' + legendHTML(per);
  // Celular: cartões
  html += '<div class="only-narrow"><div class="row" style="margin-bottom:6px"><span class="mut" style="font-size:12.5px">' + L('Ordenar por', 'Ordenar por') + '</span><select id="dzSortN"><option value="spendNow">' + L('Investimento', 'Inversión') + '</option><option value="resNow">' + L('Resultados', 'Resultados') + '</option><option value="cprNow">' + L('Custo por resultado', 'Costo por resultado') + '</option><option value="name">' + L('Nome', 'Nombre') + '</option></select></div>' +
    (rows.length ? rows.map(function (r, idx) {
      var rk = RESULT(r.f);
      return '<div class="ccard' + (idx >= 5 ? ' more' : '') + '">' + tags(r) + '<div class="cn">' + nameHTML(r.name) + '</div><div class="cg">' +
        '<div><span>' + L('Investido', 'Invertido') + '</span><b>' + money(r.spendNow) + '</b><span>' + L('antes ', 'antes ') + money(r.spendPrev) + '</span></div>' +
        '<div><span>' + (rk ? cap(RNAME(r.f)) : L('Resultado', 'Resultado')) + '</span><b>' + (rk ? count(r.resNow) : '—') + '</b><span>' + (rk ? L('antes ', 'antes ') + count(r.resPrev) : '') + '</span></div>' +
        '<div><span>' + L('Custo cada', 'Costo c/u') + '</span><b>' + money(r.cprNow) + '</b><span>' + L('antes ', 'antes ') + money(r.cprPrev) + '</span></div></div></div>';
    }).join('') : '<div class="empty">' + L('Sem campanhas no período.', 'Sin campañas en el período.') + '</div>') + '</div>';
  // Computador: tabela
  function sortMark(col) { return STATE.sort.col === col ? '<span class="sar">' + (STATE.sort.dir < 0 ? '▼' : '▲') + '</span>' : ''; }
  function th(col, label, cls) { return '<th class="' + (cls || '') + (STATE.sort.col === col ? ' sorted' : '') + '" data-col="' + col + '">' + label + sortMark(col) + '</th>'; }
  var rk0 = L('Resultados', 'Resultados'), inv = L('Investido', 'Invertido'), cc = L('Custo cada', 'Costo c/u');
  html += '<div class="only-wide">' + tableWrap('<table class="split"><thead>' +
    '<tr class="grp"><th></th><th class="prev gstart" colspan="3">' + L('Período anterior', 'Período anterior') + '<br><small>' + fmtD(per.pFrom) + ' → ' + fmtD(per.pTo) + '</small></th>' +
    '<th class="gstart" colspan="' + (hasRev ? 4 : 3) + '">' + L('Período atual', 'Período actual') + '<br><small>' + fmtD(per.from) + ' → ' + fmtD(per.to) + '</small></th></tr>' +
    '<tr>' + th('name', L('Campanha', 'Campaña')) +
      th('spendPrev', inv, 'prev gstart') + th('resPrev', rk0, 'prev') + th('cprPrev', cc, 'prev') +
      th('spendNow', inv, 'gstart') + th('resNow', rk0) + th('cprNow', cc) + (hasRev ? th('roasNow', 'ROAS') : '') +
    '</tr></thead><tbody>' +
    (rows.length ? rows.map(function (r, idx) {
      var rk = RESULT(r.f);
      return '<tr' + (idx >= 5 ? ' class="more"' : '') + '><td>' + tags(r) + '<div>' + nameHTML(r.name) + '</div></td>' +
        '<td class="prev gstart">' + money(r.spendPrev) + '</td><td class="prev">' + (rk ? count(r.resPrev) : '—') + '</td><td class="prev">' + money(r.cprPrev) + '</td>' +
        '<td class="gstart">' + money(r.spendNow) + '</td><td>' + (rk ? count(r.resNow) + ' <small class="mut">' + RNAME(r.f) + '</small>' : '—') + '</td><td>' + money(r.cprNow) + '</td>' +
        (hasRev ? '<td>' + xf(r.roasNow) + '</td>' : '') + '</tr>';
    }).join('') : '<tr><td colspan="9" class="empty">' + L('Sem campanhas no período.', 'Sin campañas.') + '</td></tr>') + '</tbody></table>') + '</div></div>';
  if (rows.length > 5) html = html.replace(/<\/div>$/, '') + '<button class="btn" id="dzAll" style="margin-top:10px;width:100%">' + (STATE.campAll ? L('Mostrar só as 5 maiores', 'Mostrar solo las 5 mayores') : L('Ver todas as campanhas', 'Ver todas las campañas') + ' (' + rows.length + ')') + '</button></div>';
  var ins = insights(per);
  html += '<div class="card"><h2>' + L('O que os números dizem', 'Lo que dicen los números') + '</h2><p class="mut" style="font-size:12px">' + L('Leituras automáticas: apontam onde olhar, não são certezas.', 'Lecturas automáticas: señalan dónde mirar, no son certezas.') + '</p>' +
    (ins.length ? ins.map(insightHTML).join('') : '<div class="empty">' + L('Sem pontos de atenção no período.', 'Sin puntos de atención.') + '</div>') + '</div>';
  v.innerHTML = html;
  if ($('#dzAll')) $('#dzAll').onclick = function () { STATE.campAll = !STATE.campAll; renderCamp(per); enhanceTables(); reportHeight(); };
  $$('th[data-col]', v).forEach(function (th) { th.onclick = function () { if (STATE.sort.col === th.dataset.col) STATE.sort.dir *= -1; else { STATE.sort.col = th.dataset.col; STATE.sort.dir = th.dataset.col === 'cprNow' || th.dataset.col === 'name' ? 1 : -1; } renderCamp(per); enhanceTables(); }; });
  var sn = $('#dzSortN'); if (sn) { sn.value = /Prev$/.test(STATE.sort.col) ? STATE.sort.col.replace('Prev', 'Now') : STATE.sort.col; sn.onchange = function () { STATE.sort.col = sn.value; STATE.sort.dir = sn.value === 'cprNow' || sn.value === 'name' ? 1 : -1; renderCamp(per); }; }
}

/* ============================== CADASTROS (CRM) ============================== */
/* Valores que a origem manda quando NÃO sabe: template não resolvido
   ({{campaign.name}}), placeholders do Google/Meta ((not set), (Other),
   Unknown) e vazios disfarçados. Tratar como "sem informação" é mais honesto
   que exibir como se fosse uma campanha, e some da cara do cliente. */
function valorVazio(v) {
  var t = String(v == null ? '' : v).trim();
  if (!t) return true;
  if (/^\{\{.*\}\}$/.test(t) || /^\$\{.*\}$/.test(t)) return true;   // template não substituído
  var n = norm(t).replace(/[()\[\]]/g, '').trim();
  return ['unknown', 'undefined', 'null', 'none', 'not set', 'no set', 'nao definido', 'não definido', 'sin definir',
          'other', 'others', 'outro', 'outros', 'n/a', 'na', '-', '--', '0', 'desconhecido', 'desconocido', 'sem informacao'].indexOf(n) > -1;
}
function isQuestionField(h) {
  var n = norm(h); if (!n) return false;
  var skip = ['nome', 'nome completo', 'name', 'full name', 'email', 'e-mail', 'telefone', 'phone', 'celular', 'whatsapp', 'data', 'dia', 'date', 'timestamp', 'created time', 'created at', 'data de cadastro', 'data de inscricao', 'horario de envio', 'id', 'lead id', 'form id', 'campanha', 'campaign', 'conjunto de anuncios', 'ad set', 'adset', 'anuncio', 'ad name', 'conta', 'account', 'plataforma', 'platform'];
  if (skip.indexOf(n) > -1) return false;
  var S = '[ _-]?';   // as planilhas alternam "landing page", "landing_page" e "landing-page"
  if (new RegExp('utm|fbclid|gclid|gbraid|wbraid|^fbc$|^fbp$|event' + S + 'id|ad' + S + 'set|ad' + S + 'group|ad' + S + 'id|match' + S + 'type|network|site' + S + 'source|landing' + S + 'page|referrer|\\bid\\b|pixel|posicionamento|placement|criativo|creative|permalink|url|link|\\bip\\b|user agent|dispositivo|device|e-?mail|telefone|phone|celular|whatsapp|nome|name').test(n)) return false;
  return true;
}
/* Pizza (rosca) para perguntas com poucas respostas distintas. Acima de 6 fatias
   a pizza fica ilegível e o gráfico de barras lê melhor, então o motor troca
   sozinho conforme o número de respostas. */
var DONUT_MAX = 6;
function donutHTML(entries, answered) {
  var S = 170, cx = S / 2, cy = S / 2, rOut = 78, rIn = 48, ac = AC;
  function ponto(r, ang) { var a = (ang - 90) * Math.PI / 180; return [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)]; }
  function fatia(ini, fim) {
    if (fim - ini >= 359.999) {   // fatia única: anel inteiro, arco não fecha sozinho
      return 'M' + cx + ' ' + (cy - rOut) + ' A' + rOut + ' ' + rOut + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - rOut) + ' Z' +
             'M' + cx + ' ' + (cy - rIn) + ' A' + rIn + ' ' + rIn + ' 0 1 0 ' + (cx - 0.01) + ' ' + (cy - rIn) + ' Z';
    }
    var g = fim - ini > 180 ? 1 : 0;
    var a = ponto(rOut, ini), b = ponto(rOut, fim), c = ponto(rIn, fim), d = ponto(rIn, ini);
    return 'M' + a[0] + ' ' + a[1] + ' A' + rOut + ' ' + rOut + ' 0 ' + g + ' 1 ' + b[0] + ' ' + b[1] +
           ' L' + c[0] + ' ' + c[1] + ' A' + rIn + ' ' + rIn + ' 0 ' + g + ' 0 ' + d[0] + ' ' + d[1] + ' Z';
  }
  var ang = 0, paths = '', legend = '';
  entries.forEach(function (e, i) {
    var frac = answered > 0 ? e[1] / answered : 0, gr = frac * 360;
    var op = Math.max(0.3, 1 - i * 0.16);
    if (gr > 0.2) paths += '<path d="' + fatia(ang, ang + gr) + '" fill="' + ac + '" fill-opacity="' + op.toFixed(2) + '"></path>';
    ang += gr;
    legend += '<div class="dlg"><span class="dot" style="background:' + ac + ';opacity:' + op.toFixed(2) + '"></span>' +
      '<span class="dl">' + nameHTML(e[0]) + '</span><b>' + pctf(frac, 0) + '</b><span class="dn">' + e[1] + '</span></div>';
  });
  return '<div class="donut"><svg viewBox="0 0 ' + S + ' ' + S + '" width="' + S + '" height="' + S + '" style="width:' + S + 'px;height:' + S + 'px;flex:0 0 auto;display:block">' +
    paths +
    '<text x="' + cx + '" y="' + (cy - 1) + '" text-anchor="middle" fill="#fff" font-size="21" font-weight="600">' + answered + '</text>' +
    '<text x="' + cx + '" y="' + (cy + 16) + '" text-anchor="middle" fill="#9a9aa6" font-size="11">' + L('respostas', 'respuestas') + '</text></svg>' +
    '<div class="dleg">' + legend + '</div></div>';
}

/* Escolha de quais perguntas do formulário viram gráfico.
   window.DASH.perguntas = ['Investimento']     -> mostra só essas (lista branca)
   window.DASH.perguntasOcultas = ['Andamento'] -> esconde essas
   Sem nenhuma das duas, o motor decide sozinho.
   A comparação ignora acentos e maiúsculas e aceita trecho do nome. */
function campoPermitido(k) {
  var n = norm(k);
  var brancas = D.perguntas, negras = D.perguntasOcultas;
  if (Array.isArray(brancas)) {
    if (!brancas.length) return false;
    return brancas.some(function (q) { var nq = norm(q); return nq && (n === nq || n.indexOf(nq) > -1); });
  }
  if (Array.isArray(negras) && negras.some(function (q) { var nq = norm(q); return nq && (n === nq || n.indexOf(nq) > -1); })) return false;
  return isQuestionField(k);
}
function notaResp(answered, total) {
  if (!total || answered >= total * 0.7) return '';
  return nota(L('Só ', 'Solo ') + pctf(answered / total, 0) + L(' dos cadastros responderam esta pergunta. A distribuição mostra o perfil de quem respondeu, que pode não representar o grupo inteiro.', ' de los registros respondieron esta pregunta. La distribución muestra el perfil de quien respondió, que puede no representar al grupo entero.'));
}
function renderCRM(per) {
  var v = $('#v-crm'); if (!v) return;
  // campanhas presentes na coluna de UTM, para permitir olhar só uma delas
  var camps = {}, temUtm = false;
  STATE.crm.forEach(function (c) { if (c.utm) { temUtm = true; camps[c.utm] = (camps[c.utm] || 0) + 1; } });
  var lista = Object.keys(camps).sort(function (a, b) { return camps[b] - camps[a]; });
  var sel = STATE.crmUtm && lista.indexOf(STATE.crmUtm) > -1 ? STATE.crmUtm : 'all';
  var byUtm = function (c) { return sel === 'all' || c.utm === sel; };

  var now = STATE.crm.filter(function (c) { return inRange(c.date, per.from, per.to) && byUtm(c); }),
      prev = STATE.crm.filter(function (c) { return inRange(c.date, per.pFrom, per.pTo) && byUtm(c); });
  var hasStatus = STATE.sources.some(function (x) { return x.tipo === 'crm' && x.status.hasStatus; });

  // quantos leads do período realmente têm campanha registrada
  function cobUtm() {
    var todos = STATE.crm.filter(function (c) { return inRange(c.date, per.from, per.to); });
    var com = todos.filter(function (c) { return c.utm; }).length;
    if (!todos.length || com === todos.length) return '';
    var porFonte = {};
    todos.forEach(function (c) { var k = c.src || '—'; porFonte[k] = porFonte[k] || { t: 0, c: 0 }; porFonte[k].t++; if (c.utm) porFonte[k].c++; });
    var det = Object.keys(porFonte).map(function (k) { return esc(k) + ': ' + porFonte[k].c + '/' + porFonte[k].t; }).join(' · ');
    return '<p class="mut" style="font-size:12.5px;margin-top:8px">' + com + L(' de ', ' de ') + todos.length + L(' cadastros têm campanha registrada', ' registros tienen campaña registrada') +
      nota(L('Os cadastros sem UTM não entram em nenhum filtro de campanha, então os números por campanha somam menos que o total. Isso vem da captura no formulário, não do relatório. Por fonte: ', 'Los registros sin UTM no entran en ningún filtro de campaña, así que los números por campaña suman menos que el total. Viene de la captura en el formulario, no del reporte. Por fuente: ') + det) + '</p>';
  }

  var filtro = '';
  if (temUtm && lista.length > 1) {
    filtro = '<div class="card"><h3>' + L('Campanha de origem', 'Campaña de origen') + '</h3>' +
      '<p class="mut" style="font-size:12.5px">' + L('Vem da UTM registrada no cadastro. Escolha uma campanha para ver o perfil só dos contatos que ela trouxe.', 'Viene de la UTM registrada en el registro. Elegí una campaña para ver el perfil solo de los contactos que trajo.') + '</p>' +
      cobUtm() +
      '<select class="fsel" data-utm style="margin-top:10px"><option value="all"' + (sel === 'all' ? ' selected' : '') + '>' + L('Todas as campanhas', 'Todas las campañas') + '</option>' +
      lista.map(function (u) { return '<option value="' + esc(u) + '"' + (sel === u ? ' selected' : '') + '>' + esc(pretty(u)) + ' (' + camps[u] + ')</option>'; }).join('') +
      '</select></div>';
  } else if (temUtm && lista.length === 1) {
    filtro = '<div class="card"><p class="mut" style="margin:0;font-size:13px">' + L('Todos os cadastros do período vieram da campanha ', 'Todos los registros del período vinieron de la campaña ') + '<b style="color:var(--tx)">' + nameHTML(pretty(lista[0])) + '</b>.</p></div>';
  }

  var html = filtro + legendHTML(per) +
    '<div class="grid">' + kpi(L('Cadastros recebidos', 'Registros recibidos'), now.length, prev.length, count, false, L('na lista do comercial', 'en la lista de ventas')) +
    kpiSimple(L('Ritmo', 'Ritmo'), perDayTxt(now.length / per.len, L('cadastro', 'registro'), L('cadastros', 'registros')), '', L('antes: ', 'antes: ') + perDayTxt(prev.length / per.pLen, L('cadastro', 'registro'), L('cadastros', 'registros')));
  if (hasStatus) html += kpi(L('Com perfil', 'Con perfil'), now.filter(function (c) { return c.qual; }).length, prev.filter(function (c) { return c.qual; }).length, count) + kpi(L('Viraram venda', 'Se convirtieron en venta'), now.filter(function (c) { return c.sale; }).length, prev.filter(function (c) { return c.sale; }).length, count);
  html += '</div>';
  if (!now.length) html += '<div class="card empty" style="margin-top:12px">' + L('Nenhum cadastro no período selecionado.', 'Ningún registro en el período.') + '</div>';
  else {
    var fields = {}, order = [];
    now.forEach(function (c) { Object.keys(c.raw || {}).forEach(function (k) { if (!fields[k]) { fields[k] = []; order.push(k); } fields[k].push(c.raw[k]); }); });
    var charts = '';
    order.forEach(function (k) {
      if (!campoPermitido(k)) return;
      var counts = {}, answered = 0;
      fields[k].forEach(function (x) { var t = String(x == null ? '' : x).trim(); if (valorVazio(t) || (parseDate(t) && /\d{4}|\d\/\d/.test(t))) return; t = pretty(t); answered++; counts[t] = (counts[t] || 0) + 1; });
      var e = Object.keys(counts).map(function (x) { return [x, counts[x]]; }).sort(function (a, b) { return b[1] - a[1]; });
      /* Independente do nome da coluna: se as respostas são links, identificadores
         numéricos longos ou textos enormes, não é uma pergunta de perfil. */
      if (!(Array.isArray(D.perguntas) && D.perguntas.length)) {
        var tecnico = 0, longos = 0;
        e.forEach(function (x) {
          var t = String(x[0]);
          if (/^https?:\/\//i.test(t) || /^[0-9]{11,}$/.test(t.replace(/\D/g, '')) && /^[\d.,\s-]+$/.test(t)) tecnico++;
          if (t.length > 60) longos++;
        });
        if (tecnico >= Math.max(1, Math.ceil(e.length * 0.4)) || longos >= Math.max(1, Math.ceil(e.length * 0.4))) return;
      }
      // resposta quase sempre diferente = texto livre, não categoria
      if (!e.length || e.length > 15 || (answered > 3 && e.length / answered > 0.6)) return;
      var max = e[0][1];
      var dominante = e[0][1] / (answered || 1);
      if (e.length >= 2 && e.length <= DONUT_MAX && dominante <= 0.9) {
        charts += '<div class="card"><h3>' + esc(pretty(k)) + '</h3><p class="mut" style="font-size:12px">' + answered + L(' de ', ' de ') + now.length + L(' responderam', ' respondieron') + notaResp(answered, now.length) + '</p>' + donutHTML(e, answered) + '</div>';
        return;
      }
      charts += '<div class="card"><h3>' + esc(pretty(k)) + '</h3><p class="mut" style="font-size:12px">' + answered + L(' de ', ' de ') + now.length + L(' responderam', ' respondieron') + notaResp(answered, now.length) + '</p>' +
        e.map(function (x) { return '<div class="brow"><div class="bl"><span>' + nameHTML(x[0]) + '</span><span>' + x[1] + ' · ' + pctf(x[1] / answered, 0) + '</span></div><div class="paceBar" style="margin:0;height:8px"><span style="width:' + (x[1] / max * 100) + '%;background:var(--ac)"></span></div></div>'; }).join('') + '</div>';
    });
    if (charts) html += '<div class="sec">' + L('O que as pessoas responderam', 'Lo que respondieron') + '</div><div class="grid g2">' + charts + '</div>';
  }
  if (!hasStatus) html = whyAlertHTML(['cadastro'], per) + html;
  v.innerHTML = html;
  $$('select[data-utm]', v).forEach(function (b) { b.onchange = function () { STATE.crmUtm = b.value === 'all' ? null : b.value; renderCRM(per); enhanceTables(); reportHeight(); }; });
  bindWhy(v);
}
/* ============================== RITMO DE VERBA ============================== */
function renderPace() {
  var v = $('#v-pace'), today = todayISO(), end = STATE.incToday ? today : addDays(today, -1), ms = monthStart(today), me = monthEnd(today);
  if (end < ms) end = ms;
  var accts = {}; STATE.rows.forEach(function (r) { if (STATE.plat === 'all' || r.platform === STATE.plat) accts[r.account] = r.platform; });
  var budgets = Object.assign({}, D.verbas || {}, store.get('verbas', {}));
  var days = daysBetween(ms, end) + 1, left = daysBetween(end, me);

  // verba total: o que o usuário digitar manda; senão, soma das verbas por conta
  var somaContas = 0; Object.keys(accts).forEach(function (a) { somaContas += +budgets[a] || 0; });
  var total = budgets.__total != null && budgets.__total !== '' ? +budgets.__total : somaContas;

  var gastoTotal = agg(STATE.rows.filter(function (r) { return (STATE.plat === 'all' || r.platform === STATE.plat) && inRange(r.date, ms, end); })).spend;
  var avg = gastoTotal / days, proj = gastoTotal + avg * left, need = left > 0 ? Math.max(total - gastoTotal, 0) / left : 0;
  var sp = total ? Math.min(gastoTotal / total * 100, 100) : 0, pp = total ? Math.min(Math.max(proj - gastoTotal, 0) / total * 100, 100 - sp) : 0;
  var over = total && proj > total * 1.02, under = total && proj < total * 0.9;

  var frase;
  if (!total) frase = L('Informe a verba total do mês para ver a projeção.', 'Informá la inversión total del mes para ver la proyección.');
  else if (over) frase = L('No ritmo atual, o mês fecha em ', 'Al ritmo actual, el mes cierra en ') + '<b>' + money(proj) + '</b>' + L(', acima da verba de ', ', por encima de la inversión de ') + money(total) + L('. Para fechar no valor combinado, o ritmo precisa cair para ', '. Para cerrar en el valor acordado, el ritmo tiene que bajar a ') + '<b>' + money(need) + L(' por dia', ' por día') + '</b>.';
  else if (under) frase = L('No ritmo atual, o mês fecha em ', 'Al ritmo actual, el mes cierra en ') + '<b>' + money(proj) + '</b>' + L(', abaixo da verba de ', ', por debajo de la inversión de ') + money(total) + L('. Dá para investir até ', '. Se puede invertir hasta ') + '<b>' + money(need) + L(' por dia', ' por día') + '</b>' + L(' sem passar do combinado.', ' sin pasar lo acordado.');
  else frase = L('No ritmo atual, o mês fecha em ', 'Al ritmo actual, el mes cierra en ') + '<b>' + money(proj) + '</b>' + L(', dentro da verba de ', ', dentro de la inversión de ') + money(total) + '.';

  var html = '<div class="card hl"><div class="bar"><h2>' + L('Ritmo de verba no mês', 'Ritmo de inversión del mes') + '</h2>' +
    '<label class="mut" style="font-size:12.5px">' + L('Verba total do mês', 'Inversión total del mes') + ' <input type="number" data-b="__total" value="' + (budgets.__total != null && budgets.__total !== '' ? budgets.__total : (somaContas || '')) + '" style="width:130px"></label></div>' +
    '<p class="mut">' + L('Dia ', 'Día ') + days + L(' de ', ' de ') + (days + left) + L('. O valor fica salvo neste navegador.', '. El valor queda guardado en este navegador.') + '</p>' +
    '<div class="paceBar"><span style="width:' + sp + '%;background:var(--ac)"></span><span style="width:' + pp + '%;background:color-mix(in srgb,var(--ac) 35%,transparent)"></span></div>' +
    '<p class="hero" style="font-size:15px;margin:10px 0 0">' + frase + '</p>' +
    '<div class="grid" style="margin-top:12px">' +
    kpiSimple(L('Investido até agora', 'Invertido hasta ahora'), money(gastoTotal), '', total ? nf(sp, 0) + L('% da verba', '% de la inversión') : '') +
    kpiSimple(L('Média por dia', 'Promedio por día'), money(avg)) +
    kpiSimple(L('Projeção de fechamento', 'Proyección de cierre'), money(proj), over ? 'down' : under ? 'warn' : 'up', !total ? '' : over ? L('acima da verba', 'por encima') : under ? L('abaixo da verba', 'por debajo') : L('dentro do planejado', 'dentro de lo planificado')) +
    kpiSimple(L('Ritmo necessário por dia', 'Ritmo necesario por día'), total ? money(need) : '—', '', left > 0 ? plural(left, L('dia restante', 'día restante'), L('dias restantes', 'días restantes')) : L('mês encerrado', 'mes cerrado')) +
    '</div></div>';

  // detalhe por conta, opcional
  var lista = Object.keys(accts).sort();
  if (lista.length) {
    html += '<div class="card"><details><summary>' + L('Ver a divisão por conta de anúncio', 'Ver la división por cuenta de anuncios') + '</summary><p class="mut" style="font-size:12.5px;margin-top:8px">' + L('A verba por conta é opcional: serve só para acompanhar a divisão interna. A projeção acima usa a verba total.', 'La inversión por cuenta es opcional: sirve solo para seguir la división interna. La proyección de arriba usa la inversión total.') + '</p>';
    lista.forEach(function (a) {
      var sA = agg(STATE.rows.filter(function (r) { return r.account === a && inRange(r.date, ms, end); })).spend;
      var bA = +budgets[a] || 0, avgA = sA / days, projA = sA + avgA * left;
      var share = gastoTotal > 0 ? sA / gastoTotal : 0;
      html += '<div style="border-top:1px solid var(--bd);padding-top:12px;margin-top:12px"><div class="bar"><h3>' + (accts[a] === 'google' ? 'Google · ' : 'Meta · ') + esc(a) + '</h3>' +
        '<label class="mut" style="font-size:12.5px">' + L('Verba desta conta', 'Inversión de esta cuenta') + ' <input type="number" data-b="' + esc(a) + '" value="' + (bA || '') + '" style="width:110px"></label></div>' +
        '<div class="grid">' + kpiSimple(L('Gasto no mês', 'Gastado en el mes'), money(sA), '', per100(share) + L('% do total', '% del total')) +
        kpiSimple(L('Média por dia', 'Promedio por día'), money(avgA)) +
        kpiSimple(L('Projeção', 'Proyección'), money(projA), '', bA ? L('verba: ', 'inversión: ') + money(bA) : L('sem verba definida', 'sin inversión definida')) + '</div></div>';
    });
    html += '</details></div>';
  } else html += '<div class="card empty">' + L('Sem contas no filtro.', 'Sin cuentas en el filtro.') + '</div>';

  v.innerHTML = html;
  $$('[data-b]', v).forEach(function (el) { el.onchange = function () { var st = store.get('verbas', {}); st[el.dataset.b] = el.value === '' ? '' : (parseFloat(el.value) || 0); store.set('verbas', st); renderPace(); }; });
}

/* ============================== REDES SOCIAIS (ABA) ============================== */
/* Curtidas, comentários, compartilhamentos e salvamentos separados poluem sem
   informar: o Facebook não entrega nenhum deles e as colunas ficam zeradas. O
   que o cliente entende é engajamento, visualizações e seguidores. Os detalhes
   ficam somados dentro de "engajamento". */
var SOC_METRICS = function () { return [
  { k: 'interactions', n: L('Interações', 'Interacciones'), help: L('Curtidas, comentários, compartilhamentos e salvamentos somados.', 'Me gusta, comentarios, compartidos y guardados sumados.') },
  { k: 'views', n: L('Visualizações', 'Visualizaciones'), help: L('Quantas vezes o conteúdo foi visto.', 'Cuántas veces se vio el contenido.') },
  { k: 'followersNew', n: L('Seguidores ganhos', 'Seguidores ganados'), help: L('Novos seguidores no período.', 'Nuevos seguidores en el período.') }
].filter(function (m) { return STATE.hasSoc[m.k]; }); };

function redeNome(r) { return r === 'instagram' ? 'Instagram' : r === 'facebook' ? 'Facebook' : r === 'meta' ? 'Meta Ads' : cap(r); }

function renderSocial(per) {
  var v = $('#v-social'); if (!v) return;
  if (!hasSocial()) {
    var falhas = STATE.sources.filter(function (x) { return (x.tipo === 'social' || x.tipo === 'engajamento') && x.status && x.status.error; });
    v.innerHTML = '<div class="card empty">' + (falhas.length
      ? L('Não consegui ler as planilhas de redes sociais. Veja a aba Diagnóstico.', 'No pude leer las planillas de redes sociales. Mirá la pestaña Diagnóstico.')
      : L('Sem dados de redes sociais no período selecionado.', 'Sin datos de redes sociales en el período seleccionado.')) + '</div>';
    return;
  }

  var org = socAgg(socIn(per.from, per.to, function (r) { return r.origem === 'organico'; }));
  var orgP = socAgg(socIn(per.pFrom, per.pTo, function (r) { return r.origem === 'organico'; }));
  var pag = socAgg(socIn(per.from, per.to, function (r) { return r.origem === 'pago'; }));
  var pagP = socAgg(socIn(per.pFrom, per.pTo, function (r) { return r.origem === 'pago'; }));
  var temPago = STATE.social.some(function (r) { return r.origem === 'pago'; });

  var totInt = org.interactions + pag.interactions, totIntP = orgP.interactions + pagP.interactions;
  var shareOrg = totInt > 0 ? org.interactions / totInt : null;

  // frase de abertura
  var frase = L('No período, o conteúdo das redes recebeu ', 'En el período, el contenido de las redes recibió ') + '<b>' + count(totInt) + '</b> ' +
    L('interações', 'interacciones');
  if (temPago && shareOrg != null) frase += ': <b>' + count(org.interactions) + '</b> ' + L('vieram do conteúdo publicado', 'vinieron del contenido publicado') +
    L(' e ', ' y ') + '<b>' + count(pag.interactions) + '</b> ' + L('vieram dos anúncios', 'vinieron de los anuncios') +
    ' (' + per100(shareOrg) + L('% orgânico', '% orgánico') + ')';
  frase += '.';
  var ganhos = 0, temGanho = false;
  Object.keys(STATE.socRedes).forEach(function (rd) { var g = followersGain(rd, per.from, per.to); if (g != null) { ganhos += g; temGanho = true; } });
  if (temGanho) frase += ' ' + L('O perfil ganhou ', 'El perfil ganó ') + '<b>' + count(ganhos) + '</b> ' + L('seguidores.', 'seguidores.');

  var dups = STATE.sources.filter(function (x) { return (x.tipo === 'social' || x.tipo === 'engajamento') && x.status && x.status.dup > 0; });
  var ntDup = dups.length ? nota(L('Linhas repetidas foram ignoradas na leitura destas planilhas: ', 'Se ignoraron filas repetidas al leer estas planillas: ') +
    dups.map(function (x) { return esc(x.nome || x.rede) + ' (' + x.status.dup + ')'; }).join(' · ') +
    L('. Os números aqui já estão corrigidos, mas a origem continua gravando repetido.', '. Los números de acá ya están corregidos, pero el origen sigue grabando repetido.')) : '';
  var html = '<div class="card hl"><div class="hero-t">' + L('Redes sociais no período', 'Redes sociales en el período') + ntDup + '</div><p class="hero" style="margin:0">' + frase + '</p></div>';

  // composição orgânico x pago
  if (temPago && totInt > 0) {
    var wo = org.interactions / totInt * 100;
    html += '<div class="card"><h2>' + L('De onde vem o engajamento', 'De dónde viene el engagement') + '</h2>' +
      '<p class="mut">' + L('Conteúdo publicado é o que o perfil conquista sozinho. Anúncio é o que a verba comprou. Os dois contam, mas dizem coisas diferentes.', 'El contenido publicado es lo que el perfil logra solo. El anuncio es lo que la inversión compró. Los dos cuentan, pero dicen cosas distintas.') + '</p>' +
      '<div class="paceBar" style="margin:14px 0 10px"><span style="width:' + wo + '%;background:var(--ac)"></span><span style="width:' + (100 - wo) + '%;background:color-mix(in srgb,var(--ac) 30%,transparent)"></span></div>' +
      '<div class="grid">' +
      kpi(L('Interações do conteúdo', 'Interacciones del contenido'), org.interactions, orgP.interactions, count, false, L('Orgânico: sem verba por trás.', 'Orgánico: sin inversión detrás.')) +
      kpi(L('Interações de anúncio', 'Interacciones de anuncio'), pag.interactions, pagP.interactions, count, false, L('Pago: veio de campanha.', 'Pago: vino de campaña.')) +
      kpi(L('Total', 'Total'), totInt, totIntP, count, false) + '</div></div>';
  }

  // KPIs orgânicos
  var ms = SOC_METRICS(), grid = '';
  ms.forEach(function (m) { if (ok(org[m.k])) grid += kpi(m.n, org[m.k], orgP[m.k], count, false, m.help); });
  if (grid) html += '<div class="card"><h2>' + L('Conteúdo publicado', 'Contenido publicado') + '</h2>' + legendHTML(per) + '<div class="grid">' + grid + '</div></div>';

  // gráfico
  if (ms.length) html += '<div class="card"><h2>' + L('Evolução diária', 'Evolución diaria') + '</h2><div id="dzSocChart"></div></div>';

  // por rede
  var redes = Object.keys(STATE.socRedes).filter(function (r) { return r !== 'meta'; });
  // só entram colunas em que alguma rede tem número
  var cols = ms.filter(function (m) {
    return m.k !== 'followersNew' && redes.some(function (rd) { var a = socAgg(socIn(per.from, per.to, function (r) { return r.rede === rd; })); return ok(a[m.k]) && a[m.k] > 0; });
  });
  if (redes.length) {
    html += '<div class="card"><h2>' + L('Por rede', 'Por red') + '</h2>' + tableWrap('<table><thead><tr><th>' + L('Rede', 'Red') + '</th>' +
      cols.map(function (m) { return '<th>' + m.n + '</th>'; }).join('') + '<th>' + L('Seguidores ganhos', 'Seguidores ganados') + '</th><th>' + L('Seguidores hoje', 'Seguidores hoy') + '</th></tr></thead><tbody>' +
      redes.map(function (rd) {
        var a = socAgg(socIn(per.from, per.to, function (r) { return r.rede === rd; }));
        var g = followersGain(rd, per.from, per.to);
        var snaps = socIn(per.from, per.to, function (r) { return r.rede === rd && ok(r.followersTotal) && r.followersTotal > 0; });
        var hoje = snaps.length ? snaps[snaps.length - 1].followersTotal : null;
        var congelado = STATE.sources.some(function (x) { return norm(x.rede || '') === rd && x.status && x.status.followersFrozen; });
        var diasComDado = socIn(per.from, per.to, function (r) { return r.rede === rd; }).reduce(function (a, r) { if (a.indexOf(r.date) < 0) a.push(r.date); return a; }, []).length;
        var nt = '';
        if (congelado) nt += nota(L('A extração repete o total de seguidores de hoje em todas as linhas, então esse campo é um retrato e não uma curva. O ganho do período vem do campo diário de novos seguidores, quando existe.', 'La extracción repite el total de seguidores de hoy en todas las filas, así que ese campo es una foto y no una curva. La ganancia del período viene del campo diario de nuevos seguidores, cuando existe.'));
        if (diasComDado > 0 && diasComDado < per.len * 0.8) nt += nota(L('Há dado em ', 'Hay dato en ') + diasComDado + L(' dos ', ' de los ') + per.len + L(' dias do período. Ou a extração só traz dias com publicação, ou houve dias sem postar: nos dois casos a média diária fica distorcida.', ' días del período. O la extracción solo trae días con publicación, o hubo días sin postear: en los dos casos el promedio diario queda distorsionado.'));
        return '<tr><td>' + redeNome(rd) + nt + '</td>' + cols.map(function (m) { return '<td>' + (ok(a[m.k]) && a[m.k] > 0 ? count(a[m.k]) : '—') + '</td>'; }).join('') +
          '<td>' + (g == null ? '—' : count(g)) + '</td><td>' + (hoje == null ? '—' : count(hoje)) + '</td></tr>';
      }).join('') + '</tbody></table>') +
      '<p class="mut" style="font-size:12.5px;margin-top:10px">' + L('“Seguidores hoje” é o retrato mais recente do período. Quando a extração repete o mesmo total em todos os dias, esse número serve como retrato, não como curva.', '“Seguidores hoy” es la foto más reciente del período. Cuando la extracción repite el mismo total todos los días, ese número sirve como foto, no como curva.') + '</p></div>';
  }

  v.innerHTML = html;

  var host = $('#dzSocChart', v);
  if (host && ms.length) {
    var mk = STATE.socMetric && ms.some(function (m) { return m.k === STATE.socMetric; }) ? STATE.socMetric : ms[0].k;
    host.innerHTML = '<div class="hsw"><div class="tw-hint">' + L('arraste para ver mais →', 'deslizá para ver más →') + '</div><div class="pills scrollx hs" style="margin-bottom:10px">' +
      ms.map(function (m) { return '<button class="pill' + (m.k === mk ? ' on' : '') + '" data-sm="' + m.k + '">' + m.n + '</button>'; }).join('') + '</div></div>' + legendHTML(per) + '<div class="chart"></div>';
    var days = [], daysP = [];
    for (var d = per.from; d <= per.to; d = addDays(d, 1)) days.push(d);
    for (var d2 = per.pFrom; d2 <= per.pTo; d2 = addDays(d2, 1)) daysP.push(d2);
    function serie(list) {
      return list.map(function (dd) {
        var rows = STATE.social.filter(function (r) { return r.date === dd && r.origem === 'organico'; });
        if (!rows.length) return null;
        return rows.reduce(function (a, r) { return a + (ok(r[mk]) ? r[mk] : 0); }, 0);
      });
    }
    drawChart($('.chart', host), { labels: days.map(function (x) { return fmtD(x); }), now: serie(days), prev: serie(daysP),
      prevLabels: daysP.map(function (x) { return fmtD(x); }), proj: null, fmt: count, fmtAxis: count });
    $$('[data-sm]', host).forEach(function (b) { b.onclick = function () { STATE.socMetric = b.dataset.sm; renderSocial(per); enhanceTables(); }; });
  }
}

/* ============================== RESUMO WHATSAPP ============================== */
function renderWa(per) {
  var v = $('#v-wa'), cur = agg(filtered(per.from, per.to)), prev = agg(filtered(per.pFrom, per.pTo));
  var lines = ['*' + (D.cliente || '') + ' · ' + L('Resumo de mídia paga', 'Resumen de medios pagos') + '*', fmtD(per.from, 1) + ' → ' + fmtD(per.to, 1), ''];
  function dl(c, p, down) { var d = deltaTxt(c, p); if (!d) return ''; return ' (' + d.txt + ')'; }
  lines.push('💰 ' + L('Investimento', 'Inversión') + ': ' + money(cur.spend) + dl(cur.spend, prev.spend));
  lines.push('👀 ' + L('Impressões', 'Impresiones') + ': ' + count(cur.impressions) + ' · ' + L('Cliques', 'Clics') + ': ' + count(cur.clicks));
  funnelsPresent().forEach(function (f) {
    if (f === 'outros' || f === 'trafego') return;
    var F = buildFunnel(f, per), rk = F.resKey, c = F.cur[rk], p = F.prev[rk], cpr = c ? F.cur.spend / c : null, ppr = p ? F.prev.spend / p : null;
    lines.push(''); lines.push('▸ *' + FNAME(f) + '*');
    lines.push(RNAME(f).charAt(0).toUpperCase() + RNAME(f).slice(1) + ': ' + count(c) + dl(c, p) + ' · ' + L('custo por ', 'costo por ') + RNAME(f, false) + ': ' + money(cpr) + dl(cpr, ppr));
    if (f === 'vendas' && STATE.has.revenue) lines.push(L('Receita', 'Ingresos') + ': ' + money(F.cur.revenue) + ' · ROAS ' + xf(F.cur.roas));
  });
  var ins = insights(per).filter(function (i) { return i.t !== 'dado'; }).slice(0, 3);
  if (ins.length) { lines.push(''); lines.push('*' + L('Destaques', 'Destacados') + '*'); ins.forEach(function (i) { lines.push((i.t === 'pos' ? '✅ ' : '⚠️ ') + i.title); }); }
  var text = lines.join('\n');
  v.innerHTML = '<div class="card"><div class="bar"><h2>' + L('Resumo para WhatsApp', 'Resumen para WhatsApp') + '</h2><button class="btn pri" id="dzCopy">' + L('Copiar texto', 'Copiar texto') + '</button></div><p class="mut">' + L('Texto pronto com o período e os filtros atuais.', 'Texto listo con el período y los filtros actuales.') + '</p><textarea id="dzWaTxt" style="min-height:280px">' + esc(text) + '</textarea></div>';
  $('#dzCopy').onclick = function () { var t = $('#dzWaTxt'); t.select(); try { navigator.clipboard.writeText(t.value); } catch (e) { document.execCommand('copy'); } this.textContent = '✓ ' + L('Copiado', 'Copiado'); };
}

/* ============================== DIAGNÓSTICO ============================== */
function renderDiag() {
  var v = $('#v-diag'), html = '<div class="card"><h2>' + L('Saúde das fontes', 'Salud de las fuentes') + '</h2><p class="mut">' + L('Se uma planilha não carregar, cole o conteúdo CSV no campo da fonte como alternativa temporária.', 'Si una planilla no carga, pegá el contenido CSV en el campo de la fuente como alternativa temporal.') + '</p></div>';
  STATE.sources.forEach(function (s) {
    var st = s.status || {}, map = st.map || {}, h = st.headers || [];
    html += '<div class="card"><div class="bar"><h3>' + (st.ok ? '✓ ' : '✗ ') + esc(s.nome || s.conta || s.plataforma || s.tipo) + ' <span class="tag">' + esc(s.tipo) + (s.funil ? ' · ' + esc(s.funil) : '') + '</span></h3><span class="' + (st.ok ? 'up' : 'down') + '" style="font-size:12.5px">' + (st.ok ? count(st.rows) + L(' linhas', ' filas') + (st.dup ? ' · ' + st.dup + L(' duplicadas ignoradas', ' duplicadas ignoradas') : '') + (st.fromPaste ? ' · ' + L('usando CSV colado', 'usando CSV pegado') : '') : esc(st.error || '')) + '</span></div>';
    if (st.dateCol) html += '<p class="mut" style="font-size:12px;margin-top:8px">' + L('Coluna de data em uso: ', 'Columna de fecha en uso: ') + '<b style="color:var(--tx)">' + esc(st.dateCol) + '</b>' + (st.dateScore != null && st.dateScore < 0.95 ? ' · ' + pctf(st.dateScore, 0) + L(' das linhas com data válida', ' de las filas con fecha válida') : '') + '</p>';
    if (h.length) html += '<p class="mut" style="font-size:12px;margin-top:8px">' + L('Colunas reconhecidas: ', 'Columnas reconocidas: ') + Object.keys(map).filter(function (k) { return map[k] != null; }).map(function (k) { return '<b style="color:var(--tx)">' + k + '</b> ← ' + esc(h[map[k]]); }).join(' · ') + (st.locale ? ' · ' + L('decimal: ', 'decimal: ') + (st.locale === 'comma' ? '1.234,56' : '1,234.56') : '') + (s.tipo === 'crm' ? ' · ' + (st.hasStatus ? L('coluna de status encontrada', 'columna de estado encontrada') : L('sem coluna de status', 'sin columna de estado')) : '') + '</p>';
    html += '<details style="margin-top:8px"><summary class="mut" style="cursor:pointer;font-size:12.5px">' + L('Colar CSV manualmente', 'Pegar CSV manualmente') + '</summary><textarea data-paste="' + s.id + '" placeholder="CSV">' + esc(store.get('paste_' + s.id, '')) + '</textarea><div class="row" style="margin-top:6px"><button class="btn" data-save="' + s.id + '">' + L('Usar este CSV', 'Usar este CSV') + '</button><button class="btn" data-clear="' + s.id + '">' + L('Voltar à leitura automática', 'Volver a la lectura automática') + '</button></div></details></div>';
  });
  var cls = Object.keys(STATE.camp);
  if (cls.length) html += '<div class="card"><h3>' + L('Classificação das campanhas', 'Clasificación de campañas') + '</h3><p class="mut" style="font-size:12.5px">' + L('Se alguma estiver errada, ajuste em window.DASH.objetivos (trecho do nome → funil).', 'Si alguna está mal, ajustá en window.DASH.objetivos (parte del nombre → embudo).') + '</p>' + tableWrap('<table><tbody>' + cls.sort().map(function (k) { var p = k.split('||'); return '<tr><td>' + esc(p[2]) + ' <small class="mut">' + esc(p[1]) + '</small></td><td>' + FNAME(STATE.camp[k].funnel) + '</td><td class="prev">' + esc(STATE.camp[k].why) + '</td></tr>'; }).join('') + '</tbody></table>') + '</div>';
  v.innerHTML = html;
  $$('[data-save]', v).forEach(function (b) { b.onclick = function () { store.set('paste_' + b.dataset.save, $('[data-paste="' + b.dataset.save + '"]', v).value); run(); }; });
  $$('[data-clear]', v).forEach(function (b) { b.onclick = function () { store.del('paste_' + b.dataset.clear); run(); }; });
}

/* ============================== ORQUESTRAÇÃO ============================== */
function syncBar(per) {
  $$('#dzPresets .pill').forEach(function (b) { b.classList.toggle('on', b.dataset.p === STATE.preset); });
  $('#dzCustom').style.display = STATE.preset === 'custom' ? '' : 'none';
  $('#dzToday').checked = STATE.incToday;
  var plats = {}; STATE.rows.forEach(function (r) { plats[r.platform] = 1; });
  var pl = Object.keys(plats);
  $('#dzPlat').style.display = pl.length > 1 ? '' : 'none';
  $('#dzPlat').innerHTML = '<option value="all">' + L('Todas as plataformas', 'Todas las plataformas') + '</option>' + pl.map(function (p) { return '<option value="' + p + '"' + (STATE.plat === p ? ' selected' : '') + '>' + (p === 'google' ? 'Google Ads' : 'Meta Ads') + '</option>'; }).join('');
  var ac = {}; STATE.rows.forEach(function (r) { if (STATE.plat === 'all' || r.platform === STATE.plat) ac[r.account] = 1; });
  var al = Object.keys(ac).sort();
  $('#dzAcct').style.display = al.length > 1 ? '' : 'none';
  $('#dzAcct').innerHTML = '<option value="all">' + L('Todas as contas', 'Todas las cuentas') + '</option>' + al.map(function (a) { return '<option' + (STATE.acct === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('');
  $('#dzPer').innerHTML = '<b style="color:var(--tx)">' + fmtD(per.from) + ' → ' + fmtD(per.to) + '</b> · ' + L('comparado com', 'comparado con') + ' ' + fmtD(per.pFrom) + ' → ' + fmtD(per.pTo) + (per.isMtd ? ' (' + L('mês anterior inteiro', 'mes anterior completo') + ')' : '');
  $('#dzUpd').textContent = STATE.loadedAt ? L('Dados lidos em ', 'Datos leídos el ') + STATE.loadedAt.toLocaleString(LOC()) + (lastDataDate() ? ' · ' + L('último dia com dados: ', 'último día con datos: ') + fmtD(lastDataDate(), 1) : '') : '';
}
function renderAll() {
  var per = resolvePeriod();
  syncBar(per);
  [['overview', function () { renderOverview(per); }], ['funnels', function () { renderFunnels(per); }], ['sim', function () { renderSim(per); }], ['camp', function () { renderCamp(per); }], ['crm', function () { renderCRM(per); }], ['pace', renderPace], ['social', function () { renderSocial(per); }], ['wa', function () { renderWa(per); }], ['diag', renderDiag]].forEach(function (x) {
    try { x[1](); } catch (e) { var el = $('#v-' + x[0]); if (el) el.innerHTML = '<div class="card down">' + L('Erro ao montar esta aba: ', 'Error al armar esta pestaña: ') + esc(e.message) + '</div>'; if (window.console) console.error(e); }
  });
  setTimeout(function () { enhanceTables(); reportHeight(); }, 50);
}
function run() {
  $('#dzUpd').textContent = L('Lendo as planilhas publicadas…', 'Leyendo las planillas publicadas…');
  return loadAll().then(renderAll);
}
function init() {
  injectStyle();
  initSources();
  shell();
  lockThen(run);
  window.addEventListener('resize', function () { setTimeout(function () { enhanceTables(); reportHeight(); }, 100); });
}
window.DASH_MOTOR = { version: VERSION, state: STATE, run: run, _test: { resolvePeriod: resolvePeriod, buildFunnel: buildFunnel, insights: insights, scenarioRates: scenarioRates, agg: agg, filtered: filtered, classifyCampaigns: classifyCampaigns } };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
