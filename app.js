/* ---------------------------------------------------------
   Kilowatt Job Tracker
   Self-contained client-side app. Data persists in
   localStorage (jobs, notes, materials, photos as
   compressed data URLs) so it works fully offline.
--------------------------------------------------------- */

const STORAGE_KEY = 'kwt_jobs_v1';

const STAGES = [
  { id: 'lead', label: 'Lead' },
  { id: 'quoted', label: 'Quoted' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'installed', label: 'Installed' },
  { id: 'followup', label: 'Follow-up' },
];

const SERVICES = {
  solar: 'Solar panels',
  heatpump: 'Heat pump',
  aircon: 'Air conditioning',
  battery: 'Battery / EV charger',
  industry: 'Industry / KMO',
};

const MATERIAL_STATUSES = ['needed', 'ordered', 'in_stock', 'installed'];

let jobs = [];
let currentView = 'dashboard';
let stageFilter = 'all';
let serviceFilter = 'all';
let searchQuery = '';
let calendarCursor = new Date();
let editingJobId = null;
let activeTab = 'overview';

/* ---------------- Persistence ---------------- */

function loadJobs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { console.warn('Corrupt data, reseeding', e); }
  }
  return seedData();
}

function saveJobs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function localIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function seedData() {
  const today = new Date();
  const iso = (d) => localIso(d);
  const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d; };

  return [
    {
      id: uid(), clientName: 'Eddy Van Damme', address: 'Kerkstraat 22, Schendelbeke',
      phone: '+32 475 12 34 56', email: 'eddy.vd@example.com',
      service: 'solar', stage: 'installed', installer: 'Team Eddy',
      visitDate: iso(addDays(-20)), installDate: iso(addDays(-3)),
      materials: [
        { id: uid(), name: '12x SunPower 415W panel', qty: 12, status: 'installed' },
        { id: uid(), name: 'SolarEdge inverter', qty: 1, status: 'installed' },
      ],
      notes: [
        { id: uid(), text: 'Installation completed, client very happy with the crew.', ts: addDays(-3).toISOString() },
      ],
      photos: [],
      createdAt: addDays(-25).toISOString(),
    },
    {
      id: uid(), clientName: 'Familie De Smet', address: 'Lange Ambachtstraat 12, Oosterzele',
      phone: '+32 486 22 11 09', email: 'desmet.fam@example.com',
      service: 'heatpump', stage: 'scheduled', installer: 'Team Jonas',
      visitDate: iso(addDays(-5)), installDate: iso(addDays(3)),
      materials: [
        { id: uid(), name: 'Daikin Altherma 3 8kW', qty: 1, status: 'ordered' },
        { id: uid(), name: 'Buffer vat 200L', qty: 1, status: 'in_stock' },
      ],
      notes: [
        { id: uid(), text: 'Site visit done, existing radiators compatible. Waiting on unit delivery.', ts: addDays(-5).toISOString() },
      ],
      photos: [],
      createdAt: addDays(-14).toISOString(),
    },
    {
      id: uid(), clientName: 'Bakkerij Coppens', address: 'Dorpsplein 5, Lierde',
      phone: '+32 9 384 20 10', email: 'info@bakkerijcoppens.be',
      service: 'industry', stage: 'quoted', installer: '',
      visitDate: iso(addDays(-2)), installDate: '',
      materials: [
        { id: uid(), name: '30x industrial panel 450W', qty: 30, status: 'needed' },
      ],
      notes: [
        { id: uid(), text: 'Sent quote for rooftop array + battery storage, awaiting decision.', ts: addDays(-1).toISOString() },
      ],
      photos: [],
      createdAt: addDays(-6).toISOString(),
    },
    {
      id: uid(), clientName: 'C. uit Lierde', address: 'Molenstraat 8, Lierde',
      phone: '+32 477 88 22 10', email: '',
      service: 'aircon', stage: 'followup', installer: 'Team Eddy',
      visitDate: iso(addDays(-40)), installDate: iso(addDays(-30)),
      materials: [
        { id: uid(), name: 'Daikin Emura multisplit', qty: 1, status: 'installed' },
      ],
      notes: [
        { id: uid(), text: 'One year check-up due next month, client reports no issues so far.', ts: addDays(-30).toISOString() },
      ],
      photos: [],
      createdAt: addDays(-45).toISOString(),
    },
    {
      id: uid(), clientName: 'Nadia El Amrani', address: 'Stationsstraat 3, Zottegem',
      phone: '+32 468 09 77 21', email: 'nadia.ea@example.com',
      service: 'battery', stage: 'lead', installer: '',
      visitDate: '', installDate: '',
      materials: [],
      notes: [
        { id: uid(), text: 'Called in about combining battery storage with existing panels. Needs site visit.', ts: addDays(0).toISOString() },
      ],
      photos: [],
      createdAt: addDays(0).toISOString(),
    },
    {
      id: uid(), clientName: 'Peeters-Willems', address: 'Hoogstraat 44, Oosterzele',
      phone: '+32 495 33 21 88', email: 'peeters.willems@example.com',
      service: 'solar', stage: 'in_progress', installer: 'Team Jonas',
      visitDate: iso(addDays(-15)), installDate: iso(addDays(1)),
      materials: [
        { id: uid(), name: '16x SunPower 415W panel', qty: 16, status: 'in_stock' },
        { id: uid(), name: 'SolarEdge inverter', qty: 1, status: 'in_stock' },
        { id: uid(), name: 'Mounting rail kit', qty: 1, status: 'needed' },
      ],
      notes: [
        { id: uid(), text: 'Scaffolding booked for install day, need mounting rails confirmed by supplier.', ts: addDays(-1).toISOString() },
      ],
      photos: [],
      createdAt: addDays(-18).toISOString(),
    },
  ];
}

