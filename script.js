let CFG = { url: localStorage.getItem('sb_url') || '', key: localStorage.getItem('sb_key') || '', bot: localStorage.getItem('tg_bot') || '' };
let wlData = [], chData = [], selCh = null, botInterval = null;

/* ── CONFIG ── */
function openCfg() { 
  document.getElementById('c-url').value = CFG.url; 
  document.getElementById('c-key').value = CFG.key; 
  document.getElementById('c-bot').value = CFG.bot; 
  openM('m-cfg'); 
}

function saveCfg() {
  CFG.url = document.getElementById('c-url').value.trim();
  CFG.key = document.getElementById('c-key').value.trim();
  CFG.bot = document.getElementById('c-bot').value.trim();
  localStorage.setItem('sb_url', CFG.url); 
  localStorage.setItem('sb_key', CFG.key); 
  localStorage.setItem('tg_bot', CFG.bot);
  closeM('m-cfg'); 
  toast('Settings saved', 'success'); 
  loadAll();
}

/* ── SUPABASE ── */
async function sb(path, opts = {}) {
  if (!CFG.url || !CFG.key) { toast('Configure Supabase in Settings', 'error'); throw new Error('no-cfg'); }
  const res = await fetch(CFG.url + '/rest/v1/' + path, { headers: { 'apikey': CFG.key, 'Authorization': 'Bearer ' + CFG.key, 'Content-Type': 'application/json', 'Prefer': opts.prefer || 'return=representation' }, ...opts });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || res.statusText); }
  const t = await res.text(); return t ? JSON.parse(t) : [];
}

/* ── BOT STATUS ── */
/* ── BOT STATUS (REAL-TIME UPDATE) ── */
async function checkBot() {
  const lbl = document.getElementById('s-bot-lbl');
  const val = document.getElementById('s-bot-val');
  const ico = document.getElementById('s-bot-ico');
  const wrap = ico.closest('.status-ico-wrap');

  if (!CFG.bot) {
    lbl.textContent = 'Bot Status';
    val.textContent = 'NO TOKEN';
    val.className = 'side-value status-no-token';
    wrap.className = 'status-ico-wrap pulse-yellow';
    return;
  }

  try {
    // Используем AbortController, чтобы долгий запрос не вешал статус при обрыве сети
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://api.telegram.org/bot' + CFG.bot + '/getMe', { signal: controller.signal });
    clearTimeout(timeoutId);
    
    const data = await res.json();

    if (data.ok) {
      lbl.textContent = '@' + data.result.username;
      val.textContent = 'ONLINE';
      val.className = 'side-value status-online';
      wrap.className = 'status-ico-wrap pulse-green';
    } else {
      // Если Telegram ответил, но data.ok === false -> Токен изменён или заблокирован
      lbl.textContent = 'Bot Status';
      val.textContent = 'BAD TOKEN';
      val.className = 'side-value status-bad-token';
      wrap.className = 'status-ico-wrap pulse-red';
    }
  } catch (e) {
    // Если сработал abort (таймаут) или нет интернета вообще
    lbl.textContent = 'Bot Status';
    val.textContent = 'OFFLINE';
    val.className = 'side-value status-offline';
    wrap.className = 'status-ico-wrap pulse-gray';
  }
}

function startBotCheck() {
  if (botInterval) clearInterval(botInterval);
  checkBot();
  // Уменьшаем интервал до 4 секунд для эффекта "реального времени"
  botInterval = setInterval(checkBot, 4000); 
}

/* ── NAV (ИЗМЕНЕНО ПОД НОВЫЕ КЛАССЫ ИЗ DSF.png) ── */
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-menu-item').forEach(n => n.classList.remove('active'));
  
  document.getElementById('page-' + id).classList.add('active');
  
  const targetNav = document.querySelector(`.nav-menu-item[onclick="goPage('${id}')"]`);
  if (targetNav) targetNav.classList.add('active');

  if (id === 'send') renderSendCh();
}

/* ── COPY ── */
function copyText(t) { navigator.clipboard.writeText(t).then(() => toast('Copied!', 'success')).catch(() => toast('Failed', 'error')); }

/* ── WHITELIST ── */
async function loadWL() {
  document.getElementById('wl-tbl').innerHTML = '<tr class="loader-row no-hover"><td colspan="4"><div class="spin"></div></td></tr>';
  document.getElementById('d-wl').innerHTML = '<tr class="loader-row no-hover"><td colspan="3"><div class="spin"></div></td></tr>';
  try {
    wlData = await sb('whitelist?order=created_at.desc');
    renderWL(wlData); renderDashWL(wlData);
    document.getElementById('s-wl').textContent = wlData.length;
  } catch (e) { if (e.message !== 'no-cfg') toast('WL error: ' + e.message, 'error'); }
}

