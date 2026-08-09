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
  { key:'pos',        name:'Retail POS',       desc:'Multi-store checkout · loyalty',    users:18, branches:'6 stores',        v:'v3.0.0',
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
  'TN-0042': { pharmacy:true, financials:true, crm:true, hr:false, pos:true, university:false, hotel:false, hospital:false },
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
  view: 'login',           // login | firstlogin | super | workspace | pharmacy | pos
  superTab: 'overview',    // overview | companies | admins | modules | infra | billing | audit
  pharmTab: 'dash',        // dash | sales | inventory | rx | users | branches | settings
  posTab: 'dash',          // dash | checkout | products | customers | transactions | staff | settings

  // Auth
  loginEmail: '', loginPassword: '', loginError: false,

  // Active identities after sign-in (mutually exclusive)
  activeSuperAdmin:   null,   // set when a Platform Super Admin signs in
  activeCompanyAdmin: null,   // set when a Company Admin signs in to the workspace
  pwUser:             null,   // pending user during first-login password change

  // Retail POS store settings — editable from POS → Settings tab.
  // Persists in memory for this session; wiring to backend comes later.
  storeSettings: {
    storeName:       'Shifo Retail Group',
    taxRate:         5,
    defaultStore:    'Bakaara Main',
    receiptHeader:   'SHIFO RETAIL GROUP',
    receiptFooter:   'Thank you for shopping at Shifo!',
    showBarcodeOnReceipt: true,
    payments:        { Cash: true, 'EVC Plus': true, Zaad: true, Sahal: true },
  },
  _settingsSaved: false,      // ephemeral flag for "Saved!" toast

  // Active company context — set when a company admin signs into the workspace
  currentCompany: 'Shifo Pharmacy Group',
  currentStore:   'Bakaara Main Store',
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

  // POS — core
  posCart: [],
  posSearchTerm: '',
  posPaymentMethod: 'cash',
  posReceiptVisible: false,
  posLastReceipt: null,
  posCustomerFilter: '',

  // POS — dual currency
  exchangeRate: 11800,
  primaryCurrency: 'USD',

  // POS — CRUD modals
  crudModal: null,       // null | { type:'product'|'customer'|'staff', mode:'add'|'edit', id:null|number }
  crudForm: {},          // live form field values
  viewModal: null,       // { type:'transaction', id:string } — for read detail
  confirmDeleteModal: null, // { type:'product'|'customer'|'staff'|'transaction', id:any }

  // POS — mobile money modal
  posMobileMoneyModal: false,
  mobilePhone: '',
  mobileTxId: '',
  mobileError: '',

  // POS — debt (Buugga Deynta)
  posDebtCustomerId: null,

  // POS — offline
  isOffline: false,
  syncQueue: 0,

  // POS — shift reconciliation
  shiftCashier: null,
  shiftCountedUSD: '',

  // POS — RBAC auth
  posActiveUser: null,     // { id, name, username, role, pin, access[] } | null
  posAuthError: '',
  posLoginPin: '',         // digits typed so far (max 4)
  posShiftActive: false,   // cashier shift start/stop
  posShiftStart: null,     // Date object

  // POS — Admin login mode ('staff' = PIN grid, 'admin' = email/password, 'force-change' = new-password screen)
  posLoginMode: 'staff',
  posAdminEmail: '',
  posAdminPassword: '',
  posNewPassword: '',
  posConfirmPassword: '',
  posPendingAdmin: null,   // admin user awaiting password change

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
    case 'pos':        root.appendChild(renderPOS());       break;
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
        <div class="login-brand-desc">Pharmacy, University, POS, Hospital, Hotel — all on the same core. Serving businesses across Mogadishu, Hargeisa, Kismayo, Bosaso and Baidoa.</div>
      </div>
      <div class="login-brand-stats">
        <div><div class="login-brand-stat-num">${S.tenants.length}</div>Companies</div>
        <div><div class="login-brand-stat-num">${MODULES_DEF.length}</div>Modules</div>
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

      ${S.loginError ? `<div class="form-error">${S.loginError === true ? 'Invalid email or password.' : S.loginError}</div>` : ''}

      <button id="btn-signin" class="login-btn">
        Sign in
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      <div class="login-footer-note">SSO · SAML · Passkey — © 2026 Curdun ICT Solution</div>
    </div>
  `;

  div.querySelector('#btn-signin').addEventListener('click', doSignIn);
  div.querySelector('#login-email').addEventListener('input', e => { S.loginEmail = e.target.value; S.loginError = false; });
  div.querySelector('#login-pw').addEventListener('keydown', e => { if(e.key==='Enter') doSignIn(); });

  return div;
}

function doSignIn() {
  const email = (S.loginEmail || $('login-email')?.value || '').toLowerCase().trim();
  const pw    = ($('login-pw')?.value || '');
  S.loginEmail = email;

  if (!email || !pw) {
    S.loginError = 'Enter your email and password.';
    render();
    return;
  }

  // 1. Try Platform Super Admin.
  const sa = SUPER_ADMINS.find(a => a.email.toLowerCase() === email);
  if (sa && sa.password === pw) {
    if (sa.mustChangePassword) {
      // Newly-provisioned super admin must set their own password first.
      S.pwUser = sa;                    // referenced by renderFirstLogin
      S.newPw1 = ''; S.newPw2 = ''; S.pwError = '';
      S.view = 'firstlogin';
      S.loginError = false;
      render();
      return;
    }
    S.activeSuperAdmin = sa;
    S.view = 'super';
    S.loginError = false;
    render();
    return;
  }

  // 2. Try Company Admin (temporary or saved workspace password).
  const ca = COMPANY_ADMINS.find(a => a.email.toLowerCase() === email);
  if (ca) {
    // Core workspace accepts the temporary password forever, and any
    // module-level password the admin has set. The force-change-on-first-use
    // rule fires later inside each active module (POS handles this today).
    if (pw === ca.tempPassword || pw === ca.posPassword) {
      S.currentCompany = ca.company;
      S.activeCompanyAdmin = ca;
      S.view = 'workspace';
      S.loginError = false;
      render();
      return;
    }
  }

  // 3. Newly-provisioned company admins whose tenant lives in S.tenants
  //    (created via Super Admin "New Company") flow through first-login.
  const tenant = S.tenants.find(t => (t.adminEmail || '').toLowerCase() === email);
  if (tenant && pw === tenant.adminTempPassword) {
    S.currentCompany = tenant.name;
    S.pwUser = { email, tenantId: tenant.id };
    S.newPw1 = ''; S.newPw2 = ''; S.pwError = '';
    S.view = 'firstlogin';
    S.loginError = false;
    render();
    return;
  }

  S.loginError = 'Invalid email or password.';
  render();
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
        ['companies', 'Companies', companiesIcon(), S.tenants.length],
        ['admins',    'Company Admins', adminsIcon(), S.tenants.length],
        ['platform',  'Platform Admins', adminsIcon(), SUPER_ADMINS.length],
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
    case 'platform':  wrap.innerHTML = renderPlatformAdminsTab(); break;
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

// ---- PLATFORM ADMINS TAB (Curdun-level super admins) ----
function renderPlatformAdminsTab() {
  const rows = SUPER_ADMINS.map(a => `
    <tr>
      <td style="padding:12px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar avatar-sm" style="background:var(--purple-800);color:var(--gold)">${initials(a.name)}</div>
          <div>
            <div style="font-weight:700">${a.name}</div>
            <div style="font-size:12px;color:var(--text-muted)">${a.email}</div>
          </div>
        </div>
      </td>
      <td style="padding:12px 16px"><span class="role-tag role-pharmacist">${a.role}</span></td>
      <td style="padding:12px 16px;font-size:12px;color:var(--text-muted)">${a.mustChangePassword ? 'Pending first sign-in' : 'Active'}</td>
      <td style="padding:12px 16px;font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${a.createdAt || '—'}</td>
    </tr>
  `).join('');

  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Cor Platform · Governance</div>
        <h1 class="page-title">Platform Admins</h1>
        <div class="page-subtitle">Curdun-level operators who can provision companies, grant modules, and see every tenant. Only add people you trust with root-level access.</div>
      </div>
    </div>

    <section class="two-col-grid">
      <div class="data-section">
        <div class="section-header-bar">
          <div><div class="section-eyebrow">Operators</div><h2 class="section-h2">${SUPER_ADMINS.length} active</h2></div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr>
              <th style="padding:12px 16px;text-align:left">Name / email</th>
              <th style="padding:12px 16px;text-align:left">Role</th>
              <th style="padding:12px 16px;text-align:left">Status</th>
              <th style="padding:12px 16px;text-align:left">Created</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <div class="add-user-panel">
        <h4>Create Platform Admin</h4>
        <div style="font-size:12px;color:#EFEAFB;line-height:1.5">
          A temporary password is generated. The new admin is forced to set their own password on first sign-in.
        </div>
        <div class="form-group">
          <label class="form-label" style="color:#FFF">Full name</label>
          <input class="form-input" id="new-sa-name" placeholder="e.g. Amina Hassan" value="${S._newSA?.name || ''}"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:#FFF">Email</label>
          <input class="form-input" id="new-sa-email" type="email" placeholder="operator@curdun.so" value="${S._newSA?.email || ''}"/>
        </div>
        ${S._newSAResult ? `
          <div class="cred-box" style="grid-column:auto">
            <div class="cred-box-header">
              <div>
                <div class="cred-eyebrow">CREATED</div>
                <div class="cred-title">${S._newSAResult.name}</div>
                <div class="cred-subtitle">${S._newSAResult.email}</div>
              </div>
            </div>
            <div>
              <div class="cred-field-label">Temporary password</div>
              <input class="cred-input pw" value="${S._newSAResult.tempPassword}" readonly onfocus="this.select()"/>
              <div class="cred-hint">Share once. They'll be forced to change it on first sign-in.</div>
            </div>
          </div>
        ` : `
          <div class="cred-hint" style="color:#EFEAFB">No password to show yet.</div>
        `}
        <button class="btn btn-primary" id="btn-create-sa">Create admin</button>
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
  // Platform Admins: form field state + create
  wrap.querySelector('#new-sa-name')?.addEventListener('input', e => {
    S._newSA = { ...(S._newSA || {}), name: e.target.value };
  });
  wrap.querySelector('#new-sa-email')?.addEventListener('input', e => {
    S._newSA = { ...(S._newSA || {}), email: e.target.value };
  });
  wrap.querySelector('#btn-create-sa')?.addEventListener('click', () => {
    const f = S._newSA || {};
    const name  = (f.name || '').trim();
    const email = (f.email || '').trim().toLowerCase();
    if (!name || !email) { alert('Name and email are required.'); return; }
    if (SUPER_ADMINS.some(a => a.email.toLowerCase() === email)) {
      alert('A platform admin with that email already exists.'); return;
    }
    // Generate a temporary password — short human-readable prefix + 6 hex.
    const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
    const tempPassword = `Cor-${rand}-26`;
    const newSA = {
      id: Math.max(...SUPER_ADMINS.map(a => a.id)) + 1,
      name, email,
      password: tempPassword,
      role: 'Super Admin',
      mustChangePassword: true,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    SUPER_ADMINS.push(newSA);
    S._newSAResult = { name, email, tempPassword };   // shown in the panel
    S._newSA = null;                                   // clear the form
    render();
  });

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
        <div class="workspace-brand-name">${S.currentCompany}</div>
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
      if (key==='pos') { S.view='pos'; S.posTab='dash'; S.posCart=[]; S.posReceiptVisible=false; render(); return; }
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
      <div class="pharm-co-name">${S.currentCompany}</div>
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
// RETAIL POS MODULE
// ============================================================
const POS_PRODUCTS = [
  { id:1,  name:'Basmati Rice 5kg',      cat:'Groceries',     price:12.00, wholesalePrice:88.00,  stock:84,  barcode:'6901234001' },
  { id:2,  name:'Sunflower Oil 3L',      cat:'Groceries',     price:8.50,  wholesalePrice:62.00,  stock:62,  barcode:'6901234002' },
  { id:3,  name:'Sugar 1kg',             cat:'Groceries',     price:1.80,  wholesalePrice:11.80,  stock:150, barcode:'6901234003' },
  { id:4,  name:'Wheat Flour 2kg',       cat:'Groceries',     price:3.20,  wholesalePrice:22.00,  stock:95,  barcode:'6901234004' },
  { id:5,  name:'Powdered Milk 400g',    cat:'Groceries',     price:6.50,  wholesalePrice:47.00,  stock:45,  barcode:'6901234005' },
  { id:6,  name:'Coca-Cola 330ml',       cat:'Beverages',     price:0.80,  wholesalePrice:8.00,   stock:200, barcode:'6901234006' },
  { id:7,  name:'Bottled Water 1.5L',    cat:'Beverages',     price:0.50,  wholesalePrice:4.50,   stock:300, barcode:'6901234007' },
  { id:8,  name:'Fresh Juice Mango 1L',  cat:'Beverages',     price:2.40,  wholesalePrice:16.00,  stock:38,  barcode:'6901234008' },
  { id:9,  name:'Laundry Detergent 1kg', cat:'Household',     price:4.20,  wholesalePrice:30.00,  stock:55,  barcode:'6901234009' },
  { id:10, name:'Dish Soap 500ml',       cat:'Household',     price:1.50,  wholesalePrice:10.00,  stock:72,  barcode:'6901234010' },
  { id:11, name:'Toothpaste 100ml',      cat:'Personal Care', price:2.00,  wholesalePrice:13.50,  stock:90,  barcode:'6901234011' },
  { id:12, name:'Shampoo 250ml',         cat:'Personal Care', price:3.80,  wholesalePrice:26.00,  stock:48,  barcode:'6901234012' },
  { id:13, name:'Canned Tuna 170g',      cat:'Groceries',     price:2.20,  wholesalePrice:15.00,  stock:110, barcode:'6901234013' },
  { id:14, name:'Tea Bags x25',          cat:'Beverages',     price:1.60,  wholesalePrice:11.00,  stock:130, barcode:'6901234014' },
  { id:15, name:'Instant Coffee 200g',   cat:'Beverages',     price:5.00,  wholesalePrice:36.00,  stock:40,  barcode:'6901234015' },
  { id:16, name:'Biscuits 200g',         cat:'Snacks',        price:1.20,  wholesalePrice:8.50,   stock:160, barcode:'6901234016' },
  { id:17, name:'Chocolate Bar 50g',     cat:'Snacks',        price:0.90,  wholesalePrice:6.00,   stock:180, barcode:'6901234017' },
  { id:18, name:'Fresh Bread Loaf',      cat:'Bakery',        price:1.00,  wholesalePrice:7.00,   stock:60,  barcode:'6901234018' },
  { id:19, name:'Eggs Tray x30',         cat:'Fresh',         price:4.50,  wholesalePrice:32.00,  stock:35,  barcode:'6901234019' },
  { id:20, name:'Bananas 1kg',           cat:'Fresh',         price:1.40,  wholesalePrice:9.00,   stock:50,  barcode:'6901234020' },
];

const POS_CUSTOMERS = [
  { id:1, name:'Abdi Mohamed',    phone:'061-234-5678', points:1240, visits:48, lastVisit:'Jul 25, 2026', tier:'Gold',   creditLimit:500,  debtBalance:120.00 },
  { id:2, name:'Halima Farah',    phone:'061-345-6789', points:860,  visits:32, lastVisit:'Jul 26, 2026', tier:'Silver', creditLimit:200,  debtBalance:0 },
  { id:3, name:'Yusuf Hassan',    phone:'061-456-7890', points:2100, visits:76, lastVisit:'Jul 27, 2026', tier:'Gold',   creditLimit:800,  debtBalance:645.50 },
  { id:4, name:'Fartun Ali',      phone:'061-567-8901', points:420,  visits:15, lastVisit:'Jul 22, 2026', tier:'Bronze', creditLimit:100,  debtBalance:95.00 },
  { id:5, name:'Omar Abdirahman', phone:'061-678-9012', points:1580, visits:55, lastVisit:'Jul 27, 2026', tier:'Gold',   creditLimit:600,  debtBalance:0 },
  { id:6, name:'Sahra Nur',       phone:'061-789-0123', points:310,  visits:11, lastVisit:'Jul 20, 2026', tier:'Bronze', creditLimit:100,  debtBalance:100.00 },
  { id:7, name:'Ibrahim Warsame', phone:'061-890-1234', points:720,  visits:28, lastVisit:'Jul 24, 2026', tier:'Silver', creditLimit:300,  debtBalance:210.00 },
  { id:8, name:'Amina Osman',     phone:'061-901-2345', points:1890, visits:68, lastVisit:'Jul 26, 2026', tier:'Gold',   creditLimit:700,  debtBalance:0 },
];

const POS_TRANSACTIONS = [
  { id:'TXN-4821', cashier:'Fartun Ali',     items:8,  total:64.20,  method:'EVC Plus', time:'14:32', date:'Jul 27, 2026', customer:'Abdi Mohamed' },
  { id:'TXN-4820', cashier:'Mohamed Farah',  items:3,  total:18.90,  method:'Cash',     time:'14:18', date:'Jul 27, 2026', customer:'Walk-in' },
  { id:'TXN-4819', cashier:'Fartun Ali',     items:12, total:95.40,  method:'Zaad',     time:'13:55', date:'Jul 27, 2026', customer:'Yusuf Hassan' },
  { id:'TXN-4818', cashier:'Ismail Omar',    items:5,  total:42.00,  method:'Cash',     time:'13:40', date:'Jul 27, 2026', customer:'Walk-in' },
  { id:'TXN-4817', cashier:'Mohamed Farah',  items:2,  total:9.50,   method:'EVC Plus', time:'13:22', date:'Jul 27, 2026', customer:'Halima Farah' },
  { id:'TXN-4816', cashier:'Fartun Ali',     items:6,  total:34.80,  method:'Sahal',    time:'13:05', date:'Jul 27, 2026', customer:'Walk-in' },
  { id:'TXN-4815', cashier:'Ismail Omar',    items:15, total:128.60, method:'Zaad',     time:'12:48', date:'Jul 27, 2026', customer:'Omar Abdirahman' },
  { id:'TXN-4814', cashier:'Fartun Ali',     items:4,  total:22.40,  method:'Cash',     time:'12:30', date:'Jul 27, 2026', customer:'Walk-in' },
  { id:'TXN-4813', cashier:'Mohamed Farah',  items:7,  total:56.10,  method:'EVC Plus', time:'12:15', date:'Jul 27, 2026', customer:'Amina Osman' },
  { id:'TXN-4812', cashier:'Ismail Omar',    items:1,  total:5.00,   method:'Cash',     time:'11:58', date:'Jul 27, 2026', customer:'Walk-in' },
];

const POS_STAFF = [
  { id:1, name:'Fartun Ali',     username:'fartun.a',  pin:'1234', role:'Senior Cashier',  store:'Bakaara Main',   shift:'Morning',  sales:186, status:'active', access:['dash','checkout','transactions'] },
  { id:2, name:'Mohamed Farah',  username:'mohamed.f', pin:'5678', role:'Cashier',         store:'Hodan Store',    shift:'Morning',  sales:124, status:'active', access:['dash','checkout','transactions'] },
  { id:3, name:'Ismail Omar',    username:'ismail.o',  pin:'9012', role:'Cashier',         store:'Wadajir Store',  shift:'Afternoon',sales:98,  status:'active', access:['dash','checkout','transactions'] },
  { id:4, name:'Khadija Abdi',   username:'khadija.a', pin:'3456', role:'Store Manager',   store:'Bakaara Main',   shift:'Full day', sales:0,   status:'active', access:['dash','checkout','products','customers','transactions','staff'] },
  { id:5, name:'Hassan Yusuf',   username:'hassan.y',  pin:'7890', role:'Cashier',         store:'Hamar Weyne',    shift:'Morning',  sales:72,  status:'active', access:['dash','checkout','transactions'] },
  { id:6, name:'Nimco Ali',      username:'nimco.a',   pin:'2468', role:'Cashier',         store:'Hodan Store',    shift:'Afternoon',sales:45,  status:'break',  access:['dash','checkout','transactions'] },
];

// ============================================================
// PLATFORM SUPER ADMINS — Cor Curdun operators
// ============================================================
// The first entry is the platform-default super admin, always present.
// Additional super admins can be created from the Super Admin console
// ("Platform Admins" tab). New entries start with mustChangePassword:true
// so the recipient is forced to set their own password on first sign-in.
const SUPER_ADMINS = [
  {
    id: 1,
    name: 'Curdun Platform Admin',
    email: 'admin@curdun.so',
    password: 'Admin@1234',              // default — change on first sign-in in production
    role: 'Super Admin',
    mustChangePassword: false,           // the platform-default admin is trusted
    createdAt: '2026-01-01',
  },
];

// Company Admins — auto-created when Cor Super Admin provisions a company.
// Login flow:
//  - Core workspace: tempPassword works (never forced to change here)
//  - Any active module (Retail POS): tempPassword works ONCE; forces
//    module password creation on first login
const COMPANY_ADMINS = [
  {
    id: 101,
    name: 'Ahmed Yusuf',
    email: 'admin@shifo.so',
    phone: '+252-61-234-5678',
    role: 'Admin',
    company: 'Shifo Pharmacy Group',
    store: 'Bakaara Main',
    tempPassword: 'Cor-7441GS-24',   // issued at company creation
    posPassword: null,               // set on first POS login
    mustChangePosPassword: true,     // toggled false after user sets posPassword
    access: ['dash','checkout','products','customers','transactions','staff','settings'],
    status: 'active',
    sales: 0,
    shift: 'Full day',
  },
];

// ============================================================
// POS ROLE-BASED ACCESS CONTROL
// ============================================================
const POS_ROLES = {
  'Cashier':       ['dash', 'checkout', 'transactions'],
  'Senior Cashier':['dash', 'checkout', 'transactions'],
  'Store Manager': ['dash', 'checkout', 'products', 'customers', 'transactions', 'staff'],
  'Admin':         ['dash', 'checkout', 'products', 'customers', 'transactions', 'staff', 'settings'],
};

function renderPOSLogin() {
  const pin = S.posLoginPin || '';
  const dots = [0,1,2,3].map(i =>
    `<div class="pin-dot ${i < pin.length ? 'filled' : ''}"></div>`
  ).join('');

  const staffList = POS_STAFF.map(s => `
    <button class="login-staff-btn" data-login-id="${s.id}">
      <div class="avatar avatar-sm" style="background:var(--purple-800);color:#FFF">${initials(s.name)}</div>
      <div>
        <div style="font-weight:700;font-size:13px">${s.name}</div>
        <div style="font-size:11px;color:var(--text-muted)">${s.role}</div>
      </div>
    </button>
  `).join('');

  const selectedStaff = S._loginSelectedId
    ? POS_STAFF.find(s => s.id === S._loginSelectedId) : null;

  // --- Body: three modes ---
  let body = '';

  if (S.posLoginMode === 'force-change') {
    const a = S.posPendingAdmin;
    body = `
      <div class="pos-login-who">
        <div class="avatar" style="background:var(--purple-800);color:#FFF;width:56px;height:56px;font-size:20px">${initials(a.name)}</div>
        <div>
          <div style="font-weight:800;font-size:16px">${a.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${a.role} · ${a.company}</div>
        </div>
      </div>
      <div class="pin-hint" style="text-align:left;margin-bottom:14px">
        <strong style="color:var(--purple-800)">First sign-in.</strong> Create a new POS password to continue.
        Your temporary password will no longer work here.
      </div>
      ${S.posAuthError ? `<div class="pin-error">${S.posAuthError}</div>` : ''}
      <form id="pos-force-change-form" style="display:flex;flex-direction:column;gap:12px;text-align:left">
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)">
          New password
          <input type="password" id="pos-new-pw" class="form-input" placeholder="At least 8 characters" autocomplete="new-password" required />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)">
          Confirm password
          <input type="password" id="pos-confirm-pw" class="form-input" placeholder="Retype new password" autocomplete="new-password" required />
        </label>
        <button type="submit" class="btn btn-primary" style="margin-top:6px">Set password & continue</button>
      </form>
    `;
  } else if (S.posLoginMode === 'admin') {
    body = `
      <div class="pos-login-who">
        <div class="avatar" style="background:var(--gold);color:var(--purple-800);width:56px;height:56px;font-size:18px;font-weight:900">A</div>
        <div>
          <div style="font-weight:800;font-size:15px">Admin sign-in</div>
          <div style="font-size:11px;color:var(--text-muted)">Company Admin · Email + password</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-admin-back" style="margin-left:auto;font-size:12px">Back</button>
      </div>
      ${S.posAuthError ? `<div class="pin-error">${S.posAuthError}</div>` : ''}
      <form id="pos-admin-login-form" style="display:flex;flex-direction:column;gap:12px;text-align:left">
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)">
          Email
          <input type="email" id="pos-admin-email" class="form-input" placeholder="admin@company.so" value="${S.posAdminEmail || ''}" autocomplete="username" required />
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)">
          Password
          <input type="password" id="pos-admin-pw" class="form-input" placeholder="Temporary or POS password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="btn btn-primary" style="margin-top:6px">Sign in</button>
        <div style="font-size:11px;color:var(--text-muted);text-align:center;margin-top:2px">
          Try <strong>admin@shifo.so</strong> / <strong>Cor-7441GS-24</strong>
        </div>
      </form>
    `;
  } else if (!selectedStaff) {
    // Staff grid + admin link
    body = `
      <div class="pos-login-staff-grid" id="login-staff-grid">
        ${staffList}
      </div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);text-align:center">
        <button type="button" class="btn-linklike" id="btn-open-admin-login"
          style="background:none;border:none;color:var(--purple-800);font-weight:700;font-size:13px;cursor:pointer;text-decoration:underline;padding:6px 10px">
          Sign in as Admin (email)
        </button>
      </div>
    `;
  } else {
    // PIN entry for selected staff
    body = `
      <div class="pos-login-who">
        <div class="avatar" style="background:var(--purple-800);color:#FFF;width:56px;height:56px;font-size:20px">${initials(selectedStaff.name)}</div>
        <div>
          <div style="font-weight:800;font-size:16px">${selectedStaff.name}</div>
          <div style="font-size:12px;color:var(--text-muted)">${selectedStaff.role}</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="btn-login-back" style="margin-left:auto;font-size:12px">Change</button>
      </div>
      <div class="pin-dots">${dots}</div>
      ${S.posAuthError ? `<div class="pin-error">${S.posAuthError}</div>` : '<div class="pin-hint">Enter your 4-digit PIN</div>'}
      <div class="numpad">
        ${[1,2,3,4,5,6,7,8,9,'','0','⌫'].map(k => `
          <button class="numpad-key${k===''?' numpad-key-empty':''}" data-key="${k}">${k}</button>
        `).join('')}
      </div>
    `;
  }

  return `
    <div class="pos-login-screen">
      <div class="pos-login-card">
        <div class="pos-login-logo">
          <img src="assets/curdun-logo.jpeg" alt="Curdun ICT" style="height:48px;width:auto;object-fit:contain;"/>
        </div>
        <div class="pos-login-title">Retail POS — Sign In</div>
        <div class="pos-login-sub">${S.currentCompany} · ${S.currentStore}</div>
        ${body}
      </div>
    </div>
  `;
}

function renderPOS() {
  // ---- Gate: show login if no active user ----
  if (!S.posActiveUser) {
    const loginWrap = document.createElement('div');
    loginWrap.style.cssText = 'height:100%;display:flex;align-items:stretch;';
    loginWrap.innerHTML = renderPOSLogin();
    setTimeout(() => wirePOSLoginEvents(), 0);
    return loginWrap;
  }

  const wrap = document.createElement('div');
  wrap.className = 'pos-layout';

  const sidebar = document.createElement('aside');
  sidebar.className = 'pos-sidebar';

  // Filter tabs by current user's role
  const allTabs = [
    ['dash',         'Dashboard',    posIcon('dash')],
    ['checkout',     'Checkout',     posIcon('checkout')],
    ['products',     'Products',     posIcon('products')],
    ['customers',    'Customers',    posIcon('customers')],
    ['transactions', 'Transactions', posIcon('transactions')],
    ['staff',        'Staff',        posIcon('staff')],
    ['settings',     'Settings',     settingsIcon()],
  ];
  const allowedTabs = POS_ROLES[S.posActiveUser.role] || POS_ROLES['Cashier'];
  const tabs = allTabs.filter(([key]) => allowedTabs.includes(key));

  // Reset posTab if current tab is no longer allowed
  if (!allowedTabs.includes(S.posTab)) S.posTab = 'dash';

  const roleColor = { Admin:'#F5C411', 'Store Manager':'#22C55E', 'Senior Cashier':'#7A5FB8', Cashier:'rgba(255,255,255,0.55)' };
  sidebar.innerHTML = `
    <div class="pos-sidebar-header">
      <button class="pharm-back" id="btn-pos-back">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to workspace
      </button>
      <div class="pharm-co-name">${S.posActiveUser?.company || S.currentCompany}</div>
      <div class="pharm-co-sub">Retail POS · v3.0.0</div>
    </div>
    <nav class="pharm-nav">
      ${tabs.map(([key,label,icon])=>`
        <button class="pharm-nav-item${S.posTab===key?' active':''}" data-pos-tab="${key}">
          ${icon} ${label}
        </button>
      `).join('')}
    </nav>
    <div class="pos-sidebar-user">
      <div class="avatar avatar-sm" style="background:var(--gold);color:var(--purple-800);font-weight:900">${initials(S.posActiveUser.name)}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${S.posActiveUser.name}</div>
        <div style="font-size:10px;color:${roleColor[S.posActiveUser.role]||'rgba(255,255,255,0.5)'}">${S.posActiveUser.role}</div>
      </div>
      <button class="btn btn-ghost" id="btn-pos-logout" title="Sign out" style="padding:4px 8px;font-size:11px;color:rgba(255,255,255,0.5)">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  `;
  sidebar.querySelector('#btn-pos-back').addEventListener('click',()=>{ S.view='workspace'; render(); });
  sidebar.querySelector('#btn-pos-logout').addEventListener('click',()=>{ S.posActiveUser=null; S.posLoginPin=''; S._loginSelectedId=null; S.posAuthError=''; S.posTab='dash'; S.posLoginMode='staff'; S.posAdminEmail=''; S.posPendingAdmin=null; render(); });
  sidebar.querySelectorAll('[data-pos-tab]').forEach(btn=>{
    btn.addEventListener('click',()=>{ S.posTab=btn.dataset.posTab; S.posReceiptVisible=false; render(); });
  });

  const main = document.createElement('div');
  main.className = 'pos-main';
  const labels = { dash:'Dashboard', checkout:'Checkout', products:'Products', customers:'Buugga Deynta', transactions:'Transactions', staff:'Staff', settings:'Settings' };

  if (S.posTab === 'checkout') {
    main.innerHTML = renderPOSCheckout();
    if (S.posMobileMoneyModal) {
      const overlay = document.createElement('div');
      overlay.className = 'mm-modal-overlay';
      overlay.innerHTML = renderMobileMoneyModal();
      main.appendChild(overlay);
    }
  } else {
    const offlineBanner = S.isOffline ? `<div class="pos-offline-banner"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg> Offline \u2014 ${S.syncQueue} transaction${S.syncQueue!==1?'s':''} queued</div>` : '';
    main.innerHTML = `
      ${offlineBanner}
      <div class="pharm-topbar">
        <div class="pharm-tab-label">${labels[S.posTab]||'Dashboard'}</div>
        <div class="ml-auto flex items-center gap-10">
          <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">${S.storeSettings.defaultStore} Store</div>
          <span class="pill ${S.isOffline?'pill-red':'pill-green'}">${S.isOffline?'\u25cf Offline':'\u25cf Online'}</span>
        </div>
      </div>
      <div class="pharm-content animate-fadein" id="pos-content">
        ${renderPOSTab()}
      </div>
    `;
  }

  wrap.appendChild(sidebar);
  wrap.appendChild(main);

  setTimeout(()=> wirePOSEvents(), 0);

  return wrap;
}

function renderPOSTab() {
  switch(S.posTab) {
    case 'dash':         return renderPOSDash();
    case 'products':     return renderPOSProducts();
    case 'customers':    return renderPOSCustomers();
    case 'transactions': return renderPOSTransactions();
    case 'staff':        return renderPOSStaff();
    case 'settings':     return renderPOSSettings();
    default:             return renderPOSDash();
  }
}

function renderPOSDash() {
  const u = S.posActiveUser;
  const sos = (usd) => (usd * S.exchangeRate).toLocaleString();

  // ---- CASHIER: personal shift dashboard ----
  if (u && u.role === 'Cashier' || u?.role === 'Senior Cashier') {
    const myTxns = POS_TRANSACTIONS.filter(t => t.cashier === u.name);
    const myTotal = myTxns.reduce((s,t) => s + t.total, 0);
    const shiftStart = S.posShiftStart
      ? S.posShiftStart.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' })
      : '—';
    const shiftDuration = S.posShiftStart
      ? Math.round((Date.now() - S.posShiftStart.getTime()) / 60000) + ' min'
      : '—';
    return `
      <div class="cashier-dash-wrap">
        <div class="cashier-dash-greeting">
          <div class="cashier-dash-avatar">${initials(u.name)}</div>
          <div>
            <div style="font-size:11px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">Good day,</div>
            <div style="font-size:22px;font-weight:900;color:var(--purple-800)">${u.name}</div>
            <div style="font-size:13px;color:var(--text-muted)">${u.role} · Bakaara Main</div>
          </div>
          <div style="margin-left:auto">
            <button class="btn ${S.posShiftActive ? 'btn-danger' : 'btn-primary'}" id="btn-shift-toggle">
              ${S.posShiftActive ? '⏹ End Shift' : '▶ Start Shift'}
            </button>
          </div>
        </div>

        ${S.posShiftActive ? `
        <div class="cashier-shift-banner">
          <span>🟢 Shift active since ${shiftStart}</span>
          <span class="shift-duration-badge">${shiftDuration}</span>
        </div>` : '<div class="cashier-shift-banner cashier-shift-idle">⚪ Shift not started — press Start Shift to begin</div>'}

        <div class="kpi-grid">
          <div class="kpi-card dark">
            <div class="kpi-eyebrow" style="color:#F5C411">My sales today</div>
            <div class="kpi-value">$${myTotal.toFixed(2)}</div>
          </div>
          <div class="kpi-card light">
            <div class="kpi-eyebrow">My transactions</div>
            <div class="kpi-value">${myTxns.length}</div>
            <div class="kpi-trend">Today</div>
          </div>
          <div class="kpi-card light">
            <div class="kpi-eyebrow">Avg. ticket</div>
            <div class="kpi-value">$${myTxns.length ? (myTotal/myTxns.length).toFixed(2) : '0.00'}</div>
            <div class="kpi-trend">Per transaction</div>
          </div>
          <div class="kpi-card light">
            <div class="kpi-eyebrow">Shift start</div>
            <div class="kpi-value" style="font-size:20px">${shiftStart}</div>
            <div class="kpi-trend">${shiftDuration !== '—' ? shiftDuration + ' elapsed' : 'Not started'}</div>
          </div>
        </div>

        <div class="data-section">
          <div class="section-header-bar"><h3 class="chart-title">My recent transactions</h3></div>
          <div class="overflow-x-auto">
            <table class="data-table" style="min-width:600px">
              <thead><tr><th>ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Time</th></tr></thead>
              <tbody>
                ${myTxns.slice(0,8).map(t=>`
                  <tr>
                    <td style="font-family:var(--font-mono);font-weight:700;color:#2D1859">${t.id}</td>
                    <td style="font-size:12px;color:var(--text-muted)">${t.customer}</td>
                    <td>${t.items}</td>
                    <td style="font-weight:800">$${t.total.toFixed(2)}</td>
                    <td><span class="pill ${t.method==='Cash'?'pill-green':'pill-gold'}">${t.method}</span></td>
                    <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${t.time}</td>
                  </tr>
                `).join('')}
                ${myTxns.length===0 ? '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">No transactions yet this shift</td></tr>' : ''}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ---- MANAGER / ADMIN: global store dashboard ----
  const todayTotal = POS_TRANSACTIONS.reduce((s,t)=>s+t.total,0);
  const todayTxns = POS_TRANSACTIONS.length;
  const avgTicket = (todayTotal / todayTxns).toFixed(2);
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="kpi-eyebrow" style="color:#F5C411">Today's sales</div>
        <div class="kpi-value">$${todayTotal.toFixed(2)}</div>
        <div class="kpi-trend" style="color:#EFEAFB">▲ 18% vs yesterday</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Transactions</div><div class="kpi-value">${todayTxns}</div><div class="kpi-trend trend-up">▲ 6 more</div></div>
      <div class="kpi-card light">
        <div class="kpi-eyebrow">Avg. ticket</div>
        <div class="kpi-value">$${avgTicket}</div>
        <div class="kpi-trend">Per transaction</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Active staff</div><div class="kpi-value">${POS_STAFF.filter(s=>s.status==='active').length}</div><div class="kpi-trend">On register now</div></div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div class="chart-card">
        <div class="chart-header"><div><h3 class="chart-title">Hourly sales</h3><div class="chart-sub">Today · all stores</div></div></div>
        <svg viewBox="0 0 600 160" width="100%" height="160" preserveAspectRatio="none">
          <defs><linearGradient id="posFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#F5C411" stop-opacity="0.3"/><stop offset="100%" stop-color="#F5C411" stop-opacity="0"/></linearGradient></defs>
          <g stroke="#F0EEF7" stroke-width="1"><line x1="0" y1="40" x2="600" y2="40"/><line x1="0" y1="80" x2="600" y2="80"/><line x1="0" y1="120" x2="600" y2="120"/></g>
          <path d="M0,140 C50,130 80,115 120,100 C160,88 200,75 250,60 C300,50 350,42 400,35 C450,30 500,25 550,22 L600,20 L600,160 L0,160 Z" fill="url(#posFill)"/>
          <path d="M0,140 C50,130 80,115 120,100 C160,88 200,75 250,60 C300,50 350,42 400,35 C450,30 500,25 550,22 L600,20" fill="none" stroke="#F5C411" stroke-width="3"/>
        </svg>
        <div class="chart-x-axis"><span>8AM</span><span>9</span><span>10</span><span>11</span><span>12</span><span>1PM</span><span>2</span><span>3PM</span></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:12px">Payment methods</h3>
        ${[['Cash','$147.60','32%','#2D1859'],['EVC Plus','$138.30','30%','#F5C411'],['Zaad','$224.00','48%','#22C55E'],['Sahal','$34.80','8%','#7A5FB8']].map(([name,amt,pct,col])=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <div style="flex:1;font-size:13px;font-weight:600">${name}</div>
            <div style="font-size:12px;font-weight:700;color:var(--text-primary)">${amt}</div>
            <div style="font-size:11px;color:var(--text-muted);width:32px;text-align:right">${pct}</div>
          </div>
        `).join('')}
        <h3 class="chart-title" style="margin-bottom:12px;margin-top:16px">Top sellers</h3>
        ${[['Basmati Rice 5kg','24 sold','#2D1859'],['Coca-Cola 330ml','42 sold','#F5C411'],['Sugar 1kg','38 sold','#22C55E'],['Bottled Water 1.5L','56 sold','#7A5FB8']].map(([name,sold,col])=>`
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:8px;height:8px;border-radius:50%;background:${col};flex-shrink:0"></div>
            <div style="flex:1;font-size:13px;font-weight:600">${name}</div>
            <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">${sold}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">Recent transactions</h3></div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:700px">
          <thead><tr><th>ID</th><th>Cashier</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Time</th></tr></thead>
          <tbody>
            ${POS_TRANSACTIONS.slice(0,5).map(t=>`
              <tr>
                <td style="font-family:var(--font-mono);font-weight:700;color:#2D1859">${t.id}</td>
                <td>${t.cashier}</td>
                <td style="font-size:12px;color:var(--text-muted)">${t.customer}</td>
                <td>${t.items}</td>
                <td style="font-weight:800">$${t.total.toFixed(2)}</td>
                <td><span class="pill ${t.method==='Cash'?'pill-green':'pill-gold'}">${t.method}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${t.time}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPOSCheckout() {
  const cart = S.posCart;
  const sos = (usd) => (usd * S.exchangeRate).toLocaleString();
  const subtotal = cart.reduce((s,item)=>{ const p = item.isWholesale ? item.wholesalePrice : item.price; return s + p * item.qty; }, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const term = (S.posSearchTerm||'').toLowerCase();
  const filtered = term ? POS_PRODUCTS.filter(p=>p.name.toLowerCase().includes(term)||p.barcode.includes(term)||p.cat.toLowerCase().includes(term)) : POS_PRODUCTS;
  const catEmoji = {Groceries:'\ud83d\uded2',Beverages:'\ud83e\udd64',Household:'\ud83c\udfe0','Personal Care':'\ud83e\uddf4',Snacks:'\ud83c\udf6a',Bakery:'\ud83c\udf5e',Fresh:'\ud83e\udd6c'};

  if (S.posReceiptVisible && S.posLastReceipt) return renderPOSReceipt();

  const debtCustomer = S.posPaymentMethod==='deyn' && S.posDebtCustomerId ? POS_CUSTOMERS.find(c=>c.id===S.posDebtCustomerId) : null;
  const overLimit = debtCustomer && (debtCustomer.debtBalance + total) > debtCustomer.creditLimit;

  return `
    <div class="pos-checkout-layout">
      <div class="pos-product-panel">
        <div class="pos-product-search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="pos-search-input" id="pos-search" type="text" placeholder="Raadi alaab ama scan barcode..." value="${S.posSearchTerm||''}"/>
          <span style="font-size:11px;color:var(--text-muted)">${filtered.length} alaab</span>
        </div>
        <div class="pos-categories">
          ${['All','Groceries','Beverages','Household','Personal Care','Snacks','Bakery','Fresh'].map(cat=>`<button class="pos-cat-btn" data-pos-cat="${cat}">${cat}</button>`).join('')}
        </div>
        <div class="pos-product-grid" id="pos-products">
          ${filtered.map(p=>`
            <button class="pos-product-tile" data-add-product="${p.id}">
              <div class="pos-tile-emoji">${catEmoji[p.cat]||'\ud83d\udce6'}</div>
              <div class="pos-tile-name">${p.name}</div>
              <div class="pos-tile-price">$${p.price.toFixed(2)}</div>
              <div class="pos-tile-wholesale">Jumlo: $${p.wholesalePrice.toFixed(2)}</div>
              <div class="pos-tile-stock">${p.stock} stock</div>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="pos-cart-panel">
        <div class="pos-cart-header">
          <h3 style="font-size:16px;font-weight:800;color:#FFF">Iibka hadda</h3>
          <span style="font-size:12px;color:rgba(255,255,255,0.6)">${cart.length} alaab</span>
        </div>

        <div class="pos-cart-items" id="pos-cart-items">
          ${cart.length===0 ? `
            <div class="pos-cart-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M3 3h18l-2 12H5L3 3z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
              <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:8px">Cart ma jirto</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.25)">Taabo alaab si aad u darto</div>
            </div>
          ` : cart.map((item,i)=>{ const effPrice=item.isWholesale?item.wholesalePrice:item.price; const rowTotal=effPrice*item.qty; return `
            <div class="pos-cart-row">
              <div class="pos-cart-item-info">
                <div class="pos-cart-item-name">${item.name}</div>
                <div class="pos-cart-item-price">$${effPrice.toFixed(2)}</div>
              </div>
              <div class="pos-wholesale-toggle">
                <span class="pos-wt-label ${!item.isWholesale?'active':''}">Xabo</span>
                <label class="pos-wt-switch"><input type="checkbox" class="pos-wholesale-cb" data-cart-idx="${i}" ${item.isWholesale?'checked':''}><span class="pos-wt-track"></span></label>
                <span class="pos-wt-label ${item.isWholesale?'active':''}">Karto</span>
              </div>
              <div class="pos-cart-qty">
                <button class="pos-qty-btn" data-qty-minus="${i}">\u2212</button>
                <span class="pos-qty-val">${item.qty}</span>
                <button class="pos-qty-btn" data-qty-plus="${i}">+</button>
              </div>
              <div class="pos-cart-item-total">$${rowTotal.toFixed(2)}</div>
              <button class="pos-cart-remove" data-remove-item="${i}">\u00d7</button>
            </div>
          `}).join('')}
        </div>

        <div class="pos-cart-summary">
          <div class="pos-summary-row"><span>Wadarta yar</span><span>$${subtotal.toFixed(2)}</span></div>
          <div class="pos-summary-row"><span>Canshuur (5%)</span><span>$${tax.toFixed(2)}</span></div>
          <div class="pos-summary-row pos-summary-total"><span>WADARTA</span><span>$${total.toFixed(2)}</span></div>
        </div>

        <div class="pos-payment-methods">
          <div class="pos-pay-section-label">Hab lacag-bixinta</div>
          <div class="pos-pay-options">
            <button class="pos-pay-btn${S.posPaymentMethod==='cash'?' active':''}" data-pay-method="cash">\ud83d\udcb5 Cash</button>
            <button class="pos-pay-btn${S.posPaymentMethod==='evc'?' active':''} pos-pay-mobile" data-pay-method="evc">\ud83d\udcf1 EVC Plus</button>
            <button class="pos-pay-btn${S.posPaymentMethod==='edahab'?' active':''} pos-pay-mobile" data-pay-method="edahab">\ud83d\udcb3 eDahab</button>
            <button class="pos-pay-btn${S.posPaymentMethod==='zaad'?' active':''} pos-pay-mobile" data-pay-method="zaad">\ud83d\udcf2 Zaad</button>
            <button class="pos-pay-btn${S.posPaymentMethod==='sahal'?' active':''}" data-pay-method="sahal">\ud83d\udcb3 Sahal</button>
            <button class="pos-pay-btn${S.posPaymentMethod==='deyn'?' active':''} pos-pay-deyn" data-pay-method="deyn">\ud83d\udcd2 Deyn</button>
          </div>
          ${S.posPaymentMethod==='deyn' ? `
            <div class="pos-deyn-selector">
              <label class="pos-pay-section-label">Magaca macmiilka (Buugga Deynta)</label>
              <select id="pos-deyn-customer" class="pos-deyn-select">
                <option value="">\u2014 Dooro macmiil \u2014</option>
                ${POS_CUSTOMERS.map(c=>{ const used=c.debtBalance+total; const over=used>c.creditLimit; return `<option value="${c.id}" ${S.posDebtCustomerId===c.id?'selected':''}>${c.name} \u2014 Deyn: $${c.debtBalance.toFixed(2)} / Xad: $${c.creditLimit} ${over?'\u26a0':'\u2713'}</option>`; }).join('')}
              </select>
              ${overLimit ? `<div class="pos-deyn-warning">\u26a0 Xadka deynta waa la dhaafay! Macmiilku xad: $${debtCustomer.creditLimit}, guud ahaan: $${(debtCustomer.debtBalance+total).toFixed(2)}.</div>` : ''}
              ${debtCustomer && !overLimit ? `<div class="pos-deyn-ok">\u2713 ${debtCustomer.name} \u00b7 Deyn cusub: $${(debtCustomer.debtBalance+total).toFixed(2)} / $${debtCustomer.creditLimit} xad</div>` : ''}
            </div>
          ` : ''}
        </div>

        <div class="pos-cart-actions">
          <button class="pos-charge-btn" id="btn-pos-charge" ${cart.length===0||overLimit?'disabled':''}>
            ${['evc','edahab','zaad'].includes(S.posPaymentMethod) ? 'Soo dir OTP \u2192' : `Bixso $${total.toFixed(2)}`}
          </button>
          <button class="pos-clear-btn" id="btn-pos-clear" ${cart.length===0?'disabled':''}>Tirtir cart</button>
        </div>
      </div>
    </div>
  `;
}

function renderMobileMoneyModal() {
  const methodLabels = {evc:'EVC Plus \u00b7 Hormuud',edahab:'eDahab \u00b7 Somtel',zaad:'Zaad \u00b7 Telesom'};
  const label = methodLabels[S.posPaymentMethod] || 'Mobile Money';
  const cart = S.posCart;
  const subtotal = cart.reduce((s,item)=>{ const p=item.isWholesale?item.wholesalePrice:item.price; return s+p*item.qty; }, 0);
  const total = subtotal * 1.05;
  const sos = (usd) => (usd * S.exchangeRate).toLocaleString();
  return `
    <div class="mm-modal">
      <div class="mm-modal-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18" stroke-linecap="round"/></svg>
      </div>
      <h3 class="mm-modal-title">${label}</h3>
      <p class="mm-modal-amount">$${total.toFixed(2)}</p>
      <div class="mm-modal-fields">
        <div class="mm-field">
          <label class="mm-label">Lambarka telefoonka</label>
          <input class="mm-input" id="mm-phone" type="tel" placeholder="061 XXX XXXX" value="${S.mobilePhone||''}" maxlength="15"/>
        </div>
        <div class="mm-field">
          <label class="mm-label">Transaction ID (6 lambar)</label>
          <input class="mm-input" id="mm-txid" type="text" placeholder="123456" value="${S.mobileTxId||''}" maxlength="8" style="font-family:var(--font-mono);letter-spacing:3px"/>
        </div>
        ${S.mobileError ? `<div class="mm-error">${S.mobileError}</div>` : ''}
      </div>
      <div class="mm-modal-actions">
        <button class="btn btn-gold" id="btn-mm-confirm">Xaqiiji \u2713</button>
        <button class="btn btn-ghost" id="btn-mm-cancel" style="color:var(--purple-800)">Jooji</button>
      </div>
    </div>
  `;
}

function renderPOSReceipt() {
  const r = S.posLastReceipt;
  return `
    <div class="pos-receipt-overlay">
      <div class="pos-receipt-card">
        <div class="pos-receipt-header">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
          <h3 style="font-size:18px;font-weight:900;color:var(--text-primary);margin-top:8px">Payment successful!</h3>
        </div>
        <div class="pos-receipt-body">
          <div style="text-align:center;padding:16px 0;border-bottom:1px dashed var(--border)">
            <div style="font-weight:900;font-size:15px">SHIFO RETAIL GROUP</div>
            <div style="font-size:11px;color:var(--text-muted)">Bakaara Main Store · Mogadishu</div>
            <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px">${r.id} · ${r.date}</div>
          </div>
          <div style="padding:12px 0;border-bottom:1px dashed var(--border)">
            ${r.items.map(item=>`
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0">
                <span>${item.name} × ${item.qty}</span>
                <span style="font-weight:700">$${(item.price*item.qty).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div style="padding:12px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)"><span>Subtotal</span><span>$${r.subtotal.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)"><span>Tax (5%)</span><span>$${r.tax.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;margin-top:8px;color:var(--purple-800)"><span>Total</span><span>$${r.total.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-top:8px;color:var(--text-muted)"><span>Paid via</span><span style="font-weight:700;color:var(--text-primary)">${r.method}</span></div>
          </div>
          <div style="text-align:center;font-size:11px;color:var(--text-muted);padding-top:12px;border-top:1px dashed var(--border)">Thank you for shopping at Shifo!</div>
        </div>
        <div style="display:flex;gap:10px;padding:16px 20px">
          <button class="btn btn-primary" id="btn-receipt-new" style="flex:1">New sale</button>
          <button class="btn btn-outline" id="btn-receipt-print" style="flex:1">Print receipt</button>
        </div>
      </div>
    </div>
  `;
}

function renderPOSProducts() {
  const cats = [...new Set(POS_PRODUCTS.map(p=>p.cat))];
  const sos = (usd) => (usd * S.exchangeRate).toLocaleString();

  // CRUD Modal
  let modalHtml = '';
  if (S.crudModal && S.crudModal.type === 'product') {
    const isEdit = S.crudModal.mode === 'edit';
    const f = S.crudForm;
    modalHtml = `
      <div class="crud-overlay">
        <div class="crud-modal">
          <div class="crud-modal-header">
            <h3>${isEdit ? 'Edit Product' : 'Add New Product'}</h3>
            <button class="crud-close-btn" id="btn-crud-close">×</button>
          </div>
          <div class="crud-modal-body">
            <div class="crud-grid-2">
              <div class="form-group"><label class="form-label">Product Name *</label><input class="form-input" id="cf-name" value="${f.name||''}"/></div>
              <div class="form-group"><label class="form-label">Category</label>
                <select class="form-select" id="cf-cat">
                  ${['Groceries','Beverages','Household','Personal Care','Snacks','Bakery','Fresh'].map(c=>`<option ${(f.cat||'Groceries')===c?'selected':''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label class="form-label">Retail Price (USD) *</label><input class="form-input" id="cf-price" type="number" step="0.01" min="0" value="${f.price||''}"/></div>
              <div class="form-group"><label class="form-label">Wholesale Price (USD)</label><input class="form-input" id="cf-wprice" type="number" step="0.01" min="0" value="${f.wholesalePrice||''}"/></div>
              <div class="form-group"><label class="form-label">Stock Qty *</label><input class="form-input" id="cf-stock" type="number" min="0" value="${f.stock||''}"/></div>
              <div class="form-group"><label class="form-label">Barcode</label><input class="form-input" id="cf-barcode" value="${f.barcode||''}"/></div>
            </div>
            ${S.crudForm._error ? `<div class="crud-error">${S.crudForm._error}</div>` : ''}
          </div>
          <div class="crud-modal-footer">
            <button class="btn btn-primary" id="btn-crud-save">${isEdit ? 'Save changes' : 'Add product'}</button>
            <button class="btn btn-ghost" id="btn-crud-cancel" style="color:var(--text-secondary)">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  // Delete confirm
  let deleteHtml = '';
  if (S.confirmDeleteModal && S.confirmDeleteModal.type === 'product') {
    const p = POS_PRODUCTS.find(x=>x.id===S.confirmDeleteModal.id);
    deleteHtml = `
      <div class="crud-overlay">
        <div class="crud-confirm">
          <div class="crud-confirm-icon">⚠️</div>
          <h3>Delete "${p?.name}"?</h3>
          <p>This will permanently remove the product from the catalog.</p>
          <div class="crud-confirm-actions">
            <button class="btn btn-danger" id="btn-delete-confirm">Yes, delete</button>
            <button class="btn btn-outline" id="btn-delete-cancel">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  return `
    ${modalHtml}${deleteHtml}
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Total products</div><div class="kpi-value">${POS_PRODUCTS.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Categories</div><div class="kpi-value">${cats.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Low stock</div><div class="kpi-value trend-warn">${POS_PRODUCTS.filter(p=>p.stock<40).length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Total value</div><div class="kpi-value">$${POS_PRODUCTS.reduce((s,p)=>s+p.price*p.stock,0).toFixed(0)}</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar">
        <h3 class="chart-title">Product catalog</h3>
        <div class="ml-auto">
          <button class="btn btn-primary btn-sm" id="btn-add-product">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Product
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>Product</th><th>Category</th><th>Retail</th><th>Wholesale</th><th>Stock</th><th>Barcode</th><th>Status</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${POS_PRODUCTS.map(p=>`
              <tr>
                <td style="font-weight:700">${p.name}</td>
                <td><span class="pill" style="background:var(--gray-50);color:var(--text-secondary)">${p.cat}</span></td>
                <td style="font-weight:800">$${p.price.toFixed(2)}</td>
                <td style="font-size:13px;color:var(--text-muted)">$${p.wholesalePrice.toFixed(2)}</td>
                <td style="font-weight:700;color:${p.stock<40?'#B45309':'var(--text-primary)'}">${p.stock}</td>
                <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${p.barcode}</td>
                <td><span class="pill ${p.stock<40?'pill-amber':'pill-green'}">● ${p.stock<40?'Low':'In stock'}</span></td>
                <td class="col-right">
                  <div class="crud-actions">
                    <button class="crud-btn crud-btn-edit" data-edit-product="${p.id}" title="Edit">✏️</button>
                    <button class="crud-btn crud-btn-delete" data-delete-product="${p.id}" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  `;
}



function renderPOSCustomers() {
  const tierColor = {Gold:'#F5C411',Silver:'#94A3B8',Bronze:'#CD7F32'};
  const totalDebt = POS_CUSTOMERS.reduce((s,c)=>s+c.debtBalance,0);
  const overdue = POS_CUSTOMERS.filter(c=>c.debtBalance>=c.creditLimit);
  const sos = (usd) => (usd * S.exchangeRate).toLocaleString();

  // Add/Edit Customer Modal
  let modalHtml = '';
  if (S.crudModal && S.crudModal.type === 'customer') {
    const isEdit = S.crudModal.mode === 'edit';
    const f = S.crudForm;
    modalHtml = `
      <div class="crud-overlay">
        <div class="crud-modal">
          <div class="crud-modal-header">
            <h3>${isEdit ? 'Edit Customer' : 'Add New Customer'}</h3>
            <button class="crud-close-btn" id="btn-crud-close">×</button>
          </div>
          <div class="crud-modal-body">
            <div class="crud-grid-2">
              <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="cf-name" value="${f.name||''}"/></div>
              <div class="form-group"><label class="form-label">Phone *</label><input class="form-input" id="cf-phone" value="${f.phone||''}"/></div>
              <div class="form-group"><label class="form-label">Tier</label>
                <select class="form-select" id="cf-tier">
                  ${['Bronze','Silver','Gold'].map(t=>`<option ${(f.tier||'Bronze')===t?'selected':''}>${t}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label class="form-label">Credit Limit (USD)</label><input class="form-input" id="cf-credit" type="number" min="0" value="${f.creditLimit||0}"/></div>
            </div>
            ${S.crudForm._error ? `<div class="crud-error">${S.crudForm._error}</div>` : ''}
          </div>
          <div class="crud-modal-footer">
            <button class="btn btn-primary" id="btn-crud-save">${isEdit ? 'Save changes' : 'Add customer'}</button>
            <button class="btn btn-ghost" id="btn-crud-cancel" style="color:var(--text-secondary)">Cancel</button>
          </div>
        </div>
      </div>`;
  }
  let deleteHtml = '';
  if (S.confirmDeleteModal && S.confirmDeleteModal.type === 'customer') {
    const c = POS_CUSTOMERS.find(x=>x.id===S.confirmDeleteModal.id);
    deleteHtml = `
      <div class="crud-overlay">
        <div class="crud-confirm">
          <div class="crud-confirm-icon">⚠️</div>
          <h3>Remove "${c?.name}"?</h3>
          <p>This will remove the customer and their debt record.</p>
          <div class="crud-confirm-actions">
            <button class="btn btn-danger" id="btn-delete-confirm">Yes, remove</button>
            <button class="btn btn-outline" id="btn-delete-cancel">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  return `
    ${modalHtml}${deleteHtml}
    <div class="buugga-header">
      <div class="buugga-title-row">
        <div>
          <div style="font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-weight:800;color:var(--gold);margin-bottom:4px">📒 BUUGGA DEYNTA · Customer Debt Ledger</div>
          <h2 style="font-size:22px;font-weight:900;color:var(--purple-800);margin:0">Macaamiisha Deynta</h2>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-primary btn-sm" id="btn-add-customer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Customer
          </button>
          <button class="btn btn-outline btn-sm" id="btn-export-deyn">Export PDF</button>
        </div>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="kpi-eyebrow" style="color:#F5C411">Wadarta Deynta</div>
        <div class="kpi-value">$${totalDebt.toFixed(2)}</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Macaamiil deyn ah</div><div class="kpi-value">${POS_CUSTOMERS.filter(c=>c.debtBalance>0).length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Xadka dhaafay \u26a0</div><div class="kpi-value" style="color:#B42318">${overdue.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Macaamiil guud</div><div class="kpi-value">${POS_CUSTOMERS.length}</div></div>
    </div>

    <div class="data-section">
      <div class="section-header-bar">
        <h3 class="chart-title">\ud83d\udcd2 Liiska Deynta</h3>
        <div class="ml-auto flex items-center gap-10" style="font-size:12px">
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#B42318;display:inline-block"></span> Xad dhaafay</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#B45309;display:inline-block"></span> Deyn jirta</span>
          <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#22C55E;display:inline-block"></span> Saafi</span>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>Macmiilka</th><th>Telefoon</th><th>Xad deynta</th><th>Deynta hadda</th><th>%</th><th>Xaaladda</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${POS_CUSTOMERS.map(c=>{
              const pct = c.creditLimit>0 ? Math.round((c.debtBalance/c.creditLimit)*100) : 0;
              const isOver = c.debtBalance>=c.creditLimit;
              const hasDebt = c.debtBalance>0;
              const rowClass = isOver?'buugga-row-over':hasDebt?'buugga-row-debt':'';
              const statusPill = isOver ? '<span class="pill" style="background:#FEF0EE;color:#B42318;border:1px solid #FDA29B">● Xad dhaafay</span>' : hasDebt ? `<span class="pill" style="background:#FFFCEF;color:#B45309;border:1px solid rgba(245,196,17,0.3)">● ${pct}% used</span>` : '<span class="pill pill-green">● Saafi</span>';
              return `<tr class="${rowClass}">
                <td><div class="flex items-center gap-10"><div class="avatar avatar-sm">${initials(c.name)}</div><div><div style="font-weight:700">${c.name}</div><div style="font-size:10px;color:var(--text-muted)">${c.tier}</div></div></div></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${c.phone}</td>
                <td style="font-weight:700">$${c.creditLimit}</td>
                <td><div style="font-weight:800;color:${isOver?'#B42318':hasDebt?'#B45309':'var(--text-primary)'}">$${c.debtBalance.toFixed(2)}</div></td>
                <td><div class="buugga-bar-wrap"><div class="buugga-bar" style="width:${Math.min(pct,100)}%;background:${isOver?'#B42318':pct>60?'#B45309':'#22C55E'}"></div></div><div style="font-size:11px;font-weight:700;margin-top:2px;color:${isOver?'#B42318':'var(--text-muted)'}">${pct}%</div></td>
                <td>${statusPill}</td>
                <td class="col-right">
                  <div class="crud-actions">
                    <button class="btn btn-xs btn-outline" data-collect-deyn="${c.id}" ${c.debtBalance===0?'disabled':''}>Collect</button>
                    <button class="crud-btn crud-btn-edit" data-edit-customer="${c.id}" title="Edit">✏️</button>
                    <button class="crud-btn crud-btn-delete" data-delete-customer="${c.id}" title="Delete">🗑️</button>
                  </div>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">\u2605 Jadwalka Xubnahayda (Loyalty)</h3></div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:600px">
          <thead><tr><th>Macmiilka</th><th>Heerka</th><th>Dhibcaha</th><th>Booqdooyinka</th><th>Booqashadii u dambeysay</th></tr></thead>
          <tbody>
            ${POS_CUSTOMERS.map(c=>{ const tc=tierColor[c.tier]||'#ccc'; return `<tr><td><div class="flex items-center gap-10"><div class="avatar avatar-sm">${initials(c.name)}</div><span style="font-weight:700">${c.name}</span></div></td><td><span class="pill" style="background:${tc}22;color:${tc==='#F5C411'?'#B45309':tc};border:1px solid ${tc}44;font-weight:800">\u2605 ${c.tier}</span></td><td style="font-weight:700">${c.points.toLocaleString()}</td><td>${c.visits}</td><td style="font-size:12px;color:var(--text-muted)">${c.lastVisit}</td></tr>`; }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPOSTransactions() {
  const totalSales = POS_TRANSACTIONS.reduce((s,t)=>s+t.total,0);
  const cashTotal = POS_TRANSACTIONS.filter(t=>t.method==='Cash').reduce((s,t)=>s+t.total,0);
  const mobileTotal = totalSales - cashTotal;
  const sos = (usd) => (usd * S.exchangeRate).toLocaleString();

  // View detail modal
  let viewHtml = '';
  if (S.viewModal && S.viewModal.type === 'transaction') {
    const t = POS_TRANSACTIONS.find(x=>x.id===S.viewModal.id);
    if (t) viewHtml = `
      <div class="crud-overlay">
        <div class="crud-modal" style="max-width:440px">
          <div class="crud-modal-header">
            <h3>Transaction Detail</h3>
            <button class="crud-close-btn" id="btn-view-close">×</button>
          </div>
          <div class="crud-modal-body">
            <div class="txn-detail-grid">
              <div class="txn-detail-row"><span>ID</span><span class="mono-val">${t.id}</span></div>
              <div class="txn-detail-row"><span>Date</span><span>${t.date}</span></div>
              <div class="txn-detail-row"><span>Time</span><span class="mono-val">${t.time}</span></div>
              <div class="txn-detail-row"><span>Cashier</span><span>${t.cashier}</span></div>
              <div class="txn-detail-row"><span>Customer</span><span>${t.customer}</span></div>
              <div class="txn-detail-row"><span>Items</span><span>${t.items}</span></div>
              <div class="txn-detail-row"><span>Payment</span><span>${t.method}</span></div>
              <div class="txn-detail-row txn-total-row"><span>Total</span><span>$${t.total.toFixed(2)}</span></div>
            </div>
          </div>
          <div class="crud-modal-footer">
            <button class="btn btn-outline" id="btn-view-close">Close</button>
          </div>
        </div>
      </div>`;
  }

  // Delete confirm
  let deleteHtml = '';
  if (S.confirmDeleteModal && S.confirmDeleteModal.type === 'transaction') {
    const t = POS_TRANSACTIONS.find(x=>x.id===S.confirmDeleteModal.id);
    deleteHtml = `
      <div class="crud-overlay">
        <div class="crud-confirm">
          <div class="crud-confirm-icon">⚠️</div>
          <h3>Void Transaction ${t?.id}?</h3>
          <p>Amount: <strong>$${t?.total.toFixed(2)}</strong> · ${t?.method}. This action cannot be undone.</p>
          <div class="crud-confirm-actions">
            <button class="btn btn-danger" id="btn-delete-confirm">Void transaction</button>
            <button class="btn btn-outline" id="btn-delete-cancel">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  return `
    ${viewHtml}${deleteHtml}
    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="kpi-eyebrow" style="color:#F5C411">Total sales</div>
        <div class="kpi-value">$${totalSales.toFixed(2)}</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Transactions</div><div class="kpi-value">${POS_TRANSACTIONS.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Cash</div><div class="kpi-value">$${cashTotal.toFixed(2)}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Mobile money</div><div class="kpi-value">$${mobileTotal.toFixed(2)}</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">All transactions — Today</h3>
        <div class="ml-auto" style="font-size:12px;color:var(--text-muted)">Click row to view · 🗑️ to void</div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>ID</th><th>Cashier</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Time</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${POS_TRANSACTIONS.map(t=>`
              <tr class="txn-row-clickable" data-view-txn="${t.id}">
                <td style="font-family:var(--font-mono);font-weight:700;color:#2D1859">${t.id}</td>
                <td>${t.cashier}</td>
                <td style="font-size:12px;color:var(--text-muted)">${t.customer}</td>
                <td>${t.items}</td>
                <td style="font-weight:800">$${t.total.toFixed(2)}</td>
                <td><span class="pill ${t.method==='Cash'?'pill-green':'pill-gold'}">${t.method}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${t.time}</td>
                <td class="col-right" onclick="event.stopPropagation()">
                  <div class="crud-actions">
                    <button class="crud-btn" data-view-txn-btn="${t.id}" title="View details" style="color:var(--purple-800)">👁️</button>
                    <button class="crud-btn crud-btn-delete" data-delete-txn="${t.id}" title="Void">🗑️</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPOSStaff() {
  const systemCashUSD = POS_TRANSACTIONS.filter(t=>t.method==='Cash').reduce((s,t)=>s+t.total,0);
  const countedUSD = parseFloat(S.shiftCountedUSD)||0;
  const variance = countedUSD - systemCashUSD;
  const varianceClass = variance===0?'shift-var-zero':variance>0?'shift-var-over':'shift-var-short';
  const varianceLabel = variance===0 ? '\u2713 Sax' : variance>0 ? `\u25b2 Kordhay $${Math.abs(variance).toFixed(2)}` : `\u25bc Dhimay $${Math.abs(variance).toFixed(2)}`;

  // Credential creation form state
  const cf = S._staffCredForm || {};
  const autoUser = cf.name ? (()=>{ const p=cf.name.trim().split(' '); return (p[0]||'').toLowerCase()+'.'+(p[1]?p[1][0].toLowerCase():''); })() : '';
  const autoPin  = cf.generatedPin || '';

  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Shaqaalaha guud</div><div class="kpi-value">${POS_STAFF.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Shaqeeya</div><div class="kpi-value" style="color:#0F7A3A">${POS_STAFF.filter(s=>s.status==='active').length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Nasanaya</div><div class="kpi-value trend-warn">${POS_STAFF.filter(s=>s.status==='break').length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Iibka maanta</div><div class="kpi-value">${POS_STAFF.reduce((s,st)=>s+st.sales,0)}</div></div>
    </div>

    <!-- CREATE STAFF WITH CREDENTIALS -->
    <div class="staff-cred-panel">
      <div class="staff-cred-header">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        <h3 class="staff-cred-title">Create Staff Account</h3>
      </div>
      <div class="staff-cred-grid">
        <div class="form-group">
          <label class="form-label" style="color:rgba(255,255,255,0.8)">Full Name *</label>
          <input class="form-input shift-count-input" id="scf-name" placeholder="e.g. Ali Omar" value="${cf.name||''}"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:rgba(255,255,255,0.8)">Role *</label>
          <select class="form-select shift-count-input" id="scf-role">
            ${['Cashier','Senior Cashier','Store Manager','Admin'].map(r=>`<option value="${r}" ${(cf.role||'Cashier')===r?'selected':''}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:rgba(255,255,255,0.8)">Store</label>
          <select class="form-select shift-count-input" id="scf-store">
            ${['Bakaara Main','Hodan Store','Wadajir Store','Hamar Weyne'].map(st=>`<option ${(cf.store||'Bakaara Main')===st?'selected':''}>${st}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:rgba(255,255,255,0.8)">Shift</label>
          <select class="form-select shift-count-input" id="scf-shift">
            ${['Morning','Afternoon','Full day'].map(sh=>`<option ${(cf.shift||'Morning')===sh?'selected':''}>${sh}</option>`).join('')}
          </select>
        </div>
      </div>
      ${autoUser ? `
      <div class="staff-cred-preview">
        <div class="cred-preview-item">
          <span class="cred-preview-label">Auto username</span>
          <span class="cred-preview-val" style="font-family:var(--font-mono)">${autoUser}</span>
        </div>
        <div class="cred-preview-item">
          <span class="cred-preview-label">Auto-generated PIN</span>
          <span class="cred-preview-val cred-pin">${autoPin || '—'}</span>
          <button class="btn btn-ghost btn-sm" id="btn-regen-pin" style="color:var(--gold);font-size:11px">↺ New PIN</button>
        </div>
      </div>` : ''}
      ${cf._error ? `<div class="crud-error" style="margin:8px 0">${cf._error}</div>` : ''}
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn btn-gold" id="btn-create-staff-cred">Create Account ✓</button>
        <button class="btn btn-ghost" id="btn-clear-staff-cred" style="color:#EFEAFB">Clear</button>
      </div>
    </div>

    <div class="shift-panel">
      <div class="shift-panel-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <h3 class="shift-panel-title">Xirida Shiftiga \u2014 Shift Reconciliation</h3>
      </div>
      <div class="shift-cashier-select">
        <label class="form-label" style="color:rgba(255,255,255,0.7)">Cashier-ka shiftiga xira</label>
        <select class="form-select" id="shift-cashier-sel" style="max-width:280px;background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.2);color:#FFF">
          <option value="">\u2014 Dooro cashier \u2014</option>
          ${POS_STAFF.map(s=>`<option value="${s.id}" ${S.shiftCashier===s.id?'selected':''}>${s.name} \u00b7 ${s.store}</option>`).join('')}
        </select>
      </div>
      <div class="shift-system-totals">
        <div class="shift-sys-row"><span class="shift-sys-label">Nidaamka: Cash USD</span><span class="shift-sys-val">$${systemCashUSD.toFixed(2)}</span></div>
      </div>
      <div class="shift-count-grid">
        <div class="shift-count-col">
          <label class="form-label" style="color:rgba(255,255,255,0.7)">La tirisay \u2014 USD</label>
          <input class="form-input shift-count-input" id="shift-usd" type="number" step="0.01" min="0" placeholder="0.00" value="${S.shiftCountedUSD||''}">
        </div>
      </div>
      ${countedUSD>0 ? `
      <div class="shift-variance-card ${varianceClass}">
        <div style="flex:1"><div class="shift-var-label">Kala duwanaanshaha</div><div class="shift-var-value">${varianceLabel}</div></div>
        <div style="text-align:right"><div style="font-size:11px;opacity:0.7">La tirisay</div><div style="font-weight:800">$${countedUSD.toFixed(2)}</div></div>
        <div style="text-align:right"><div style="font-size:11px;opacity:0.7">Nidaamka</div><div style="font-weight:800">$${systemCashUSD.toFixed(2)}</div></div>
      </div>` : ''}
      <div style="display:flex;gap:10px;margin-top:14px">
        <button class="btn btn-gold" id="btn-close-shift">Xir Shiftiga \u2713</button>
        <button class="btn btn-ghost" id="btn-reset-shift" style="color:#EFEAFB">Dib u bilow</button>
      </div>
    </div>

    <!-- STAFF CRUD MODAL -->
    ${(()=>{
      let staffModal = '';
      if (S.crudModal && S.crudModal.type === 'staff') {
        const isEdit = S.crudModal.mode === 'edit';
        const f = S.crudForm;
        staffModal = `
          <div class="crud-overlay">
            <div class="crud-modal">
              <div class="crud-modal-header">
                <h3>${isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
                <button class="crud-close-btn" id="btn-crud-close">\u00d7</button>
              </div>
              <div class="crud-modal-body">
                <div class="crud-grid-2">
                  <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="cf-name" value="${f.name||''}"/></div>
                  <div class="form-group"><label class="form-label">Role</label>
                    <select class="form-select" id="cf-role">
                      ${['Cashier','Senior Cashier','Store Manager','Admin'].map(r=>`<option ${(f.role||'Cashier')===r?'selected':''}>${r}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group"><label class="form-label">Store</label>
                    <select class="form-select" id="cf-store">
                      ${['Bakaara Main','Hodan Store','Wadajir Store','Hamar Weyne'].map(st=>`<option ${(f.store||'Bakaara Main')===st?'selected':''}>${st}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group"><label class="form-label">Shift</label>
                    <select class="form-select" id="cf-shift">
                      ${['Morning','Afternoon','Full day'].map(sh=>`<option ${(f.shift||'Morning')===sh?'selected':''}>${sh}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group"><label class="form-label">Status</label>
                    <select class="form-select" id="cf-status">
                      <option ${(f.status||'active')==='active'?'selected':''}>active</option>
                      <option ${f.status==='break'?'selected':''}>break</option>
                    </select>
                  </div>
                </div>
                ${S.crudForm._error ? `<div class="crud-error">${S.crudForm._error}</div>` : ''}
              </div>
              <div class="crud-modal-footer">
                <button class="btn btn-primary" id="btn-crud-save">${isEdit ? 'Save changes' : 'Add staff'}</button>
                <button class="btn btn-ghost" id="btn-crud-cancel" style="color:var(--text-secondary)">Cancel</button>
              </div>
            </div>
          </div>`;
      }
      if (S.confirmDeleteModal && S.confirmDeleteModal.type === 'staff') {
        const s = POS_STAFF.find(x=>x.id===S.confirmDeleteModal.id);
        staffModal += `
          <div class="crud-overlay">
            <div class="crud-confirm">
              <div class="crud-confirm-icon">\u26a0\ufe0f</div>
              <h3>Remove "${s?.name}"?</h3>
              <p>This will remove the staff member from the POS system.</p>
              <div class="crud-confirm-actions">
                <button class="btn btn-danger" id="btn-delete-confirm">Yes, remove</button>
                <button class="btn btn-outline" id="btn-delete-cancel">Cancel</button>
              </div>
            </div>
          </div>`;
      }
      return staffModal;
    })()
    }
    <div class="data-section">
      <div class="section-header-bar">
        <h3 class="chart-title">Shaqaalaha POS</h3>
        <div class="ml-auto">
          <button class="btn btn-primary btn-sm" id="btn-add-staff">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Staff
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>Magac</th><th>Username</th><th>Door</th><th>PIN</th><th>Dukaanka</th><th>Shift</th><th>Iibka maanta</th><th>Xaaladda</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${POS_STAFF.map(s=>`
              <tr>
                <td><div class="flex items-center gap-10"><div class="avatar avatar-sm">${initials(s.name)}</div><span style="font-weight:700">${s.name}</span></div></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${s.username||'—'}</td>
                <td><span class="role-tag ${s.role.includes('Admin')?'role-manager':s.role.includes('Manager')?'role-manager':s.role.includes('Senior')?'role-pharmacist':'role-cashier'}">${s.role}</span></td>
                <td><span class="pin-badge">${s.pin ? '●●●●' : '—'}</span></td>
                <td style="font-size:13px">${s.store}</td>
                <td style="font-size:12px;color:var(--text-muted)">${s.shift}</td>
                <td style="font-weight:700">$${s.sales}</td>
                <td><span class="pill ${s.status==='active'?'pill-green':'pill-amber'}">\u25cf ${s.status==='active'?'Shaqeeya':'Nasanaya'}</span></td>
                <td class="col-right">
                  <div class="crud-actions">
                    <button class="crud-btn crud-btn-edit" data-edit-staff="${s.id}" title="Edit">\u270f\ufe0f</button>
                    <button class="crud-btn crud-btn-delete" data-delete-staff="${s.id}" title="Remove">\ud83d\uddd1\ufe0f</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPOSSettings() {
  const s = S.storeSettings;
  const stores = ['Bakaara Main','Hodan Store','Wadajir Store','Hamar Weyne'];
  const savedBanner = S._settingsSaved
    ? `<div style="background:#DEF7EC;color:#0F7A3A;border:1px solid #86EFAC;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:16px">Settings saved.</div>`
    : '';

  return `
    <div style="max-width:600px">
      ${savedBanner}

      <div class="card" style="padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Store Settings</h3>
        <div class="flex-col gap-14">
          <div class="form-group">
            <label class="form-label">Store name</label>
            <input class="form-input" id="ss-store-name" value="${s.storeName}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Default currency</label>
            <input class="form-input" value="USD ($)" readonly style="background:var(--gray-50);color:var(--text-muted)"/>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">USD is the only supported currency for this deployment.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Tax rate (%)</label>
            <input class="form-input" id="ss-tax-rate" type="number" min="0" max="100" step="0.5" value="${s.taxRate}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Default store</label>
            <select class="form-select" id="ss-default-store">
              ${stores.map(st => `<option ${s.defaultStore===st?'selected':''}>${st}</option>`).join('')}
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-save-store-settings" style="align-self:flex-start">Save store settings</button>
        </div>
      </div>

      <div class="card" style="padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Receipt Settings</h3>
        <div class="flex-col gap-14">
          <div class="form-group">
            <label class="form-label">Receipt header</label>
            <input class="form-input" id="ss-receipt-header" value="${s.receiptHeader}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Footer message</label>
            <input class="form-input" id="ss-receipt-footer" value="${s.receiptFooter}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Show barcode on receipt</label>
            <select class="form-select" id="ss-receipt-barcode">
              <option value="yes" ${s.showBarcodeOnReceipt?'selected':''}>Yes</option>
              <option value="no"  ${!s.showBarcodeOnReceipt?'selected':''}>No</option>
            </select>
          </div>
          <button class="btn btn-primary btn-sm" id="btn-save-receipt-settings" style="align-self:flex-start">Save receipt settings</button>
        </div>
      </div>

      <div class="card" style="padding:24px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Payment Methods</h3>
        <div class="flex-col gap-14">
          ${Object.keys(s.payments).map(m => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
              <span style="font-weight:700">${m}</span>
              <label class="toggle">
                <input type="checkbox" data-payment-toggle="${m}" ${s.payments[m]?'checked':''}/>
                <span class="toggle-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// LOGIN EVENT HANDLER (separate from wirePOSEvents)
// ============================================================
function wirePOSLoginEvents() {
  // --- Staff mode: card selection ---
  document.querySelectorAll('[data-login-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      S._loginSelectedId = parseInt(btn.dataset.loginId);
      S.posLoginPin = '';
      S.posAuthError = '';
      render();
    });
  });

  // --- Staff mode: back to staff grid ---
  document.getElementById('btn-login-back')?.addEventListener('click', () => {
    S._loginSelectedId = null;
    S.posLoginPin = '';
    S.posAuthError = '';
    render();
  });

  // --- Open Admin sign-in mode ---
  document.getElementById('btn-open-admin-login')?.addEventListener('click', () => {
    S.posLoginMode = 'admin';
    S.posAuthError = '';
    S.posAdminEmail = '';
    render();
  });

  // --- Admin mode: back to staff grid ---
  document.getElementById('btn-admin-back')?.addEventListener('click', () => {
    S.posLoginMode = 'staff';
    S.posAuthError = '';
    render();
  });

  // --- Admin login form submit ---
  document.getElementById('pos-admin-login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('pos-admin-email').value.trim().toLowerCase();
    const pw = document.getElementById('pos-admin-pw').value;
    S.posAdminEmail = email;

    const admin = COMPANY_ADMINS.find(a => a.email.toLowerCase() === email);
    if (!admin) {
      S.posAuthError = 'No admin account found for that email.';
      render();
      return;
    }

    // 1) Matches saved POS password (already changed once) \u2192 sign in
    if (admin.posPassword && pw === admin.posPassword) {
      S.posActiveUser = { ...admin };
      S.currentCompany = admin.company;
      S.posLoginMode = 'staff';
      S.posAuthError = '';
      S.posAdminEmail = '';
      S.posTab = 'dash';
      render();
      return;
    }

    // 2) Matches temp password AND still requires change \u2192 force change
    if (admin.mustChangePosPassword && pw === admin.tempPassword) {
      S.posPendingAdmin = admin;
      S.posLoginMode = 'force-change';
      S.posAuthError = '';
      render();
      return;
    }

    // 3) Temp password used after already-changed \u2192 reject (temp only works once in POS)
    if (pw === admin.tempPassword && !admin.mustChangePosPassword) {
      S.posAuthError = 'Temporary password no longer works in POS. Use your new POS password.';
      render();
      return;
    }

    S.posAuthError = 'Incorrect password.';
    render();
  });

  // --- Force-change form submit ---
  document.getElementById('pos-force-change-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const np = document.getElementById('pos-new-pw').value;
    const cp = document.getElementById('pos-confirm-pw').value;
    if (np.length < 8) {
      S.posAuthError = 'Password must be at least 8 characters.';
      render();
      return;
    }
    if (np !== cp) {
      S.posAuthError = 'Passwords do not match.';
      render();
      return;
    }
    const admin = S.posPendingAdmin;
    admin.posPassword = np;
    admin.mustChangePosPassword = false;
    S.posActiveUser = { ...admin };
    S.currentCompany = admin.company;
    S.posPendingAdmin = null;
    S.posLoginMode = 'staff';
    S.posAuthError = '';
    S.posTab = 'dash';
    render();
  });

  // --- Numpad (staff mode) ---
  document.querySelectorAll('.numpad-key:not(.numpad-key-empty)').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.key;
      if (k === '\u232b') {
        S.posLoginPin = (S.posLoginPin || '').slice(0, -1);
        S.posAuthError = '';
        render();
        return;
      }
      if ((S.posLoginPin || '').length >= 4) return;
      S.posLoginPin = (S.posLoginPin || '') + k;
      if (S.posLoginPin.length === 4) {
        const staff = POS_STAFF.find(s => s.id === S._loginSelectedId);
        if (staff && String(staff.pin) === S.posLoginPin) {
          S.posActiveUser = { ...staff };
          S.posLoginPin = '';
          S._loginSelectedId = null;
          S.posAuthError = '';
          S.posTab = 'dash';
          render();
        } else {
          S.posAuthError = 'PIN is incorrect. Please try again.';
          S.posLoginPin = '';
          render();
        }
      } else {
        render();
      }
    });
  });
}

function wirePOSEvents() {
  // ---- CRUD: Products ----
  document.getElementById('btn-add-product')?.addEventListener('click', () => {
    S.crudModal = { type:'product', mode:'add', id:null };
    S.crudForm = {};
    render();
  });
  document.querySelectorAll('[data-edit-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = POS_PRODUCTS.find(x=>x.id===parseInt(btn.dataset.editProduct));
      if (!p) return;
      S.crudModal = { type:'product', mode:'edit', id:p.id };
      S.crudForm = { name:p.name, cat:p.cat, price:p.price, wholesalePrice:p.wholesalePrice, stock:p.stock, barcode:p.barcode };
      render();
    });
  });
  document.querySelectorAll('[data-delete-product]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.confirmDeleteModal = { type:'product', id:parseInt(btn.dataset.deleteProduct) };
      render();
    });
  });

  // ---- CRUD: Customers ----
  document.getElementById('btn-add-customer')?.addEventListener('click', () => {
    S.crudModal = { type:'customer', mode:'add', id:null };
    S.crudForm = {};
    render();
  });
  document.querySelectorAll('[data-edit-customer]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = POS_CUSTOMERS.find(x=>x.id===parseInt(btn.dataset.editCustomer));
      if (!c) return;
      S.crudModal = { type:'customer', mode:'edit', id:c.id };
      S.crudForm = { name:c.name, phone:c.phone, tier:c.tier, creditLimit:c.creditLimit };
      render();
    });
  });
  document.querySelectorAll('[data-delete-customer]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.confirmDeleteModal = { type:'customer', id:parseInt(btn.dataset.deleteCustomer) };
      render();
    });
  });

  // ---- CRUD: Staff ----
  document.getElementById('btn-add-staff')?.addEventListener('click', () => {
    S.crudModal = { type:'staff', mode:'add', id:null };
    S.crudForm = {};
    render();
  });
  document.querySelectorAll('[data-edit-staff]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = POS_STAFF.find(x=>x.id===parseInt(btn.dataset.editStaff));
      if (!s) return;
      S.crudModal = { type:'staff', mode:'edit', id:s.id };
      S.crudForm = { name:s.name, role:s.role, store:s.store, shift:s.shift, status:s.status };
      render();
    });
  });
  document.querySelectorAll('[data-delete-staff]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.confirmDeleteModal = { type:'staff', id:parseInt(btn.dataset.deleteStaff) };
      render();
    });
  });

  // ---- Transactions: View + Delete ----
  document.querySelectorAll('[data-view-txn]').forEach(row => {
    row.addEventListener('click', () => {
      S.viewModal = { type:'transaction', id:row.dataset.viewTxn };
      render();
    });
  });
  document.querySelectorAll('[data-view-txn-btn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.viewModal = { type:'transaction', id:btn.dataset.viewTxnBtn };
      render();
    });
  });
  document.querySelectorAll('[data-delete-txn]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.confirmDeleteModal = { type:'transaction', id:btn.dataset.deleteTxn };
      render();
    });
  });

  // ---- Shared modal close/cancel ----
  document.getElementById('btn-crud-close')?.addEventListener('click', () => { S.crudModal=null; S.crudForm={}; render(); });
  document.getElementById('btn-crud-cancel')?.addEventListener('click', () => { S.crudModal=null; S.crudForm={}; render(); });
  document.getElementById('btn-view-close')?.addEventListener('click', () => { S.viewModal=null; render(); });
  document.getElementById('btn-delete-cancel')?.addEventListener('click', () => { S.confirmDeleteModal=null; render(); });

  // ---- Shared SAVE ----
  document.getElementById('btn-crud-save')?.addEventListener('click', () => {
    if (!S.crudModal) return;
    const f = {};
    // Collect form values
    ['name','phone','cat','role','store','shift','status','tier'].forEach(id => {
      const el = document.getElementById('cf-'+id);
      if (el) f[id] = el.value.trim();
    });
    ['price','wholesalePrice','stock','creditLimit'].forEach(id => {
      const el = document.getElementById('cf-'+id);
      if (el) f[id] = parseFloat(el.value)||0;
    });
    ['barcode'].forEach(id => {
      const el = document.getElementById('cf-'+id);
      if (el) f[id] = el.value.trim();
    });

    const { type, mode, id } = S.crudModal;

    if (type === 'product') {
      if (!f.name) { S.crudForm._error='Product name is required.'; render(); return; }
      if (f.price<=0) { S.crudForm._error='Price must be greater than 0.'; render(); return; }
      if (mode === 'add') {
        POS_PRODUCTS.push({ id: Date.now(), name:f.name, cat:f.cat||'Groceries', price:f.price, wholesalePrice:f.wholesalePrice||f.price*6, stock:f.stock||0, barcode:f.barcode||'' });
      } else {
        const p = POS_PRODUCTS.find(x=>x.id===id);
        if (p) Object.assign(p, { name:f.name, cat:f.cat, price:f.price, wholesalePrice:f.wholesalePrice, stock:f.stock, barcode:f.barcode });
      }
    } else if (type === 'customer') {
      if (!f.name) { S.crudForm._error='Customer name is required.'; render(); return; }
      if (!f.phone) { S.crudForm._error='Phone number is required.'; render(); return; }
      if (mode === 'add') {
        POS_CUSTOMERS.push({ id:Date.now(), name:f.name, phone:f.phone, tier:f.tier||'Bronze', creditLimit:f.creditLimit||100, debtBalance:0, points:0, visits:0, lastVisit:'—' });
      } else {
        const c = POS_CUSTOMERS.find(x=>x.id===id);
        if (c) Object.assign(c, { name:f.name, phone:f.phone, tier:f.tier, creditLimit:f.creditLimit });
      }
    } else if (type === 'staff') {
      if (!f.name) { S.crudForm._error='Staff name is required.'; render(); return; }
      if (mode === 'add') {
        POS_STAFF.push({ id:Date.now(), name:f.name, role:f.role||'Cashier', store:f.store||'Bakaara Main', shift:f.shift||'Morning', sales:0, status:f.status||'active' });
      } else {
        const s = POS_STAFF.find(x=>x.id===id);
        if (s) Object.assign(s, { name:f.name, role:f.role, store:f.store, shift:f.shift, status:f.status });
      }
    }
    S.crudModal = null; S.crudForm = {};
    render();
  });

  // ---- Shared DELETE CONFIRM ----
  document.getElementById('btn-delete-confirm')?.addEventListener('click', () => {
    if (!S.confirmDeleteModal) return;
    const { type, id } = S.confirmDeleteModal;
    if (type === 'product') {
      const i = POS_PRODUCTS.findIndex(x=>x.id===id);
      if (i!==-1) POS_PRODUCTS.splice(i,1);
    } else if (type === 'customer') {
      const i = POS_CUSTOMERS.findIndex(x=>x.id===id);
      if (i!==-1) POS_CUSTOMERS.splice(i,1);
    } else if (type === 'staff') {
      const i = POS_STAFF.findIndex(x=>x.id===id);
      if (i!==-1) POS_STAFF.splice(i,1);
    } else if (type === 'transaction') {
      const i = POS_TRANSACTIONS.findIndex(x=>x.id===id);
      if (i!==-1) POS_TRANSACTIONS.splice(i,1);
    }
    S.confirmDeleteModal = null;
    render();
  });

  // ---- Deyn: collect ----
  document.querySelectorAll('[data-collect-deyn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = POS_CUSTOMERS.find(x=>x.id===parseInt(btn.dataset.collectDeyn));
      if (c && c.debtBalance > 0) { c.debtBalance = 0; render(); }
    });
  });

  // ---- POS Settings tab ----
  // Store settings save
  const btnSaveStore = document.getElementById('btn-save-store-settings');
  if (btnSaveStore) btnSaveStore.addEventListener('click', () => {
    const name = document.getElementById('ss-store-name').value.trim();
    if (!name) { alert('Store name is required.'); return; }
    S.storeSettings.storeName    = name;
    S.storeSettings.taxRate      = parseFloat(document.getElementById('ss-tax-rate').value) || 0;
    S.storeSettings.defaultStore = document.getElementById('ss-default-store').value;
    S.currentStore               = S.storeSettings.defaultStore + ' Store';
    S._settingsSaved = true;
    render();
    setTimeout(() => { S._settingsSaved = false; render(); }, 2500);
  });
  const btnSaveReceipt = document.getElementById('btn-save-receipt-settings');
  if (btnSaveReceipt) btnSaveReceipt.addEventListener('click', () => {
    S.storeSettings.receiptHeader        = document.getElementById('ss-receipt-header').value;
    S.storeSettings.receiptFooter        = document.getElementById('ss-receipt-footer').value;
    S.storeSettings.showBarcodeOnReceipt = document.getElementById('ss-receipt-barcode').value === 'yes';
    S._settingsSaved = true;
    render();
    setTimeout(() => { S._settingsSaved = false; render(); }, 2500);
  });
  document.querySelectorAll('[data-payment-toggle]').forEach(cb => {
    cb.addEventListener('change', () => {
      S.storeSettings.payments[cb.dataset.paymentToggle] = cb.checked;
    });
  });

  // Shift reconciliation
  const shiftCashierSel = document.getElementById('shift-cashier-sel');
  if (shiftCashierSel) shiftCashierSel.addEventListener('change', () => { S.shiftCashier = parseInt(shiftCashierSel.value)||null; render(); });
  const shiftUSD = document.getElementById('shift-usd');
  if (shiftUSD) shiftUSD.addEventListener('input', () => { S.shiftCountedUSD = shiftUSD.value; render(); });
  const closeShiftBtn = document.getElementById('btn-close-shift');
  if (closeShiftBtn) closeShiftBtn.addEventListener('click', () => {
    alert('Shiftiga waa la xiray! \u2713 Waraaqda waa la daabacay.');
    S.shiftCountedUSD=''; S.shiftCashier=null;
    render();
  });
  const resetShiftBtn = document.getElementById('btn-reset-shift');
  if (resetShiftBtn) resetShiftBtn.addEventListener('click', () => { S.shiftCountedUSD=''; render(); });

  if (S.posTab === 'checkout') {
    const searchInput = document.getElementById('pos-search');
    if (searchInput) { searchInput.addEventListener('input', e => { S.posSearchTerm = e.target.value; render(); }); searchInput.focus(); }

    document.querySelectorAll('[data-add-product]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.addProduct);
        const prod = POS_PRODUCTS.find(p=>p.id===id);
        if (!prod) return;
        const existing = S.posCart.find(item=>item.id===id);
        if (existing) { existing.qty++; }
        else { S.posCart.push({ id:prod.id, name:prod.name, price:prod.price, wholesalePrice:prod.wholesalePrice, qty:1, isWholesale:false }); }
        render();
      });
    });

    document.querySelectorAll('.pos-wholesale-cb').forEach(cb => {
      cb.addEventListener('change', () => { S.posCart[parseInt(cb.dataset.cartIdx)].isWholesale = cb.checked; render(); });
    });

    document.querySelectorAll('[data-qty-plus]').forEach(btn => {
      btn.addEventListener('click', () => { S.posCart[parseInt(btn.dataset.qtyPlus)].qty++; render(); });
    });
    document.querySelectorAll('[data-qty-minus]').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.qtyMinus);
        if (S.posCart[i].qty > 1) S.posCart[i].qty--;
        else S.posCart.splice(i, 1);
        render();
      });
    });
    document.querySelectorAll('[data-remove-item]').forEach(btn => {
      btn.addEventListener('click', () => { S.posCart.splice(parseInt(btn.dataset.removeItem), 1); render(); });
    });
    document.querySelectorAll('[data-pos-cat]').forEach(btn => {
      btn.addEventListener('click', () => { S.posSearchTerm = btn.dataset.posCat==='All'?'':btn.dataset.posCat; render(); });
    });
    document.querySelectorAll('[data-pay-method]').forEach(btn => {
      btn.addEventListener('click', () => { S.posPaymentMethod=btn.dataset.payMethod; S.posDebtCustomerId=null; render(); });
    });
    const deynSel = document.getElementById('pos-deyn-customer');
    if (deynSel) deynSel.addEventListener('change', () => { S.posDebtCustomerId=parseInt(deynSel.value)||null; render(); });

    const chargeBtn = document.getElementById('btn-pos-charge');
    if (chargeBtn) {
      chargeBtn.addEventListener('click', () => {
        if (S.posCart.length===0) return;
        if (['evc','edahab','zaad'].includes(S.posPaymentMethod)) {
          S.posMobileMoneyModal=true; S.mobilePhone=''; S.mobileTxId=''; S.mobileError='';
          render(); return;
        }
        finalizeCharge();
      });
    }
    const clearBtn = document.getElementById('btn-pos-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => { S.posCart=[]; render(); });
  }

  if (S.posMobileMoneyModal) {
    const phoneInput = document.getElementById('mm-phone');
    const txInput = document.getElementById('mm-txid');
    if (phoneInput) phoneInput.addEventListener('input', () => { S.mobilePhone=phoneInput.value; });
    if (txInput) txInput.addEventListener('input', () => { S.mobileTxId=txInput.value; });
    const confirmBtn = document.getElementById('btn-mm-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const phone=(S.mobilePhone||'').trim();
        const txid=(S.mobileTxId||'').trim();
        if (!/^[\d\s\-+]{7,}$/.test(phone)) { S.mobileError='Geli lambarka telefoonka saxda ah.'; render(); return; }
        if (!/^\d{4,8}$/.test(txid)) { S.mobileError='Transaction ID waa inuu noqdaa 4\u20138 lambar.'; render(); return; }
        S.posMobileMoneyModal=false;
        finalizeCharge();
      });
    }
    const cancelBtn = document.getElementById('btn-mm-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { S.posMobileMoneyModal=false; render(); });
  }

  if (S.posReceiptVisible) {
    const newBtn = document.getElementById('btn-receipt-new');
    if (newBtn) newBtn.addEventListener('click', () => { S.posReceiptVisible=false; S.posCart=[]; render(); });
    const printBtn = document.getElementById('btn-receipt-print');
    if (printBtn) printBtn.addEventListener('click', () => { window.print(); });
  }

  // ---- Cashier shift toggle ----
  const shiftToggle = document.getElementById('btn-shift-toggle');
  if (shiftToggle) {
    shiftToggle.addEventListener('click', () => {
      if (S.posShiftActive) {
        S.posShiftActive = false;
        S.posShiftStart = null;
      } else {
        S.posShiftActive = true;
        S.posShiftStart = new Date();
      }
      render();
    });
  }

  // ---- Staff credential creation ----
  const scfName = document.getElementById('scf-name');
  if (scfName) {
    scfName.addEventListener('input', () => {
      if (!S._staffCredForm) S._staffCredForm = {};
      S._staffCredForm.name = scfName.value;
      if (scfName.value.trim() && !S._staffCredForm.generatedPin) {
        S._staffCredForm.generatedPin = String(Math.floor(1000 + Math.random() * 9000));
      }
      render();
    });
  }
  const scfRole = document.getElementById('scf-role');
  if (scfRole) scfRole.addEventListener('change', () => { if (!S._staffCredForm) S._staffCredForm = {}; S._staffCredForm.role = scfRole.value; });
  const scfStore = document.getElementById('scf-store');
  if (scfStore) scfStore.addEventListener('change', () => { if (!S._staffCredForm) S._staffCredForm = {}; S._staffCredForm.store = scfStore.value; });
  const scfShift = document.getElementById('scf-shift');
  if (scfShift) scfShift.addEventListener('change', () => { if (!S._staffCredForm) S._staffCredForm = {}; S._staffCredForm.shift = scfShift.value; });

  const regenPin = document.getElementById('btn-regen-pin');
  if (regenPin) {
    regenPin.addEventListener('click', () => {
      if (!S._staffCredForm) S._staffCredForm = {};
      S._staffCredForm.generatedPin = String(Math.floor(1000 + Math.random() * 9000));
      render();
    });
  }

  const createCredBtn = document.getElementById('btn-create-staff-cred');
  if (createCredBtn) {
    createCredBtn.addEventListener('click', () => {
      const cf = S._staffCredForm || {};
      const name = (cf.name || '').trim();
      if (!name) { S._staffCredForm = cf; cf._error = 'Full name is required.'; render(); return; }
      const parts = name.split(/\s+/);
      const username = (parts[0] || '').toLowerCase() + '.' + (parts[1] ? parts[1][0].toLowerCase() : '');
      const pin = cf.generatedPin || String(Math.floor(1000 + Math.random() * 9000));
      const role = cf.role || 'Cashier';
      const access = POS_ROLES[role] || POS_ROLES['Cashier'];
      POS_STAFF.push({
        id: Date.now(), name, username, pin, role,
        store: cf.store || 'Bakaara Main', shift: cf.shift || 'Morning',
        sales: 0, status: 'active', access: [...access]
      });
      S._staffCredForm = {};
      render();
    });
  }

  const clearCredBtn = document.getElementById('btn-clear-staff-cred');
  if (clearCredBtn) {
    clearCredBtn.addEventListener('click', () => { S._staffCredForm = {}; render(); });
  }
}

function finalizeCharge() {
  const subtotal = S.posCart.reduce((s,item)=>{ const p=item.isWholesale?item.wholesalePrice:item.price; return s+p*item.qty; }, 0);
  const tax = subtotal * 0.05;
  const total = subtotal + tax;
  const methodLabels = {cash:'Cash',evc:'EVC Plus',edahab:'eDahab',zaad:'Zaad',sahal:'Sahal',deyn:'Deyn (Credit)'};
  if (S.posPaymentMethod==='deyn' && S.posDebtCustomerId) {
    const cust = POS_CUSTOMERS.find(c=>c.id===S.posDebtCustomerId);
    if (cust) cust.debtBalance = Math.round((cust.debtBalance+total)*100)/100;
  }
  if (S.isOffline) S.syncQueue++;
  S.posLastReceipt = { id:'TXN-'+(4821+Math.floor(Math.random()*100)), date:new Date().toLocaleString(), items:[...S.posCart], subtotal, tax, total, method:methodLabels[S.posPaymentMethod]||'Cash', mobilePhone:S.mobilePhone||null, mobileTxId:S.mobileTxId||null };
  S.posReceiptVisible=true; S.posCart=[]; S.posMobileMoneyModal=false;
  render();
}

function posIcon(type) {
  const icons = {
    dash:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
    checkout:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18l-2 12H5L3 3z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>`,
    products:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3v4M8 3v4"/></svg>`,
    customers:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.5-6 7-6s7 2 7 6"/><path d="M16 3c2 0 4 1 4 3s-2 3-4 3"/></svg>`,
    transactions: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></svg>`,
    staff:        `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>`,
  };
  return icons[type] || icons.dash;
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