/* ---------------- Utilities ---------------- */

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function stageLabel(id) { return (STAGES.find(s => s.id === id) || {}).label || id; }

function daysUntil(iso) {
  if (!iso) return Infinity;
  const target = new Date(iso + 'T00:00:00');
  const now = new Date(); now.setHours(0,0,0,0);
  return Math.round((target - now) / 86400000);
}

function getJob(id) { return jobs.find(j => j.id === id); }

/* ---------------- View switching ---------------- */

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById('view-' + view).classList.remove('hidden');
  renderCurrentView();
}

function renderCurrentView() {
  if (currentView === 'dashboard') renderDashboard();
  else if (currentView === 'jobs') renderJobs();
  else if (currentView === 'calendar') renderCalendar();
}

/* ---------------- Filtering ---------------- */

function filteredJobs() {
  return jobs.filter(j => {
    if (stageFilter !== 'all' && j.stage !== stageFilter) return false;
    if (serviceFilter !== 'all' && j.service !== serviceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hay = (j.clientName + ' ' + j.address + ' ' + j.email).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

/* ---------------- Dashboard ---------------- */

function renderDashboard() {
  const statGrid = document.getElementById('stat-grid');
  const active = jobs.filter(j => !['installed', 'followup'].includes(j.stage) || j.stage === 'followup');
  const scheduledThisWeek = jobs.filter(j => {
    const dv = daysUntil(j.visitDate), di = daysUntil(j.installDate);
    return (dv >= 0 && dv <= 7) || (di >= 0 && di <= 7);
  });
  const pendingMaterials = jobs.reduce((acc, j) => acc + j.materials.filter(m => m.status !== 'installed').length, 0);
  const leads = jobs.filter(j => j.stage === 'lead');

  statGrid.innerHTML = `
    <div class="stat-card accent"><div class="num">${jobs.length}</div><div class="label">Total jobs</div></div>
    <div class="stat-card accent-orange"><div class="num">${scheduledThisWeek.length}</div><div class="label">Scheduled this week</div></div>
    <div class="stat-card"><div class="num">${pendingMaterials}</div><div class="label">Materials pending</div></div>
    <div class="stat-card"><div class="num">${leads.length}</div><div class="label">New inquiries</div></div>
  `;

  const weekList = document.getElementById('dash-week-list');
  weekList.innerHTML = scheduledThisWeek.length ? scheduledThisWeek.map(j => {
    const isInstall = daysUntil(j.installDate) >= 0 && daysUntil(j.installDate) <= 7;
    const date = isInstall ? j.installDate : j.visitDate;
    return `<div class="mini-item" onclick="openJobModal('${j.id}')">
      <div><div class="mini-title">${escapeHtml(j.clientName)}</div><div class="mini-sub">${isInstall ? 'Install' : 'Site visit'} · ${fmtDate(date)}</div></div>
      <span class="badge badge-${j.stage}">${stageLabel(j.stage)}</span>
    </div>`;
  }).join('') : '<div class="mini-empty">Nothing scheduled this week</div>';

  const matList = document.getElementById('dash-materials-list');
  const jobsWithPending = jobs.filter(j => j.materials.some(m => m.status !== 'installed'));
  matList.innerHTML = jobsWithPending.length ? jobsWithPending.map(j => {
    const pending = j.materials.filter(m => m.status !== 'installed');
    return `<div class="mini-item" onclick="openJobModal('${j.id}')">
      <div><div class="mini-title">${escapeHtml(j.clientName)}</div><div class="mini-sub">${pending.length} item(s) pending</div></div>
      <span class="badge badge-${j.stage}">${stageLabel(j.stage)}</span>
    </div>`;
  }).join('') : '<div class="mini-empty">All materials in place</div>';

  const leadsList = document.getElementById('dash-leads-list');
  leadsList.innerHTML = leads.length ? leads.map(j => `
    <div class="mini-item" onclick="openJobModal('${j.id}')">
      <div><div class="mini-title">${escapeHtml(j.clientName)}</div><div class="mini-sub">${SERVICES[j.service]}</div></div>
      <span class="badge badge-lead">Lead</span>
    </div>`).join('') : '<div class="mini-empty">No new inquiries</div>';
}

/* ---------------- Jobs list ---------------- */

function renderJobs() {
  const grid = document.getElementById('job-grid');
  const list = filteredJobs();
  document.getElementById('job-empty').classList.toggle('hidden', list.length !== 0);

  grid.innerHTML = list.map(j => `
    <div class="job-card" onclick="openJobModal('${j.id}')">
      <div class="job-card-top">
        <h4>${escapeHtml(j.clientName)}</h4>
        <span class="badge badge-${j.stage}">${stageLabel(j.stage)}</span>
      </div>
      <div class="addr">${escapeHtml(j.address || 'No address yet')}</div>
      <div class="service-tag">⚡ ${SERVICES[j.service]}</div>
      <div class="job-card-meta">
        <span>${j.installDate ? 'Install ' + fmtDate(j.installDate) : (j.visitDate ? 'Visit ' + fmtDate(j.visitDate) : 'Not scheduled')}</span>
        <span class="job-card-photos">${j.photos.length ? '📷 ' + j.photos.length : ''}</span>
      </div>
    </div>
  `).join('');
}

/* ---------------- Calendar ---------------- */

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  document.getElementById('cal-month-label').textContent =
    calendarCursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const gridStart = new Date(year, month, 1 - startOffset);

  const eventsByDate = {};
  jobs.forEach(j => {
    if (j.visitDate) (eventsByDate[j.visitDate] = eventsByDate[j.visitDate] || []).push({ job: j, type: 'visit' });
    if (j.installDate) (eventsByDate[j.installDate] = eventsByDate[j.installDate] || []).push({ job: j, type: 'install' });
  });

  const todayIso = localIso(new Date());
  let html = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const iso = localIso(d);
    const isOther = d.getMonth() !== month;
    const isToday = iso === todayIso;
    const events = eventsByDate[iso] || [];
    html += `<div class="cal-day ${isOther ? 'other-month' : ''} ${isToday ? 'today' : ''}">
      <div class="cal-daynum">${d.getDate()}</div>
      ${events.map(e => `<div class="cal-event ${e.type}" title="${escapeHtml(e.job.clientName)}" onclick="openJobModal('${e.job.id}')">${e.type === 'install' ? '🔧' : '📋'} ${escapeHtml(e.job.clientName)}</div>`).join('')}
    </div>`;
    if (i === 41) break;
  }
  document.getElementById('calendar-body').innerHTML = html;
}

/* ---------------- Job modal ---------------- */

function populateSelects() {
  const stageSel = document.getElementById('jm-stage');
  stageSel.innerHTML = STAGES.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
  const serviceSel = document.getElementById('jm-service');
  serviceSel.innerHTML = Object.entries(SERVICES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
}

let modalDraft = { materials: [], notes: [], photos: [] };

function openJobModal(id) {
  editingJobId = id || null;
  const job = id ? getJob(id) : {
    id: null, clientName: '', address: '', phone: '', email: '',
    service: 'solar', stage: 'lead', installer: '', visitDate: '', installDate: '',
    materials: [], notes: [], photos: [],
  };

  modalDraft = {
    materials: JSON.parse(JSON.stringify(job.materials || [])),
    notes: JSON.parse(JSON.stringify(job.notes || [])),
    photos: JSON.parse(JSON.stringify(job.photos || [])),
  };

  document.getElementById('jm-client-name').value = job.clientName;
  document.getElementById('jm-address').value = job.address;
  document.getElementById('jm-phone').value = job.phone;
  document.getElementById('jm-email').value = job.email;
  document.getElementById('jm-installer').value = job.installer;
  document.getElementById('jm-visit-date').value = job.visitDate;
  document.getElementById('jm-install-date').value = job.installDate;
  document.getElementById('jm-stage').value = job.stage;
  document.getElementById('jm-service').value = job.service;

  document.getElementById('jm-delete').classList.toggle('hidden', !id);

  switchTab('overview');
  renderMaterials(modalDraft.materials);
  renderNotes(modalDraft.notes);
  renderPhotos(modalDraft.photos);

  document.getElementById('job-modal').classList.remove('hidden');
}

function closeJobModal() {
  document.getElementById('job-modal').classList.add('hidden');
  editingJobId = null;
}

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'tab-' + tab));
}

