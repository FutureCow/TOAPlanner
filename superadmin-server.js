#!/usr/bin/env node
'use strict'

const http = require('http')
const fs   = require('fs')
const path = require('path')
const { Pool } = require('pg')

const APP_DIR      = __dirname
const SCHOOLS_FILE = path.join(APP_DIR, 'schools.json')
const PORT         = Number(process.env.SUPERADMIN_PORT || 3001)

// ── DB pools ─────────────────────────────────────────────────────────────────

const pools = new Map()

function getPool(url) {
  if (!pools.has(url)) pools.set(url, new Pool({ connectionString: url }))
  return pools.get(url)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadSchools() {
  try { return JSON.parse(fs.readFileSync(SCHOOLS_FILE, 'utf8')) }
  catch { return {} }
}

function saveSchools(d) {
  fs.writeFileSync(SCHOOLS_FILE, JSON.stringify(d, null, 2))
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = ''
    req.on('data', c => s += c)
    req.on('end', () => { try { resolve(JSON.parse(s)) } catch { resolve({}) } })
    req.on('error', reject)
  })
}

function json(res, status, data) {
  const body = JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
}

function html(res, content) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(content)
}

// ── Router ────────────────────────────────────────────────────────────────────

async function handle(req, res) {
  const u     = new URL(req.url, 'http://localhost')
  const parts = u.pathname.split('/').filter(Boolean)
  const m     = req.method

  // ── UI
  if (m === 'GET' && u.pathname === '/') return html(res, UI)

  // ── GET /api/schools
  if (m === 'GET' && u.pathname === '/api/schools') {
    const s = loadSchools()
    return json(res, 200, Object.entries(s).map(([slug, cfg]) => ({
      slug,
      name:              cfg.name,
      allowedDomain:     cfg.allowedDomain,
      googleClientId:    cfg.googleClientId    ?? '',
      googleClientSecret:cfg.googleClientSecret ?? '',
      azureClientId:     cfg.azureClientId     ?? '',
      azureClientSecret: cfg.azureClientSecret  ?? '',
      azureTenantId:     cfg.azureTenantId     ?? '',
    })))
  }

  // ── PATCH /api/schools/:slug
  if (m === 'PATCH' && parts[0] === 'api' && parts[1] === 'schools' && parts[2] && !parts[3]) {
    const slug = parts[2]
    const s = loadSchools()
    if (!s[slug]) return json(res, 404, { error: 'Niet gevonden' })
    const b = await readBody(req)
    for (const k of ['name','allowedDomain','googleClientId','googleClientSecret','azureClientId','azureClientSecret','azureTenantId']) {
      if (b[k] === undefined) continue
      if (b[k] === '') delete s[slug][k]; else s[slug][k] = b[k]
    }
    saveSchools(s)
    return json(res, 200, { ok: true })
  }

  // ── POST /api/schools/:slug/rename
  if (m === 'POST' && parts[0] === 'api' && parts[1] === 'schools' && parts[2] && parts[3] === 'rename') {
    const slug = parts[2]
    const s = loadSchools()
    if (!s[slug]) return json(res, 404, { error: 'Niet gevonden' })
    const { newSlug } = await readBody(req)
    if (!newSlug || !/^[a-z0-9-]+$/.test(newSlug)) return json(res, 400, { error: 'Ongeldige slug (alleen a-z, 0-9, koppelteken)' })
    if (s[newSlug]) return json(res, 409, { error: 'Slug al in gebruik' })
    s[newSlug] = s[slug]
    delete s[slug]
    saveSchools(s)
    return json(res, 200, { ok: true, newSlug })
  }

  // ── GET /api/schools/:slug/users
  if (m === 'GET' && parts[1] === 'schools' && parts[3] === 'users' && !parts[4]) {
    const slug = parts[2]
    const s = loadSchools()
    if (!s[slug]) return json(res, 404, { error: 'Niet gevonden' })
    try {
      const { rows } = await getPool(s[slug].databaseUrl).query(
        `SELECT id, email, name, abbreviation, "isTeacher", "isTOA", "isAdmin", allowed, "createdAt"
         FROM "User" ORDER BY name`
      )
      return json(res, 200, rows)
    } catch(e) { return json(res, 500, { error: e.message }) }
  }

  // ── PATCH /api/schools/:slug/users/:id
  if (m === 'PATCH' && parts[1] === 'schools' && parts[3] === 'users' && parts[4]) {
    const slug = parts[2], id = parts[4]
    const s = loadSchools()
    if (!s[slug]) return json(res, 404, { error: 'Niet gevonden' })
    const b = await readBody(req)
    const sets = [], vals = []
    let i = 1
    if (b.abbreviation !== undefined) { sets.push(`abbreviation=$${i++}`);  vals.push(String(b.abbreviation).toUpperCase().slice(0,6)) }
    if (b.isTeacher    !== undefined) { sets.push(`"isTeacher"=$${i++}`);   vals.push(!!b.isTeacher) }
    if (b.isTOA        !== undefined) { sets.push(`"isTOA"=$${i++}`);       vals.push(!!b.isTOA) }
    if (b.isAdmin      !== undefined) { sets.push(`"isAdmin"=$${i++}`);     vals.push(!!b.isAdmin) }
    if (b.allowed      !== undefined) { sets.push(`allowed=$${i++}`);       vals.push(!!b.allowed) }
    if (!sets.length) return json(res, 400, { error: 'Niets te wijzigen' })
    vals.push(id)
    try {
      await getPool(s[slug].databaseUrl).query(
        `UPDATE "User" SET ${sets.join(',')} WHERE id=$${i}`, vals
      )
      return json(res, 200, { ok: true })
    } catch(e) { return json(res, 500, { error: e.message }) }
  }

  // ── DELETE /api/schools/:slug/users/:id
  if (m === 'DELETE' && parts[1] === 'schools' && parts[3] === 'users' && parts[4]) {
    const slug = parts[2], id = parts[4]
    const s = loadSchools()
    if (!s[slug]) return json(res, 404, { error: 'Niet gevonden' })
    try {
      await getPool(s[slug].databaseUrl).query(`DELETE FROM "User" WHERE id=$1`, [id])
      return json(res, 200, { ok: true })
    } catch(e) { return json(res, 500, { error: e.message }) }
  }

  json(res, 404, { error: 'Niet gevonden' })
}