function renderWL(data) {
  const tb = document.getElementById('wl-tbl');
  if (!data.length) { tb.innerHTML = '<tr class="no-hover"><td colspan="4"><div class="empty">👥<br>No users in whitelist</div></td></tr>'; return; }
  tb.innerHTML = data.map((r, i) => `<tr>
    <td><span class="badge b-blue">${i + 1}</span></td>
    <td><code style="font-size:11px">${r.user_id}</code> <button class="btn-copy" onclick="copyText('${r.user_id}')" title="Copy"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></td>
    <td style="color:var(--muted2);font-size:10px">${r.created_at ? new Date(r.created_at).toLocaleString('en') : '—'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="confirmDel('user',${r.user_id})"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete</button></td>
  </tr>`).join('');
}

function renderDashWL(data) {
  const tb = document.getElementById('d-wl'), top = data.slice(0, 5);
  if (!top.length) { tb.innerHTML = '<tr class="no-hover"><td colspan="3"><div class="empty">No data</div></td></tr>'; return; }
  tb.innerHTML = top.map((r, i) => `<tr><td><span class="badge b-blue">${i + 1}</span></td><td><code style="font-size:11px">${r.user_id}</code></td><td style="color:var(--muted2);font-size:10px">${r.created_at ? new Date(r.created_at).toLocaleTimeString('en') : '—'}</td></tr>`).join('');
}