function saveJobFromModal() {
  const data = {
    clientName: document.getElementById('jm-client-name').value.trim() || 'Unnamed client',
    address: document.getElementById('jm-address').value.trim(),
    phone: document.getElementById('jm-phone').value.trim(),
    email: document.getElementById('jm-email').value.trim(),
    installer: document.getElementById('jm-installer').value.trim(),
    visitDate: document.getElementById('jm-visit-date').value,
    installDate: document.getElementById('jm-install-date').value,
    stage: document.getElementById('jm-stage').value,
    service: document.getElementById('jm-service').value,
    materials: modalDraft.materials,
    notes: modalDraft.notes,
    photos: modalDraft.photos,
  };

  if (editingJobId) {
    const job = getJob(editingJobId);
    Object.assign(job, data);
  } else {
    jobs.unshift({ id: uid(), createdAt: new Date().toISOString(), ...data });
  }
  saveJobs();
  closeJobModal();
  renderCurrentView();
}

function deleteJob() {
  if (!editingJobId) return;
  if (!confirm('Delete this job? This cannot be undone.')) return;
  jobs = jobs.filter(j => j.id !== editingJobId);
  saveJobs();
  closeJobModal();
  renderCurrentView();
}

/* ---------------- Materials ---------------- */

function renderMaterials(list) {
  const tbody = document.getElementById('materials-tbody');
  tbody.innerHTML = list.length ? list.map(m => `
    <tr>
      <td>${escapeHtml(m.name)}</td>
      <td>${m.qty}</td>
      <td>
        <select onchange="updateMaterialStatus('${m.id}', this.value)">
          ${MATERIAL_STATUSES.map(s => `<option value="${s}" ${s === m.status ? 'selected' : ''}>${s.replace('_',' ')}</option>`).join('')}
        </select>
      </td>
      <td><button class="mat-remove" onclick="removeMaterial('${m.id}')">&times;</button></td>
    </tr>
  `).join('') : `<tr><td colspan="4" style="color:var(--text-muted); text-align:center; padding:16px;">No materials added yet</td></tr>`;
}

