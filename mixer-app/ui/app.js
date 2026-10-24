const $ = id => document.getElementById(id);
const api = window.mixer;
let config, connected = false, activeChannel = 0, activeTab = 'programs', sessions = [], endpoints = [], installed = [], icons = [], lastChanged = 0, toastTimer;
let iconById=new Map(),iconCategory='popular',iconResults=[],iconLimit=0,recentIcons=[];
const sliders = [], assigns = [];
const iconCache = new Map();
const layoutNames = ['Colunas', 'Linhas', 'Canal em destaque'];
function notify(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, 5000); }
function errorMessage(error){return String(error.message||error).replace(/^Error invoking remote method ['"][^'"]+['"]: (?:Error: )?/,'').replace(/^Error: /,'');}
function report(error) { notify(errorMessage(error)); }
function svgIcon(name) {
  const icon = iconById.get(name);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  if(!icon)return svg;
  svg.setAttribute('viewBox', `0 0 ${icon.w} ${icon.h}`); svg.setAttribute('aria-hidden', 'true');
  for (const d of Array.isArray(icon.path) ? icon.path : [icon.path]) { const p = document.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', d); svg.append(p); }
  return svg;
}
async function rasterIcon(name) {
  if (iconCache.has(name)) return iconCache.get(name);
  const svg = svgIcon(name); svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); svg.setAttribute('width', '64'); svg.setAttribute('height', '64'); svg.setAttribute('fill', 'white');
  const image = new Image(); image.src = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64; canvas.getContext('2d').drawImage(image, 0, 0); const png = canvas.toDataURL(); iconCache.set(name, png); return png;
}
async function toBitmap(icon) {
  if (!icon) return Array(32).fill(0);
  const image = new Image(); image.src = icon; await image.decode();
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 16, 16);
  const data = ctx.getImageData(0, 0, 16, 16).data, bytes = Array(32).fill(0);
  for (let i = 0; i < 256; i++) { const p = i * 4; if (data[p + 3] > 100 && .299 * data[p] + .587 * data[p + 1] + .114 * data[p + 2] > 90) bytes[(i >> 4) * 2 + ((i & 15) >> 3)] |= 1 << (i & 7); }
  return bytes;
}
function drawBitmap(ctx, bitmap, x, y, channel) {
  if (!bitmap?.some(Boolean)) return;
  for (let row = 0; row < 16; row++) for (let col = 0; col < 16; col++) if (bitmap[row * 2 + (col >> 3)] & (1 << (col & 7))) ctx.fillRect(x + col, y + row, 1, 1);
}
function drawScreen(canvas, layout) {
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 128, 64); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.font = '8px monospace';
  config.channels.forEach((c, i) => {
    if (layout === 0) { const x = i * 32; drawBitmap(ctx, c.bitmap, x + 8, 2, i); ctx.strokeRect(x + 11.5, 23.5, 8, 25); const h = Math.round(c.volume * 23 / 100); ctx.fillRect(x + 13, 48 - h, 5, h); ctx.fillText(String(c.volume).padStart(3, ' '), x + 5, 61); }
    else if (layout === 1) { drawBitmap(ctx, c.bitmap, 0, i * 16, i); ctx.strokeRect(23.5, i * 16 + 4.5, 74, 7); ctx.fillRect(25, i * 16 + 6, Math.round(c.volume * 70 / 100), 4); ctx.fillText(String(c.volume).padStart(3, ' '), 104, i * 16 + 11); }
  });
  if (layout === 2) { const c = config.channels[lastChanged]; drawBitmap(ctx, c.bitmap, 8, 10, lastChanged); ctx.font = '23px monospace'; ctx.fillText(`${c.volume}%`, 42, 29); ctx.fillRect(8, 36, Math.round(112 * c.volume / 100), 3); ctx.font = '8px monospace'; config.channels.forEach((c, i) => ctx.fillText(`${i + 1}:${c.volume}`, 2 + i * 32, 59)); }
}
function refreshPreviews() { document.querySelectorAll('.layout-option').forEach((button, i) => { button.classList.toggle('selected', config.layout === i); button.setAttribute('aria-pressed', String(config.layout === i)); drawScreen(button.querySelector('canvas'), i); }); }
function targetName(target) { const system={'@master':'Volume geral','@microphone':'Microfone','@system':'Sons do Windows'};return system[target] || sessions.find(s => s.target === target)?.name || endpoints.find(s => s.target === target)?.name || installed.find(s => s.target === target)?.name || config.channels[activeChannel]?.targetNames[target] || target.split(/[\\/]/).pop().replace(/\.exe$/i, ''); }
function updateChannel(i) {
  const c = config.channels[i], button = assigns[i]; sliders[i].value = c.volume; sliders[i].title = `${c.volume}%`; button.replaceChildren();
  button.parentElement.classList.toggle('offline', !connected);
  if (c.symbol && c.icon) { const img = document.createElement('img'); img.src = c.icon; img.alt = iconById.get(c.symbol)?.label||''; button.append(img); }
  else { const plus = document.createElement('span'); plus.className = 'plus'; plus.textContent = '+'; button.append(plus); }
  button.title = c.targets.map(targetName).join(', ') || `Canal ${i + 1}`; button.setAttribute('aria-label', `Configurar canal ${i + 1}`);
}
async function commit() { await api.save(config); }
const revisions = [0, 0, 0, 0];
async function commitChannel(index = activeChannel) {
  const revision = ++revisions[index], c = config.channels[index];
  const icon=c.symbol?await rasterIcon(c.symbol):null;
  const bitmap = await toBitmap(icon); if (revisions[index] !== revision) return;
  c.icon = icon; c.bitmap = bitmap; for (const target of c.targets) c.targetNames[target] = targetName(target);
  updateChannel(index); refreshPreviews();
  try { await commit(); $('appError').textContent = ''; } catch (e) { $('appError').textContent = errorMessage(e); throw e; }
}
function addRow(container, s) {
  const c = config.channels[activeChannel], row = document.createElement('label'); row.className = 'app-item';
  const check = document.createElement('input'); check.type = 'checkbox'; check.checked = c.targets.some(target => AudioTargets.matches(target, s));
  const label = document.createElement('span'); label.textContent = s.name; row.append(check, label);
  row.title = [s.name, s.path || s.target].join('\n');
  check.addEventListener('change', () => { c.targets = check.checked ? [...new Set([...c.targets, s.target])] : c.targets.filter(t => !AudioTargets.matches(t, s)); c.targetNames[s.target] = s.name; void commitChannel().catch(report); });
  container.append(row);
}
function renderApps() {
  const list = $('apps'); list.replaceChildren(); const search = $('search').value.toLowerCase();
  const available = new Map(AudioTargets.merge($('allApps').checked ? installed : [], sessions).map(s => [AudioTargets.key(s.target), s]));
  for (const t of config.channels[activeChannel].targets) if (AudioTargets.isApplication(t) && !available.has(AudioTargets.key(t))) available.set(AudioTargets.key(t), { target: t, name: config.channels[activeChannel].targetNames[t] || targetName(t) });
  [...available.values()].sort((a, b) => a.name.localeCompare(b.name)).filter(s => `${s.name} ${s.path || s.target}`.toLowerCase().includes(search)).forEach(s => addRow(list, s));
  if (!available.size) { const text = document.createElement('p'); text.className = 'note'; text.textContent = 'Reproduza áudio em um aplicativo ou marque Todos os aplicativos.'; list.append(text); }
}
function renderUtilities() {
  const list = $('systemApps'); list.replaceChildren();
  const groups = [['Sistema', [{ target: '@master', name: 'Volume geral' }, { target: '@microphone', name: 'Microfone' }, { target: '@system', name: 'Sons do Windows' }]], ['Dispositivos de saída', endpoints.filter(s => s.kind === 'output')], ['Dispositivos de entrada', endpoints.filter(s => s.kind === 'input')]];
  for (const [title, items] of groups) { const h = document.createElement('h3'); h.className = 'group-title'; h.textContent = title; list.append(h); items.forEach(s => addRow(list, s)); }
}
let refreshRevision = 0;
async function refreshApps() {
  const revision = ++refreshRevision;
  const includeInstalled = $('allApps').checked;
  $('appError').textContent = 'Carregando…';
  try {
    const [nextSessions, nextEndpoints, nextInstalled] = await Promise.all([api.sessions(), api.endpoints(), includeInstalled ? api.allApps() : Promise.resolve(null)]);
    if (revision !== refreshRevision) return;
    sessions = nextSessions; endpoints = nextEndpoints; if (nextInstalled) installed = nextInstalled;
    $('appError').textContent = ''; renderApps(); renderUtilities();
  } catch (e) { if (revision === refreshRevision) $('appError').textContent = errorMessage(e); }
}
function setChannelTab(tab) { activeTab = tab; $('channelDialog').classList.toggle('picking-icons',tab==='labels');document.querySelectorAll('#channelTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); document.querySelectorAll('.tab-panel').forEach(p => { p.hidden = p.id !== tab; }); }
function appendIconPage(){
  const end=Math.min(iconLimit+84,iconResults.length),fragment=document.createDocumentFragment();
  for(const icon of iconResults.slice(iconLimit,end)){
    const b=document.createElement('button');b.type='button';b.dataset.icon=icon.name;b.title=icon.label;b.setAttribute('aria-label',icon.label);b.setAttribute('aria-pressed',String(config.channels[activeChannel].symbol===icon.name));b.classList.toggle('selected',config.channels[activeChannel].symbol===icon.name);
    const label=document.createElement('span');label.textContent=icon.label;b.append(svgIcon(icon.name),label);b.addEventListener('click',()=>chooseIcon(icon.name).catch(report));fragment.append(b);
  }
  iconLimit=end;$('iconGrid').append(fragment);
}
function renderIconGrid(){
  const query=$('iconSearch').value,category=query.trim()?'all':iconCategory;
  iconResults=IconCatalog.search(icons,query,category,recentIcons);iconLimit=0;$('iconGrid').replaceChildren();$('iconGrid').scrollTop=0;
  $('iconCount').textContent=`${iconResults.length} ícones`;$('iconEmpty').hidden=!!iconResults.length;$('iconEmpty').textContent=category==='recent'?'Os ícones que você escolher aparecerão aqui.':'Nenhum ícone encontrado. Tente outro nome.';
  document.querySelectorAll('[data-category]').forEach(b=>{b.classList.toggle('active',b.dataset.category===category);b.setAttribute('aria-pressed',String(b.dataset.category===category));});appendIconPage();
}
function fillLabelOptions(){
  const symbol=config.channels[activeChannel].symbol,icon=iconById.get(symbol);$('selectedIcon').replaceChildren();
  if(icon)$('selectedIcon').append(svgIcon(symbol));else $('selectedIcon').textContent='+';
  $('selectedIconName').textContent=icon?.label||'Nenhum ícone escolhido';$('removeIcon').disabled=!icon;
  document.querySelectorAll('#iconGrid button').forEach(b=>{const selected=b.dataset.icon===symbol;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
}
async function chooseIcon(symbol){
  if(symbol!==null&&!iconById.has(symbol))return;
  const index=activeChannel;config.channels[index].symbol=symbol;fillLabelOptions();await commitChannel(index);
  if(symbol){recentIcons=[symbol,...recentIcons.filter(id=>id!==symbol)].slice(0,18);try{localStorage.setItem('mixer.iconRecents.v1',JSON.stringify(recentIcons));}catch{}}
  if(activeChannel===index)fillLabelOptions();
}
function openChannel(i) { activeChannel = i; $('channelTitle').textContent = `Configurar canal ${i + 1}`; $('allApps').checked = false; $('search').value = ''; $('iconSearch').value = '';iconCategory='popular';renderIconGrid();fillLabelOptions(); setChannelTab('programs'); renderApps(); renderUtilities(); $('channelDialog').showModal(); void refreshApps(); }
function updateStatus(status) {
  connected = status.connected;
  $('connection').classList.toggle('online', connected);
  $('connection').querySelector('span').textContent = connected ? 'Conectado' : status.message.startsWith('Aguardando') ? 'Conectando…' : 'Desconectado';
  $('connection').title = status.message;
  const detected = $('deviceSelect').selectedOptions[0];
  $('deviceName').textContent = status.name || (detected?.value ? detected.textContent : '—');
  $('deviceModel').textContent = connected ? status.device?.model || 'Arduino Nano · ATmega328P' : '—';
  $('deviceFirmware').textContent = connected ? status.device?.firmware || 'MX Nano v2' : '—';
  $('deviceError').className = connected ? 'note' : 'error';
  $('deviceError').textContent = connected ? status.device ? status.device.oledAddress ? `OLED detectada em 0x${status.device.oledAddress.toString(16).toUpperCase()}.` : 'OLED ausente ou sem resposta. A conexão USB continua disponível.' : '' : status.message === 'Desconectado' ? '' : status.message;
  config?.channels.forEach((_, i) => { if (sliders[i]) updateChannel(i); });
}
async function refreshDevices() { $('deviceSelect').replaceChildren(); try { const devices = await api.devices(); $('deviceSelect').add(new Option(devices.length ? 'Selecionar dispositivo' : 'Nenhum dispositivo', '')); devices.forEach(d => $('deviceSelect').add(new Option(d.name, d.path))); if (devices.length === 1) $('deviceSelect').value = devices[0].path; updateStatus((await api.state()).status); } catch (e) { $('deviceError').textContent = errorMessage(e); } }
function setSettingsTab(tab) { document.querySelectorAll('#settingsTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab)); document.querySelectorAll('.settings-panel').forEach(p => { p.hidden = p.id !== tab; }); }
async function openSettings() { $('brightness').value = config.brightness; ['autostart', 'tray', 'inverted'].forEach(k => { $(k).checked = config.general[k]; }); setSettingsTab('device'); $('deviceDialog').showModal(); await refreshDevices(); }
async function saveGeneral() { const old = { ...config.general }; ['autostart', 'tray', 'inverted'].forEach(k => { config.general[k] = $(k).checked; }); try { await commit(); } catch (e) { config.general = old; ['autostart', 'tray', 'inverted'].forEach(k => { $(k).checked = old[k]; }); report(e); } }
async function init() {
  if (!api) throw Error('Abra o aplicativo para Windows para usar o mixer.');
  icons = await (await fetch('icons.json')).json();
  iconById=new Map(icons.map(icon=>[icon.name,icon]));try{recentIcons=JSON.parse(localStorage.getItem('mixer.iconRecents.v1')||'[]').filter(id=>iconById.has(id));}catch{recentIcons=[];}
  const state = await api.state(); config = state.config;
  for (let i = 0; i < 4; i++) {
    const channel = document.createElement('article'); channel.className = 'channel'; channel.innerHTML = `<div class="slider-area"><div class="track"></div><input class="channel-slider" type="range" min="0" max="100" step="1" aria-label="Volume do canal ${i + 1}"></div><button class="assign"></button>`;
    sliders[i] = channel.querySelector('input'); assigns[i] = channel.querySelector('button'); $('channels').append(channel); updateChannel(i);
    let debounce; sliders[i].addEventListener('input', () => { const value = Number(sliders[i].value); config.channels[i].volume = value; lastChanged = i; updateChannel(i); refreshPreviews(); clearTimeout(debounce); debounce = setTimeout(() => api.volume(i, value).catch(report), 30); });
    sliders[i].addEventListener('change', () => { void commit().catch(report); }); assigns[i].addEventListener('click', () => openChannel(i));
    channel.querySelector('.slider-area').addEventListener('mouseenter', () => { $('deviceHint').hidden = connected; }); channel.querySelector('.slider-area').addEventListener('mouseleave', () => { $('deviceHint').hidden = true; });
  }
  layoutNames.forEach((name, i) => { const b = document.createElement('button'); b.className = 'layout-option'; b.setAttribute('aria-label', `OLED: ${name}`); b.innerHTML = '<canvas width="128" height="64"></canvas><span class="layout-caption"><span></span><i></i></span>'; b.querySelector('span span').textContent = name; b.addEventListener('click', async () => { config.layout = i; refreshPreviews(); try { await commit(); } catch (e) { report(e); } }); $('layouts').append(b); });
  $('settings').append(svgIcon('gear')); updateStatus(state.status); refreshPreviews();
  api.on(event => { if (event.type === 'status') updateStatus(event); else if (event.type === 'volume') { config.channels[event.channel].volume = event.volume; lastChanged = event.channel; updateChannel(event.channel); refreshPreviews(); } else if (event.type === 'notice') notify(event.message); });
  updateStatus((await api.state()).status);
}
$('settings').addEventListener('click', () => openSettings().catch(report)); $('connection').addEventListener('click', () => openSettings().catch(report)); $('minimize').addEventListener('click', () => api.window('minimize')); $('close').addEventListener('click', () => api.window('close'));
$('closeChannel').addEventListener('click', () => $('channelDialog').close()); $('closeSettings').addEventListener('click', () => $('deviceDialog').close()); $('closeSettingsBottom').addEventListener('click', () => $('deviceDialog').close());
$('channelTabs').addEventListener('click', e => { if (e.target.dataset.tab) setChannelTab(e.target.dataset.tab); }); $('settingsTabs').addEventListener('click', e => { if (e.target.dataset.tab) setSettingsTab(e.target.dataset.tab); });
$('allApps').addEventListener('change', refreshApps); $('search').addEventListener('input', renderApps); $('refreshApps').addEventListener('click', refreshApps); $('appInfo').addEventListener('click', () => notify('Atualizar busca novamente os aplicativos com sessão de áudio em todas as saídas do Windows. Reproduza um som no programa para que ele apareça. Todos os aplicativos inclui programas instalados.'));
$('addProgram').addEventListener('click', async () => { try { const program = await api.program(); if (program) { installed.push(program); $('allApps').checked = true; const c = config.channels[activeChannel]; c.targets = [...new Set([...c.targets, program.target])]; await commitChannel(); renderApps(); } } catch (e) { report(e); } });
$('iconSearch').addEventListener('input',renderIconGrid);$('iconSearch').addEventListener('search',renderIconGrid);
$('iconCategories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(button){iconCategory=button.dataset.category;$('iconSearch').value='';renderIconGrid();}});
$('iconGrid').addEventListener('scroll',()=>{const grid=$('iconGrid');if(grid.scrollHeight-grid.scrollTop-grid.clientHeight<160)appendIconPage();});
$('removeIcon').addEventListener('click',()=>chooseIcon(null).catch(report));
['autostart', 'tray', 'inverted'].forEach(id => $(id).addEventListener('change', saveGeneral)); $('brightness').addEventListener('change', () => { config.brightness = Number($('brightness').value); void commit().catch(report); });
$('refreshDevices').addEventListener('click', refreshDevices); $('connect').addEventListener('click', async () => { try { if (!$('deviceSelect').value) throw Error('Selecione a porta do Arduino Nano.'); updateStatus(await api.connect($('deviceSelect').value)); } catch (e) { $('deviceError').textContent = errorMessage(e); } }); $('disconnect').addEventListener('click', () => api.disconnect().catch(report));
$('deviceSelect').addEventListener('change', async () => { try { updateStatus((await api.state()).status); } catch(e) { report(e); } });
init().catch(report);