// ── UI ────────────────────────────────────────────────────────────────────────

const UI = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TOA Planner — Superadmin</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;background:#0f1117;color:#e2e8f0;min-height:100vh;font-size:14px}
header{background:#181b23;border-bottom:1px solid #2d3347;padding:1rem 2rem;display:flex;align-items:center;gap:1rem}
header h1{font-size:1.1rem;font-weight:700;color:#fff}
header span{font-size:.8rem;color:#64748b;background:#1e2231;border:1px solid #2d3347;padding:.2rem .6rem;border-radius:.4rem}
.tabs{display:flex;gap:.25rem;padding:1rem 2rem .5rem;border-bottom:1px solid #2d3347}
.tab{padding:.5rem 1.2rem;border-radius:.5rem .5rem 0 0;cursor:pointer;font-weight:500;color:#64748b;border:1px solid transparent;border-bottom:none;transition:all .15s}
.tab.active{background:#181b23;color:#e2e8f0;border-color:#2d3347}
.tab:hover:not(.active){color:#94a3b8}
main{padding:1.5rem 2rem}
section{display:none}.section.active{display:block}
table{width:100%;border-collapse:collapse;font-size:.82rem}
th{text-align:left;padding:.5rem .75rem;color:#64748b;font-size:.7rem;text-transform:uppercase;letter-spacing:.05em;background:#181b23;border-bottom:2px solid #2d3347}
td{padding:.6rem .75rem;border-bottom:1px solid #1e2231;vertical-align:middle}
tr:hover td{background:#181b23}
input[type=text],input[type=password],select{background:#1e2231;border:1px solid #2d3347;color:#e2e8f0;border-radius:.4rem;padding:.3rem .6rem;font-size:.8rem;width:100%}
input[type=text]:focus,input[type=password]:focus,select:focus{outline:none;border-color:#3b82f6}
.btn{padding:.35rem .9rem;border-radius:.4rem;font-size:.78rem;font-weight:600;cursor:pointer;border:none;transition:all .15s}
.btn-blue{background:#2563eb;color:#fff}.btn-blue:hover{background:#1d4ed8}
.btn-green{background:#15803d;color:#fff}.btn-green:hover{background:#166534}
.btn-red{background:#991b1b;color:#fff}.btn-red:hover{background:#7f1d1d}
.btn-sm{padding:.25rem .6rem;font-size:.72rem}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:.3rem;font-size:.7rem;font-weight:600}
.badge-green{background:rgba(21,128,61,.2);color:#4ade80}
.badge-red{background:rgba(153,27,27,.2);color:#f87171}
.chip{display:inline-block;padding:.15rem .45rem;border-radius:.25rem;font-size:.7rem;font-weight:600;background:#1e2231;color:#94a3b8;border:1px solid #2d3347}
.school-select{max-width:280px;margin-bottom:1rem}
.modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:50;align-items:center;justify-content:center}
.modal-overlay.open{display:flex}
.modal{background:#181b23;border:1px solid #2d3347;border-radius:.75rem;padding:1.5rem;width:520px;max-width:95vw;max-height:90vh;overflow-y:auto}
.modal h2{font-size:1rem;font-weight:700;margin-bottom:1.2rem;color:#fff}
.field{margin-bottom:.9rem}
.field label{display:block;font-size:.75rem;color:#64748b;margin-bottom:.3rem}
.modal-actions{display:flex;gap:.5rem;justify-content:flex-end;margin-top:1.2rem}
.saved{color:#4ade80;font-size:.75rem;margin-left:.5rem}
.error-msg{color:#f87171;font-size:.75rem;margin-top:.3rem}
.abbr-cell{font-weight:700;font-size:.75rem;background:#1e2231;padding:.2rem .5rem;border-radius:.3rem;border:1px solid #2d3347;cursor:pointer;color:#cbd5e1}
.abbr-cell:hover{border-color:#3b82f6}
</style>
</head>
<body>
<header>
  <h1>TOA Planner</h1>
  <span>Superadmin</span>
</header>

<div class="tabs">
  <div class="tab active" onclick="showTab('schools')">Scholen</div>
  <div class="tab" onclick="showTab('users')">Gebruikers</div>
</div>

<main>

<!-- ── SCHOLEN ── -->
<section id="tab-schools" class="section active">
  <div style="display:flex;justify-content:flex-end;margin-bottom:1rem">
  </div>
  <table id="schools-table">
    <thead><tr>
      <th>Slug</th><th>Naam</th><th>Domein</th><th>Google</th><th>Azure</th><th></th>
    </tr></thead>
    <tbody id="schools-body"><tr><td colspan="6" style="color:#64748b;padding:2rem;text-align:center">Laden…</td></tr></tbody>
  </table>
</section>

<!-- ── GEBRUIKERS ── -->
<section id="tab-users" class="section">
  <select class="school-select" id="school-select" onchange="loadUsers()">
    <option value="">Kies een school…</option>
  </select>
  <table id="users-table" style="display:none">
    <thead><tr>
      <th>Naam / E-mail</th><th>Afkorting</th><th>Docent</th><th>TOA</th><th>Admin</th><th>Toegang</th><th></th>
    </tr></thead>
    <tbody id="users-body"></tbody>
  </table>
</section>

</main>

<!-- ── SCHOOL EDIT MODAL ── -->
<div class="modal-overlay" id="school-modal">
  <div class="modal">
    <h2 id="modal-title">School bewerken</h2>
    <input type="hidden" id="edit-slug">
    <div class="field">
      <label>Subdomein (slug)</label>
      <div style="display:flex;gap:.5rem;align-items:center">
        <input type="text" id="edit-new-slug" placeholder="bijv. mijnschool" style="font-family:monospace">
        <button class="btn btn-sm" style="background:#2d3347;color:#e2e8f0;white-space:nowrap" onclick="renameSchool()">Hernoemen</button>
      </div>
      <div style="font-size:.7rem;color:#475569;margin-top:.25rem">Alleen a-z, 0-9 en koppeltekens. Wijzig ook DNS en OAuth redirect URI.</div>
      <div id="rename-error" class="error-msg"></div>
    </div>
    <hr style="border-color:#2d3347;margin:.5rem 0 1rem">
    <div class="field"><label>Naam</label><input type="text" id="edit-name"></div>
    <div class="field">
      <label>Toegestaan e-maildomein</label>
      <input type="text" id="edit-domain" placeholder="school.nl, andere.nl">
      <div style="font-size:.7rem;color:#475569;margin-top:.25rem">Meerdere domeinen scheiden met een komma.</div>
    </div>
    <hr style="border-color:#2d3347;margin:.5rem 0 1rem">
    <p style="font-size:.75rem;color:#64748b;margin-bottom:.75rem">Google OAuth (leeg = niet gebruikt)</p>
    <div class="field"><label>Google Client ID</label><input type="text" id="edit-google-id"></div>
    <div class="field"><label>Google Client Secret</label><input type="password" id="edit-google-secret"></div>
    <hr style="border-color:#2d3347;margin:.5rem 0 1rem">
    <p style="font-size:.75rem;color:#64748b;margin-bottom:.75rem">Azure AD (leeg = niet gebruikt)</p>
    <div class="field"><label>Azure Client ID</label><input type="text" id="edit-azure-id"></div>
    <div class="field"><label>Azure Client Secret</label><input type="password" id="edit-azure-secret"></div>
    <div class="field"><label>Azure Tenant ID</label><input type="text" id="edit-azure-tenant"></div>
    <div id="modal-error" class="error-msg"></div>
    <div class="modal-actions">
      <button class="btn btn-sm" onclick="closeModal()" style="background:#2d3347;color:#e2e8f0">Annuleren</button>
      <button class="btn btn-blue btn-sm" onclick="saveSchool()">Opslaan</button>
    </div>
  </div>
</div>

<script>
let schools = []
let users   = []

// ── Tabs ──────────────────────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.getElementById('tab-' + name).classList.add('active')
  event.target.classList.add('active')
  if (name === 'users' && schools.length === 0) loadSchools()
}

// ── Schools ───────────────────────────────────────────────────────────────────
async function loadSchools() {
  const res = await fetch('/api/schools')
  schools = await res.json()
  renderSchools()
  // also populate user school select
  const sel = document.getElementById('school-select')
  const cur = sel.value
  sel.innerHTML = '<option value="">Kies een school…</option>' +
    schools.map(s => \`<option value="\${s.slug}">\${s.name} (\${s.slug})</option>\`).join('')
  if (cur) sel.value = cur
}

function renderSchools() {
  const tbody = document.getElementById('schools-body')
  if (!schools.length) { tbody.innerHTML = '<tr><td colspan="6" style="color:#64748b;padding:2rem;text-align:center">Geen scholen gevonden</td></tr>'; return }
  tbody.innerHTML = schools.map(s => \`
    <tr>
      <td><span class="chip">\${s.slug}</span></td>
      <td style="font-weight:600;color:#f1f5f9">\${s.name}</td>
      <td style="color:#94a3b8">\${s.allowedDomain}</td>
      <td>\${s.googleClientId ? '<span class="badge badge-green">✓</span>' : '<span style="color:#475569">—</span>'}</td>
      <td>\${s.azureClientId  ? '<span class="badge badge-green">✓</span>' : '<span style="color:#475569">—</span>'}</td>
      <td><button class="btn btn-sm" style="background:#2d3347;color:#e2e8f0" onclick='openModal(\${JSON.stringify(s)})'>Bewerken</button></td>
    </tr>
  \`).join('')
}

function openModal(s) {
  document.getElementById('edit-slug').value          = s.slug
  document.getElementById('edit-new-slug').value      = s.slug
  document.getElementById('edit-name').value          = s.name
  document.getElementById('edit-domain').value        = s.allowedDomain
  document.getElementById('edit-google-id').value     = s.googleClientId    || ''
  document.getElementById('edit-google-secret').value = s.googleClientSecret|| ''
  document.getElementById('edit-azure-id').value      = s.azureClientId     || ''
  document.getElementById('edit-azure-secret').value  = s.azureClientSecret || ''
  document.getElementById('edit-azure-tenant').value  = s.azureTenantId     || ''
  document.getElementById('modal-title').textContent  = 'School bewerken — ' + s.slug
  document.getElementById('modal-error').textContent  = ''
  document.getElementById('rename-error').textContent = ''
  document.getElementById('school-modal').classList.add('open')
}

async function renameSchool() {
  const slug    = document.getElementById('edit-slug').value
  const newSlug = document.getElementById('edit-new-slug').value.trim().toLowerCase()
  const errEl   = document.getElementById('rename-error')
  errEl.textContent = ''
  if (newSlug === slug) { errEl.textContent = 'Nieuwe slug is gelijk aan de huidige.'; return }
  if (!confirm(\`Subdomein wijzigen van "\${slug}" naar "\${newSlug}"?\\n\\nVergeet niet DNS en OAuth redirect URI aan te passen!\`)) return
  const res = await fetch('/api/schools/' + slug + '/rename', {
    method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ newSlug })
  })
  const data = await res.json()
  if (!res.ok) { errEl.textContent = data.error || 'Hernoemen mislukt.'; return }
  closeModal()
  await loadSchools()
  alert(\`Subdomein gewijzigd naar "\${newSlug}".\\n\\nVergeet niet:\\n• DNS: \${newSlug}.toaplanner.nl → server\\n• Google OAuth redirect URI:\\n  https://\${newSlug}.toaplanner.nl/api/auth/callback/google\\n• Caddy regel aanpassen indien van toepassing\\n• pm2 restart toa-planner\`)
}

function closeModal() {
  document.getElementById('school-modal').classList.remove('open')
}

async function saveSchool() {
  const slug = document.getElementById('edit-slug').value
  const body = {
    name:               document.getElementById('edit-name').value.trim(),
    allowedDomain:      document.getElementById('edit-domain').value.trim(),
    googleClientId:     document.getElementById('edit-google-id').value.trim(),
    googleClientSecret: document.getElementById('edit-google-secret').value.trim(),
    azureClientId:      document.getElementById('edit-azure-id').value.trim(),
    azureClientSecret:  document.getElementById('edit-azure-secret').value.trim(),
    azureTenantId:      document.getElementById('edit-azure-tenant').value.trim(),
  }
  const res = await fetch('/api/schools/' + slug, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
  if (res.ok) { closeModal(); loadSchools() }
  else { document.getElementById('modal-error').textContent = 'Opslaan mislukt.' }
}

document.getElementById('school-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal()
})

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadUsers() {
  const slug = document.getElementById('school-select').value
  const tbl  = document.getElementById('users-table')
  const tbody = document.getElementById('users-body')
  if (!slug) { tbl.style.display='none'; return }
  tbody.innerHTML = '<tr><td colspan="7" style="color:#64748b;padding:1.5rem;text-align:center">Laden…</td></tr>'
  tbl.style.display = ''
  const res = await fetch('/api/schools/' + slug + '/users')
  if (!res.ok) { tbody.innerHTML = '<tr><td colspan="7" style="color:#f87171;padding:1.5rem">Fout bij laden.</td></tr>'; return }
  users = await res.json()
  renderUsers(slug)
}

function renderUsers(slug) {
  const tbody = document.getElementById('users-body')
  if (!users.length) { tbody.innerHTML = '<tr><td colspan="7" style="color:#64748b;padding:1.5rem;text-align:center">Geen gebruikers</td></tr>'; return }
  tbody.innerHTML = users.map(u => \`
    <tr id="user-\${u.id}">
      <td>
        <div style="font-weight:600;color:#f1f5f9">\${esc(u.name)}</div>
        <div style="font-size:.7rem;color:#64748b">\${esc(u.email)}</div>
      </td>
      <td>
        <span class="abbr-cell" onclick="editAbbr('\${u.id}','\${u.abbreviation}','\${slug}')"
          title="Klik om te wijzigen">\${u.abbreviation.toUpperCase()}</span>
      </td>
      <td><input type="checkbox" \${u.isTeacher?'checked':''} onchange="patchUser('\${slug}','\${u.id}',{isTeacher:this.checked})"></td>
      <td><input type="checkbox" \${u.isTOA?'checked':''} onchange="patchUser('\${slug}','\${u.id}',{isTOA:this.checked})"></td>
      <td><input type="checkbox" \${u.isAdmin?'checked':''} onchange="patchUser('\${slug}','\${u.id}',{isAdmin:this.checked})"></td>
      <td>
        <button onclick="patchUser('\${slug}','\${u.id}',{allowed:\${!u.allowed}});this.closest('tr').remove()"
          class="btn btn-sm \${u.allowed?'btn-green':'btn-red'}">
          \${u.allowed ? '✓ Toegestaan' : '✗ Geblokkeerd'}
        </button>
      </td>
      <td>
        <button class="btn btn-sm btn-red" onclick="deleteUser('\${slug}','\${u.id}','\${esc(u.name)}')">✕</button>
      </td>
    </tr>
  \`).join('')
}

async function patchUser(slug, id, data) {
  await fetch('/api/schools/'+slug+'/users/'+id, {
    method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)
  })
  // refresh allowed badge text if needed
  if (data.allowed !== undefined) loadUsers()
}

async function deleteUser(slug, id, name) {
  if (!confirm('Gebruiker "'+name+'" verwijderen?')) return
  await fetch('/api/schools/'+slug+'/users/'+id, { method:'DELETE' })
  loadUsers()
}

function editAbbr(id, current, slug) {
  const val = prompt('Nieuwe afkorting (max 6 tekens):', current.toUpperCase())
  if (!val || val.trim() === current.toUpperCase()) return
  patchUser(slug, id, { abbreviation: val.trim() }).then(() => loadUsers())
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadSchools()
</script>
</body>
</html>`

// ── Start ─────────────────────────────────────────────────────────────────────

http.createServer(async (req, res) => {
  try { await handle(req, res) }
  catch (e) { json(res, 500, { error: e.message }) }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`TOA Superadmin draait op poort ${PORT}`)
})