function addMaterial() {
  const nameInput = document.getElementById('mat-name');
  const qtyInput = document.getElementById('mat-qty');
  const name = nameInput.value.trim();
  if (!name) return;
  modalDraft.materials.push({ id: uid(), name, qty: Number(qtyInput.value) || 1, status: 'needed' });
  nameInput.value = '';
  qtyInput.value = 1;
  renderMaterials(modalDraft.materials);
}

function updateMaterialStatus(id, status) {
  const m = modalDraft.materials.find(x => x.id === id);
  if (m) m.status = status;
}

function removeMaterial(id) {
  modalDraft.materials = modalDraft.materials.filter(m => m.id !== id);
  renderMaterials(modalDraft.materials);
}

/* ---------------- Notes ---------------- */

function renderNotes(list) {
  const el = document.getElementById('notes-list');
  const sorted = [...list].sort((a, b) => new Date(b.ts) - new Date(a.ts));
  el.innerHTML = sorted.length ? sorted.map(n => `
    <div class="note-item">
      <div class="note-time">${fmtDateTime(n.ts)}</div>
      <div>${escapeHtml(n.text)}</div>
    </div>
  `).join('') : '<div class="mini-empty">No notes yet</div>';
}

function addNote() {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) return;
  modalDraft.notes.push({ id: uid(), text, ts: new Date().toISOString() });
  input.value = '';
  renderNotes(modalDraft.notes);
}