function filterWL() { const q = document.getElementById('wl-search').value.toLowerCase(); renderWL(wlData.filter(r => String(r.user_id).includes(q))); }
function openAddUser() { document.getElementById('n-uid').value = ''; openM('m-add-user'); }
async function addUser() {
  const id = document.getElementById('n-uid').value.trim();
  if (!id || isNaN(id)) { toast('Enter a valid numeric ID', 'error'); return; }
  try {
    await sb('whitelist', { method: 'POST', body: JSON.stringify({ user_id: parseInt(id) }) });
    closeM('m-add-user'); toast('User ' + id + ' added', 'success'); loadWL();
  }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function delUser(uid) {
  try { await sb('whitelist?user_id=eq.' + uid, { method: 'DELETE', prefer: 'return=minimal' }); toast('User ' + uid + ' removed', 'info'); loadWL(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

/* ── CHANNELS ── */
async function loadCH() {
  document.getElementById('ch-tbl').innerHTML = '<tr class="loader-row no-hover"><td colspan="5"><div class="spin"></div></td></tr>';
  document.getElementById('d-ch').innerHTML = '<tr class="loader-row no-hover"><td colspan="3"><div class="spin"></div></td></tr>';
  try {
    chData = await sb('channels?order=created_at.desc');
    renderCH(chData); renderDashCH(chData);
    document.getElementById('s-ch').textContent = chData.length;
  } catch (e) { if (e.message !== 'no-cfg') toast('Channels error: ' + e.message, 'error'); }
}

function renderCH(data) {
  const tb = document.getElementById('ch-tbl');
  if (!data.length) { tb.innerHTML = '<tr class="no-hover"><td colspan="5"><div class="empty">📡<br>No channels added</div></td></tr>'; return; }
  tb.innerHTML = data.map((r, i) => `<tr>
    <td><span class="badge b-blue">${i + 1}</span></td>
    <td><b>${r.title || '—'}</b></td>
    <td><code style="font-size:10px;color:var(--muted2)">${r.channel_id}</code> <button class="btn-copy" onclick="copyText('${r.channel_id}')" title="Copy"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></button></td>
    <td>${r.username ? `<a href="https://t.me/${r.username}" target="_blank" style="color:#c4b5fd;text-decoration:none"><span class="badge b-green">@${r.username}</span></a>` : '<span style="color:var(--muted)">—</span>'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="confirmDel('channel','${r.channel_id}')"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Delete</button></td>
  </tr>`).join('');
}

function renderDashCH(data) {
  const tb = document.getElementById('d-ch'), top = data.slice(0, 5);
  if (!top.length) { tb.innerHTML = '<tr class="no-hover"><td colspan="3"><div class="empty">No data</div></td></tr>'; return; }
  tb.innerHTML = top.map((r, i) => `<tr>
    <td><span class="badge b-blue">${i + 1}</span></td>
    <td>${r.title || '—'}</td>
    <td><code style="font-size:10px;color:var(--muted2)">${r.channel_id}</code></td>
  </tr>`).join('');
}

function filterCH() { const q = document.getElementById('ch-search').value.toLowerCase(); renderCH(chData.filter(r => (r.title || '').toLowerCase().includes(q) || String(r.channel_id).includes(q) || (r.username || '').toLowerCase().includes(q))); }
function openAddCh() { ['n-chid', 'n-chname', 'n-chuser'].forEach(id => document.getElementById(id).value = ''); openM('m-add-ch'); }
async function addCh() {
  const id = document.getElementById('n-chid').value.trim(), title = document.getElementById('n-chname').value.trim(), uname = document.getElementById('n-chuser').value.trim().replace('@', '');
  if (!id || !title) { toast('Fill in ID and name', 'error'); return; }
  try {
    await sb('channels', { method: 'POST', body: JSON.stringify({ channel_id: id, title, username: uname }) });
    closeM('m-add-ch'); toast('Channel added', 'success'); loadCH();
  }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

async function delCh(cid) {
  try { await sb('channels?channel_id=eq.' + encodeURIComponent(cid), { method: 'DELETE', prefer: 'return=minimal' }); toast('Channel removed', 'info'); loadCH(); }
  catch (e) { toast('Error: ' + e.message, 'error'); }
}

/* ── CONFIRM ── */
function confirmDel(type, id) {
  document.getElementById('conf-title').textContent = type === 'user' ? 'Remove user ' + id + '?' : 'Remove channel?';
  document.getElementById('conf-msg').textContent = type === 'user' ? 'User ' + id + ' will lose bot access.' : 'Channel ' + id + ' will be removed.';
  document.getElementById('conf-ok').onclick = () => { closeM('m-confirm'); type === 'user' ? delUser(id) : delCh(id); };
  openM('m-confirm');
}

/* ── SEND MESSAGE ── */
function renderSendCh() {
  const el = document.getElementById('send-chs');
  if (!chData.length) { el.innerHTML = '<div class="empty" style="width:100%;grid-column:1/-1">📡<br>No channels. Add them in the Channels tab.</div>'; return; }
  el.innerHTML = chData.map(ch => `<div class="ch-card ${selCh && selCh.channel_id === ch.channel_id ? 'sel' : ''}" onclick='selectCh(${JSON.stringify(ch).replace(/'/g, "&#39;")})'>
    <div class="ch-name"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.17h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${ch.title || 'Untitled'}</div>
    <div class="ch-id">${ch.username ? '@' + ch.username : ch.channel_id}</div>
  </div>`).join('');
}

function selectCh(ch) { selCh = ch; renderSendCh(); document.getElementById('send-ch-label').textContent = ch.username ? '@' + ch.username : ch.title; document.getElementById('send-form').style.display = 'block'; updatePreview(); }

function updatePreview() {
  const txt = document.getElementById('msg-txt').value; if (!selCh) return;
  const name = selCh.username ? '@' + selCh.username : selCh.title;
  const link = selCh.username ? 'https://t.me/' + selCh.username : 'https://t.me/c/' + String(selCh.channel_id).replace('-100', '');
  document.getElementById('msg-preview').innerHTML = (txt || '') + `\n\n<a href="${link}">📢 Subscribe to ${name}</a>`;
}

async function sendMsg() {
  const txt = document.getElementById('msg-txt').value.trim();
  if (!txt) { toast('Write a message first', 'error'); return; }
  if (!selCh) { toast('Select a channel', 'error'); return; }
  if (!CFG.bot) { toast('Set Bot Token in Settings', 'error'); return; }
  const name = selCh.username ? '@' + selCh.username : selCh.title;
  const link = selCh.username ? 'https://t.me/' + selCh.username : 'https://t.me/c/' + String(selCh.channel_id).replace('-100', '');
  const final = txt + `\n\n<a href="${link}">📢 Subscribe to ${name}</a>`;
  const btn = document.getElementById('send-btn'); btn.innerHTML = '<div class="spin spin-sm"></div> Sending...'; btn.disabled = true;
  try {
    const res = await fetch('https://api.telegram.org/bot' + CFG.bot + '/sendMessage', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: selCh.channel_id, text: final, parse_mode: 'HTML' }) });
    const data = await res.json();
    if (data.ok) { toast('Sent to ' + name, 'success'); clearSend(); } else toast('TG: ' + data.description, 'error');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
  finally { btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send to channel'; btn.disabled = false; }
}

function clearSend() { selCh = null; document.getElementById('msg-txt').value = ''; document.getElementById('msg-preview').innerHTML = 'Write a message above...'; document.getElementById('send-form').style.display = 'none'; renderSendCh(); }

/* ── MODAL ── */
function openM(id) { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-wrap').forEach(el => el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); }));

/* ── TOAST ── */
function toast(msg, type = 'info') { const c = document.getElementById('toasts'), t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; c.appendChild(t); setTimeout(() => t.style.opacity = '0', 2600); setTimeout(() => t.remove(), 3100); }

/* ── INIT ── */
async function loadAll() { document.getElementById('s-time').textContent = new Date().toLocaleTimeString('en'); startBotCheck(); await Promise.all([loadWL(),loadCH()]); }

if (!CFG.url || !CFG.key) { setTimeout(() => { toast('Configure Supabase in Settings', 'info'); openCfg(); }, 500); }
else loadAll();