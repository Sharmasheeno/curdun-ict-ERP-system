/* ============================================================
   CURDUN ICT SOLUTION — ERP APP JAVASCRIPT
   app.html — Full state machine for all views & tabs
   ============================================================ */

'use strict';

// ============================================================
// DATA CONSTANTS
// ============================================================
const MODULES_DEF = [
  { key:'pharmacy',   name:'Pharmacy',        desc:'POS · prescriptions · inventory',   users:42, branches:'14 branches',     v:'v4.12.0',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><path d="M4.5 4.5l15 15"/><rect x="2" y="2" width="8" height="20" rx="4"/><rect x="14" y="2" width="8" height="20" rx="4"/></svg>` },
  { key:'financials', name:'Financials',       desc:'Ledger · AR/AP · tax filing',       users:12, branches:'USD ledger',      v:'v6.0.4',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>` },
  { key:'crm',        name:'CRM & Sales',      desc:'Leads · patients · WhatsApp',       users:8,  branches:'2,140 contacts',  v:'v5.2.0',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.5-6 7-6s7 2 7 6"/><circle cx="17" cy="7" r="3"/></svg>` },
  { key:'hr',         name:'HR & Payroll',     desc:'Staff · payroll · attendance',      users:0,  branches:'',               v:'v1.8.3',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>` },
  { key:'pos',        name:'Retail POS',       desc:'Multi-store checkout · loyalty',    users:0,  branches:'',               v:'v3.0.0',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><path d="M3 3h18l-2 12H5L3 3z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>` },
  { key:'university', name:'University',       desc:'Students · courses · exams',       users:0,  branches:'',               v:'v2.4.0',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>` },
  { key:'hotel',      name:'Hotel & Booking',  desc:'Reservations · housekeeping',      users:0,  branches:'',               v:'v3.7.2',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/></svg>` },
  { key:'hospital',   name:'Hospital',         desc:'EMR · appointments · triage',      users:0,  branches:'',               v:'v2.1.0',
    icon:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5C411" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8v8M8 12h8"/></svg>` },
];

const SEED_TENANTS = [
  { id:'TN-0042', name:'Shifo Pharmacy Group',    city:'Mogadishu', owner:'Ahmed Yusuf',    since:'May 2024', plan:'Enterprise', users:62,  invoice:'3,200', region:'SO-MG-1' },
  { id:'TN-0117', name:'Jamhuriya University',    city:'Hargeisa',  owner:'Fadumo Ibrahim', since:'Oct 2023', plan:'Enterprise', users:214, invoice:'4,500', region:'SO-HL-1' },
  { id:'TN-0208', name:'Bosaso Retail Co-op',     city:'Bosaso',    owner:'Yusuf Kahin',    since:'Feb 2025', plan:'Business',   users:34,  invoice:'1,100', region:'SO-BO-1' },
  { id:'TN-0091', name:'Kismayo General Hospital',city:'Kismayo',   owner:'Sahra Ali',      since:'Mar 2024', plan:'Enterprise', users:118, invoice:'3,600', region:'SO-KI-1' },
  { id:'TN-0155', name:'Baidoa Grand Hotel',      city:'Baidoa',    owner:'Omar Sharif',    since:'Nov 2024', plan:'Business',   users:22,  invoice:'850',   region:'SO-BA-1' },
  { id:'TN-0173', name:'Halane School System',    city:'Mogadishu', owner:'Zeinab Warsame', since:'Jul 2025', plan:'Business',   users:47,  invoice:'1,300', region:'SO-MG-1' },
  { id:'TN-0201', name:'Mogadishu Livestock Ltd', city:'Mogadishu', owner:'Bashir Mohamud', since:'Jan 2025', plan:'Starter',    users:9,   invoice:'320',   region:'SO-MG-1' },
];

const SEED_LICENSES = {
  'TN-0042': { pharmacy:true, financials:true, crm:true, hr:false, pos:false, university:false, hotel:false, hospital:false },
  'TN-0117': { pharmacy:false, financials:true, crm:true, hr:true, pos:false, university:true, hotel:false, hospital:false },
  'TN-0208': { pharmacy:false, financials:true, crm:true, hr:false, pos:true, university:false, hotel:false, hospital:false },
  'TN-0091': { pharmacy:true, financials:true, crm:true, hr:true, pos:false, university:false, hotel:false, hospital:true },
  'TN-0155': { pharmacy:false, financials:true, crm:true, hr:false, pos:false, university:false, hotel:true, hospital:false },
  'TN-0173': { pharmacy:false, financials:true, crm:true, hr:true, pos:false, university:true, hotel:false, hospital:false },
  'TN-0201': { pharmacy:false, financials:true, crm:true, hr:false, pos:false, university:false, hotel:false, hospital:false },
};

const SEED_INVOICES = [
  { id:'INV-26742', name:'Shifo Pharmacy Group',    plan:'Enterprise', amount:3200, paid:'EVC Plus',   issued:'Jul 22, 2026', due:'Aug 22', status:'paid' },
  { id:'INV-26741', name:'Jamhuriya University',    plan:'Enterprise', amount:4500, paid:'Dahabshiil', issued:'Jul 20, 2026', due:'Aug 20', status:'paid' },
  { id:'INV-26738', name:'Baidoa Grand Hotel',      plan:'Business',   amount:850,  paid:'—',          issued:'Jul 18, 2026', due:'Aug 18', status:'due' },
  { id:'INV-26735', name:'Bosaso Retail Co-op',     plan:'Business',   amount:1100, paid:'Sahal',      issued:'Jul 17, 2026', due:'Aug 17', status:'paid' },
  { id:'INV-26720', name:'Kismayo General Hospital',plan:'Enterprise', amount:3600, paid:'EVC Plus',   issued:'Jul 15, 2026', due:'Aug 15', status:'paid' },
  { id:'INV-26712', name:'Halane School System',    plan:'Business',   amount:1300, paid:'Zaad',       issued:'Jul 12, 2026', due:'Aug 12', status:'paid' },
  { id:'INV-26705', name:'Marka Coastal Trading',   plan:'Starter',    amount:380,  paid:'—',          issued:'Jul 5, 2026',  due:'Aug 5',  status:'due' },
  { id:'INV-26698', name:'Mogadishu Livestock Ltd', plan:'Starter',    amount:320,  paid:'—',          issued:'Jun 30, 2026', due:'Jul 30', status:'overdue' },
];

// ============================================================
// APP STATE
// ============================================================
const S = {
  view: 'login',           // login | firstlogin | super | workspace | pharmacy
  superTab: 'overview',    // overview | companies | admins | modules | infra | billing | audit
  pharmTab: 'dash',        // dash | sales | inventory | rx | users | branches | settings

  // Auth
  loginEmail: '', loginPassword: '', loginError: false,
  newPw1: '', newPw2: '', pwError: '',

  // Tenants
  tenants: [...SEED_TENANTS],
  licenses: JSON.parse(JSON.stringify(SEED_LICENSES)),
  selectedTenantId: 'TN-0042',

  // Modals
  tenantModalMode: null,   // null | create | edit
  tenantForm: {},
  confirmDeleteId: null,

  invoiceModal: false,
  invoiceForm: { tenantId:'TN-0042', systems:{ pharmacy:true, financials:true }, prices:{}, custom:[], discount:0, due:'Aug 30, 2026', note:'' },
  invoices: [...SEED_INVOICES],

  systemModal: false,
  systemForm: { name:'', desc:'', forWho:'', v:'v1.0.0', price:400 },
  customSystems: [],

  // Pharmacy users
  pharmUsers: [
    { id:1, name:'Fartun Ali',    email:'fartun@shifo.so',   role:'Pharmacist',    branch:'Bakaara Main' },
    { id:2, name:'Mohamed Farah', email:'mohamed@shifo.so',  role:'Cashier',       branch:'Hodan Branch' },
    { id:3, name:'Amina Hassan',  email:'amina@shifo.so',    role:'Branch Manager',branch:'Wadajir Branch' },
    { id:4, name:'Ismail Omar',   email:'ismail@shifo.so',   role:'Cashier',       branch:'Hamar Weyne' },
    { id:5, name:'Khadija Abdi',  email:'khadija@shifo.so',  role:'Pharmacist',    branch:'Bakaara Main' },
    { id:6, name:'Hodan Nur',     email:'hodan@shifo.so',    role:'Accountant',    branch:'HQ · Mogadishu' },
  ],
  showAddUser: false, newName:'', newRole:'Pharmacist', newBranch:'Bakaara Main',

  liveTick: 0,
};

// ============================================================
// HELPERS
// ============================================================
const $ = (id) => document.getElementById(id);
const el = (tag, attrs={}, ...children) => {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.forEach(c => { if(c != null) e.append(typeof c === 'string' ? c : c); });
  return e;
};
const html = (str) => { const t = document.createElement('div'); t.innerHTML = str; return t.firstElementChild; };

function initials(name) {
  return (name||'').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
}
function grantedCount(tenantId) {
  return Object.values(S.licenses[tenantId] || {}).filter(Boolean).length;
}
function getTenant(id) {
  return S.tenants.find(t=>t.id === id) || S.tenants[0] || {};
}

// ============================================================
// RENDER ROUTER
// ============================================================
function render() {
  const root = $('app-root');
  if (!root) return;
  root.innerHTML = '';

  switch(S.view) {
    case 'login':      root.appendChild(renderLogin());     break;
    case 'firstlogin': root.appendChild(renderFirstLogin()); break;
    case 'super':      root.appendChild(renderSuper());     break;
    case 'workspace':  root.appendChild(renderWorkspace()); break;
    case 'pharmacy':   root.appendChild(renderPharmacy());  break;
  }
}

// ============================================================
// LOGIN VIEW
// ============================================================
function renderLogin() {
  const div = document.createElement('div');
  div.className = 'login-split';
  div.innerHTML = `
    <!-- Brand Panel -->
    <div class="login-brand">
      <div class="login-brand-head">
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          <rect x="2" y="2" width="60" height="60" rx="14" fill="#3B2170"/>
          <path d="M22 20 L12 32 L22 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M42 20 L52 32 L42 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <rect x="30" y="14" width="4" height="36" rx="2" fill="#F5C411" transform="rotate(15 32 32)"/>
        </svg>
        <div>
          <div class="login-brand-name">CURDUN</div>
          <div class="login-brand-sub">ICT SOLUTION</div>
        </div>
      </div>
      <div class="login-brand-body">
        <div class="login-brand-eyebrow">Cor Platform</div>
        <div class="login-brand-headline">One login for every side of your business.</div>
        <div class="login-brand-desc">Pharmacy, University, POS, Hospital, Hotel — all on the same core. Trusted by 148 companies across Mogadishu, Hargeisa, Kismayo, Bosaso and Baidoa.</div>
      </div>
      <div class="login-brand-stats">
        <div><div class="login-brand-stat-num">148</div>Companies</div>
        <div><div class="login-brand-stat-num">8</div>Modules</div>
        <div><div class="login-brand-stat-num">99.96%</div>Uptime</div>
      </div>
      <svg class="login-brand-bg-icon" width="340" height="340" viewBox="0 0 24 24" fill="#F5C411">
        <path d="M12 2l3 6 6 .9-4.5 4.4 1 6.7L12 17l-5.5 3 1-6.7L3 8.9 9 8z"/>
      </svg>
    </div>

    <!-- Form Panel -->
    <div class="login-form-panel">
      <div>
        <div class="login-eyebrow">Sign in</div>
        <h2 class="login-title">Welcome back</h2>
        <div class="login-subtitle">One account, routed by role. Curdun admins and company admins share this door.</div>
      </div>

      <div class="form-group">
        <label class="form-label" for="login-email">Email</label>
        <input id="login-email" class="form-input" type="email" placeholder="you@company.so" value="${S.loginEmail}"/>
      </div>
      <div class="form-group">
        <div class="flex justify-between items-center" style="margin-bottom:5px">
          <label class="form-label" for="login-pw" style="margin:0">Password</label>
          <a href="#" style="font-size:12px; font-weight:700; color:var(--purple-800)">Forgot?</a>
        </div>
        <input id="login-pw" class="form-input mono" type="password" placeholder="••••••••" style="letter-spacing:2px"/>
      </div>

      ${S.loginError ? `<div class="form-error">Invalid credentials. Use one of the demo accounts below.</div>` : ''}

      <button id="btn-signin" class="login-btn">
        Sign in
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      <div class="divider-text">DEMO ACCOUNTS</div>

      <div class="demo-grid">
        <button class="demo-card purple" id="demo-super">
          <div class="demo-card-eyebrow">Curdun</div>
          <div>Super Admin</div>
          <div class="demo-card-email">admin@curdun.so</div>
        </button>
        <button class="demo-card gold" id="demo-admin">
          <div class="demo-card-eyebrow">Shifo Pharmacy</div>
          <div>Company Admin</div>
          <div class="demo-card-email">ahmed@shifo.so</div>
        </button>
      </div>

      <button class="demo-first-login" id="demo-firstlogin">
        Try: new admin's <b>first sign-in</b> (temporary password → set new password)
      </button>

      <div class="login-footer-note">SSO · SAML · Passkey — © 2026 Curdun ICT Solution</div>
    </div>
  `;

  div.querySelector('#btn-signin').addEventListener('click', doSignIn);
  div.querySelector('#demo-super').addEventListener('click', () => { S.view='super'; render(); });
  div.querySelector('#demo-admin').addEventListener('click', () => { S.view='workspace'; render(); });
  div.querySelector('#demo-firstlogin').addEventListener('click', () => { S.newPw1=''; S.newPw2=''; S.pwError=''; S.view='firstlogin'; render(); });
  div.querySelector('#login-email').addEventListener('input', e => { S.loginEmail = e.target.value; S.loginError = false; });
  div.querySelector('#login-pw').addEventListener('keydown', e => { if(e.key==='Enter') doSignIn(); });

  return div;
}

function doSignIn() {
  const email = (S.loginEmail || $('login-email')?.value || '').toLowerCase().trim();
  const pw = ($('login-pw')?.value || '');
  S.loginEmail = email;

  if (!email) { S.loginError = true; render(); return; }
  if (email.includes('curdun')) { S.view='super'; S.loginError=false; render(); return; }

  // Check if matches a created company admin
  const created = S.tenants.find(t => (t.adminEmail||'').toLowerCase() === email);
  if (created) { S.view='firstlogin'; S.loginError=false; render(); return; }

  if (email.includes('shifo') || email.includes('ahmed')) { S.view='workspace'; S.loginError=false; render(); return; }
  if (/@[^\s@]+\.[a-z]{2,}$/i.test(email)) { S.view='firstlogin'; S.loginError=false; render(); return; }

  S.loginError = true; render();
}

// ============================================================
// FIRST SIGN-IN VIEW
// ============================================================
function renderFirstLogin() {
  const div = document.createElement('div');
  div.className = 'first-login-bg';

  const hasPwLen   = (S.newPw1||'').length >= 10;
  const hasPwUpper = /[A-Z]/.test(S.newPw1||'');
  const hasPwNum   = /[0-9]/.test(S.newPw1||'');
  const pwMatch    = !!(S.newPw1) && (S.newPw1 === S.newPw2);

  div.innerHTML = `
    <div class="first-login-box">
      <div class="first-login-header">
        <div class="icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>
          </svg>
        </div>
        <div>
          <div class="eyebrow">Curdun · First sign-in</div>
          <h2>Create your new password</h2>
        </div>
      </div>
      <div class="first-login-body">
        <div class="first-login-info">
          Welcome <b style="color:var(--purple-800)">Hodan Warsame</b>. You signed in with the temporary password Curdun sent by SMS.<br>
          Before you enter your workspace, please set a personal password that only you know.
        </div>
        <div class="flex-col gap-14">
          <div class="form-group">
            <label class="form-label">Your account</label>
            <div class="form-input mono" style="color:var(--purple-800)">hodan@baraka.so</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pw1">New password</label>
            <input id="pw1" class="form-input" type="password" placeholder="At least 10 characters" value="${S.newPw1}"/>
          </div>
          <div class="form-group">
            <label class="form-label" for="pw2">Confirm new password</label>
            <input id="pw2" class="form-input" type="password" placeholder="Type it again" value="${S.newPw2}"/>
          </div>
          <div class="pw-rules">
            <div class="title">Password must have</div>
            <div class="pw-rule ${hasPwLen?'met':''}">  ${hasPwLen?'✓':'○'} At least 10 characters</div>
            <div class="pw-rule ${hasPwUpper?'met':''}"> ${hasPwUpper?'✓':'○'} One uppercase letter (A–Z)</div>
            <div class="pw-rule ${hasPwNum?'met':''}">   ${hasPwNum?'✓':'○'} One number (0–9)</div>
            <div class="pw-rule ${pwMatch?'met':''}">    ${pwMatch?'✓':'○'} Both passwords match</div>
          </div>
          ${S.pwError ? `<div class="form-error">⚠ ${S.pwError}</div>` : ''}
          <button id="btn-setpw" class="btn btn-primary w-full">Save password & open my workspace →</button>
          <div style="text-align:center; font-size:11px; color:var(--gray-500)">From now on, always sign in with this password. Never share it — not even with Curdun.</div>
        </div>
      </div>
    </div>
  `;

  div.querySelector('#pw1').addEventListener('input', e => { S.newPw1=e.target.value; S.pwError=''; renderPartialPwRules(div); });
  div.querySelector('#pw2').addEventListener('input', e => { S.newPw2=e.target.value; S.pwError=''; renderPartialPwRules(div); });
  div.querySelector('#btn-setpw').addEventListener('click', () => {
    if (!S.newPw1 || S.newPw1.length < 10) { S.pwError='Password must be at least 10 characters.'; render(); return; }
    if (!/[A-Z]/.test(S.newPw1)) { S.pwError='Add at least one uppercase letter.'; render(); return; }
    if (!/[0-9]/.test(S.newPw1)) { S.pwError='Add at least one number.'; render(); return; }
    if (S.newPw1 !== S.newPw2)   { S.pwError='The two passwords do not match.'; render(); return; }
    S.view = 'workspace'; render();
  });
  return div;
}

function renderPartialPwRules(container) {
  const rules = container.querySelectorAll('.pw-rule');
  const hasPwLen   = (S.newPw1||'').length >= 10;
  const hasPwUpper = /[A-Z]/.test(S.newPw1||'');
  const hasPwNum   = /[0-9]/.test(S.newPw1||'');
  const pwMatch    = !!(S.newPw1) && (S.newPw1 === S.newPw2);
  const checks = [hasPwLen, hasPwUpper, hasPwNum, pwMatch];
  const labels = ['At least 10 characters','One uppercase letter (A–Z)','One number (0–9)','Both passwords match'];
  rules.forEach((r, i) => {
    r.className = 'pw-rule' + (checks[i]?' met':'');
    r.textContent = (checks[i]?'✓':'○') + ' ' + labels[i];
  });
}

// ============================================================
// SUPER ADMIN VIEW
// ============================================================
function renderSuper() {
  const wrap = document.createElement('div');
  wrap.className = 'super-layout';
  wrap.appendChild(renderSidebar());

  const main = document.createElement('main');
  main.className = 'super-main';
  main.appendChild(renderTopBar());
  main.appendChild(renderTabContent());
  wrap.appendChild(main);

  return wrap;
}

function renderSidebar() {
  const aside = document.createElement('aside');
  aside.className = 'sidebar';
  aside.innerHTML = `
    <div class="sidebar-header">
      <svg width="38" height="38" viewBox="0 0 64 64" fill="none">
        <rect x="2" y="2" width="60" height="60" rx="12" fill="#3B2170"/>
        <path d="M22 20 L12 32 L22 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M42 20 L52 32 L42 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="30" y="14" width="4" height="36" rx="2" fill="#F5C411" transform="rotate(15 32 32)"/>
      </svg>
      <div>
        <div class="sidebar-brand-name">CURDUN</div>
        <div class="sidebar-brand-sub">COR · SUPER ADMIN</div>
      </div>
    </div>
    <div class="sidebar-section-label">Console</div>
    <nav class="sidebar-nav">
      ${[
        ['overview',  'Overview', overviewIcon()],
        ['companies', 'Companies', companiesIcon(), 148],
        ['admins',    'Company Admins', adminsIcon(), 148],
        ['modules',   'Systems Catalog', modulesIcon()],
        ['infra',     'Infrastructure', infraIcon()],
        ['billing',   'Billing & Subs', billingIcon()],
        ['audit',     'Audit & Compliance', auditIcon()],
      ].map(([tab, label, icon, badge]) => `
        <button class="sidebar-item${S.superTab===tab?' active':''}" data-tab="${tab}">
          ${icon} ${label}
          ${badge ? `<span class="sidebar-badge">${badge}</span>` : ''}
        </button>
      `).join('')}
    </nav>
    <div class="sidebar-spacer"></div>
    <div class="sidebar-user">
      <div class="avatar-pill">AK</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">Adamu Kaduna</div>
        <div class="sidebar-user-role">Global Super Admin</div>
      </div>
      <button class="sidebar-logout" id="btn-logout" title="Sign out">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  `;

  aside.querySelectorAll('.sidebar-item').forEach(btn => {
    btn.addEventListener('click', () => { S.superTab = btn.dataset.tab; render(); });
  });
  aside.querySelector('#btn-logout').addEventListener('click', () => { S.view='login'; S.loginError=false; render(); });
  return aside;
}

function renderTopBar() {
  const bar = document.createElement('header');
  bar.className = 'topbar';
  bar.innerHTML = `
    <div class="topbar-breadcrumb">
      Curdun Cor <span style="margin:0 6px;color:#B3A9D2">›</span>
      <span class="current">${S.superTab}</span>
    </div>
    <div class="ml-auto flex items-center gap-12">
      <div class="topbar-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6484" stroke-width="2">
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
        </svg>
        <span>Search tenants, modules, logs…</span>
        <span class="kbd">⌘K</span>
      </div>
      <div class="topbar-status">
        <span style="width:7px;height:7px;border-radius:50%;background:#22C55E;display:inline-block"></span>
        Production · SO-MG-1
      </div>
      <button class="topbar-notif">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D1859" stroke-width="1.8" style="display:block;margin:auto">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
        </svg>
        <span class="topbar-notif-dot"></span>
      </button>
    </div>
  `;
  return bar;
}

function renderTabContent() {
  const wrap = document.createElement('div');
  wrap.className = 'tab-content animate-fadein';
  switch(S.superTab) {
    case 'overview':  wrap.innerHTML = renderOverviewTab(); break;
    case 'companies': wrap.innerHTML = renderCompaniesTab(); break;
    case 'admins':    wrap.innerHTML = renderAdminsTab(); break;
    case 'modules':   wrap.innerHTML = renderModulesTab(); break;
    case 'infra':     wrap.innerHTML = renderInfraTab(); break;
    case 'billing':   wrap.innerHTML = renderBillingTab(); break;
    case 'audit':     wrap.innerHTML = renderAuditTab(); break;
  }
  // Wire up events after innerHTML
  setTimeout(() => wireTabEvents(wrap), 0);
  return wrap;
}

// ---- OVERVIEW TAB ----
function renderOverviewTab() {
  const tenant = getTenant(S.selectedTenantId);
  const topCos = [...S.tenants].sort((a,b)=>b.users-a.users).slice(0,5);
  const moduleAdoption = MODULES_DEF.map(m => {
    const count = S.tenants.filter(t=>(S.licenses[t.id]||{})[m.key]).length;
    const pct   = S.tenants.length ? Math.round((count/S.tenants.length)*100) : 0;
    return { name:m.name, count, pct };
  });

  const liveCpu = 58 + Math.round(Math.sin(S.liveTick/3)*8);
  const liveMem = 68 + Math.round(Math.cos(S.liveTick/4)*6);
  const liveReq = (42180 + Math.round(Math.sin(S.liveTick/2)*3400)).toLocaleString();

  return `
    <section class="flex justify-between items-center gap-20" style="flex-wrap:wrap">
      <div>
        <div class="label-sm text-faint">Cor Overview</div>
        <h1 style="margin:6px 0 4px;font-size:28px;font-weight:900;letter-spacing:-0.4px">Global Platform Dashboard</h1>
        <div style="font-size:13px;color:var(--text-muted)">Every tenant, every module across Somalia — at a glance.</div>
      </div>
      <div class="time-range">
        <button class="time-btn active">30 days</button>
        <button class="time-btn">Quarter</button>
        <button class="time-btn">Year</button>
      </div>
    </section>

    <section class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow">Companies</div><div class="kpi-value">${S.tenants.length}</div><div class="kpi-trend">▲ 12 · last 30d</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Monthly recurring</div><div class="kpi-value">$75,000</div><div class="kpi-trend trend-up">▲ 8.4% MoM</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Modules deployed</div><div class="kpi-value">8<span style="font-size:14px;color:var(--text-muted);font-weight:500"> / 8</span></div><div class="kpi-trend">All licensed at least once</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Platform uptime</div><div class="kpi-value">99.96%</div><div class="kpi-trend trend-warn">1 incident open</div></div>
    </section>

    <section style="display:grid;grid-template-columns:2fr minmax(0,1fr);gap:16px">
      <div class="chart-card">
        <div class="chart-header">
          <div><h3 class="chart-title">Revenue & tenant growth</h3><div class="chart-sub">Last 7 months</div></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-swatch" style="background:#2D1859"></span>MRR</span>
            <span class="legend-item"><span class="legend-swatch" style="background:#F5C411"></span>Tenants</span>
          </div>
        </div>
        <svg viewBox="0 0 600 200" width="100%" height="200" preserveAspectRatio="none">
          <defs><linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#2D1859" stop-opacity="0.28"/><stop offset="100%" stop-color="#2D1859" stop-opacity="0"/></linearGradient></defs>
          <g stroke="#F0EEF7" stroke-width="1"><line x1="0" y1="30" x2="600" y2="30"/><line x1="0" y1="80" x2="600" y2="80"/><line x1="0" y1="130" x2="600" y2="130"/><line x1="0" y1="180" x2="600" y2="180"/></g>
          <path d="M0,150 C60,140 120,120 180,110 C240,100 300,80 360,70 C420,60 480,50 540,40 L600,32 L600,200 L0,200 Z" fill="url(#revFill)"/>
          <path d="M0,150 C60,140 120,120 180,110 C240,100 300,80 360,70 C420,60 480,50 540,40 L600,32" fill="none" stroke="#2D1859" stroke-width="3"/>
          <path d="M0,175 C60,170 120,162 180,155 C240,150 300,140 360,132 C420,125 480,115 540,105 L600,95" fill="none" stroke="#F5C411" stroke-width="3" stroke-dasharray="5 4"/>
        </svg>
        <div class="chart-x-axis"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
      </div>
      <div class="chart-card flex-col gap-12">
        <div class="flex justify-between items-center">
          <h3 class="chart-title">Alerts & incidents</h3>
          <span class="pill pill-amber">3 OPEN</span>
        </div>
        <div class="alert-card-red">
          <div class="alert-icon" style="background:#B42318;color:#FFF"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10.3 3.86l-8.1 14A2 2 0 0 0 3.94 21h16.12a2 2 0 0 0 1.75-3.14l-8.1-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg></div>
          <div><div class="alert-title">HR & Payroll · Kismayo Hospital</div><div class="alert-desc">Security patch pending · 3h ago</div></div>
        </div>
        <div class="alert-card-amber">
          <div class="alert-icon" style="background:#F5C411;color:#2D1859"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
          <div><div class="alert-title">Retail POS v3.0 pending</div><div class="alert-desc">44 tenants awaiting upgrade</div></div>
        </div>
        <div class="alert-card-info">
          <div class="alert-icon" style="background:#2D1859;color:#F5C411"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/></svg></div>
          <div><div class="alert-title">Invoice overdue · Lagos Trade</div><div class="alert-desc">$320 · 25 days late</div></div>
        </div>
      </div>
    </section>

    <section style="display:grid;grid-template-columns:1.1fr minmax(0,1fr);gap:16px">
      <div class="data-section">
        <div class="section-header-bar">
          <h3 class="chart-title">Top companies</h3>
          <a href="#" class="ml-auto" style="font-size:12px;font-weight:700;color:var(--purple-800)" onclick="S.superTab='companies';render();return false">View all →</a>
        </div>
        ${topCos.map(c=>`
          <div class="flex items-center gap-12" style="padding:12px 20px;border-top:1px solid #F0EEF7">
            <div style="width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#2D1859,#4A2B8A);color:#F5C411;display:grid;place-items:center;font-weight:900;font-size:12px;flex-shrink:0">${initials(c.name)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;color:var(--text-primary);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.name}</div>
              <div style="font-size:11px;color:var(--text-muted)">${c.city} · ${c.plan} · ${grantedCount(c.id)} modules</div>
            </div>
            <div style="text-align:right"><div style="font-weight:800;font-size:13px">$ ${c.invoice}</div><div style="font-size:10px;color:var(--text-muted)">${c.users} users</div></div>
          </div>
        `).join('')}
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:14px">Module adoption</h3>
        <div class="flex-col gap-12">
          ${moduleAdoption.map(m=>`
            <div>
              <div class="flex justify-between" style="font-size:12px;margin-bottom:4px"><span style="color:var(--text-primary);font-weight:600">${m.name}</span><span style="color:var(--text-muted);font-family:var(--font-mono)">${m.count} · ${m.pct}%</span></div>
              <div class="progress-bar"><div class="progress-fill" style="width:${m.pct}%"></div></div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px">
      <div class="infra-dark-card">
        <div class="flex justify-between items-center" style="margin-bottom:14px">
          <h3>Server utilization</h3>
          <span class="live-badge">LIVE</span>
        </div>
        <div class="flex-col gap-11">
          <div class="infra-metric"><div class="infra-metric-row"><span>CPU · cluster SO-MG-1</span><span class="infra-metric-val">${liveCpu}%</span></div><div class="infra-progress"><div class="infra-progress-fill" style="width:${liveCpu}%"></div></div></div>
          <div class="infra-metric"><div class="infra-metric-row"><span>Memory · 384 GB</span><span class="infra-metric-val">${liveMem}%</span></div><div class="infra-progress"><div class="infra-progress-fill" style="width:${liveMem}%"></div></div></div>
          <div class="infra-metric"><div class="infra-metric-row"><span>Storage · 24 TB SSD</span><span class="infra-metric-val">44%</span></div><div class="infra-progress"><div class="infra-progress-fill" style="width:44%"></div></div></div>
          <div class="infra-metric"><div class="infra-metric-row"><span>Network egress</span><span class="infra-metric-val">318 Mb/s</span></div><div class="infra-progress"><div class="infra-progress-fill" style="width:34%"></div></div></div>
        </div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:14px">Recent activity</h3>
        <div class="flex-col gap-12">
          ${[
            ['+','#EEFBF3','#0F7A3A','Baidoa Grand Hotel · Hotel & Booking granted','Adamu Kaduna · 8 min ago'],
            ['✓','#F5C41133','#8B5A00','Shifo Pharmacy invoice paid','$3,200 · 42 min ago'],
            ['●','#2D1859','#F5C411','Bosaso Retail Co-op onboarded','1h ago · Financials + CRM + POS'],
            ['🔒','#FEF0EE','#B42318','Kismayo Hospital · HR module suspended','Security patch pending · 3h ago'],
            ['✓','#EEFBF3','#0F7A3A','Backup completed · SO-MG-1','24 TB snapshot · 6h ago'],
          ].map(([icon,bg,fg,title,desc])=>`
            <div class="flex gap-10">
              <div style="width:28px;height:28px;border-radius:8px;background:${bg};color:${fg};display:grid;place-items:center;flex-shrink:0;font-weight:900;font-size:14px">${icon}</div>
              <div style="font-size:12px"><div style="color:var(--text-primary);font-weight:700">${title}</div><div style="color:var(--text-muted)">${desc}</div></div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

// ---- COMPANIES TAB ----
function renderCompaniesTab() {
  const tenant = getTenant(S.selectedTenantId);
  const mods = MODULES_DEF.map(m => {
    const on = !!(S.licenses[S.selectedTenantId]||{})[m.key];
    return { ...m, on };
  });

  return `
    <section class="data-section" id="companies-table-section">
      <div class="section-header-bar">
        <div><div class="section-eyebrow">Tenants</div><h2 class="section-h2">Companies</h2></div>
        <div class="ml-auto flex items-center gap-8">
          <button class="filter-pill active" style="border:none;background:#2D1859;color:#FFF">All · ${S.tenants.length}</button>
          <button class="filter-pill">Enterprise</button>
          <button class="filter-pill">Business</button>
          <button class="filter-pill">Starter</button>
          <button class="btn btn-gold btn-sm" id="btn-add-company">+ Add company</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>Company</th><th>Plan</th><th>Modules</th><th>Users</th><th>Next payment</th><th>Region</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${S.tenants.map(t=>`
              <tr>
                <td style="cursor:pointer" data-select="${t.id}">
                  <div class="flex items-center gap-10">
                    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#2D1859,#4A2B8A);color:#F5C411;display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0">${initials(t.name)}</div>
                    <div><div style="font-weight:700;color:var(--text-primary)">${t.name}</div><div style="font-size:11px;color:var(--text-muted)">${t.city} · Owner ${t.owner}</div></div>
                  </div>
                </td>
                <td><span style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:#F5C41133;color:#8B5A00">${t.plan}</span></td>
                <td style="font-weight:700;color:#2D1859">${grantedCount(t.id)} / 8</td>
                <td style="font-weight:700">${t.users}</td>
                <td>$ ${t.invoice}</td>
                <td style="font-family:var(--font-mono);color:var(--text-muted);font-size:12px">${t.region}</td>
                <td class="col-right">
                  <button class="btn btn-primary btn-xs" style="margin-right:6px" data-select="${t.id}">Manage</button>
                  <button class="btn btn-outline btn-xs" style="margin-right:6px" data-edit="${t.id}">Edit</button>
                  <button class="btn btn-xs" style="border:1px solid #FDA29B;color:#B42318;background:#FFF" data-delete="${t.id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Tenant Drilldown -->
    <section class="tenant-drilldown">
      <div class="tenant-drilldown-avatar">${initials(tenant.name)}</div>
      <div>
        <div class="tenant-id">Tenant · ${tenant.id}</div>
        <h2 class="tenant-name">${tenant.name}</h2>
        <div class="tenant-meta">${tenant.city} · Owner: ${tenant.owner} · Since ${tenant.since}</div>
      </div>
      <div class="ml-auto flex gap-10" style="flex-wrap:wrap">
        <span class="pill pill-green">● Active</span>
        <span class="pill pill-gold">${tenant.plan}</span>
      </div>
    </section>

    <!-- Module Grants -->
    <section>
      <div class="flex justify-between items-center" style="margin-bottom:14px">
        <div>
          <h3 style="font-size:18px;font-weight:800;color:var(--text-primary)">Systems this company can use</h3>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Turn on to give access. Turn off to remove access. Changes save right away.</div>
        </div>
        <div style="font-size:12px;color:var(--text-muted)"><b style="color:#2D1859">${grantedCount(S.selectedTenantId)}</b> of 8 modules granted</div>
      </div>
      <div class="module-grant-grid">
        ${mods.map(m=>`
          <div class="module-grant-card ${m.on?'on':'off'}">
            <div class="flex justify-between items-center">
              <div class="grant-icon-wrap">${m.icon}</div>
              <button class="toggle-wrap ${m.on?'on':''}" data-toggle="${m.key}"><span class="toggle-knob"></span></button>
            </div>
            <div class="grant-title ${m.on?'on':'off'}">${m.name}</div>
            <div class="grant-meta">${m.on?'GRANTED · '+m.v:'NOT LICENSED'}</div>
          </div>
        `).join('')}
      </div>
    </section>

    <!-- Stats Row -->
    <section style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px">
      <div class="kpi-card light"><div class="kpi-eyebrow">Total users</div><div class="kpi-value">${tenant.users}</div><div class="kpi-trend">Across active modules</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Next payment</div><div class="kpi-value">$ ${tenant.invoice}</div><div class="kpi-trend">Due Aug 15, 2026</div></div>
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Server location</div><div class="kpi-value">${tenant.region}</div><div class="kpi-trend" style="color:#EFEAFB">Edge PoP</div></div>
    </section>
  `;
}

// ---- ADMINS TAB ----
function renderAdminsTab() {
  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Access Control</div>
        <h1 class="page-title">Company Admins</h1>
        <div class="page-subtitle">Each company you add to Cor gets <b style="color:#2D1859">one login</b> — the Company Admin. They receive the credentials by SMS/email, sign in, and from there they create their own staff. You do <b>not</b> create staff for them.</div>
      </div>
      <button class="btn btn-gold" id="btn-invite-admin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Invite a new admin
      </button>
    </div>
    <section class="admins-stat-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Total admins</div><div class="kpi-value">${S.tenants.length}</div><div class="kpi-trend" style="color:#EFEAFB">One per company</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Active</div><div class="kpi-value" style="color:#0F7A3A">${Math.max(0,S.tenants.length-6)}</div><div class="kpi-trend">Signed in this week</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Invite sent</div><div class="kpi-value" style="color:#B45309">5</div><div class="kpi-trend">Pending first sign-in</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Suspended</div><div class="kpi-value" style="color:#B42318">1</div><div class="kpi-trend">Kismayo Hospital</div></div>
    </section>
    <section class="data-section">
      <div class="section-header-bar">
        <h3 class="chart-title">All company admins</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:700px">
          <thead><tr><th>Admin</th><th>Company</th><th>Plan</th><th>Last sign-in</th><th>Status</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${S.tenants.map((t,i)=>`<tr>
              <td>
                <div class="flex items-center gap-10">
                  <div style="width:32px;height:32px;border-radius:50%;background:#2D1859;color:#F5C411;display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0">${initials(t.owner)}</div>
                  <div><div style="font-weight:700">${t.owner}</div><div style="font-size:11px;color:var(--text-muted)">admin@${t.name.toLowerCase().replace(/\s+/,'')+'.so'}</div></div>
                </div>
              </td>
              <td style="font-weight:600">${t.name}</td>
              <td><span style="font-size:11px;font-weight:800;padding:3px 8px;border-radius:999px;background:#F5C41133;color:#8B5A00">${t.plan}</span></td>
              <td style="color:var(--text-muted);font-size:12px">${i===0?'Today, 14:22':i<3?'Yesterday':'2 days ago'}</td>
              <td><span class="pill ${i===3?'pill-red':'pill-green'}">${i===3?'● Suspended':'● Active'}</span></td>
              <td class="col-right"><button class="btn btn-outline btn-xs">Reset password</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ---- MODULES CATALOG TAB ----
function renderModulesTab() {
  const allModules = [...MODULES_DEF];
  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Systems Catalog</div>
        <h1 class="page-title">Available Systems</h1>
        <div class="page-subtitle">All Curdun modules available for licensing. Toggle them per-company from the Companies tab.</div>
      </div>
      <button class="btn btn-gold" id="btn-add-system">+ Add system</button>
    </div>
    <div class="catalog-grid">
      ${allModules.map(m=>{
        const count = S.tenants.filter(t=>(S.licenses[t.id]||{})[m.key]).length;
        const isBeta = m.key === 'hospital';
        return `
          <div class="catalog-card">
            <div class="catalog-card-head">
              <div class="catalog-icon">${m.icon}</div>
              <span class="pill ${isBeta?'pill-amber':'pill-green'}">${isBeta?'● Beta':'● Published'}</span>
            </div>
            <div class="catalog-name">${m.name}</div>
            <div class="catalog-desc">${m.desc}</div>
            <div class="catalog-meta">
              <span class="catalog-version">${m.v}</span>
              <span class="pill pill-purple" style="font-size:10px;padding:3px 8px">${count} tenants</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ---- INFRA TAB ----
function renderInfraTab() {
  const liveCpu = 58 + Math.round(Math.sin(S.liveTick/3)*8);
  const liveMem = 68 + Math.round(Math.cos(S.liveTick/4)*6);
  const liveReq = (42180 + Math.round(Math.sin(S.liveTick/2)*3400)).toLocaleString();
  const now = new Date();
  const pad = n=>String(n).padStart(2,'0');
  const liveTime = pad(now.getHours())+':'+pad(now.getMinutes())+':'+pad(now.getSeconds());

  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Infrastructure</div>
        <h1 class="page-title">Platform Infrastructure</h1>
        <div class="page-subtitle">Live metrics from all Curdun server clusters across Somalia. Refreshes every 3 seconds.</div>
      </div>
      <span class="live-badge">🔴 LIVE · ${liveTime}</span>
    </div>
    <section class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">CPU Load</div><div class="kpi-value">${liveCpu}%</div><div class="kpi-trend" style="color:#EFEAFB">SO-MG-1 cluster</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Memory</div><div class="kpi-value">${liveMem}%</div><div class="kpi-trend">of 384 GB</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Requests / min</div><div class="kpi-value" style="font-size:22px">${liveReq}</div><div class="kpi-trend trend-up">Normal range</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Active sessions</div><div class="kpi-value">2,340</div><div class="kpi-trend">Peak today: 3,100</div></div>
    </section>
    <section style="display:grid;grid-template-columns:1.2fr 1fr;gap:16px">
      <div class="infra-dark-card">
        <div class="flex justify-between items-center" style="margin-bottom:16px"><h3>Server clusters</h3><span class="live-badge">LIVE</span></div>
        ${[
          ['SO-MG-1','Mogadishu – Primary',liveCpu,'62%',true],
          ['SO-HL-1','Hargeisa – Secondary',42,'42%',true],
          ['SO-BO-1','Bosaso – Edge',28,'28%',true],
          ['SO-KI-1','Kismayo – Edge',35,'35%',true],
          ['SO-BA-1','Baidoa – Edge',19,'19%',true],
        ].map(([id,loc,pct,lbl,ok])=>`
          <div class="server-row">
            <div class="flex-col" style="flex:1">
              <div class="flex justify-between" style="font-size:12px;margin-bottom:4px">
                <span style="font-family:var(--font-mono);color:#EFEAFB;font-weight:700">${id}</span>
                <span style="color:#F5C411;font-weight:700">${pct}</span>
              </div>
              <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-bottom:5px">${loc}</div>
              <div class="infra-progress"><div class="infra-progress-fill" style="width:${pct}"></div></div>
            </div>
            <span class="pill-green pill" style="margin-left:12px;flex-shrink:0">● OK</span>
          </div>
        `).join('')}
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:14px">Storage breakdown</h3>
        ${[
          ['Tenant data','44%','#2D1859'],['Backups (30d)','28%','#4A2B8A'],['Logs & audit','14%','#F5C411'],['Media & uploads','9%','#22C55E'],['System & OS','5%','#6B6484'],
        ].map(([name,pct,col])=>`
          <div style="margin-bottom:12px">
            <div class="flex justify-between" style="font-size:12.5px;margin-bottom:5px"><span style="font-weight:700;color:var(--text-primary)">${name}</span><span style="color:var(--text-muted);font-family:var(--font-mono)">${pct}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct};background:${col}"></div></div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

// ---- BILLING TAB ----
function renderBillingTab() {
  const statusMap = { paid:{text:'● Paid',bg:'#EEFBF3',fg:'#0F7A3A'}, due:{text:'● Due soon',bg:'#FEF6D8',fg:'#8B5A00'}, overdue:{text:'● Overdue',bg:'#FEF0EE',fg:'#B42318'} };
  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Billing & Subscriptions</div>
        <h1 class="page-title">Revenue & Invoices</h1>
      </div>
      <button class="btn btn-gold" id="btn-open-invoice">+ Create invoice</button>
    </div>

    <section class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">MRR</div><div class="kpi-value">$75,000</div><div class="kpi-trend trend-up" style="color:#EFEAFB">▲ 8.4% MoM</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">ARR</div><div class="kpi-value">$900K</div><div class="kpi-trend trend-up">▲ projected</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Collected this month</div><div class="kpi-value">$68,200</div><div class="kpi-trend">90.9% collection rate</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Overdue</div><div class="kpi-value trend-warn">$640</div><div class="kpi-trend trend-warn">2 invoices</div></div>
    </section>

    <section style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div class="chart-card">
        <div class="chart-header"><div><h3 class="chart-title">Revenue trend</h3><div class="chart-sub">Last 7 months · billed vs collected</div></div>
          <div class="chart-legend"><span class="legend-item"><span class="legend-swatch" style="background:#2D1859"></span>Billed</span><span class="legend-item"><span class="legend-swatch" style="background:#F5C411"></span>Collected</span></div>
        </div>
        <svg viewBox="0 0 600 180" width="100%" height="180" preserveAspectRatio="none">
          <g stroke="#F0EEF7" stroke-width="1"><line x1="0" y1="30" x2="600" y2="30"/><line x1="0" y1="75" x2="600" y2="75"/><line x1="0" y1="120" x2="600" y2="120"/><line x1="0" y1="165" x2="600" y2="165"/></g>
          <g>
            <rect x="20" y="110" width="42" height="55" fill="#2D1859" rx="4"/><rect x="66" y="120" width="42" height="45" fill="#F5C411" rx="4"/>
            <rect x="120" y="100" width="42" height="65" fill="#2D1859" rx="4"/><rect x="166" y="112" width="42" height="53" fill="#F5C411" rx="4"/>
            <rect x="220" y="85" width="42" height="80" fill="#2D1859" rx="4"/><rect x="266" y="94" width="42" height="71" fill="#F5C411" rx="4"/>
            <rect x="320" y="72" width="42" height="93" fill="#2D1859" rx="4"/><rect x="366" y="82" width="42" height="83" fill="#F5C411" rx="4"/>
            <rect x="420" y="60" width="42" height="105" fill="#2D1859" rx="4"/><rect x="466" y="68" width="42" height="97" fill="#F5C411" rx="4"/>
            <rect x="520" y="42" width="42" height="123" fill="#2D1859" rx="4"/><rect x="566" y="52" width="30" height="113" fill="#F5C411" rx="4"/>
          </g>
        </svg>
        <div class="chart-x-axis" style="justify-content:space-around;padding:0 20px"><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:4px">How companies pay</h3>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:14px">Somali payment methods used to settle invoices</div>
        ${[
          ['EVC Plus · Hormuud','54%','#2D1859'],
          ['Zaad · Telesom','21%','#F5C411'],
          ['Sahal · Golis','9%','#7A5FB8'],
          ['eDahab · Somtel','8%','#22C55E'],
          ['Bank transfer · Salaam/Amal','6%','#6B6484'],
          ['Card (Visa/Mastercard)','2%','#B45309'],
        ].map(([name,pct,col])=>`
          <div style="margin-bottom:12px">
            <div class="flex justify-between" style="font-size:12.5px;margin-bottom:5px"><span style="font-weight:700;color:var(--text-primary)">${name}</span><span style="color:var(--text-muted);font-family:var(--font-mono)">${pct}</span></div>
            <div class="progress-bar"><div class="progress-fill" style="width:${pct};background:${col}"></div></div>
          </div>
        `).join('')}
      </div>
    </section>

    <section class="data-section">
      <div class="section-header-bar">
        <div><h3 class="chart-title">Recent invoices</h3><div style="font-size:11px;color:var(--text-muted);margin-top:2px">Showing ${S.invoices.length} invoices</div></div>
        <div class="ml-auto flex items-center gap-8">
          <button class="filter-pill active" style="border:none;background:#2D1859;color:#FFF">All</button>
          <button class="filter-pill">Paid</button>
          <button class="filter-pill">Due soon</button>
          <button class="filter-pill" style="border-color:#FDA29B;color:#B42318">Overdue</button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:940px">
          <thead><tr><th>Invoice</th><th>Company</th><th>Plan</th><th>Amount</th><th>Paid via</th><th>Issued</th><th>Due</th><th>Status</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${S.invoices.map(inv=>{
              const st = statusMap[inv.status];
              return `<tr style="${inv.status==='overdue'?'background:#FEF6F5':''}">
                <td style="font-family:var(--font-mono);font-weight:700;color:${inv.status==='overdue'?'#B42318':'#2D1859'}">${inv.id}</td>
                <td style="font-weight:700">${inv.name}</td>
                <td><span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:999px;background:#F5C41133;color:#8B5A00">${inv.plan}</span></td>
                <td style="font-weight:800">$${inv.amount.toLocaleString()}</td>
                <td style="font-size:12px;color:var(--text-secondary)">${inv.paid}</td>
                <td style="color:var(--text-muted)">${inv.issued}</td>
                <td style="color:var(--text-muted)">${inv.due}</td>
                <td><span style="display:inline-flex;align-items:center;font-size:11px;font-weight:800;padding:5px 10px;border-radius:999px;background:${st.bg};color:${st.fg}">${st.text}</span></td>
                <td class="col-right"><button class="btn btn-outline btn-xs">View</button></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="flex justify-between items-center" style="padding:14px 20px;border-top:1px solid var(--border);font-size:12px;color:var(--text-muted)">
        <div>Showing recent invoices</div>
        <div class="flex gap-6"><button class="btn btn-outline btn-xs">‹ Prev</button><button class="btn btn-primary btn-xs">Next ›</button></div>
      </div>
    </section>
  `;
}

// ---- AUDIT TAB ----
function renderAuditTab() {
  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Audit</div>
        <h1 class="page-title">Compliance & Audit Trail</h1>
        <div class="page-subtitle">Every action Curdun super admins take is logged and immutable.</div>
      </div>
    </div>
    <section class="data-section">
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th></tr></thead>
          <tbody>
            ${[
              ['14:22:04','Adamu Kaduna','Granted module','Hotel & Booking → Baidoa Grand Hotel','41.191.x.x'],
              ['13:41:19','System','Payment received','Shifo Pharmacy · INV-26742','stripe.webhook'],
              ['12:08:52','Adamu Kaduna','Added company','Bosaso Retail Co-op (TN-0208)','41.191.x.x'],
              ['10:55:12','System','Suspended module','HR & Payroll · Kismayo Hospital','policy.engine'],
              ['09:24:08','Adamu Kaduna','Sign-in','Curdun Cor · Super Admin','41.191.x.x'],
              ['08:12:33','System','Backup completed','SO-MG-1 · 24 TB snapshot','scheduler'],
            ].map(([time,actor,action,target,ip])=>`
              <tr>
                <td style="font-family:var(--font-mono);color:var(--text-muted)">${time}</td>
                <td style="font-weight:700">${actor}</td>
                <td>${action}</td>
                <td>${target}</td>
                <td style="font-family:var(--font-mono);color:var(--text-muted);font-size:11px">${ip}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ---- WIRE TAB EVENTS ----
function wireTabEvents(wrap) {
  // Companies tab: select tenant
  wrap.querySelectorAll('[data-select]').forEach(btn => {
    btn.addEventListener('click', () => { S.selectedTenantId = btn.dataset.select; render(); });
  });
  // Toggle module license
  wrap.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.toggle;
      const id = S.selectedTenantId;
      if (!S.licenses[id]) S.licenses[id] = {};
      S.licenses[id][key] = !S.licenses[id][key];
      render();
    });
  });
  // Delete tenant
  wrap.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => { S.confirmDeleteId = btn.dataset.delete; renderDeleteModal(); });
  });
  // Edit tenant
  wrap.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = S.tenants.find(x=>x.id===btn.dataset.edit) || {};
      S.tenantModalMode = 'edit';
      S.tenantForm = { ...t, adminEmail: t.adminEmail||'', adminPhone: t.adminPhone||'', adminPassword: t.adminPassword||'Cor-XXXXX-24', sendSms:true, sendEmail:true };
      renderTenantModal();
    });
  });
  // Add company
  const addBtn = wrap.querySelector('#btn-add-company');
  if (addBtn) addBtn.addEventListener('click', openCreate);
  // Add system
  const addSys = wrap.querySelector('#btn-add-system');
  if (addSys) addSys.addEventListener('click', () => { S.systemModal = true; renderSystemModal(); });
  // Open invoice
  const openInv = wrap.querySelector('#btn-open-invoice');
  if (openInv) openInv.addEventListener('click', () => { S.invoiceModal = true; renderInvoiceModal(); });
  // Invite admin
  const invAdmin = wrap.querySelector('#btn-invite-admin');
  if (invAdmin) invAdmin.addEventListener('click', openCreate);
  // Time range buttons
  wrap.querySelectorAll('.time-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.querySelectorAll('.time-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  // Filter pills (UI only)
  wrap.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const parent = pill.closest('.flex');
      if (parent) parent.querySelectorAll('.filter-pill').forEach(p => { p.classList.remove('active'); p.style.background=''; p.style.color=''; p.style.borderColor=''; });
      pill.classList.add('active'); pill.style.background='#2D1859'; pill.style.color='#FFF'; pill.style.borderColor='#2D1859';
    });
  });
}

// ============================================================
// TENANT MODAL
// ============================================================
function openCreate() {
  S.tenantModalMode = 'create';
  S.tenantForm = {
    id: 'TN-' + String(Math.floor(1000+Math.random()*9000)),
    name:'', city:'Mogadishu', owner:'', plan:'Business', users:0,
    invoice:'0', region:'SO-MG-1', since:'Jul 2026',
    adminEmail:'', adminPhone:'+252 ', sendSms:true, sendEmail:true,
    adminPassword:'Cor-'+Math.random().toString(36).slice(2,8).toUpperCase()+'-24',
  };
  renderTenantModal();
}

function renderTenantModal() {
  let modal = document.getElementById('tenant-modal');
  if (!modal) { modal = document.createElement('div'); modal.id='tenant-modal'; document.body.appendChild(modal); }
  const f = S.tenantForm;
  const isCreate = S.tenantModalMode === 'create';
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop-tenant">
      <div class="modal-box" style="max-width:640px">
        <div class="modal-header">
          <div class="modal-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg></div>
          <div style="flex:1"><div class="label-xs text-gold">Companies</div><div style="font-size:19px;font-weight:800">${isCreate?'Add a new company':'Edit company'}</div></div>
          <button class="modal-close" id="btn-close-tenant">×</button>
        </div>
        <div class="modal-body" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div style="grid-column:1/span 2" class="form-group"><label class="form-label">Company name *</label><input class="form-input" id="mf-name" placeholder="e.g. Marka Coastal Trading" value="${f.name||''}"/></div>
          <div class="form-group"><label class="form-label">Owner name *</label><input class="form-input" id="mf-owner" placeholder="e.g. Deqa Abdirahman" value="${f.owner||''}"/></div>
          <div class="form-group"><label class="form-label">City</label><select class="form-select" id="mf-city">${['Mogadishu','Hargeisa','Bosaso','Kismayo','Baidoa','Garowe'].map(c=>`<option${c===f.city?' selected':''}>${c}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Plan</label><select class="form-select" id="mf-plan">${['Starter','Business','Enterprise'].map(p=>`<option${p===f.plan?' selected':''}>${p}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Server location</label><select class="form-select" id="mf-region">${['SO-MG-1','SO-HL-1','SO-BO-1','SO-KI-1','SO-BA-1'].map(r=>`<option${r===f.region?' selected':''}>${r}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Number of users</label><input class="form-input" id="mf-users" type="number" min="0" placeholder="0" value="${f.users||0}"/></div>
          <div class="form-group"><label class="form-label">Monthly fee (USD)</label><input class="form-input" id="mf-invoice" placeholder="e.g. 1,100" value="${f.invoice||''}"/></div>

          <!-- Credentials -->
          <div class="cred-box">
            <div class="cred-box-header">
              <div><div class="cred-eyebrow">Step 2 · Auto-created</div><div class="cred-title">Company Admin login</div><div class="cred-subtitle">Cor makes ONE admin account. They'll create their own staff after signing in.</div></div>
              <button class="btn btn-gold btn-xs" id="btn-regen-pw">↻ Regenerate</button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="form-group"><label class="cred-field-label">Admin email (login)</label><input class="cred-input" id="mf-admin-email" placeholder="admin@company.so" value="${f.adminEmail||''}"/></div>
              <div class="form-group"><label class="cred-field-label">Phone (for SMS OTP)</label><input class="cred-input" id="mf-admin-phone" placeholder="+252 61 000 0000" value="${f.adminPhone||''}"/></div>
              <div class="form-group" style="grid-column:1/span 2">
                <label class="cred-field-label">Temporary password</label>
                <div class="flex gap-6" style="margin-top:4px">
                  <input class="cred-input pw" id="mf-admin-pw" value="${f.adminPassword||''}" style="flex:1"/>
                  <button class="btn btn-outline btn-xs" id="btn-copy-pw" style="background:rgba(255,255,255,0.1);color:#FFF;border-color:rgba(255,255,255,0.2)">Copy</button>
                </div>
                <div class="cred-hint">Admin must change this on first sign-in. Never shown again after this screen.</div>
              </div>
              <div style="grid-column:1/span 2" class="cred-checkboxes">
                <label class="cred-checkbox"><input type="checkbox" ${f.sendSms?'checked':''} id="mf-sms"/> Send by SMS (Hormuud)</label>
                <label class="cred-checkbox"><input type="checkbox" ${f.sendEmail?'checked':''} id="mf-email"/> Send by email</label>
                <label class="cred-checkbox" style="margin-left:auto"><input type="checkbox" checked/> Force change on first login</label>
              </div>
            </div>
          </div>

          <!-- Module licenses -->
          <div style="grid-column:1/span 2;padding:16px 18px;background:#FFFCEF;border:1px dashed rgba(245,196,17,0.6);border-radius:12px">
            <div class="label-xs" style="color:#8B5A00">Step 3 · Modules the admin can open</div>
            <div style="font-size:12.5px;color:var(--text-secondary);margin:3px 0 10px">Only ticked systems appear on their dashboard.</div>
            <div class="module-license-grid">
              ${MODULES_DEF.map(m=>`<label class="module-license-label"><input type="checkbox" style="accent-color:#F5C411"/> ${m.name}</label>`).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-close-tenant2">Cancel</button>
          <button class="btn btn-gold" id="btn-save-tenant">${isCreate?'Add company':'Save changes'}</button>
        </div>
      </div>
    </div>
  `;

  const close = () => { S.tenantModalMode=null; modal.remove(); };
  modal.querySelector('#btn-close-tenant').addEventListener('click', close);
  modal.querySelector('#btn-close-tenant2').addEventListener('click', close);
  modal.querySelector('#modal-backdrop-tenant').addEventListener('click', e=>{ if(e.target.id==='modal-backdrop-tenant') close(); });
  modal.querySelector('#btn-regen-pw').addEventListener('click', () => {
    const pw = 'Cor-'+Math.random().toString(36).slice(2,8).toUpperCase()+'-24';
    modal.querySelector('#mf-admin-pw').value = pw;
    S.tenantForm.adminPassword = pw;
  });
  modal.querySelector('#btn-copy-pw').addEventListener('click', () => {
    const pw = modal.querySelector('#mf-admin-pw').value;
    try { navigator.clipboard.writeText(pw); } catch(e){}
    modal.querySelector('#btn-copy-pw').textContent = 'Copied!';
    setTimeout(()=>{ const b=modal.querySelector('#btn-copy-pw'); if(b) b.textContent='Copy'; },2000);
  });
  modal.querySelector('#btn-save-tenant').addEventListener('click', () => {
    const name  = modal.querySelector('#mf-name').value.trim();
    const owner = modal.querySelector('#mf-owner').value.trim();
    if (!name || !owner) { alert('Please fill in Company name and Owner name.'); return; }
    const newT = {
      ...S.tenantForm,
      name, owner,
      city:    modal.querySelector('#mf-city').value,
      plan:    modal.querySelector('#mf-plan').value,
      region:  modal.querySelector('#mf-region').value,
      users:   parseInt(modal.querySelector('#mf-users').value)||0,
      invoice: modal.querySelector('#mf-invoice').value,
      adminEmail: modal.querySelector('#mf-admin-email').value,
      adminPhone: modal.querySelector('#mf-admin-phone').value,
      adminPassword: modal.querySelector('#mf-admin-pw').value,
    };
    if (S.tenantModalMode === 'create') {
      S.tenants.unshift(newT);
      S.licenses[newT.id] = { pharmacy:false, financials:true, crm:false, hr:false, pos:false, university:false, hotel:false, hospital:false };
    } else {
      const idx = S.tenants.findIndex(t=>t.id===newT.id);
      if (idx>=0) S.tenants[idx] = newT;
    }
    modal.remove(); S.tenantModalMode=null; render();
  });
}

function renderDeleteModal() {
  let modal = document.getElementById('delete-modal');
  if (!modal) { modal = document.createElement('div'); modal.id='delete-modal'; document.body.appendChild(modal); }
  const t = S.tenants.find(x=>x.id===S.confirmDeleteId)||{};
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop-delete">
      <div class="modal-box" style="max-width:440px;padding:24px 26px">
        <div style="width:48px;height:48px;border-radius:14px;background:#FEF0EE;color:#B42318;display:grid;place-items:center;margin-bottom:14px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </div>
        <h3 style="margin:0 0 6px;font-size:18px;font-weight:800;color:var(--text-primary)">Delete this company?</h3>
        <div style="font-size:13px;color:var(--text-muted);line-height:1.55"><b style="color:var(--text-primary)">${t.name}</b> will lose access. All module licenses and users will be revoked. This action cannot be undone.</div>
        <div class="flex gap-10 justify-between" style="margin-top:20px">
          <button class="btn btn-outline" id="btn-cancel-del">Cancel</button>
          <button class="btn btn-danger" id="btn-confirm-del">Delete company</button>
        </div>
      </div>
    </div>
  `;
  const cancel = () => { S.confirmDeleteId=null; modal.remove(); };
  modal.querySelector('#btn-cancel-del').addEventListener('click', cancel);
  modal.querySelector('#modal-backdrop-delete').addEventListener('click', e=>{ if(e.target.id==='modal-backdrop-delete') cancel(); });
  modal.querySelector('#btn-confirm-del').addEventListener('click', () => {
    const id = S.confirmDeleteId;
    S.tenants = S.tenants.filter(t=>t.id!==id);
    delete S.licenses[id];
    if (S.selectedTenantId === id) S.selectedTenantId = S.tenants[0]?.id || '';
    S.confirmDeleteId=null; modal.remove(); render();
  });
}

// ============================================================
// INVOICE MODAL
// ============================================================
function renderInvoiceModal() {
  let modal = document.getElementById('invoice-modal');
  if (!modal) { modal = document.createElement('div'); modal.id='invoice-modal'; document.body.appendChild(modal); }
  const PRICE = { pharmacy:600, financials:450, crm:350, hr:280, pos:400, university:800, hotel:500, hospital:900 };
  const f = S.invoiceForm;

  const updateTotal = () => {
    const sysT = MODULES_DEF.filter(m=>f.systems[m.key]).reduce((a,m)=>a+Number(f.prices[m.key]??PRICE[m.key]??400),0);
    const cT   = (f.custom||[]).reduce((a,c)=>a+Number(c.amount||0),0);
    const d    = Number(f.discount)||0;
    const total = Math.max(0, sysT+cT-d);
    const sub = modal.querySelector('#inv-subtotal');
    const disc = modal.querySelector('#inv-discount');
    const tot = modal.querySelector('#inv-total');
    if(sub) sub.textContent = '$'+(sysT+cT);
    if(disc) disc.textContent = '− $'+d;
    if(tot) tot.textContent = '$'+total;
  };

  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop-invoice">
      <div class="modal-box" style="max-width:680px">
        <div class="modal-header">
          <div class="modal-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h5"/></svg></div>
          <div style="flex:1"><div class="label-xs text-gold">Billing</div><div style="font-size:19px;font-weight:800">Create a new invoice</div></div>
          <button class="modal-close" id="btn-close-invoice">×</button>
        </div>
        <div class="modal-body flex-col gap-16">
          <div class="tip-box"><b style="color:#2D1859">Tip:</b> Curdun bills companies automatically every month. Use this only for a one-off bill (setup fee, extra users, custom training).</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">Bill to company</label>
              <select class="form-select" id="inv-tenant">${S.tenants.map(t=>`<option value="${t.id}"${t.id===f.tenantId?' selected':''}>${t.name}</option>`).join('')}</select>
            </div>
            <div class="form-group"><label class="form-label">Payment due date</label><input class="form-input" id="inv-due" placeholder="e.g. Aug 30, 2026" value="${f.due}"/></div>
          </div>
          <div>
            <label class="form-label">Systems to charge for</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px" id="inv-systems">
              ${MODULES_DEF.map(m=>{
                const on = !!f.systems[m.key];
                const price = f.prices[m.key]??PRICE[m.key]??400;
                return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;border:${on?'2px solid #F5C411':'1px solid #E9E7F1'};background:${on?'#FFFCEF':'#FFF'}" data-sys="${m.key}">
                  <div style="width:20px;height:20px;border-radius:6px;background:${on?'#2D1859':'#FFF'};border:${on?'0':'2px solid #D9D5E7'};display:grid;place-items:center;color:#F5C411;font-size:12px;font-weight:900;cursor:pointer;flex-shrink:0" data-check="${m.key}">${on?'✓':''}</div>
                  <div style="flex:1;cursor:pointer;font-weight:700;font-size:13px;color:var(--text-primary)" data-check="${m.key}">${m.name}</div>
                  ${on?`<span style="color:#2D1859;font-weight:800">$</span><input type="number" min="0" value="${price}" style="width:70px;padding:6px 8px;background:#FFF;border:1px solid #D9D5E7;border-radius:6px;font-size:13px;font-weight:800;color:#2D1859;text-align:right;outline:none" data-price="${m.key}"/>`:''}
                </div>`;
              }).join('')}
            </div>
          </div>
          <div>
            <div class="flex justify-between items-center" style="margin-bottom:8px">
              <label class="form-label">Custom charges</label>
              <button class="btn btn-xs" style="border:1px solid #F5C411;background:#FFFCEF;color:#2D1859" id="btn-add-custom-line">+ Add custom charge</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">For one-off items like setup fee, extra training, custom development.</div>
            <div id="custom-lines-container" class="flex-col gap-8"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">Discount (USD)</label><input class="form-input" id="inv-discount-field" type="number" min="0" placeholder="0" value="${f.discount||0}"/></div>
            <div class="form-group"><label class="form-label">Note (optional)</label><input class="form-input" id="inv-note" placeholder="e.g. Loyalty discount" value="${f.note||''}"/></div>
          </div>
          <div style="padding:14px 16px;background:#2D1859;color:#FFF;border-radius:12px">
            <div class="label-xs text-gold" style="margin-bottom:8px">Invoice total</div>
            ${MODULES_DEF.filter(m=>f.systems[m.key]).map(m=>`<div class="flex justify-between" style="font-size:13px;padding:3px 0"><span style="color:#EFEAFB">${m.name}</span><span style="font-weight:700">$ ${f.prices[m.key]??PRICE[m.key]??400}</span></div>`).join('')}
            <div style="border-top:1px dashed rgba(255,255,255,0.2);margin-top:8px;padding-top:8px">
              <div class="flex justify-between" style="font-size:12px;color:#EFEAFB"><span>Subtotal</span><span id="inv-subtotal">$0</span></div>
              <div class="flex justify-between" style="font-size:12px;color:#EFEAFB"><span>Discount</span><span id="inv-discount">− $0</span></div>
              <div class="flex justify-between items-center" style="padding-top:6px;margin-top:2px;border-top:1px solid rgba(255,255,255,0.13)">
                <span class="label-xs" style="color:#EFEAFB">Total to bill</span>
                <span style="font-size:24px;font-weight:900;color:#F5C411" id="inv-total">$0</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-close-invoice2">Cancel</button>
          <button class="btn btn-gold" id="btn-save-invoice">Create & send</button>
        </div>
      </div>
    </div>
  `;

  // Wire systems toggles
  modal.querySelectorAll('[data-check]').forEach(el => {
    el.addEventListener('click', () => {
      const key = el.dataset.check;
      f.systems[key] = !f.systems[key];
      renderInvoiceModal();
    });
  });
  // Price inputs
  modal.querySelectorAll('[data-price]').forEach(input => {
    input.addEventListener('input', () => { f.prices[input.dataset.price] = input.value; updateTotal(); });
  });
  // Discount
  const discInp = modal.querySelector('#inv-discount-field');
  if (discInp) discInp.addEventListener('input', ()=>{ f.discount=discInp.value; updateTotal(); });

  const close = () => { S.invoiceModal=false; modal.remove(); };
  modal.querySelector('#btn-close-invoice').addEventListener('click', close);
  modal.querySelector('#btn-close-invoice2').addEventListener('click', close);
  modal.querySelector('#modal-backdrop-invoice').addEventListener('click', e=>{ if(e.target.id==='modal-backdrop-invoice') close(); });

  modal.querySelector('#btn-add-custom-line').addEventListener('click', () => {
    f.custom = [...(f.custom||[]), { id:Date.now(), label:'', amount:0 }];
    renderCustomLines(modal, f, updateTotal);
    updateTotal();
  });

  modal.querySelector('#btn-save-invoice').addEventListener('click', () => {
    const PRICE2 = { pharmacy:600, financials:450, crm:350, hr:280, pos:400, university:800, hotel:500, hospital:900 };
    const tenant = S.tenants.find(t=>t.id===modal.querySelector('#inv-tenant').value);
    if (!tenant) return;
    const sysT = MODULES_DEF.filter(m=>f.systems[m.key]).reduce((a,m)=>a+Number(f.prices[m.key]??PRICE2[m.key]??400),0);
    const cT   = (f.custom||[]).reduce((a,c)=>a+Number(c.amount||0),0);
    const d    = Number(f.discount)||0;
    const total = Math.max(0, sysT+cT-d);
    if (!total) { alert('Please select at least one system or add a custom charge.'); return; }
    const id = 'INV-' + Math.floor(26750+Math.random()*100);
    const today = new Date();
    const issued = today.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    S.invoices.unshift({ id, name:tenant.name, plan:tenant.plan, amount:total, paid:'—', issued, due:f.due||'TBD', status:'due' });
    modal.remove(); S.invoiceModal=false; render();
  });

  updateTotal();
  renderCustomLines(modal, f, updateTotal);
}

function renderCustomLines(modal, f, updateTotal) {
  const container = modal.querySelector('#custom-lines-container');
  if (!container) return;
  container.innerHTML = (f.custom||[]).map((c,i)=>`
    <div class="flex items-center gap-8" data-custom-idx="${i}">
      <input class="form-input" style="flex:1" placeholder="e.g. Setup fee · 3-day training" value="${c.label||''}"/>
      <span style="color:#2D1859;font-weight:800">$</span>
      <input class="form-input" type="number" min="0" placeholder="0" style="width:100px;text-align:right" value="${c.amount||0}"/>
      <button class="btn btn-xs" style="border:1px solid #FDA29B;color:#B42318;background:#FFF;flex-shrink:0" data-remove-custom="${i}">×</button>
    </div>
  `).join('');
  container.querySelectorAll('[data-remove-custom]').forEach(btn => {
    btn.addEventListener('click', ()=>{ const idx=parseInt(btn.dataset.removeCustom); f.custom.splice(idx,1); renderCustomLines(modal,f,updateTotal); updateTotal(); });
  });
  container.querySelectorAll('input').forEach((inp,i)=>{
    const row = Math.floor(i/2);
    inp.addEventListener('input', ()=>{
      if (!f.custom[row]) return;
      if (i%2===0) f.custom[row].label=inp.value;
      else { f.custom[row].amount=inp.value; updateTotal(); }
    });
  });
}

// ============================================================
// SYSTEM MODAL
// ============================================================
function renderSystemModal() {
  let modal = document.getElementById('system-modal');
  if (!modal) { modal = document.createElement('div'); modal.id='system-modal'; document.body.appendChild(modal); }
  modal.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop-system">
      <div class="modal-box" style="max-width:480px">
        <div class="modal-header">
          <div class="modal-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>
          <div style="flex:1"><div class="label-xs text-gold">Catalog</div><div style="font-size:19px;font-weight:800">Add a new system</div></div>
          <button class="modal-close" id="btn-close-sys">×</button>
        </div>
        <div class="modal-body flex-col gap-14">
          <div class="form-group"><label class="form-label">System name *</label><input class="form-input" id="sys-name" placeholder="e.g. Livestock Tracking"/></div>
          <div class="form-group"><label class="form-label">Description</label><input class="form-input" id="sys-desc" placeholder="Short description"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group"><label class="form-label">For whom</label><input class="form-input" id="sys-for" placeholder="e.g. Traders"/></div>
            <div class="form-group"><label class="form-label">Version</label><input class="form-input" id="sys-v" placeholder="v1.0.0" value="v1.0.0"/></div>
            <div class="form-group"><label class="form-label">Price (USD/mo)</label><input class="form-input" id="sys-price" type="number" placeholder="400" value="400"/></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" id="btn-close-sys2">Cancel</button>
          <button class="btn btn-gold" id="btn-save-sys">Add to catalog</button>
        </div>
      </div>
    </div>
  `;
  const close = () => { S.systemModal=false; modal.remove(); };
  modal.querySelector('#btn-close-sys').addEventListener('click', close);
  modal.querySelector('#btn-close-sys2').addEventListener('click', close);
  modal.querySelector('#modal-backdrop-system').addEventListener('click', e=>{if(e.target.id==='modal-backdrop-system') close();});
  modal.querySelector('#btn-save-sys').addEventListener('click', ()=>{
    const name = modal.querySelector('#sys-name').value.trim();
    if (!name) { alert('Please enter a system name.'); return; }
    S.customSystems.unshift({ name, desc:modal.querySelector('#sys-desc').value, forWho:modal.querySelector('#sys-for').value, v:modal.querySelector('#sys-v').value, price:modal.querySelector('#sys-price').value });
    close(); render();
  });
}

// ============================================================
// COMPANY ADMIN WORKSPACE
// ============================================================
function renderWorkspace() {
  const div = document.createElement('div');
  div.style.minHeight = '100vh';

  // Build module cards for Shifo's licenses (use TN-0042)
  const licenses = S.licenses['TN-0042'] || {};
  const modules = MODULES_DEF.map(m => ({ ...m, on: !!licenses[m.key] }));

  div.innerHTML = `
    <header class="workspace-header">
      <svg width="34" height="34" viewBox="0 0 64 64" fill="none"><rect x="2" y="2" width="60" height="60" rx="12" fill="#3B2170"/><path d="M22 20 L12 32 L22 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 20 L52 32 L42 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="30" y="14" width="4" height="36" rx="2" fill="#F5C411" transform="rotate(15 32 32)"/></svg>
      <div>
        <div class="workspace-brand-name">Shifo Pharmacy Group</div>
        <div class="workspace-brand-sub">Company workspace · Cor platform</div>
      </div>
      <div class="workspace-header-actions">
        <div class="workspace-user-pill">
          <div style="width:26px;height:26px;border-radius:50%;background:#F5C411;color:#2D1859;display:grid;place-items:center;font-weight:900;font-size:10px">AY</div>
          Ahmed Yusuf
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <button class="btn btn-outline btn-sm" id="btn-ws-logout" style="color:#FFF;border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.1)">Sign out</button>
      </div>
    </header>
    <div style="padding:40px;background:var(--bg-page);min-height:calc(100vh - 74px)">
      <div style="max-width:1200px;margin:0 auto">
        <div style="margin-bottom:28px">
          <div class="label-md" style="color:#F5C411;background:#2D1859;display:inline-block;padding:4px 10px;border-radius:6px;margin-bottom:8px">Cor Curdun</div>
          <h1 style="font-size:26px;font-weight:900;letter-spacing:-0.5px">Your systems</h1>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px">${modules.filter(m=>m.on).length} active modules · click Launch to open</div>
        </div>
        <div class="workspace-modules-grid">
          ${modules.map(m=>`
            <div class="ws-module-card ${m.on?'active':'inactive'}">
              <span class="ws-module-badge ${m.on?'active':'inactive'}">● ${m.on?'Ready':'Locked'}</span>
              <div style="font-size:28px;margin-top:8px">${{pharmacy:'💊',financials:'💰',crm:'📊',hr:'👥',pos:'🛒',university:'🎓',hotel:'🏨',hospital:'🏥'}[m.key]||'⚙️'}</div>
              <div class="ws-module-title ${m.on?'active':'inactive'}">${m.name}</div>
              <div class="ws-module-desc ${m.on?'active':'inactive'}">${m.desc}</div>
              <div class="ws-module-foot ${m.on?'active':'inactive'}">${m.on?(m.users+' users · '+(m.branches||'ready')):'Not on your plan'}</div>
              <button class="ws-launch-btn ${m.on?'active':'inactive'}" data-launch="${m.key}">
                ${m.on?`Launch ${m.name} →`:'Request access'}
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  div.querySelector('#btn-ws-logout').addEventListener('click', ()=>{ S.view='login'; render(); });
  div.querySelectorAll('[data-launch]').forEach(btn => {
    btn.addEventListener('click', ()=>{
      const key = btn.dataset.launch;
      const mod = modules.find(m=>m.key===key);
      if (!mod || !mod.on) return;
      if (key==='pharmacy') { S.view='pharmacy'; S.pharmTab='dash'; render(); return; }
      alert(mod.name+' module — full dashboard coming soon!');
    });
  });

  return div;
}

// ============================================================
// PHARMACY MODULE
// ============================================================
function renderPharmacy() {
  const wrap = document.createElement('div');
  wrap.className = 'pharm-layout';

  // Sidebar
  const sidebar = document.createElement('aside');
  sidebar.className = 'pharm-sidebar';
  const tabs = [
    ['dash',     'Dashboard',    dashIcon()],
    ['sales',    'Sales & POS',  salesIcon()],
    ['inventory','Inventory',    inventoryIcon()],
    ['rx',       'Prescriptions',rxIcon()],
    ['users',    'Users & Roles',usersIcon()],
    ['branches', 'Branches',     branchIcon()],
    ['settings', 'Settings',     settingsIcon()],
  ];
  sidebar.innerHTML = `
    <div class="pharm-sidebar-header">
      <button class="pharm-back" id="btn-pharm-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to workspace
      </button>
      <div class="pharm-co-name">Shifo Pharmacy Group</div>
      <div class="pharm-co-sub">Pharmacy Module · v4.12.0</div>
    </div>
    <nav class="pharm-nav">
      ${tabs.map(([key,label,icon])=>`
        <button class="pharm-nav-item${S.pharmTab===key?' active':''}" data-pharm="${key}">
          ${icon} ${label}
        </button>
      `).join('')}
    </nav>
    <div style="padding:16px;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:rgba(255,255,255,0.4)">Cor Curdun · Pharmacy</div>
  `;
  sidebar.querySelector('#btn-pharm-back').addEventListener('click',()=>{ S.view='workspace'; render(); });
  sidebar.querySelectorAll('[data-pharm]').forEach(btn=>{
    btn.addEventListener('click',()=>{ S.pharmTab=btn.dataset.pharm; render(); });
  });

  // Main
  const main = document.createElement('div');
  main.className = 'pharm-main';
  const labels = { dash:'Dashboard', sales:'Sales & POS', inventory:'Inventory', rx:'Prescriptions', users:'Users & Roles', branches:'Branches', settings:'Settings' };
  main.innerHTML = `
    <div class="pharm-topbar">
      <div class="pharm-tab-label">${labels[S.pharmTab]||'Dashboard'}</div>
      <div class="ml-auto flex items-center gap-10">
        <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">Bakaara Main Branch</div>
        <span class="pill pill-green">● Online</span>
        <button class="btn btn-gold btn-sm"${S.pharmTab==='users'?' id="btn-pharm-add-user"':''}>
          ${S.pharmTab==='users'?'+ Add user':S.pharmTab==='sales'?'New sale':S.pharmTab==='inventory'?'+ Add stock':'+ New'}
        </button>
      </div>
    </div>
    <div class="pharm-content animate-fadein" id="pharm-content">
      ${renderPharmTab()}
    </div>
  `;

  if (S.pharmTab==='users') {
    setTimeout(()=>{
      const addBtn = document.getElementById('btn-pharm-add-user');
      if(addBtn) addBtn.addEventListener('click',()=>{ S.showAddUser=true; render(); });
      document.querySelectorAll('[data-remove-user]').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const id = parseInt(btn.dataset.removeUser);
          S.pharmUsers = S.pharmUsers.filter(u=>u.id!==id); render();
        });
      });
    },0);
  }
  if (S.showAddUser) {
    setTimeout(()=>{
      const saveBtn = document.getElementById('btn-save-user');
      if(saveBtn) saveBtn.addEventListener('click',()=>{
        const name = document.getElementById('new-name')?.value.trim();
        if(!name) return;
        const email = name.toLowerCase().replace(/\s+/g,'.')+'@shifo.so';
        S.pharmUsers.unshift({ id:Date.now(), name, email, role:document.getElementById('new-role')?.value||'Pharmacist', branch:document.getElementById('new-branch')?.value||'Bakaara Main' });
        S.showAddUser=false; render();
      });
      document.getElementById('btn-cancel-user')?.addEventListener('click',()=>{ S.showAddUser=false; render(); });
    },0);
  }

  wrap.appendChild(sidebar);
  wrap.appendChild(main);
  return wrap;
}

function renderPharmTab() {
  switch(S.pharmTab) {
    case 'dash':      return renderPharmDash();
    case 'sales':     return renderPharmSales();
    case 'inventory': return renderPharmInventory();
    case 'rx':        return renderPharmRx();
    case 'users':     return renderPharmUsers();
    case 'branches':  return renderPharmBranches();
    case 'settings':  return renderPharmSettings();
    default:          return renderPharmDash();
  }
}

function renderPharmDash() {
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Today's sales</div><div class="kpi-value">$4,820</div><div class="kpi-trend trend-up" style="color:#EFEAFB">▲ 12% vs yesterday</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Items sold</div><div class="kpi-value">247</div><div class="kpi-trend trend-up">▲ 34 units</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Low stock alerts</div><div class="kpi-value trend-warn">8</div><div class="kpi-trend trend-warn">Needs reorder</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Prescriptions</div><div class="kpi-value">31</div><div class="kpi-trend">Filled today</div></div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div class="chart-card">
        <div class="chart-header"><div><h3 class="chart-title">Daily sales trend</h3><div class="chart-sub">This week · all branches</div></div></div>
        <svg viewBox="0 0 600 160" width="100%" height="160" preserveAspectRatio="none">
          <defs><linearGradient id="phFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#F5C411" stop-opacity="0.3"/><stop offset="100%" stop-color="#F5C411" stop-opacity="0"/></linearGradient></defs>
          <g stroke="#F0EEF7" stroke-width="1"><line x1="0" y1="40" x2="600" y2="40"/><line x1="0" y1="90" x2="600" y2="90"/><line x1="0" y1="140" x2="600" y2="140"/></g>
          <path d="M0,120 C80,110 150,95 240,80 C320,65 400,50 480,35 L600,28 L600,160 L0,160 Z" fill="url(#phFill)"/>
          <path d="M0,120 C80,110 150,95 240,80 C320,65 400,50 480,35 L600,28" fill="none" stroke="#F5C411" stroke-width="3"/>
        </svg>
        <div class="chart-x-axis"><span>Sat</span><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Today</span></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:12px">Top sellers today</h3>
        ${[['Paracetamol 500mg','84 units','#2D1859'],['Amoxicillin 250mg','47 units','#F5C411'],['Ibuprofen 400mg','38 units','#22C55E'],['ORS Sachet','29 units','#7A5FB8'],['Metronidazole','18 units','#B45309']].map(([name,sold,col])=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <div style="flex:1;font-size:13px;font-weight:600">${name}</div>
            <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">${sold}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPharmUsers() {
  const roleCounts = {
    Pharmacist: S.pharmUsers.filter(u=>u.role==='Pharmacist').length,
    Cashier: S.pharmUsers.filter(u=>u.role==='Cashier').length,
    Manager: S.pharmUsers.filter(u=>u.role==='Branch Manager').length,
    Accountant: S.pharmUsers.filter(u=>u.role==='Accountant').length,
  };
  const roleClass = {Pharmacist:'role-pharmacist',Cashier:'role-cashier','Branch Manager':'role-manager',Accountant:'role-accountant'};

  return `
    <div class="user-stat-cards">
      <div class="user-stat"><div class="user-stat-num">${S.pharmUsers.length}</div><div class="user-stat-label">Total users</div></div>
      <div class="user-stat"><div class="user-stat-num">${roleCounts.Pharmacist}</div><div class="user-stat-label">Pharmacists</div></div>
      <div class="user-stat"><div class="user-stat-num">${roleCounts.Cashier}</div><div class="user-stat-label">Cashiers</div></div>
      <div class="user-stat"><div class="user-stat-num">${roleCounts.Manager}</div><div class="user-stat-label">Managers</div></div>
    </div>

    ${S.showAddUser ? `
      <div class="add-user-panel">
        <h4>Add a new user</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div class="form-group"><label class="form-label" style="color:#F5C411">Full name *</label><input class="cred-input" id="new-name" placeholder="e.g. Hodan Nuur" value="${S.newName||''}"/></div>
          <div class="form-group"><label class="form-label" style="color:#F5C411">Role</label>
            <select class="cred-input" id="new-role" style="background:rgba(255,255,255,0.1)">
              ${['Pharmacist','Cashier','Branch Manager','Accountant'].map(r=>`<option${r===S.newRole?' selected':''}>${r}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label" style="color:#F5C411">Branch</label>
            <select class="cred-input" id="new-branch" style="background:rgba(255,255,255,0.1)">
              ${['Bakaara Main','Hodan Branch','Wadajir Branch','Hamar Weyne','HQ · Mogadishu'].map(b=>`<option${b===S.newBranch?' selected':''}>${b}</option>`).join('')}
            </select>
          </div>
          <div class="flex items-center gap-10" style="align-self:end">
            <button class="btn btn-gold" id="btn-save-user">Save user</button>
            <button class="btn btn-ghost" id="btn-cancel-user" style="color:#EFEAFB">Cancel</button>
          </div>
        </div>
      </div>
    ` : ''}

    <div class="data-section">
      <div class="overflow-x-auto">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${S.pharmUsers.map(u=>`
              <tr>
                <td>
                  <div class="flex items-center gap-10">
                    <div class="avatar avatar-sm">${initials(u.name)}</div>
                    <span style="font-weight:700">${u.name}</span>
                  </div>
                </td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${u.email}</td>
                <td><span class="role-tag ${roleClass[u.role]||'role-accountant'}">${u.role}</span></td>
                <td style="font-size:13px;color:var(--text-secondary)">${u.branch}</td>
                <td class="col-right"><button class="btn btn-xs" style="border:1px solid #FDA29B;color:#B42318;background:#FFF" data-remove-user="${u.id}">Remove</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPharmSales() {
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Today's revenue</div><div class="kpi-value">$4,820</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Transactions</div><div class="kpi-value">89</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Cash payments</div><div class="kpi-value">$2,140</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">EVC/Zaad</div><div class="kpi-value">$2,680</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">Today's transactions</h3></div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:600px">
          <thead><tr><th>Receipt #</th><th>Cashier</th><th>Items</th><th>Total</th><th>Method</th><th>Time</th></tr></thead>
          <tbody>
            ${[['RCP-0891','Fartun Ali',6,'$84.00','EVC Plus','14:22'],['RCP-0890','Mohamed Farah',2,'$18.50','Cash','14:10'],['RCP-0889','Fartun Ali',1,'$7.00','Cash','13:55'],['RCP-0888','Ismail Omar',4,'$62.00','Zaad','13:40'],['RCP-0887','Mohamed Farah',8,'$95.50','EVC Plus','13:22']].map(([r,c,i,t,m,time])=>`
              <tr><td style="font-family:var(--font-mono);font-weight:700;color:#2D1859">${r}</td><td>${c}</td><td>${i}</td><td style="font-weight:800">${t}</td><td>${m}</td><td style="color:var(--text-muted);font-family:var(--font-mono)">${time}</td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPharmInventory() {
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Total SKUs</div><div class="kpi-value">1,847</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Low stock</div><div class="kpi-value trend-warn">8</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Expiring soon</div><div class="kpi-value trend-warn">14</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Stock value</div><div class="kpi-value">$38,200</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">Inventory — Low stock alerts</h3></div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:640px">
          <thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>In stock</th><th>Min qty</th><th>Status</th></tr></thead>
          <tbody>
            ${[['Paracetamol 500mg x100','BATCH-24A','Mar 2027',12,50,'low'],['Amoxicillin 250mg','BATCH-25C','Jun 2026',5,20,'critical'],['Metformin 500mg','BATCH-25A','Jan 2027',8,30,'low'],['ORS Sachet x10','BATCH-24D','Dec 2026',22,40,'low']].map(([n,b,e,s,m,st])=>`
              <tr><td style="font-weight:700">${n}</td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${b}</td><td style="font-size:12px">${e}</td><td style="font-weight:800;color:${st==='critical'?'#B42318':'#B45309'}">${s}</td><td>${m}</td><td><span class="pill ${st==='critical'?'pill-red':'pill-amber'}">${st==='critical'?'● Critical':'● Low'}</span></td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPharmRx() {
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Today's Rx</div><div class="kpi-value">31</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Filled</div><div class="kpi-value" style="color:#0F7A3A">28</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Pending</div><div class="kpi-value trend-warn">3</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Out of stock</div><div class="kpi-value trend-warn">1</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">Prescriptions today</h3></div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:700px">
          <thead><tr><th>Rx #</th><th>Patient</th><th>Doctor</th><th>Medicines</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            ${[['RX-2281','Farhan Hassan','Dr. Ahmed Warsame','Amoxicillin 250mg x20','14:30','filled'],['RX-2280','Hodan Abdi','Dr. Sahra Farah','Paracetamol 500mg x30, Ibuprofen 400mg x15','13:55','filled'],['RX-2279','Ibrahim Yusuf','Dr. Ahmed Warsame','Metformin 500mg x60','13:20','pending'],['RX-2278','Amina Nur','Dr. Fadumo Ali','ORS Sachet x5','12:45','filled']].map(([r,p,d,m,t,st])=>`
              <tr><td style="font-family:var(--font-mono);font-weight:700;color:#2D1859">${r}</td><td style="font-weight:600">${p}</td><td style="font-size:12px;color:var(--text-muted)">${d}</td><td style="font-size:12px">${m}</td><td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${t}</td><td><span class="pill ${st==='filled'?'pill-green':'pill-amber'}">● ${st}</span></td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPharmBranches() {
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Total branches</div><div class="kpi-value">14</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Active today</div><div class="kpi-value" style="color:#0F7A3A">12</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Cities covered</div><div class="kpi-value">4</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Total staff</div><div class="kpi-value">${S.pharmUsers.length}</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">All branches</h3></div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:600px">
          <thead><tr><th>Branch</th><th>City</th><th>Staff</th><th>Today's sales</th><th>Status</th></tr></thead>
          <tbody>
            ${[['Bakaara Main','Mogadishu',8,'$1,840','open'],['Hodan Branch','Mogadishu',5,'$960','open'],['Wadajir Branch','Mogadishu',4,'$720','open'],['Hamar Weyne','Mogadishu',3,'$480','open'],['Hargeisa Central','Hargeisa',6,'$520','open'],['Bosaso Branch','Bosaso',4,'$380','closed']].map(([b,c,s,t,st])=>`
              <tr><td style="font-weight:700">${b}</td><td>${c}</td><td>${s}</td><td style="font-weight:700">${t}</td><td><span class="pill ${st==='open'?'pill-green':'pill-red'}">● ${st}</span></td></tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPharmSettings() {
  return `
    <div style="max-width:600px">
      <div class="card" style="padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">General Settings</h3>
        <div class="flex-col gap-14">
          <div class="form-group"><label class="form-label">Company name</label><input class="form-input" value="Shifo Pharmacy Group"/></div>
          <div class="form-group"><label class="form-label">Default currency</label><select class="form-select"><option selected>USD ($)</option><option>SOS (SH.)</option><option>Both</option></select></div>
          <div class="form-group"><label class="form-label">Default branch for this session</label><select class="form-select"><option selected>Bakaara Main</option><option>Hodan Branch</option><option>Wadajir Branch</option></select></div>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start">Save settings</button>
        </div>
      </div>
      <div class="card" style="padding:24px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Receipt Settings</h3>
        <div class="flex-col gap-14">
          <div class="form-group"><label class="form-label">Receipt header text</label><input class="form-input" value="Shifo Pharmacy Group — Est. 2020"/></div>
          <div class="form-group"><label class="form-label">Footer message</label><input class="form-input" value="Thank you for choosing Shifo Pharmacy!"/></div>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start">Save</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// SVG ICON HELPERS (inline)
// ============================================================
function overviewIcon()   { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`; }
function companiesIcon() { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>`; }
function adminsIcon()    { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.5-6 7-6s7 2 7 6"/><circle cx="17" cy="7" r="3"/><path d="M22 21c0-3-2-5-5-5"/></svg>`; }
function modulesIcon()   { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`; }
function infraIcon()     { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="20" height="6" rx="1"/><rect x="2" y="14" width="20" height="6" rx="1"/><circle cx="6" cy="7" r="0.8" fill="currentColor"/><circle cx="6" cy="17" r="0.8" fill="currentColor"/></svg>`; }
function billingIcon()   { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>`; }
function auditIcon()     { return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l9 4v6c0 5-4 9-9 10-5-1-9-5-9-10V6l9-4z"/></svg>`; }
function dashIcon()      { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`; }
function salesIcon()     { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18l-2 12H5L3 3z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>`; }
function inventoryIcon() { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3v4M8 3v4"/></svg>`; }
function rxIcon()        { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 4.5l15 15"/><rect x="2" y="2" width="8" height="20" rx="4"/><rect x="14" y="2" width="8" height="20" rx="4"/></svg>`; }
function usersIcon()     { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.5-6 7-6s7 2 7 6"/></svg>`; }
function branchIcon()    { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"/></svg>`; }
function settingsIcon()  { return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`; }

// ============================================================
// LIVE METRICS TIMER
// ============================================================
setInterval(() => {
  S.liveTick++;
  if (S.view === 'super' && (S.superTab === 'overview' || S.superTab === 'infra')) {
    // Partial update of live metrics without full re-render
    const liveTime = (() => { const d=new Date(); const p=n=>String(n).padStart(2,'0'); return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); })();
    const liveCpu = 58 + Math.round(Math.sin(S.liveTick/3)*8);
    const liveMem = 68 + Math.round(Math.cos(S.liveTick/4)*6);
    document.querySelectorAll('.infra-progress-fill').forEach((bar,i) => {
      if(i===0) bar.style.width = liveCpu+'%';
      if(i===1) bar.style.width = liveMem+'%';
    });
    const timeEl = document.querySelector('.live-badge');
    if (timeEl && S.superTab==='infra') timeEl.textContent = '🔴 LIVE · '+liveTime;
  }
}, 3000);

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  render();
});

// Expose to window for inline event handlers
window.S = S;
window.render = render;