/* ---------------- Photos ---------------- */

function renderPhotos(list) {
  const grid = document.getElementById('photo-grid');
  grid.innerHTML = list.map(p => `
    <div class="photo-thumb">
      <img src="${p.dataUrl}" onclick="openLightbox('${p.id}')">
      <button class="photo-remove" onclick="removePhoto('${p.id}')">&times;</button>
    </div>
  `).join('');
}

function handlePhotoInput(fileList) {
  Array.from(fileList).forEach(file => {
    compressImage(file, 1000, 0.72).then(dataUrl => {
      modalDraft.photos.push({ id: uid(), dataUrl, ts: new Date().toISOString() });
      renderPhotos(modalDraft.photos);
    }).catch(err => console.error('Photo processing failed', err));
  });
}

function compressImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function removePhoto(id) {
  modalDraft.photos = modalDraft.photos.filter(p => p.id !== id);
  renderPhotos(modalDraft.photos);
}

function openLightbox(id) {
  const p = modalDraft.photos.find(x => x.id === id);
  if (!p) return;
  document.getElementById('lightbox-img').src = p.dataUrl;
  document.getElementById('lightbox').classList.remove('hidden');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
}

/* ---------------- Helpers ---------------- */

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- Event wiring ---------------- */

document.addEventListener('DOMContentLoaded', () => {
  jobs = loadJobs();
  saveJobs();
  populateSelects();

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('new-job-btn').addEventListener('click', () => openJobModal(null));
  document.getElementById('jm-close').addEventListener('click', closeJobModal);
  document.getElementById('jm-save').addEventListener('click', saveJobFromModal);
  document.getElementById('jm-delete').addEventListener('click', deleteJob);
  document.getElementById('job-modal').addEventListener('click', (e) => {
    if (e.target.id === 'job-modal') closeJobModal();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('global-search').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    if (currentView !== 'jobs') switchView('jobs');
    else renderJobs();
  });

  document.querySelectorAll('#stage-filters .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      stageFilter = chip.dataset.stage;
      document.querySelectorAll('#stage-filters .chip').forEach(c => c.classList.toggle('active', c === chip));
      renderJobs();
    });
  });

  document.getElementById('service-filter').addEventListener('change', (e) => {
    serviceFilter = e.target.value;
    renderJobs();
  });

  document.getElementById('mat-add-btn').addEventListener('click', addMaterial);
  document.getElementById('note-add-btn').addEventListener('click', addNote);

  document.getElementById('photo-input').addEventListener('change', (e) => {
    handlePhotoInput(e.target.files);
    e.target.value = '';
  });

  document.getElementById('cal-prev').addEventListener('click', () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    calendarCursor = new Date();
    renderCalendar();
  });

  document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') closeLightbox();
  });

  renderCurrentView();
});
