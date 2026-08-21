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

// Each tenant carries its Company Admin identity: adminEmail (the address
// used both for sign-in and for reset-password emails), adminStatus,
// lastSignInAt (ISO string or null if never), and pendingReset (populated
// when the Super Admin generates a reset token from the Admins table).
// Only companies that are actually registered on the Curdun platform.
// Add real entries here as new customers are onboarded.
const SEED_TENANTS = [
  { id:'TN-0042', name:'Shifo Retail Group', city:'Mogadishu', owner:'Ahmed Yusuf', since:'Aug 2026', plan:'Business', users:18, invoice:'1,100', region:'SO-MG-1', adminEmail:'admin@shifo.so', adminStatus:'active', lastSignInAt:'2026-08-10T14:22:00', pendingReset:null },
];

const SEED_LICENSES = {
  // Only Retail POS is live — only pos:true for registered companies.
  'TN-0042': { pharmacy:false, financials:false, crm:false, hr:false, pos:true, university:false, hotel:false, hospital:false },
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
  view: new URLSearchParams(window.location.search).get('reset') ? 'passwordreset' : 'login',
  superTab: 'overview',    // overview | companies | admins | platform | modules | infra | billing | audit

  // Super Admin Overview interactivity
  overviewRange:      '30d',    // '30d' | 'quarter' | 'year' — time-range selector
  platformSearch:     '',       // header search box query
  platformNotifOpen:  false,    // notification bell dropdown

  // Company Admins page — reset-password flow modal
  //   step 'confirm' → shows admin details and delivery options
  //   step 'sent'    → shows the generated reset token + copy-paste link
  resetAdminModal: null,   // { tenantId, step, sendEmail, sendSMS, token, link }
  companyAdminStatus: 'all',
  companyAdminModal: null, // { type:'edit'|'assign', tenantId, error? }
  platformAdminQuery: '',
  platformAdminStatus: 'all',
  platformAdminModal: null, // { type:'edit'|'reset'|'remove', id, step?, token?, link? }
  platformAdminError: '',

  // Platform alerts — real state, editable. Icon/tone/desc drive rendering.
  platformAlerts: [
    { id:'a1', severity:'high',   module:'HR & Payroll',    subject:'Kismayo Hospital', desc:'Security patch pending', when:'3h ago',  status:'open' },
    { id:'a2', severity:'medium', module:'Retail POS v3.0', subject:'Rollout pending',  desc:'44 tenants awaiting upgrade', when:'today',  status:'open' },
    { id:'a3', severity:'info',   module:'Billing',         subject:'Invoice overdue',  desc:'$320 · 25 days late', when:'25d',    status:'open' },
  ],
  pharmTab: 'dash',        // dash | sales | inventory | rx | users | branches | settings
  posTab: 'dash',          // dash | checkout | products | customers | transactions | staff | settings

  // Odoo-style POS architecture state
  posView: 'selector',      // 'selector' | 'backoffice' | 'session'
  posStoreType: null,       // null | 'retail' | 'bakery' | 'clothes' | 'furniture' | 'restaurant' | 'electronics'
  posBackofficeTab: 'dashboard', // dashboard | orders | sessions | payments | customers | products | categories | combos | reports-orders | reports-sales | reports-session | reports-stock | config-settings | config-payments | config-staff | config-currencies
  posNavDropdown: null,     // null | 'orders' | 'products' | 'reporting' | 'configuration'

  // Auth
  loginEmail: '', loginPassword: '', loginError: false,
  recoveryModal: false, recoveryMode: 'email', recoveryEmail: '', recoveryOtp: '', recoveryMessage: '', recoveryError: '',
  resetToken: new URLSearchParams(window.location.search).get('reset') || '',
  resetPassword: '', resetPasswordConfirm: '', resetPasswordError: '',

  // Active identities after sign-in (mutually exclusive)
  activeSuperAdmin:   null,   // set when a Platform Super Admin signs in
  activeCompanyAdmin: null,   // set when a Company Admin signs in to the workspace
  pwUser:             null,   // pending user during first-login password change

  // Retail POS store settings — editable from POS → Settings tab.
  // Loaded from and saved to the tenant-scoped POS settings API.
  storeSettings: {
    storeName:       'Shifo Retail Group',
    taxRate:         5,
    defaultStore:    'Bakaara Main',
    receiptHeader:   'SHIFO RETAIL GROUP',
    receiptFooter:   'Thank you for shopping at Shifo!',
    showBarcodeOnReceipt: true,
    cashControl: true,
    openingControl: true,
    maximumDifference: 20,
    payments:        { Cash: true, 'EVC Plus': true, eDahab: true, ZAAD: true, Sahal: true, Deyn: true },
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
  // Legacy single-method state kept only for the "add-line" click handler that
  // consults it as a UI hint. Financial source of truth is posPaymentLines.
  posPaymentMethod: 'cash',
  // Odoo-style split-payment lines. Each entry:
  //   { method_name, method_type: 'cash'|'mobile'|'credit', amount, tendered?, reference? }
  // The backend independently validates and re-derives change from tendered.
  posPaymentLines: [],
  posReceiptVisible: false,
  posLastReceipt: null,
  posCustomerFilter: '',

  // POS — dual currency
  exchangeRate: 11800,
  primaryCurrency: 'USD',

  // POS — CRUD modals
  crudModal: null,       // null | { type:'product'|'customer'|'staff', mode:'add'|'edit', id:null|number }
  crudForm: {},          // live form field values
  staffCredentialResult: null, // one-time staff email/password/PIN confirmation
  viewModal: null,       // { type:'transaction', id:string } — for read detail
  confirmDeleteModal: null, // { type:'product'|'customer'|'staff'|'transaction', id:any }

  // POS — mobile money modal
  posMobileMoneyModal: false,
  mobilePhone: '',
  mobileTxId: '',
  mobileError: '',

  // POS — debt (Buugga Deynta)
  posDebtCustomerId: null,

  // POS — management reports and stock notifications
  posReportFrom: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  posReportTo: new Date().toISOString().slice(0, 10),
  posReportSection: 'sales',
  posReportData: null,
  posReportLoading: false,
  posReportError: '',
  posStockAlerts: [],

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
  posConfig: null,
  posSession: null,
  posSessionSummary: null,
  posSessions: [],

  // Register control modal (replaces browser prompt() calls) — Odoo-style flow.
  //   { mode: 'open' | 'close' | 'cash-in' | 'cash-out' | 'closed-summary',
  //     amount, note, counted, managerPin, error, result }
  posRegisterModal: null,
  posCashTendered: '',       // USD amount entered by cashier for cash payment
  posHeldOrders: [],         // [{ id, cashier, items, customer, ts }]
  posShowHeld: false,        // toggle held orders panel
  posPayments: [],
  posPendingOrderId: null,

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
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));

function copyInputValue(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.select();
  const fallback = () => { try { document.execCommand('copy'); } catch (_) {} };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(input.value).catch(fallback);
  else fallback();
  if (button) {
    const label = button.textContent;
    button.textContent = '✓ Copied';
    setTimeout(() => { if (button.isConnected) button.textContent = label; }, 1500);
  }
}

function initials(name) {
  return (name||'').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
}

/**
 * Single source of truth for POS stock status.
 * Every screen — KPI cards, product table, checkout tile, notifications —
 * must call these helpers so numbers can never contradict each other.
 *
 * A product is:
 *   OUT of stock  when stock <= 0
 *   LOW  in stock when stock > 0 AND stock <= minimum_stock (default min = 5)
 *   OK   otherwise
 *
 * The backend uses `current_stock <= minimum_stock` in
 * ProductRepository::getLowStockProducts and DashboardService — matches.
 */
function posStockThreshold(product) {
  const raw = product?.minimumStock ?? product?.minimum_stock ?? 5;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}
function posIsOutOfStock(product) {
  return Number(product?.stock ?? product?.current_stock ?? 0) <= 0;
}
function posIsLowStock(product) {
  const stock = Number(product?.stock ?? product?.current_stock ?? 0);
  return stock > 0 && stock <= posStockThreshold(product);
}
function posStockStatus(product) {
  if (posIsOutOfStock(product)) return 'OUT_OF_STOCK';
  if (posIsLowStock(product))   return 'LOW';
  return 'OK';
}
function posCountLowStock() {
  return POS_PRODUCTS.filter(p => posIsLowStock(p) || posIsOutOfStock(p)).length;
}

/**
 * Small fetch wrapper for the /api/v1/* backend.
 * - Always sends/receives JSON.
 * - Includes credentials so the PHPSESSID cookie authenticates the request.
 * - Throws an Error with the server's message + attaches .status on failure,
 *   so callers can show a real error to the user.
 * Usage:
 *   await api('/companies', { method:'POST', body:{ name, city } });
 */
async function api(path, opts = {}) {
  const url = path.startsWith('http') ? path : `/api/v1${path}`;
  let res;
  try {
    res = await fetch(url, {
      method:      opts.method || 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
  } catch (_) {
    const locationHint = location.protocol === 'file:'
      ? ' Open the application from http://127.0.0.1:8000/app.html, not as a local file.'
      : ' Confirm the Curdun PHP server is running, then refresh this page.';
    throw new Error(`The backend server is unavailable.${locationHint}`);
  }
  let payload = null;
  try { payload = await res.json(); } catch (_) {}
  if (!res.ok || (payload && payload.success === false)) {
    const msg = (payload && payload.message) || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
}

/**
 * "Today, 14:22" | "Yesterday" | "3 days ago" | "Never" (when null).
 * Not locale-perfect — enough for the Admins table.
 */
function formatRelativeTime(iso) {
  if (!iso) return 'Never';
  const then = new Date(iso);
  if (isNaN(then)) return String(iso);
  const now  = new Date();
  const startOfToday     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate()-1);
  const hh = String(then.getHours()).padStart(2,'0');
  const mm = String(then.getMinutes()).padStart(2,'0');
  if (then >= startOfToday)     return `Today, ${hh}:${mm}`;
  if (then >= startOfYesterday) return 'Yesterday';
  const days = Math.floor((startOfToday - then) / (24*3600*1000));
  return `${days} day${days===1?'':'s'} ago`;
}

/**
 * Wrap a password input with a show/hide eye toggle.
 * Pass the same attributes you'd put on a <input type="password"> — id,
 * placeholder, value, class, autocomplete, style, required.
 * The toggle is wired globally by the delegated listener in wirePasswordToggles().
 */
function pwField(attrs = {}) {
  const {
    id = '',
    placeholder = '',
    value = '',
    className = 'form-input',
    autocomplete = 'current-password',
    style = '',
    required = false,
  } = attrs;
  const eyeOpen = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  return `
    <div class="pw-field">
      <input type="password" id="${id}" class="${className}" placeholder="${placeholder}" value="${value}" autocomplete="${autocomplete}" ${required?'required':''} ${style?`style="${style}"`:''}/>
      <button type="button" class="pw-toggle" data-pw-toggle="${id}" aria-label="Show password" tabindex="-1">
        ${eyeOpen}
      </button>
    </div>
  `;
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
    case 'passwordreset': root.appendChild(renderPasswordReset()); break;
    case 'firstlogin': root.appendChild(renderFirstLogin()); break;
    case 'super':      root.appendChild(renderSuper());     break;
    case 'workspace':  root.appendChild(renderWorkspace()); break;
    case 'pharmacy':   root.appendChild(renderPharmacy());  break;
    case 'pos':        root.appendChild(renderPOS());       break;
  }

  // Modal HTML is composed inside each feature view so its event handlers stay
  // close to that feature. Move the finished overlay to the application root
  // after wiring; otherwise an animated content container's transform makes a
  // position:fixed modal start after the sidebar and overflow the viewport.
  setTimeout(() => {
    root.querySelectorAll('.crud-overlay').forEach(overlay => {
      if (overlay.parentElement !== root) root.appendChild(overlay);
    });
  }, 0);
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
          <button type="button" id="btn-forgot-help" style="font-size:12px;font-weight:700;color:var(--purple-800);background:none;border:0;cursor:pointer">Forgot?</button>
        </div>
        ${pwField({ id:'login-pw', className:'form-input mono', placeholder:'••••••••', style:'letter-spacing:2px' })}
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
    ${renderRecoveryModal()}
  `;

  div.querySelector('#btn-signin').addEventListener('click', doSignIn);
  div.querySelector('#btn-forgot-help').addEventListener('click', () => {
    S.recoveryModal = true; S.recoveryEmail = S.loginEmail || ''; S.recoveryMessage = ''; S.recoveryError = ''; render();
  });
  div.querySelectorAll('[data-recovery-close]').forEach(element => element.addEventListener('click', event => {
    if (event.target === element) { S.recoveryModal = false; render(); }
  }));
  div.querySelectorAll('[data-recovery-mode]').forEach(button => button.addEventListener('click', () => {
    S.recoveryMode = button.dataset.recoveryMode; S.recoveryMessage = ''; S.recoveryError = ''; render();
  }));
  div.querySelector('#recovery-email')?.addEventListener('input', event => { S.recoveryEmail = event.target.value; });
  div.querySelector('#recovery-otp')?.addEventListener('input', event => { S.recoveryOtp = event.target.value.replace(/\D/g,'').slice(0,6); });
  div.querySelector('#btn-recovery-submit')?.addEventListener('click', async event => {
    const email = (S.recoveryEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { S.recoveryError='Enter a valid account email.'; render(); return; }
    event.currentTarget.disabled=true; event.currentTarget.textContent=S.recoveryMode==='sms'?'Verifying…':'Sending…';
    try {
      if (S.recoveryMode === 'sms') {
        if (!/^\d{6}$/.test(S.recoveryOtp)) throw new Error('Enter the 6-digit OTP sent to your phone.');
        const result = await api('/auth/verify-reset-otp',{method:'POST',body:{email,otp:S.recoveryOtp}});
        S.resetToken=result.token; S.resetPassword=''; S.resetPasswordConfirm=''; S.recoveryModal=false; S.view='passwordreset'; render();
      } else {
        await api('/auth/forgot-password',{method:'POST',body:{email}});
        S.recoveryMessage='If this account exists, a secure reset link has been sent to its email address.'; S.recoveryError=''; render();
      }
    } catch (error) { S.recoveryError=error.message; render(); }
  });
  div.querySelector('#login-email').addEventListener('input', e => { S.loginEmail = e.target.value; S.loginError = false; });
  div.querySelector('#login-pw').addEventListener('input', () => {
    if (S.loginError) { S.loginError = false; document.querySelector('.form-error')?.remove(); }
  });
  div.querySelector('#login-pw').addEventListener('keydown', e => { if(e.key==='Enter') doSignIn(); });

  return div;
}

function renderRecoveryModal() {
  if (!S.recoveryModal) return '';
  return `<div class="crud-overlay" data-recovery-close>
    <div class="crud-modal" style="max-width:500px" onclick="event.stopPropagation()">
      <div class="crud-modal-header"><h3>Recover your account</h3><button class="crud-close-btn" data-recovery-close>×</button></div>
      <div class="crud-modal-body">
        <div class="filter-pills" style="margin-bottom:18px">
          <button class="filter-pill ${S.recoveryMode==='email'?'active':''}" data-recovery-mode="email">Email reset link</button>
          <button class="filter-pill ${S.recoveryMode==='sms'?'active':''}" data-recovery-mode="sms">Use SMS OTP</button>
        </div>
        <div class="form-group"><label class="form-label">Account email</label><input class="form-input" id="recovery-email" type="email" value="${esc(S.recoveryEmail || '')}" placeholder="admin@company.so"/></div>
        ${S.recoveryMode==='sms' ? `<div class="form-group"><label class="form-label">6-digit OTP</label><input class="form-input mono" id="recovery-otp" inputmode="numeric" maxlength="6" value="${esc(S.recoveryOtp || '')}" placeholder="000000" style="letter-spacing:5px;font-size:18px"/><div class="cred-hint">Use the OTP sent by Curdun after your Company Admin reset was requested.</div></div>` : `<div style="font-size:12px;color:var(--text-muted);line-height:1.55">We will send a one-time link to the registered email. For security, we never reveal whether an email is registered.</div>`}
        ${S.recoveryMessage ? `<div style="margin-top:14px;padding:11px;border-radius:9px;background:#ECFDF3;color:#166534;font-size:12px">${esc(S.recoveryMessage)}</div>` : ''}
        ${S.recoveryError ? `<div style="margin-top:14px;padding:11px;border-radius:9px;background:#FEE4E2;color:#B42318;font-size:12px">${esc(S.recoveryError)}</div>` : ''}
      </div>
      <div class="crud-modal-footer"><button class="btn btn-ghost" data-recovery-close>Cancel</button><button class="btn btn-primary" id="btn-recovery-submit">${S.recoveryMode==='sms'?'Verify OTP':'Send reset link'}</button></div>
    </div>
  </div>`;
}

function renderPasswordReset() {
  const div = document.createElement('div');
  div.className = 'first-login-bg';
  div.innerHTML = `
    <div class="first-login-box" style="max-width:520px">
      <div class="first-login-header">
        <div class="icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div>
        <div><div class="eyebrow">Curdun account recovery</div><h2>Set a new password</h2></div>
      </div>
      <div class="first-login-body">
        <div class="first-login-info">This one-time link expires after 60 minutes and cannot be reused.</div>
        <div class="flex-col gap-14">
          <div class="form-group"><label class="form-label" for="reset-pw1">New password</label>${pwField({id:'reset-pw1',placeholder:'At least 10 characters',autocomplete:'new-password'})}</div>
          <div class="form-group"><label class="form-label" for="reset-pw2">Confirm new password</label>${pwField({id:'reset-pw2',placeholder:'Type it again',autocomplete:'new-password'})}</div>
          ${S.resetPasswordError ? `<div class="form-error">${S.resetPasswordError}</div>` : ''}
          <button class="btn btn-primary w-full" id="btn-complete-reset">Save new password</button>
          <button class="btn btn-ghost w-full" id="btn-reset-back">Back to sign in</button>
        </div>
      </div>
    </div>`;
  div.querySelector('#reset-pw1').addEventListener('input', event => { S.resetPassword=event.target.value; S.resetPasswordError=''; });
  div.querySelector('#reset-pw2').addEventListener('input', event => { S.resetPasswordConfirm=event.target.value; S.resetPasswordError=''; });
  div.querySelector('#btn-reset-back').addEventListener('click', () => { history.replaceState({},'',location.pathname); S.view='login'; render(); });
  div.querySelector('#btn-complete-reset').addEventListener('click', async event => {
    if (S.resetPassword.length < 10 || !/[A-Z]/.test(S.resetPassword) || !/\d/.test(S.resetPassword)) {
      S.resetPasswordError='Use at least 10 characters, one uppercase letter, and one number.'; render(); return;
    }
    if (S.resetPassword !== S.resetPasswordConfirm) { S.resetPasswordError='The passwords do not match.'; render(); return; }
    event.currentTarget.disabled=true; event.currentTarget.textContent='Saving…';
    try {
      await api('/auth/reset-password',{method:'POST',body:{token:S.resetToken,password:S.resetPassword,password_confirmation:S.resetPasswordConfirm}});
      history.replaceState({},'',location.pathname);
      S.resetToken=''; S.resetPassword=''; S.resetPasswordConfirm=''; S.loginError='Password reset complete. Sign in with your new password.'; S.view='login'; render();
    } catch (error) { S.resetPasswordError=error.message; render(); }
  });
  return div;
}

async function doSignIn() {
  const email = (S.loginEmail || $('login-email')?.value || '').toLowerCase().trim();
  const pw    = ($('login-pw')?.value || '');
  S.loginEmail = email;

  if (!email || !pw) {
    S.loginError = 'Enter your email and password.';
    render();
    return;
  }

  const button = $('btn-signin');
  if (button) { button.disabled = true; button.textContent = 'Signing in…'; }
  try {
    const result = await api('/auth/login', { method:'POST', body:{ email, password:pw } });
    await handleAuthenticatedUser(result.user || result);
  } catch (error) {
    S.loginError = error.message || 'Invalid email or password.';
    render();
  }
}

async function handleAuthenticatedUser(user, restoring = false) {
  if (!user || !user.id) return;
  const roles = Array.isArray(user.roles) ? user.roles : String(user.roles || '').split(',');
  const isSuper = roles.includes('superadmin');
  S.loginError = false;
  S.currentCompany = user.company_name || 'Curdun ICT Solutions';
  if (user.must_change_password) {
    S.pwUser = user;
    S.newPw1 = ''; S.newPw2 = ''; S.pwError = '';
    S.view = 'firstlogin';
    render();
    return;
  }
  if (isSuper) {
    S.activeSuperAdmin = { ...user, role:'Super Admin' };
    S.activeCompanyAdmin = null;
    S.view = 'super';
    await loadPlatformData();
  } else {
    S.activeCompanyAdmin = { ...user, role:posRoleLabel(roles[0]) };
    S.activeSuperAdmin = null;
    S.view = 'workspace';
  }
  if (!restoring || S.view !== 'login') render();
}

function posRoleLabel(role) {
  return { admin:'Admin', store_manager:'Store Manager', senior_cashier:'Senior Cashier', cashier:'Cashier' }[role] || 'Cashier';
}

async function loadPlatformData() {
  if (!S.activeSuperAdmin) return;
  try {
    const [overview, companies, users] = await Promise.all([
      api('/platform/overview'), api('/platform/companies'), api('/platform/users')
    ]);
    S.platformOverview = overview;
    S.platformUsers = users;
    const platformAdmins = users.filter(user => String(user.roles || '').split(',').includes('superadmin'));
    SUPER_ADMINS.splice(0, SUPER_ADMINS.length, ...platformAdmins.map(user => ({
      id:Number(user.id), name:user.name, email:user.email, role:'Super Admin',
      phone:user.phone || '', status:user.status || 'inactive',
      mustChangePassword:Boolean(Number(user.must_change_password)), createdAt:(user.created_at || '').slice(0,10),
      lastLoginAt:user.last_login_at || null,
    })));
    S.tenants = companies.map(company => ({
      id:`TN-${String(company.id).padStart(4,'0')}`, companyId:Number(company.id), name:company.name,
      city:company.city || '—', owner:company.admin_name || 'Not assigned', since:(company.created_at || '').slice(0,7),
      plan:'Business', users:Number(company.user_count || 0), invoice:'0', region:'SO', adminEmail:company.admin_email || '',
      adminId:company.admin_id ? Number(company.admin_id) : null, adminStatus:company.admin_status || 'inactive',
      adminPhone:company.admin_phone || '', adminMustChangePassword:Boolean(Number(company.admin_must_change_password)),
      lastSignInAt:company.admin_last_login_at || null, deliveryChannel:company.admin_delivery_channel || null,
      deliveryStatus:company.admin_delivery_status || null, deliveryAt:company.admin_delivery_at || null, pendingReset:null,
    }));
    S.licenses = {};
    companies.forEach(company => { S.licenses[`TN-${String(company.id).padStart(4,'0')}`] = { pharmacy:false,financials:false,crm:false,hr:false,pos:Boolean(Number(company.pos_enabled)),university:false,hotel:false,hospital:false }; });
    if (S.tenants.length && !S.tenants.some(item => item.id === S.selectedTenantId)) S.selectedTenantId = S.tenants[0].id;
  } catch (error) {
    console.error('Platform data load failed:', error);
    S.platformLoadError = error.message;
  }
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
          Welcome <b style="color:var(--purple-800)">${S.pwUser?.name || 'User'}</b>. You signed in with a temporary password.<br>
          Before you enter your workspace, please set a personal password that only you know.
        </div>
        <div class="flex-col gap-14">
          <div class="form-group">
            <label class="form-label">Your account</label>
            <div class="form-input mono" style="color:var(--purple-800)">${S.pwUser?.email || ''}</div>
          </div>
          <div class="form-group">
            <label class="form-label" for="pw1">New password</label>
            ${pwField({ id:'pw1', placeholder:'At least 10 characters', value:S.newPw1, autocomplete:'new-password' })}
          </div>
          <div class="form-group">
            <label class="form-label" for="pw2">Confirm new password</label>
            ${pwField({ id:'pw2', placeholder:'Type it again', value:S.newPw2, autocomplete:'new-password' })}
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
  div.querySelector('#btn-setpw').addEventListener('click', async (event) => {
    if (!S.newPw1 || S.newPw1.length < 10) { S.pwError='Password must be at least 10 characters.'; render(); return; }
    if (!/[A-Z]/.test(S.newPw1)) { S.pwError='Add at least one uppercase letter.'; render(); return; }
    if (!/[0-9]/.test(S.newPw1)) { S.pwError='Add at least one number.'; render(); return; }
    if (S.newPw1 !== S.newPw2)   { S.pwError='The two passwords do not match.'; render(); return; }
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      const user = await api('/auth/change-password', { method:'POST', body:{ password:S.newPw1, password_confirmation:S.newPw2 } });
      S.pwUser = null;
      await handleAuthenticatedUser(user);
    } catch (error) {
      S.pwError = error.message || 'Unable to change password.';
      render();
    }
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
  const operatorName = S.activeSuperAdmin?.name || 'Platform Administrator';
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
      <div class="avatar-pill">${esc(initials(operatorName))}</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name">${esc(operatorName)}</div>
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
      <label class="topbar-search" style="cursor:text">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B6484" stroke-width="2">
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
        </svg>
        <input id="platform-search" type="text" placeholder="Search tenants, modules, logs…"
               value="${S.platformSearch || ''}"
               style="flex:1;border:none;outline:none;background:transparent;font-size:12px;color:var(--text-primary);min-width:180px"/>
      </label>
      <div class="topbar-status">
        <span style="width:7px;height:7px;border-radius:50%;background:#22C55E;display:inline-block"></span>
        Production · SO-MG-1
      </div>
      <div style="position:relative">
        <button class="topbar-notif" id="btn-platform-notif" title="Alerts &amp; incidents">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D1859" stroke-width="1.8" style="display:block;margin:auto">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          </svg>
          ${S.platformAlerts.some(a => a.status === 'open') ? '<span class="topbar-notif-dot"></span>' : ''}
        </button>
        ${S.platformNotifOpen ? (() => {
          const open = S.platformAlerts.filter(a => a.status === 'open');
          return `
            <div id="platform-notif-panel" style="position:absolute;top:calc(100% + 8px);right:0;width:320px;background:#FFF;border:1px solid var(--border);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,0.12);z-index:50;overflow:hidden">
              <div style="padding:12px 14px;border-bottom:1px solid var(--border);font-weight:800;font-size:13px;display:flex;justify-content:space-between;align-items:center">
                <span>Alerts &amp; incidents</span>
                <span style="font-size:11px;color:var(--text-muted)">${open.length} open</span>
              </div>
              ${open.length === 0
                ? '<div style="padding:20px;text-align:center;font-size:12px;color:var(--text-muted)">✓ No open incidents</div>'
                : open.map(a => `
                    <div style="padding:10px 14px;border-top:1px solid var(--border);font-size:12px">
                      <div style="font-weight:700;color:var(--text-primary)">${a.module} · ${a.subject}</div>
                      <div style="color:var(--text-muted);margin-top:2px">${a.desc}</div>
                      <div style="color:var(--text-muted);font-family:var(--font-mono);font-size:10px;margin-top:2px">${a.when}</div>
                    </div>
                  `).join('')}
              <div style="padding:8px 14px;border-top:1px solid var(--border);background:var(--gray-50)">
                <button id="btn-notif-goto" style="border:none;background:none;font-size:12px;font-weight:700;color:var(--purple-800);cursor:pointer;padding:0">Open Overview →</button>
              </div>
            </div>
          `;
        })() : ''}
      </div>
    </div>
  `;

  // Wire header interactivity (search + notification bell)
  const searchInput = bar.querySelector('#platform-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      S.platformSearch = e.target.value;
      // Only auto-jump to Companies while typing so the search actually filters something.
      if (S.superTab !== 'companies' && e.target.value.trim() !== '') {
        S.superTab = 'companies';
      }
      render();
      // Restore focus + caret after re-render
      setTimeout(() => {
        const el = document.getElementById('platform-search');
        if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
      }, 0);
    });
  }
  const notifBtn = bar.querySelector('#btn-platform-notif');
  if (notifBtn) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.platformNotifOpen = !S.platformNotifOpen;
      render();
    });
  }
  // "Open Overview" jump inside the dropdown
  const gotoBtn = bar.querySelector('#btn-notif-goto');
  if (gotoBtn) {
    gotoBtn.addEventListener('click', () => {
      S.superTab = 'overview';
      S.platformNotifOpen = false;
      render();
    });
  }
  // Click-away closes the notification panel
  if (S.platformNotifOpen && !window.__notifClickAwayBound) {
    window.__notifClickAwayBound = true;
    document.addEventListener('click', (e) => {
      if (!S.platformNotifOpen) return;
      const panel = document.getElementById('platform-notif-panel');
      const btn   = document.getElementById('btn-platform-notif');
      if (!panel) return;
      if (!panel.contains(e.target) && btn && !btn.contains(e.target)) {
        S.platformNotifOpen = false;
        render();
      }
    });
  }

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

  // ---- Live server-metric jitter (Server Utilization card below) ----
  const liveCpu = 58 + Math.round(Math.sin(S.liveTick/3)*8);
  const liveMem = 68 + Math.round(Math.cos(S.liveTick/4)*6);
  const liveReq = (42180 + Math.round(Math.sin(S.liveTick/2)*3400)).toLocaleString();

  // ---- Dynamic KPIs, computed from real state ----
  const totalMRR = S.tenants.reduce((sum, t) => sum + parseInt(String(t.invoice).replace(/,/g, ''), 10) || 0, 0);
  const modulesLicensedAtLeastOnce = MODULES_DEF.filter(m =>
    S.tenants.some(t => (S.licenses[t.id] || {})[m.key])
  ).length;
  const openAlerts = S.platformAlerts.filter(a => a.status === 'open');

  // Range-specific labels for the KPI trend line + chart caption.
  const rangeLabel = { '30d':'last 30d', 'quarter':'last quarter', 'year':'last year' }[S.overviewRange] || 'last 30d';
  const chartRangeSub = { '30d':'Last 7 months', 'quarter':'Last 4 quarters', 'year':'Last 3 years' }[S.overviewRange] || 'Last 7 months';

  return `
    <section class="flex justify-between items-center gap-20" style="flex-wrap:wrap">
      <div>
        <div class="label-sm text-faint">Cor Overview</div>
        <h1 style="margin:6px 0 4px;font-size:28px;font-weight:900;letter-spacing:-0.4px">Global Platform Dashboard</h1>
        <div style="font-size:13px;color:var(--text-muted)">Every tenant, every module across Somalia — at a glance.</div>
      </div>
      <div class="time-range">
        <button class="time-btn${S.overviewRange==='30d'?' active':''}"    data-range="30d">30 days</button>
        <button class="time-btn${S.overviewRange==='quarter'?' active':''}" data-range="quarter">Quarter</button>
        <button class="time-btn${S.overviewRange==='year'?' active':''}"    data-range="year">Year</button>
      </div>
    </section>

    <section class="kpi-grid">
      <div class="kpi-card dark">
        <div class="kpi-eyebrow">Companies</div>
        <div class="kpi-value">${S.tenants.length}</div>
        <div class="kpi-trend">${S.tenants.length} active · ${rangeLabel}</div>
      </div>
      <div class="kpi-card light">
        <div class="kpi-eyebrow">Monthly recurring</div>
        <div class="kpi-value">$${totalMRR.toLocaleString()}</div>
        <div class="kpi-trend trend-up">Across ${S.tenants.length} tenant${S.tenants.length===1?'':'s'}</div>
      </div>
      <div class="kpi-card light">
        <div class="kpi-eyebrow">Modules deployed</div>
        <div class="kpi-value">${modulesLicensedAtLeastOnce}<span style="font-size:14px;color:var(--text-muted);font-weight:500"> / ${MODULES_DEF.length}</span></div>
        <div class="kpi-trend">${modulesLicensedAtLeastOnce===MODULES_DEF.length?'All licensed at least once':(MODULES_DEF.length-modulesLicensedAtLeastOnce)+' with no tenants yet'}</div>
      </div>
      <div class="kpi-card light">
        <div class="kpi-eyebrow">Platform uptime</div>
        <div class="kpi-value">99.96%</div>
        <div class="kpi-trend ${openAlerts.length ? 'trend-warn' : 'trend-up'}">${openAlerts.length} incident${openAlerts.length===1?'':'s'} open</div>
      </div>
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
          <span class="pill ${openAlerts.length ? 'pill-amber' : 'pill-green'}">${openAlerts.length} OPEN</span>
        </div>
        ${openAlerts.length === 0 ? `
          <div class="alert-card-info" style="justify-content:center">
            <div style="text-align:center;padding:12px 0;color:var(--text-muted);font-size:13px">✓ No open incidents</div>
          </div>
        ` : openAlerts.map(a => {
          const iconSvg = a.severity === 'high'
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10.3 3.86l-8.1 14A2 2 0 0 0 3.94 21h16.12a2 2 0 0 0 1.75-3.14l-8.1-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>'
            : a.severity === 'medium'
              ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>'
              : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/></svg>';
          const cardClass = a.severity === 'high' ? 'alert-card-red' : a.severity === 'medium' ? 'alert-card-amber' : 'alert-card-info';
          const iconStyle = a.severity === 'high'
            ? 'background:#B42318;color:#FFF'
            : a.severity === 'medium'
              ? 'background:#F5C411;color:#2D1859'
              : 'background:#2D1859;color:#F5C411';
          return `
            <div class="${cardClass}" data-alert-id="${a.id}" style="cursor:pointer" title="Click to resolve">
              <div class="alert-icon" style="${iconStyle}">${iconSvg}</div>
              <div style="flex:1;min-width:0">
                <div class="alert-title">${a.module} · ${a.subject}</div>
                <div class="alert-desc">${a.desc} · ${a.when}</div>
              </div>
            </div>
          `;
        }).join('')}
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
              <div style="font-weight:700;color:var(--text-primary);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.name)}</div>
              <div style="font-size:11px;color:var(--text-muted)">${esc(c.city)} · ${esc(c.plan)} · ${grantedCount(c.id)} modules</div>
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

  // Filter tenants by the platform-wide search query (case-insensitive across
  // name, city, id, owner). Empty query returns everyone.
  const q = (S.platformSearch || '').toLowerCase().trim();
  const filteredTenants = q === ''
    ? S.tenants
    : S.tenants.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.owner || '').toLowerCase().includes(q));

  return `
    <section class="data-section" id="companies-table-section">
      <div class="section-header-bar">
        <div><div class="section-eyebrow">Tenants</div><h2 class="section-h2">Companies${q ? ` <span style="font-size:12px;color:var(--text-muted);font-weight:500">— filter: "${q}"</span>` : ''}</h2></div>
        <div class="ml-auto flex items-center gap-8">
          <button class="filter-pill active" style="border:none;background:#2D1859;color:#FFF">All · ${filteredTenants.length}</button>
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
            ${filteredTenants.length === 0 ? `
              <tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-muted);font-style:italic">No companies match "${q}".</td></tr>
            ` : filteredTenants.map(t=>`
              <tr>
                <td style="cursor:pointer" data-select="${t.id}">
                  <div class="flex items-center gap-10">
                    <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#2D1859,#4A2B8A);color:#F5C411;display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0">${initials(t.name)}</div>
                    <div><div style="font-weight:700;color:var(--text-primary)">${esc(t.name)}</div><div style="font-size:11px;color:var(--text-muted)">${esc(t.city)} · Owner ${esc(t.owner)}</div></div>
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
        <h2 class="tenant-name">${esc(tenant.name)}</h2>
        <div class="tenant-meta">${esc(tenant.city)} · Owner: ${esc(tenant.owner)} · Since ${esc(tenant.since)}</div>
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
              <button class="toggle-wrap ${m.on?'on':''}" data-toggle="${m.key}" ${m.key!=='pos'?'disabled title="Coming soon"':''}><span class="toggle-knob"></span></button>
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
  const admins = S.tenants.filter(t => t.adminId);
  const statusOf = t => ['suspended','inactive'].includes(t.adminStatus) ? 'suspended' : (t.adminMustChangePassword ? 'invited' : 'active');
  const total = admins.length;
  const active = admins.filter(t => statusOf(t)==='active').length;
  const invited = admins.filter(t => statusOf(t)==='invited').length;
  const suspended = admins.filter(t => statusOf(t)==='suspended').length;
  const q = (S.platformSearch || '').toLowerCase().trim();
  const filter = S.companyAdminStatus || 'all';
  const rows = admins.filter(t =>
      (filter === 'all' || statusOf(t) === filter) &&
      (!q ||
        t.name.toLowerCase().includes(q) ||
        t.owner.toLowerCase().includes(q) ||
        (t.adminEmail || '').toLowerCase().includes(q) ||
        (t.adminPhone || '').toLowerCase().includes(q)));
  const statusPill = {
    active:{cls:'pill-green',label:'● Active'}, invited:{cls:'pill-amber',label:'● Invited'}, suspended:{cls:'pill-red',label:'● Suspended'},
  };
  const deliveryLabel = t => {
    if (!t.deliveryStatus) return '<span style="color:var(--text-muted)">No delivery yet</span>';
    const color = t.deliveryStatus === 'sent' ? '#0F7A3A' : (t.deliveryStatus === 'preview' ? '#B45309' : '#B42318');
    const channel = t.deliveryChannel === 'sms' ? 'SMS' : 'Email';
    return `<span style="color:${color};font-weight:700">${channel} · ${esc(t.deliveryStatus)}</span><div style="font-size:10px;color:var(--text-muted);margin-top:2px">${formatRelativeTime(t.deliveryAt)}</div>`;
  };

  return `
    <div class="page-title-bar">
      <div>
        <div class="page-title-eyebrow">Access Control</div>
        <h1 class="page-title">Company Admins</h1>
        <div class="page-subtitle">Every registered company has one primary administrator. Invitations and password recovery are delivered automatically by email or secure SMS OTP and recorded for audit.</div>
      </div>
      <button class="btn btn-gold" id="btn-invite-admin">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add company & admin
      </button>
    </div>
    <section class="admins-stat-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Total admins</div><div class="kpi-value">${total}</div><div class="kpi-trend" style="color:#EFEAFB">Real assigned accounts</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Active</div><div class="kpi-value" style="color:#0F7A3A">${active}</div><div class="kpi-trend">Setup completed</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Invited</div><div class="kpi-value" style="color:#B45309">${invited}</div><div class="kpi-trend">Pending first sign-in</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Suspended</div><div class="kpi-value" style="color:#B42318">${suspended}</div><div class="kpi-trend">Access currently blocked</div></div>
    </section>
    <section class="data-section">
      <div class="section-header-bar">
        <h3 class="chart-title" style="margin-right:auto">All company admins${q ? ` <span style="font-size:12px;color:var(--text-muted);font-weight:500">— “${esc(q)}”</span>` : ''}</h3>
        <select class="form-input" id="company-admin-filter" style="width:auto;min-width:150px"><option value="all" ${filter==='all'?'selected':''}>All statuses</option><option value="active" ${filter==='active'?'selected':''}>Active</option><option value="invited" ${filter==='invited'?'selected':''}>Invited</option><option value="suspended" ${filter==='suspended'?'selected':''}>Suspended</option></select>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:930px">
          <thead><tr><th>Admin</th><th>Company</th><th>Last sign-in</th><th>Last delivery</th><th>Status</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${rows.length === 0 ? `
              <tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-muted)">No assigned company administrators match this view.</td></tr>
            ` : rows.map(t => {
              const state = statusOf(t);
              const s = statusPill[state];
              return `<tr>
                <td>
                  <div class="flex items-center gap-10">
                    <div style="width:32px;height:32px;border-radius:50%;background:#2D1859;color:#F5C411;display:grid;place-items:center;font-weight:900;font-size:11px;flex-shrink:0">${initials(t.owner)}</div>
                    <div>
                      <div style="font-weight:700">${esc(t.owner)}</div>
                      <div style="font-size:11px;color:var(--text-muted)">${esc(t.adminEmail || '—')}</div>
                      <div style="font-size:10px;color:var(--text-muted)">${esc(t.adminPhone || 'No phone registered')}</div>
                    </div>
                  </div>
                </td>
                <td style="font-weight:600">${esc(t.name)}<div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${esc(t.id)}</div></td>
                <td style="color:var(--text-muted);font-size:12px">${formatRelativeTime(t.lastSignInAt)}</td>
                <td style="font-size:11px">${deliveryLabel(t)}</td>
                <td><span class="pill ${s.cls}">${s.label}</span></td>
                <td class="col-right">
                  <button class="btn btn-outline btn-xs" data-edit-company-admin="${t.id}">Edit</button>
                  <button class="btn btn-outline btn-xs" data-toggle-admin="${t.id}">${state==='suspended'?'Activate':'Suspend'}</button>
                  <button class="btn btn-outline btn-xs" data-reset-admin="${t.id}">Reset password</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    ${renderResetAdminModal()}
    ${renderCompanyAdminModal()}
  `;
}

/**
 * Reset-password modal for the Company Admin listing.
 * Two-step flow:
 *   1. confirm  → show admin details + delivery-channel checkboxes
 *   2. sent     → show the generated one-time reset link + a Copy button
 */
function renderResetAdminModal() {
  const m = S.resetAdminModal;
  if (!m) return '';
  const t = S.tenants.find(x => x.id === m.tenantId);
  if (!t) return '';

  if (m.step === 'sent') {
    const delivery = m.delivery || {};
    const isSuccess = ['sent','preview'].includes(delivery.status);
    return `
      <div class="crud-overlay" data-modal-close>
        <div class="crud-modal" style="max-width:520px" onclick="event.stopPropagation()">
          <div class="crud-modal-header">
            <h3>${isSuccess ? 'Password reset delivered' : 'Delivery needs attention'}</h3>
            <button class="crud-close-btn" data-modal-close>×</button>
          </div>
          <div class="crud-modal-body">
            <div style="padding:14px;background:${isSuccess?'#DEF7EC':'#FEE4E2'};border:1px solid ${isSuccess?'#86EFAC':'#FDA29B'};border-radius:10px;margin-bottom:16px;font-size:13px;color:${isSuccess?'#065F46':'#B42318'}">
              ${isSuccess?'✓':'⚠'} ${esc(delivery.message || 'Delivery could not be completed.')}<br><b>${esc(delivery.destination || (m.channel==='sms'?t.adminPhone:t.adminEmail))}</b>
            </div>
            ${delivery.preview_link ? `<label class="form-label">Local preview link</label><div style="display:flex;gap:8px;margin-top:4px"><input class="form-input mono" id="reset-link-input" value="${esc(delivery.preview_link)}" readonly onfocus="this.select()" style="font-size:12px"/><button class="btn btn-primary btn-sm" id="btn-copy-reset-link">Copy</button></div>` : ''}
            ${delivery.preview_otp ? `<label class="form-label">Local preview OTP</label><div style="display:flex;gap:8px;margin-top:4px"><input class="form-input mono" id="reset-otp-input" value="${esc(delivery.preview_otp)}" readonly style="font-size:20px;letter-spacing:6px"/><button class="btn btn-primary btn-sm" id="btn-copy-reset-otp">Copy</button></div>` : ''}
            <div style="font-size:11px;color:var(--text-muted);margin-top:10px">${m.channel==='sms'?'OTP expires in 10 minutes and allows 5 attempts.':'Email link expires in 60 minutes.'} ${delivery.status==='preview'?'Configure the production provider in backend/.env before deployment.':''}</div>
          </div>
          <div class="crud-modal-footer">
            <button class="btn btn-primary" data-modal-close>Done</button>
          </div>
        </div>
      </div>
    `;
  }

  // step: 'confirm'
  return `
    <div class="crud-overlay" data-modal-close>
      <div class="crud-modal" style="max-width:480px" onclick="event.stopPropagation()">
        <div class="crud-modal-header">
          <h3>Reset admin password</h3>
          <button class="crud-close-btn" data-modal-close>×</button>
        </div>
        <div class="crud-modal-body">
          <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--gray-50);border-radius:10px;margin-bottom:16px">
            <div style="width:44px;height:44px;border-radius:50%;background:#2D1859;color:#F5C411;display:grid;place-items:center;font-weight:900;font-size:14px">${initials(t.owner)}</div>
            <div>
              <div style="font-weight:800;font-size:15px">${esc(t.owner)}</div>
              <div style="font-size:12px;color:var(--text-muted)">${esc(t.adminEmail)} · ${esc(t.name)}</div>
            </div>
          </div>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.55;margin-bottom:16px">
            Choose how the administrator should receive password recovery. The existing password remains active until recovery is completed.
          </div>
          <div class="form-group">
            <label class="form-label">Delivery channel</label>
            <div class="filter-pills" style="margin-top:6px">
              <button class="filter-pill ${m.channel==='email'?'active':''}" data-reset-channel="email">Email reset link</button>
              <button class="filter-pill ${m.channel==='sms'?'active':''}" data-reset-channel="sms" ${!t.adminPhone?'disabled title="Add a phone number first"':''}>SMS OTP</button>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:9px">${m.channel==='sms' ? esc(t.adminPhone || 'No phone number registered') : esc(t.adminEmail)}</div>
            ${m.error ? `<div style="margin-top:12px;color:var(--red);font-size:12px">${esc(m.error)}</div>` : ''}
          </div>
        </div>
        <div class="crud-modal-footer">
          <button class="btn btn-ghost" data-modal-close>Cancel</button>
          <button class="btn btn-primary" id="btn-send-reset">Send ${m.channel==='sms'?'OTP':'reset email'}</button>
        </div>
      </div>
    </div>
  `;
}

function renderCompanyAdminModal() {
  const modal = S.companyAdminModal;
  if (!modal || modal.type !== 'edit') return '';
  const tenant = S.tenants.find(item => item.id === modal.tenantId);
  if (!tenant?.adminId) return '';
  return `<div class="crud-overlay" data-company-admin-close>
    <div class="crud-modal" style="max-width:560px" onclick="event.stopPropagation()">
      <div class="crud-modal-header"><h3>Edit Company Admin</h3><button class="crud-close-btn" data-company-admin-close>×</button></div>
      <div class="crud-modal-body">
        <div style="padding:11px 13px;background:var(--gray-50);border-radius:9px;margin-bottom:15px;font-size:12px"><b>${esc(tenant.name)}</b> · Primary Company Admin</div>
        <div class="form-group"><label class="form-label">Full name *</label><input class="form-input" id="company-admin-name" value="${esc(tenant.owner)}"/></div>
        <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="company-admin-email" type="email" value="${esc(tenant.adminEmail)}"/></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="company-admin-phone" type="tel" value="${esc(tenant.adminPhone || '')}" placeholder="+252 61 000 0000"/><div class="cred-hint">Required when delivering password resets by SMS OTP.</div></div>
        ${modal.error ? `<div style="color:var(--red);font-size:12px">${esc(modal.error)}</div>` : ''}
      </div>
      <div class="crud-modal-footer"><button class="btn btn-ghost" data-company-admin-close>Cancel</button><button class="btn btn-primary" id="btn-save-company-admin">Save changes</button></div>
    </div>
  </div>`;
}

// ---- PLATFORM ADMINS TAB (Curdun-level super admins) ----
function renderPlatformAdminsTab() {
  const query = (S.platformAdminQuery || '').trim().toLowerCase();
  const filter = S.platformAdminStatus || 'all';
  const currentId = Number(S.activeSuperAdmin?.id || 0);
  const statusOf = admin => admin.status !== 'active' ? admin.status : (admin.mustChangePassword ? 'pending' : 'active');
  const visibleAdmins = SUPER_ADMINS.filter(admin => {
    const matchesText = !query || `${admin.name} ${admin.email} ${admin.phone}`.toLowerCase().includes(query);
    return matchesText && (filter === 'all' || statusOf(admin) === filter);
  });
  const counts = {
    active: SUPER_ADMINS.filter(a => a.status === 'active').length,
    pending: SUPER_ADMINS.filter(a => a.status === 'active' && a.mustChangePassword).length,
    suspended: SUPER_ADMINS.filter(a => a.status === 'suspended').length,
  };
  const badge = admin => {
    const status = statusOf(admin);
    const labels = { active:'Active', pending:'Pending first sign-in', suspended:'Suspended', inactive:'Inactive' };
    const classes = { active:'pill-green', pending:'pill-amber', suspended:'pill-red', inactive:'' };
    return `<span class="pill ${classes[status] || ''}">${labels[status] || esc(status)}</span>`;
  };
  const rows = visibleAdmins.map(a => `
    <tr>
      <td style="padding:12px 16px">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="avatar avatar-sm" style="background:var(--purple-800);color:var(--gold)">${initials(a.name)}</div>
          <div>
            <div style="font-weight:700">${esc(a.name)} ${a.id === currentId ? '<span class="pill pill-purple" style="font-size:9px;padding:2px 7px;margin-left:5px">YOU</span>' : ''}</div>
            <div style="font-size:12px;color:var(--text-muted)">${esc(a.email)}</div>
            ${a.phone ? `<div style="font-size:11px;color:var(--text-muted)">${esc(a.phone)}</div>` : ''}
          </div>
        </div>
      </td>
      <td style="padding:12px 16px">${badge(a)}</td>
      <td style="padding:12px 16px;font-size:12px;color:var(--text-muted)">${formatRelativeTime(a.lastLoginAt)}</td>
      <td style="padding:12px 16px;font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${a.createdAt || '—'}</td>
      <td style="padding:12px 16px">
        <div class="crud-actions">
          <button class="crud-btn crud-btn-edit" data-platform-edit="${a.id}" title="Edit profile">✎</button>
          <button class="crud-btn" data-platform-reset="${a.id}" title="Generate password reset link">↻</button>
          ${a.id === currentId ? '' : `
            <button class="crud-btn" data-platform-status="${a.id}" title="${a.status === 'active' ? 'Suspend' : 'Activate'} account">${a.status === 'active' ? '⊘' : '✓'}</button>
            <button class="crud-btn crud-btn-delete" data-platform-remove="${a.id}" title="Remove account">⌫</button>
          `}
        </div>
      </td>
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

    <section class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow">Total operators</div><div class="kpi-value">${SUPER_ADMINS.length}</div><div class="kpi-trend">Root-level accounts</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Active</div><div class="kpi-value">${counts.active}</div><div class="kpi-trend trend-up">Can access the platform</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Pending setup</div><div class="kpi-value">${counts.pending}</div><div class="kpi-trend">Awaiting first sign-in</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Suspended</div><div class="kpi-value">${counts.suspended}</div><div class="kpi-trend ${counts.suspended ? 'trend-warn' : 'trend-up'}">Access blocked</div></div>
    </section>

    <section class="two-col-grid">
      <div class="data-section">
        <div class="section-header-bar">
          <div style="margin-right:auto"><div class="section-eyebrow">Operators</div><h2 class="section-h2">${visibleAdmins.length} shown</h2></div>
          <input class="form-input" id="platform-admin-search" type="search" placeholder="Search name, email or phone…" value="${esc(S.platformAdminQuery || '')}" style="width:min(260px,100%)"/>
          <select class="form-input" id="platform-admin-filter" style="width:auto;min-width:150px">
            <option value="all" ${filter==='all'?'selected':''}>All statuses</option>
            <option value="active" ${filter==='active'?'selected':''}>Active</option>
            <option value="pending" ${filter==='pending'?'selected':''}>Pending setup</option>
            <option value="suspended" ${filter==='suspended'?'selected':''}>Suspended</option>
            <option value="inactive" ${filter==='inactive'?'selected':''}>Inactive</option>
          </select>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table" style="min-width:820px">
            <thead><tr>
              <th style="padding:12px 16px;text-align:left">Name / email</th>
              <th style="padding:12px 16px;text-align:left">Status</th>
              <th style="padding:12px 16px;text-align:left">Last sign-in</th>
              <th style="padding:12px 16px;text-align:left">Created</th>
              <th style="padding:12px 16px;text-align:right">Actions</th>
            </tr></thead>
            <tbody>${rows || `<tr><td colspan="5" style="padding:34px;text-align:center;color:var(--text-muted)">No platform administrators match this filter.</td></tr>`}</tbody>
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
          <input class="form-input" id="new-sa-name" placeholder="e.g. Amina Hassan" value="${esc(S._newSA?.name || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:#FFF">Email</label>
          <input class="form-input" id="new-sa-email" type="email" placeholder="operator@curdun.so" value="${esc(S._newSA?.email || '')}"/>
        </div>
        <div class="form-group">
          <label class="form-label" style="color:#FFF">Phone <span style="font-weight:500;opacity:.75">(optional)</span></label>
          <input class="form-input" id="new-sa-phone" type="tel" placeholder="+252 61 000 0000" value="${esc(S._newSA?.phone || '')}"/>
        </div>
        ${S.platformAdminError ? `<div style="padding:10px 12px;border-radius:9px;background:#FEE4E2;color:#B42318;font-size:12px">${esc(S.platformAdminError)}</div>` : ''}
        ${S._newSAResult ? `
          <div class="cred-box" style="grid-column:auto">
            <div class="cred-box-header">
              <div>
                <div class="cred-eyebrow">CREATED</div>
                <div class="cred-title">${esc(S._newSAResult.name)}</div>
                <div class="cred-subtitle">${esc(S._newSAResult.email)}</div>
              </div>
            </div>
            <div>
              <div class="cred-field-label">Temporary password</div>
              <div style="display:flex;gap:8px"><input class="cred-input pw" id="new-sa-password" value="${esc(S._newSAResult.tempPassword)}" readonly onfocus="this.select()"/><button class="btn btn-primary btn-sm" id="btn-copy-sa-password">Copy</button></div>
              <div class="cred-hint">Share once. They'll be forced to change it on first sign-in.</div>
            </div>
            <button class="btn btn-outline btn-sm" id="btn-dismiss-sa-result" style="margin-top:10px">Dismiss credentials</button>
          </div>
        ` : `
          <div class="cred-hint" style="color:#EFEAFB">No password to show yet.</div>
        `}
        <button class="btn btn-primary" id="btn-create-sa">Create admin</button>
      </div>
    </section>
    ${renderPlatformAdminModal()}
  `;
}

function renderPlatformAdminModal() {
  const modal = S.platformAdminModal;
  if (!modal) return '';
  const admin = SUPER_ADMINS.find(item => item.id === Number(modal.id));
  if (!admin) return '';

  if (modal.type === 'edit') return `
    <div class="crud-overlay" data-platform-modal-close>
      <div class="crud-modal" style="max-width:560px" onclick="event.stopPropagation()">
        <div class="crud-modal-header"><h3>Edit Platform Admin</h3><button class="crud-close-btn" data-platform-modal-close>×</button></div>
        <div class="crud-modal-body">
          <div class="form-group"><label class="form-label">Full name *</label><input class="form-input" id="platform-edit-name" value="${esc(admin.name)}"/></div>
          <div class="form-group"><label class="form-label">Email *</label><input class="form-input" id="platform-edit-email" type="email" value="${esc(admin.email)}"/></div>
          <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="platform-edit-phone" type="tel" value="${esc(admin.phone || '')}" placeholder="+252 61 000 0000"/></div>
          <div style="padding:12px;background:var(--gray-50);border-radius:10px;font-size:12px;color:var(--text-muted)">Role: <strong style="color:var(--text-primary)">Super Admin</strong> · Access to every company and platform setting.</div>
          ${modal.error ? `<div style="color:var(--red);font-size:12px;margin-top:12px">${esc(modal.error)}</div>` : ''}
        </div>
        <div class="crud-modal-footer"><button class="btn btn-ghost" data-platform-modal-close>Cancel</button><button class="btn btn-primary" id="btn-save-platform-admin">Save changes</button></div>
      </div>
    </div>`;

  if (modal.type === 'reset' && modal.step === 'sent') return `
    <div class="crud-overlay" data-platform-modal-close>
      <div class="crud-modal" style="max-width:560px" onclick="event.stopPropagation()">
        <div class="crud-modal-header"><h3>Reset link ready</h3><button class="crud-close-btn" data-platform-modal-close>×</button></div>
        <div class="crud-modal-body">
          <div style="padding:12px;background:${modal.delivery?.status==='failed'?'#FEE4E2':'#ECFDF3'};border:1px solid ${modal.delivery?.status==='failed'?'#FDA29B':'#86EFAC'};border-radius:10px;color:${modal.delivery?.status==='failed'?'#B42318':'#166534'};font-size:13px;margin-bottom:16px">${esc(modal.delivery?.message || 'Password reset delivery processed.')} <strong>${esc(modal.delivery?.destination || admin.email)}</strong></div>
          ${modal.delivery?.preview_link ? `<label class="form-label">Local preview link</label><div style="display:flex;gap:8px;margin-top:5px"><input class="form-input mono" id="platform-reset-link" value="${esc(modal.delivery.preview_link)}" readonly onfocus="this.select()"/><button class="btn btn-primary btn-sm" id="btn-copy-platform-reset">Copy</button></div>` : ''}
          <div style="font-size:11px;color:var(--text-muted);margin-top:8px">Valid for 60 minutes. The current password remains valid until this link is completed.</div>
        </div>
        <div class="crud-modal-footer"><button class="btn btn-primary" data-platform-modal-close>Done</button></div>
      </div>
    </div>`;

  if (modal.type === 'reset') return `
    <div class="crud-overlay" data-platform-modal-close>
      <div class="crud-modal" style="max-width:500px" onclick="event.stopPropagation()">
        <div class="crud-modal-header"><h3>Reset password</h3><button class="crud-close-btn" data-platform-modal-close>×</button></div>
        <div class="crud-modal-body"><p style="font-size:13px;line-height:1.6;color:var(--text-secondary)">Generate a secure, one-time reset link for <strong>${esc(admin.name)}</strong> (${esc(admin.email)}). This action is recorded in the audit trail.</p>${modal.error ? `<div style="color:var(--red);font-size:12px;margin-top:12px">${esc(modal.error)}</div>` : ''}</div>
        <div class="crud-modal-footer"><button class="btn btn-ghost" data-platform-modal-close>Cancel</button><button class="btn btn-primary" id="btn-generate-platform-reset">Generate link</button></div>
      </div>
    </div>`;

  return `
    <div class="crud-overlay" data-platform-modal-close>
      <div class="crud-confirm" onclick="event.stopPropagation()">
        <div class="crud-confirm-icon">⚠️</div><h3>Remove Platform Admin?</h3>
        <p><strong>${esc(admin.name)}</strong> will immediately lose all platform access. This cannot be undone from this screen.</p>
        ${modal.error ? `<div style="color:var(--red);font-size:12px;margin-bottom:14px">${esc(modal.error)}</div>` : ''}
        <div class="crud-confirm-actions"><button class="btn btn-ghost" data-platform-modal-close>Cancel</button><button class="btn-danger" id="btn-confirm-platform-remove">Remove admin</button></div>
      </div>
    </div>`;
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
      ${(() => {
        const mrr = S.tenants.reduce((s,t)=>s+(parseInt(String(t.invoice).replace(/,/g,''),10)||0),0);
        const arr = mrr * 12;
        const collected = Math.round(mrr * 0.909);
        const overdue = mrr - collected;
        return `
        <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">MRR</div><div class="kpi-value">$${mrr.toLocaleString()}</div><div class="kpi-trend trend-up" style="color:#EFEAFB">Across ${S.tenants.length} tenants</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">ARR</div><div class="kpi-value">$${arr.toLocaleString()}</div><div class="kpi-trend trend-up">Annualized MRR</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Collected this month</div><div class="kpi-value">$${collected.toLocaleString()}</div><div class="kpi-trend">90.9% collection rate</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Overdue</div><div class="kpi-value trend-warn">$${overdue.toLocaleString()}</div><div class="kpi-trend trend-warn">Outstanding</div></div>
        `;
      })()}
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
  // Overview: time-range buttons
  wrap.querySelectorAll('[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.overviewRange = btn.dataset.range;
      render();
    });
  });

  // Overview: click an alert card to resolve it
  wrap.querySelectorAll('[data-alert-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.alertId;
      if (!confirm('Mark this alert as resolved?')) return;
      const a = S.platformAlerts.find(x => x.id === id);
      if (a) a.status = 'resolved';
      render();
    });
  });

  // Company Admins tab: Reset password buttons + Invite button
  wrap.querySelectorAll('[data-reset-admin]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.resetAdminModal = {
        tenantId: btn.dataset.resetAdmin,
        step: 'confirm',
        channel: 'email',
        token: null,
        delivery: null,
      };
      render();
    });
  });
  wrap.querySelectorAll('[data-toggle-admin]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tenant = S.tenants.find(item => item.id === btn.dataset.toggleAdmin);
      if (!tenant?.adminId) return;
      const status = tenant.adminStatus === 'active' ? 'inactive' : 'active';
      if (status === 'inactive' && !confirm(`Suspend ${tenant.owner}? They will immediately lose access to ${tenant.name}.`)) return;
      try {
        await api(`/platform/users/${tenant.adminId}`, { method:'PUT', body:{status} });
        await loadPlatformData();
        render();
      } catch (error) { alert(error.message); }
    });
  });
  wrap.querySelector('#btn-invite-admin')?.addEventListener('click', () => {
    openCreate();
  });
  wrap.querySelector('#company-admin-filter')?.addEventListener('change', event => { S.companyAdminStatus=event.target.value; render(); });
  wrap.querySelectorAll('[data-edit-company-admin]').forEach(button => button.addEventListener('click', () => {
    S.companyAdminModal={type:'edit',tenantId:button.dataset.editCompanyAdmin}; render();
  }));
  wrap.querySelectorAll('[data-company-admin-close]').forEach(element => element.addEventListener('click', event => {
    if (event.target === element) { S.companyAdminModal=null; render(); }
  }));
  wrap.querySelector('#btn-save-company-admin')?.addEventListener('click', async event => {
    const modal=S.companyAdminModal;
    const tenant=S.tenants.find(item=>item.id===modal?.tenantId);
    if (!tenant?.adminId) return;
    const name=(document.getElementById('company-admin-name')?.value||'').trim();
    const email=(document.getElementById('company-admin-email')?.value||'').trim().toLowerCase();
    const phone=(document.getElementById('company-admin-phone')?.value||'').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { modal.error='A full name and valid email are required.'; render(); return; }
    event.currentTarget.disabled=true; event.currentTarget.textContent='Saving…';
    try { await api(`/platform/users/${tenant.adminId}`,{method:'PUT',body:{name,email,phone}}); S.companyAdminModal=null; await loadPlatformData(); render(); }
    catch(error){ modal.error=error.message; render(); }
  });

  // Reset-password modal: close, generate, copy
  wrap.querySelectorAll('[data-modal-close]').forEach(el => {
    el.addEventListener('click', (e) => {
      // Only close when the click actually landed on the close/backdrop target,
      // not when it bubbled up from a nested click.
      if (e.target === el) { S.resetAdminModal = null; render(); }
    });
  });
  wrap.querySelectorAll('[data-reset-channel]').forEach(button => button.addEventListener('click', () => {
    if (button.disabled || !S.resetAdminModal) return;
    S.resetAdminModal.channel=button.dataset.resetChannel; S.resetAdminModal.error=''; render();
  }));
  wrap.querySelector('#btn-send-reset')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const m = S.resetAdminModal;
    if (!m) return;
    const t = S.tenants.find(x => x.id === m.tenantId);
    if (!t || !t.adminId) { alert('No administrator is assigned to this company.'); return; }

    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = 'Generating…';

    try {
      const data = await api(`/platform/users/${t.adminId}/reset-password`, { method:'POST', body:{channel:m.channel} });
      m.token = data.token;
      m.delivery = data.delivery;
      m.step  = 'sent';
      t.pendingReset = { channel:m.channel, createdAt:new Date().toISOString(), expiresAt:data.expires_at };
      t.deliveryStatus=data.delivery?.status; t.deliveryChannel=m.channel; t.deliveryAt=new Date().toISOString();
      render();
    } catch (err) {
      m.error=err.message; render();
    }
  });
  wrap.querySelector('#btn-copy-reset-link')?.addEventListener('click', () => {
    copyInputValue('reset-link-input', document.getElementById('btn-copy-reset-link'));
  });
  wrap.querySelector('#btn-copy-reset-otp')?.addEventListener('click', () => copyInputValue('reset-otp-input', document.getElementById('btn-copy-reset-otp')));

  // Platform Admins: form field state + create
  wrap.querySelector('#platform-admin-search')?.addEventListener('input', e => {
    S.platformAdminQuery = e.target.value;
    clearTimeout(S._platformSearchTimer);
    S._platformSearchTimer = setTimeout(() => {
      render();
      const input = document.getElementById('platform-admin-search');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    }, 180);
  });
  wrap.querySelector('#platform-admin-filter')?.addEventListener('change', e => {
    S.platformAdminStatus = e.target.value;
    render();
  });
  wrap.querySelector('#new-sa-name')?.addEventListener('input', e => {
    S._newSA = { ...(S._newSA || {}), name: e.target.value };
    S.platformAdminError = '';
  });
  wrap.querySelector('#new-sa-email')?.addEventListener('input', e => {
    S._newSA = { ...(S._newSA || {}), email: e.target.value };
    S.platformAdminError = '';
  });
  wrap.querySelector('#new-sa-phone')?.addEventListener('input', e => {
    S._newSA = { ...(S._newSA || {}), phone: e.target.value };
    S.platformAdminError = '';
  });
  wrap.querySelector('#btn-create-sa')?.addEventListener('click', async event => {
    const f = S._newSA || {};
    const name  = (f.name || '').trim();
    const email = (f.email || '').trim().toLowerCase();
    const phone = (f.phone || '').trim();
    if (!name || !email) { S.platformAdminError = 'Name and email are required.'; render(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { S.platformAdminError = 'Enter a valid email address.'; render(); return; }
    if (SUPER_ADMINS.some(a => a.email.toLowerCase() === email)) {
      S.platformAdminError = 'A platform admin with that email already exists.'; render(); return;
    }
    const button = event.currentTarget;
    button.disabled = true; button.textContent = 'Creating…';
    try {
      const data = await api('/platform/users', { method:'POST', body:{ name,email,phone,role:'superadmin',company_id:S.activeSuperAdmin?.company_id } });
      const newSA = { id:data.user.id,name,email,phone,status:'active',role:'Super Admin',mustChangePassword:true,createdAt:new Date().toISOString().slice(0,10),lastLoginAt:null };
      SUPER_ADMINS.push(newSA);
      S._newSAResult = { name,email,tempPassword:data.temporary_password };
      S._newSA = null;
      S.platformAdminError = '';
      await loadPlatformData();
      render();
    } catch (error) { S.platformAdminError = error.message; render(); }
  });
  wrap.querySelector('#btn-copy-sa-password')?.addEventListener('click', event => {
    copyInputValue('new-sa-password', event.currentTarget);
  });
  wrap.querySelector('#btn-dismiss-sa-result')?.addEventListener('click', () => { S._newSAResult = null; render(); });

  wrap.querySelectorAll('[data-platform-edit]').forEach(button => button.addEventListener('click', () => {
    S.platformAdminModal = { type:'edit', id:Number(button.dataset.platformEdit) };
    render();
  }));
  wrap.querySelectorAll('[data-platform-reset]').forEach(button => button.addEventListener('click', () => {
    S.platformAdminModal = { type:'reset', id:Number(button.dataset.platformReset), step:'confirm' };
    render();
  }));
  wrap.querySelectorAll('[data-platform-remove]').forEach(button => button.addEventListener('click', () => {
    S.platformAdminModal = { type:'remove', id:Number(button.dataset.platformRemove) };
    render();
  }));
  wrap.querySelectorAll('[data-platform-status]').forEach(button => button.addEventListener('click', async () => {
    const admin = SUPER_ADMINS.find(item => item.id === Number(button.dataset.platformStatus));
    if (!admin) return;
    const status = admin.status === 'active' ? 'suspended' : 'active';
    if (status === 'suspended' && !confirm(`Suspend ${admin.name}? They will immediately lose platform access.`)) return;
    button.disabled = true;
    try {
      await api(`/platform/users/${admin.id}`, { method:'PUT', body:{status} });
      await loadPlatformData(); render();
    } catch (error) { alert(error.message); button.disabled = false; }
  }));

  wrap.querySelectorAll('[data-platform-modal-close]').forEach(element => element.addEventListener('click', event => {
    if (event.target === element) { S.platformAdminModal = null; render(); }
  }));
  wrap.querySelector('#btn-save-platform-admin')?.addEventListener('click', async event => {
    const modal = S.platformAdminModal;
    if (!modal) return;
    const name = (document.getElementById('platform-edit-name')?.value || '').trim();
    const email = (document.getElementById('platform-edit-email')?.value || '').trim().toLowerCase();
    const phone = (document.getElementById('platform-edit-phone')?.value || '').trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { modal.error = 'A full name and valid email are required.'; render(); return; }
    event.currentTarget.disabled = true; event.currentTarget.textContent = 'Saving…';
    try {
      await api(`/platform/users/${modal.id}`, { method:'PUT', body:{name,email,phone} });
      S.platformAdminModal = null; await loadPlatformData(); render();
    } catch (error) { modal.error = error.message; render(); }
  });
  wrap.querySelector('#btn-generate-platform-reset')?.addEventListener('click', async event => {
    const modal = S.platformAdminModal;
    if (!modal) return;
    event.currentTarget.disabled = true; event.currentTarget.textContent = 'Generating…';
    try {
      const data = await api(`/platform/users/${modal.id}/reset-password`, { method:'POST', body:{channel:'email'} });
      modal.step = 'sent'; modal.token = data.token; modal.delivery=data.delivery;
      render();
    } catch (error) { modal.error = error.message; render(); }
  });
  wrap.querySelector('#btn-copy-platform-reset')?.addEventListener('click', event => {
    copyInputValue('platform-reset-link', event.currentTarget);
  });
  wrap.querySelector('#btn-confirm-platform-remove')?.addEventListener('click', async event => {
    const modal = S.platformAdminModal;
    if (!modal) return;
    event.currentTarget.disabled = true; event.currentTarget.textContent = 'Removing…';
    try {
      await api(`/platform/users/${modal.id}`, { method:'DELETE' });
      S.platformAdminModal = null; await loadPlatformData(); render();
    } catch (error) { modal.error = error.message; render(); }
  });

  // Companies tab: select tenant
  wrap.querySelectorAll('[data-select]').forEach(btn => {
    btn.addEventListener('click', () => { S.selectedTenantId = btn.dataset.select; render(); });
  });
  // Toggle module license
  wrap.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.toggle;
      if (key !== 'pos') return;
      const id = S.selectedTenantId;
      if (!S.licenses[id]) S.licenses[id] = {};
      const next = !S.licenses[id][key];
      const tenant = getTenant(id);
      try {
        await api(`/platform/companies/${tenant.companyId}`, { method:'PUT', body:{ name:tenant.name, pos_enabled:next } });
        S.licenses[id][key] = next;
        render();
      } catch (error) { alert(error.message); }
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
      S.tenantForm = { ...t, adminEmail:t.adminEmail||'', adminPhone:t.adminPhone||'', deliveryChannel:t.deliveryChannel||'email' };
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
    adminEmail:'', adminPhone:'+252 ', deliveryChannel:'email',
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
          <div style="grid-column:1/span 2" class="form-group"><label class="form-label">Company name *</label><input class="form-input" id="mf-name" placeholder="e.g. Marka Coastal Trading" value="${esc(f.name||'')}"/></div>
          <div class="form-group"><label class="form-label">Owner name *</label><input class="form-input" id="mf-owner" placeholder="e.g. Deqa Abdirahman" value="${esc(f.owner||'')}"/></div>
          <div class="form-group"><label class="form-label">City</label><select class="form-select" id="mf-city">${['Mogadishu','Hargeisa','Bosaso','Kismayo','Baidoa','Garowe'].map(c=>`<option${c===f.city?' selected':''}>${c}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Plan</label><select class="form-select" id="mf-plan">${['Starter','Business','Enterprise'].map(p=>`<option${p===f.plan?' selected':''}>${p}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Server location</label><select class="form-select" id="mf-region">${['SO-MG-1','SO-HL-1','SO-BO-1','SO-KI-1','SO-BA-1'].map(r=>`<option${r===f.region?' selected':''}>${r}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Number of users</label><input class="form-input" id="mf-users" type="number" min="0" placeholder="0" value="${f.users||0}"/></div>
          <div class="form-group"><label class="form-label">Monthly fee (USD)</label><input class="form-input" id="mf-invoice" placeholder="e.g. 1,100" value="${esc(f.invoice||'')}"/></div>

          <!-- Credentials -->
          <div class="cred-box">
            <div class="cred-box-header">
              <div><div class="cred-eyebrow">Step 2 · Auto-created</div><div class="cred-title">Company Admin login</div><div class="cred-subtitle">Cor makes ONE admin account. They'll create their own staff after signing in.</div></div>
              <span class="pill pill-green">Secure server generation</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="form-group"><label class="cred-field-label">Admin email (login)</label><input class="cred-input" id="mf-admin-email" placeholder="admin@company.so" value="${esc(f.adminEmail||'')}"/></div>
              <div class="form-group"><label class="cred-field-label">Phone (for SMS OTP)</label><input class="cred-input" id="mf-admin-phone" placeholder="+252 61 000 0000" value="${esc(f.adminPhone||'')}"/></div>
              <div class="form-group" style="grid-column:1/span 2">
                <label class="cred-field-label">Temporary password</label>
                <div class="flex gap-6" style="margin-top:4px">
                  <input class="cred-input pw" id="mf-admin-pw" value="Generated after company is saved" readonly style="flex:1"/>
                </div>
                <div class="cred-hint">Admin must change this on first sign-in. Never shown again after this screen.</div>
              </div>
              <div style="grid-column:1/span 2" class="cred-checkboxes">
                <label class="cred-checkbox"><input type="radio" name="delivery-channel" value="email" ${(f.deliveryChannel||'email')==='email'?'checked':''}/> Send by email</label>
                <label class="cred-checkbox"><input type="radio" name="delivery-channel" value="sms" ${f.deliveryChannel==='sms'?'checked':''}/> Send by SMS</label>
                <label class="cred-checkbox" style="margin-left:auto"><input type="checkbox" checked/> Force change on first login</label>
              </div>
            </div>
          </div>

          <!-- Module licenses: only live modules are selectable; others locked -->
          <div style="grid-column:1/span 2;padding:16px 18px;background:#FFFCEF;border:1px dashed rgba(245,196,17,0.6);border-radius:12px">
            <div class="label-xs" style="color:#8B5A00">Step 3 · Modules the admin can open</div>
            <div style="font-size:12.5px;color:var(--text-secondary);margin:3px 0 10px">Only live modules can be assigned. More modules coming soon.</div>
            <div class="module-license-grid">

              <!-- ✅ Retail POS — LIVE, selectable -->
              <label class="module-license-label" style="border:1.5px solid rgba(34,197,94,0.4);background:rgba(34,197,94,0.06);border-radius:8px;padding:7px 10px">
                <input type="checkbox" id="mf-mod-pos" style="accent-color:#F5C411" checked/>
                <span>🛒 Retail POS</span>
                <span style="font-size:10px;color:#0F7A3A;font-weight:700;margin-left:4px">&#9679; Live</span>
              </label>

              <!-- 🔒 All other modules — coming soon, disabled -->
              ${[
                ['💊','Pharmacy'],
                ['💰','Financials'],
                ['📊','CRM &amp; Sales'],
                ['👥','HR &amp; Payroll'],
                ['🎓','University'],
                ['🏨','Hotel &amp; Booking'],
                ['🏥','Hospital'],
              ].map(([emoji, name]) => `
                <label class="module-license-label" style="opacity:0.5;cursor:not-allowed;border:1.5px dashed var(--border);border-radius:8px;padding:7px 10px">
                  <input type="checkbox" disabled style="accent-color:#ccc"/>
                  <span>${emoji} ${name}</span>
                  <span style="font-size:10px;color:#7A5FB8;font-weight:700;margin-left:4px">🔒 Soon</span>
                </label>
              `).join('')}

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
  modal.querySelector('#btn-save-tenant').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const name  = modal.querySelector('#mf-name').value.trim();
    const owner = modal.querySelector('#mf-owner').value.trim();
    if (!name || !owner) { alert('Please fill in Company name and Owner name.'); return; }

    const adminEmail = modal.querySelector('#mf-admin-email').value.trim();
    const adminPhone = modal.querySelector('#mf-admin-phone').value.trim();
    const city   = modal.querySelector('#mf-city').value;
    const plan   = modal.querySelector('#mf-plan').value;
    const region = modal.querySelector('#mf-region').value;
    const users  = parseInt(modal.querySelector('#mf-users').value) || 0;
    const invoice= modal.querySelector('#mf-invoice').value;
    const deliveryChannel = modal.querySelector('input[name="delivery-channel"]:checked')?.value || 'email';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) { alert('Enter a valid Company Admin email.'); return; }
    if (deliveryChannel === 'sms' && adminPhone.replace(/\D/g,'').length < 8) { alert('Enter a valid phone number for SMS delivery.'); return; }

    // Show any inline error message on the modal footer.
    const showError = (msg) => {
      let err = modal.querySelector('.modal-error');
      if (!err) {
        err = document.createElement('div');
        err.className = 'modal-error';
        err.style.cssText = 'padding:10px 14px;background:#FEF0EE;border:1px solid #FDA29B;color:#B42318;font-size:12.5px;font-weight:700;border-radius:8px;margin:8px 20px 0';
        modal.querySelector('.modal-footer').parentNode.insertBefore(err, modal.querySelector('.modal-footer'));
      }
      err.textContent = msg;
    };

    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = S.tenantModalMode === 'create' ? 'Creating…' : 'Saving…';

    try {
      if (S.tenantModalMode === 'create') {
        const result = await api('/platform/companies', {
          method: 'POST',
          body: { name, admin_name:owner, admin_email:adminEmail, admin_phone:adminPhone, phone:adminPhone, city, country:'Somalia', branch_name:'Main Store', status:'active', delivery_channel:deliveryChannel },
        });
        await loadPlatformData();
        showCompanyCreationResult(modal, {name,adminEmail,tempPassword:result.temporary_password,delivery:result.delivery});
        return;
      } else {
        // EDIT — send the changed fields to PUT /companies/{id}
        const companyId = S.tenantForm.companyId;
        if (companyId) {
          await api(`/platform/companies/${companyId}`, {
            method: 'PUT',
            body: { name, phone: adminPhone, city, country: 'Somalia', status: 'active' },
          });
        }
        await loadPlatformData();
      }

      modal.remove();
      S.tenantModalMode = null;
      render();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = origText;
      showError(err.message || 'Something went wrong. Try again.');
    }
  });
}

function showCompanyCreationResult(host, result) {
  const delivery=result.delivery||{status:'failed',channel:'email',message:'No delivery result was returned.'};
  const okay=['sent','preview'].includes(delivery.status);
  host.innerHTML=`<div class="modal-backdrop">
    <div class="modal-box" style="max-width:560px">
      <div class="modal-header"><div class="modal-icon">✓</div><div style="flex:1"><div class="label-xs text-gold">Company created</div><div style="font-size:19px;font-weight:800">${esc(result.name)}</div></div></div>
      <div class="modal-body">
        <div style="padding:13px;border-radius:10px;background:${okay?'#ECFDF3':'#FEE4E2'};color:${okay?'#166534':'#B42318'};font-size:13px;margin-bottom:16px"><b>${esc(delivery.channel==='sms'?'SMS':'Email')} ${esc(delivery.status)}</b><br>${esc(delivery.message)} ${delivery.destination?`Destination: ${esc(delivery.destination)}.`:''}</div>
        <div class="form-group"><label class="form-label">Admin login</label><input class="form-input" value="${esc(result.adminEmail)}" readonly/></div>
        ${(delivery.status==='preview'||delivery.status==='failed')?`<div class="form-group"><label class="form-label">Temporary password — local/manual fallback</label><div style="display:flex;gap:8px"><input class="form-input mono" id="created-company-password" value="${esc(result.tempPassword)}" readonly/><button class="btn btn-primary btn-sm" id="btn-copy-company-password">Copy</button></div><div class="cred-hint">Shown because a production delivery provider is not active. Share securely and only once.</div></div>`:''}
      </div>
      <div class="modal-footer"><button class="btn btn-gold" id="btn-company-result-done">Done</button></div>
    </div></div>`;
  host.querySelector('#btn-copy-company-password')?.addEventListener('click',event=>copyInputValue('created-company-password',event.currentTarget));
  host.querySelector('#btn-company-result-done').addEventListener('click',()=>{host.remove();S.tenantModalMode=null;S.superTab='admins';render();});
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
  modal.querySelector('#btn-confirm-del').addEventListener('click', async () => {
    const id = S.confirmDeleteId;
    const tenant = getTenant(id);
    try {
      await api(`/platform/companies/${tenant.companyId}`, { method:'DELETE' });
      await loadPlatformData();
      if (S.selectedTenantId === id) S.selectedTenantId = S.tenants[0]?.id || '';
      S.confirmDeleteId=null; modal.remove(); render();
    } catch (error) { alert(error.message); }
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

  // Only Retail POS is live. Every other module is Coming Soon.
  const LIVE_MODULE = 'pos';

  const modules = MODULES_DEF.map(m => ({
    ...m,
    live: m.key === LIVE_MODULE,
  }));

  const modEmoji = { pharmacy:'\ud83d\udc8a', financials:'\ud83d\udcb0', crm:'\ud83d\udcca', hr:'\ud83d\udc65', pos:'\ud83d\uded2', university:'\ud83c\udf93', hotel:'\ud83c\udfe8', hospital:'\ud83c\udfe5' };

  div.innerHTML = `
    <header class="workspace-header">
      <svg width="34" height="34" viewBox="0 0 64 64" fill="none"><rect x="2" y="2" width="60" height="60" rx="12" fill="#3B2170"/><path d="M22 20 L12 32 L22 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 20 L52 32 L42 44" stroke="#FFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="30" y="14" width="4" height="36" rx="2" fill="#F5C411" transform="rotate(15 32 32)"/></svg>
      <div>
        <div class="workspace-brand-name">${esc(S.currentCompany)}</div>
        <div class="workspace-brand-sub">Company workspace · Cor platform</div>
      </div>
      <div class="workspace-header-actions">
        <div class="workspace-user-pill">
          <div style="width:26px;height:26px;border-radius:50%;background:#F5C411;color:#2D1859;display:grid;place-items:center;font-weight:900;font-size:10px">${initials(S.activeCompanyAdmin?.name || '')}</div>
          ${esc(S.activeCompanyAdmin?.name || 'Company user')}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </div>
        <button class="btn btn-outline btn-sm" id="btn-ws-logout" style="color:#FFF;border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.1)">Sign out</button>
      </div>
    </header>

    <div style="padding:40px;background:var(--bg-page);min-height:calc(100vh - 74px)">
      <div style="max-width:1200px;margin:0 auto">

        <!-- Header -->
        <div style="margin-bottom:32px">
          <div class="label-md" style="color:#F5C411;background:#2D1859;display:inline-block;padding:4px 10px;border-radius:6px;margin-bottom:10px">Cor Curdun</div>
          <h1 style="font-size:26px;font-weight:900;letter-spacing:-0.5px">Your systems</h1>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px">
            <span class="pill pill-green" style="margin-right:8px">&#9679; 1 module live</span>
            More modules launching soon — stay tuned.
          </div>
        </div>

        <!-- Module grid -->
        <div class="workspace-modules-grid">
          ${modules.map(m => `
            <div class="ws-module-card ${m.live ? 'active' : 'ws-cs-card'}">

              ${m.live ? `
                <!-- LIVE badge -->
                <span class="ws-module-badge active" style="background:rgba(34,197,94,0.15);color:#0F7A3A;border:1px solid rgba(34,197,94,0.3)">&#9679;&nbsp;Live</span>
              ` : `
                <!-- COMING SOON badge -->
                <span class="ws-cs-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Coming Soon
                </span>
              `}

              <div style="font-size:32px;margin-top:12px;margin-bottom:4px">${modEmoji[m.key] || '\u2699\ufe0f'}</div>
              <div class="ws-module-title ${m.live ? 'active' : 'inactive'}">${m.name}</div>
              <div class="ws-module-desc ${m.live ? 'active' : 'inactive'}">${m.desc}</div>
              <div class="ws-module-foot ${m.live ? 'active' : 'inactive'}">
                ${m.live ? (m.users + ' users \u00b7 ' + (m.branches || 'ready')) : 'In development'}
              </div>

              ${m.live ? `
                <button class="ws-launch-btn active" data-launch="${m.key}">Launch ${m.name} \u2192</button>
              ` : `
                <button class="ws-cs-btn" disabled>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Coming soon
                </button>
              `}
            </div>
          `).join('')}
        </div>

        <!-- Roadmap note -->
        <div class="ws-roadmap-note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>Pharmacy, Hospital, University, Hotel &amp; Booking, and Finance modules are actively in development and will be released in upcoming updates. Contact <strong>support@curdun.so</strong> to join the early access list.</span>
        </div>

      </div>
    </div>
  `;

  div.querySelector('#btn-ws-logout').addEventListener('click', () => posLogout());

  // Only the POS launch button does anything
  div.querySelectorAll('[data-launch]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.launch;
      if (key === 'pos') {
        const role = posRoleName(S.activeCompanyAdmin || {});
        S.posActiveUser = { ...mapStaff(S.activeCompanyAdmin || {}), role, access:POS_ROLES[role] || POS_ROLES.Cashier };
        S.view = 'pos';
        // Route to store selector if no type chosen yet, else straight to back-office
        S.posView = S.posStoreType ? 'backoffice' : 'selector';
        S.posBackofficeTab = 'dashboard';
        S.posCart = [];
        S.posReceiptVisible = false;
        render();
        try { await posBootstrap(); } catch (error) { S.posAuthError=error.message; render(); }
      }
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
  { id:1, name:'Fartun Ali',     username:'fartun.a',  pin:'', role:'Senior Cashier',  store:'Bakaara Main',   shift:'Morning',  sales:186, status:'active', access:['dash','checkout','transactions'] },
  { id:2, name:'Mohamed Farah',  username:'mohamed.f', pin:'', role:'Cashier',         store:'Hodan Store',    shift:'Morning',  sales:124, status:'active', access:['dash','checkout','transactions'] },
  { id:3, name:'Ismail Omar',    username:'ismail.o',  pin:'', role:'Cashier',         store:'Wadajir Store',  shift:'Afternoon',sales:98,  status:'active', access:['dash','checkout','transactions'] },
  { id:4, name:'Khadija Abdi',   username:'khadija.a', pin:'', role:'Store Manager',   store:'Bakaara Main',   shift:'Full day', sales:0,   status:'active', access:['dash','checkout','products','customers','transactions','reports','notifications','staff'] },
  { id:5, name:'Hassan Yusuf',   username:'hassan.y',  pin:'', role:'Cashier',         store:'Hamar Weyne',    shift:'Morning',  sales:72,  status:'active', access:['dash','checkout','transactions'] },
  { id:6, name:'Nimco Ali',      username:'nimco.a',   pin:'', role:'Cashier',         store:'Hodan Store',    shift:'Afternoon',sales:45,  status:'break',  access:['dash','checkout','transactions'] },
];

// ============================================================
// PLATFORM SUPER ADMINS — Cor Curdun operators
// ============================================================
// The first entry is the platform-default super admin, always present.
// Additional super admins can be created from the Super Admin console
// ("Platform Admins" tab). New entries start with mustChangePassword:true
// so the recipient is forced to set their own password on first sign-in.
const SUPER_ADMINS = [];

// Company Admins — auto-created when Cor Super Admin provisions a company.
// Login flow:
//  - Core workspace: tempPassword works (never forced to change here)
//  - Any active module (Retail POS): tempPassword works ONCE; forces
//    module password creation on first login
// ============================================================
// POS ACCESS-LEVEL MODEL — Odoo Retail POS (Rule #5/#6/#7/#8)
// ============================================================
// Internal engine works on MINIMAL / BASIC / ADVANCED. Friendly
// business-role names (Cashier, Senior Cashier, Store Manager,
// Admin) are display labels only — they map to a level below.
// The backend hydrates the same table via GET /api/v1/pos/access so
// frontend and backend stay in lockstep (Rule #16).
const POS_LEVEL_MINIMAL  = 'MINIMAL';
const POS_LEVEL_BASIC    = 'BASIC';
const POS_LEVEL_ADVANCED = 'ADVANCED';
const POS_LEVEL_RANK = { MINIMAL:1, BASIC:2, ADVANCED:3 };

// Friendly role → Odoo level. superadmin is always ADVANCED.
const POS_ROLE_TO_LEVEL = {
  'Cashier':        POS_LEVEL_MINIMAL,
  'Senior Cashier': POS_LEVEL_BASIC,
  'Store Manager':  POS_LEVEL_ADVANCED,
  'Admin':          POS_LEVEL_ADVANCED,
  // Backend role slugs (kept in sync with Core\PosAccess::ROLE_LEVEL)
  'cashier':        POS_LEVEL_MINIMAL,
  'senior_cashier': POS_LEVEL_BASIC,
  'store_manager':  POS_LEVEL_ADVANCED,
  'admin':          POS_LEVEL_ADVANCED,
  'superadmin':     POS_LEVEL_ADVANCED,
};

// Capabilities each Odoo 19 level unlocks (higher levels inherit lower).
// Kept in strict lockstep with backend Core\PosAccess::CAPS.
// pos.staff_admin / pos.customer_admin / pos.settings are DELIBERATELY absent
// — those are ERP-account permissions gated by AccountPermissionMiddleware.
// Odoo separates POS access from backend access: an Advanced POS employee who
// has no database user cannot enter Staff / Settings / Product admin.
const POS_CAPABILITIES = {
  MINIMAL: [
    'pos.enter','pos.sell','pos.search_products','pos.select_customer',
    'pos.order_note','pos.promo_code','pos.payment_receive','pos.order_validate',
    'pos.employee_switch','pos.lock','pos.reload',
    'pos.orders_view','pos.orders_search',
    'pos.reprint_receipt','pos.reprint_invoice','pos.reports_view',
  ],
  BASIC: [
    'pos.register_open','pos.opening_control','pos.cash_in','pos.cash_out',
    'pos.refund','pos.cancel_order','pos.customer_create',
    'pos.discount_apply','pos.price_change',
    'pos.pricelist_select','pos.loyalty_operate',
    'pos.settle_sales_order','pos.fiscal_position_switch',
  ],
  ADVANCED: [
    'pos.register_close','pos.closing_control','pos.reconciliation',
    'pos.product_admin',
  ],
};

// Which POS sidebar tabs each level sees. Odoo doesn't have a Curdun-style
// sidebar, but this maps to what the different levels manage in Odoo:
// MINIMAL only sees selling; BASIC adds customers/refund history;
// ADVANCED adds staff/settings/reports.
const POS_ROLES = {
  MINIMAL:  ['dash','checkout','transactions'],
  BASIC:    ['dash','checkout','transactions','customers','notifications'],
  ADVANCED: ['dash','checkout','transactions','sessions','payments','products','customers','reports','notifications','staff','settings'],
  // Aliases for legacy code that still passes display names/role slugs.
  'Cashier':       ['dash','checkout','transactions'],
  'Senior Cashier':['dash','checkout','transactions','customers','notifications'],
  'Store Manager': ['dash','checkout','transactions','sessions','payments','products','customers','reports','notifications','staff'],
  'Admin':         ['dash','checkout','transactions','sessions','payments','products','customers','reports','notifications','staff','settings'],
};

// Compatibility shim — old code paths use these action names; each now maps
// to a canonical capability. Anything not in this map defaults to false
// (least privilege) so unknown legacy checks don't accidentally allow.
// Legacy action-name shims. Anything mapped to a null value here is an
// ERP-account permission — the frontend cannot answer it from POS level
// alone; the caller should check S.posAccountPermissions instead. posCan()
// returns false for these so buttons stay hidden until back-office data
// tells us the account carries the permission.
const POS_LEGACY_ACTION_CAP = {
  sell:          'pos.sell',
  smallDiscount: 'pos.discount_apply',
  largeDiscount: 'pos.discount_apply',
  refund:        'pos.refund',
  voidOrder:     'pos.refund',
  cashInOut:     'pos.cash_in',
  openRegister:  'pos.register_open',
  closeRegister: 'pos.register_close',
  editProducts:  'pos.product_admin',
  // These are ERP-permission-gated (see AccountPermissionMiddleware). The
  // POS level does not answer them — hidden until the ERP account grants.
  viewMargin:    null,
  manageStaff:   null,
  settings:      null,
};

/**
 * Odoo access level for a user. Prefers the highest level any of their
 * roles maps to. Unknown roles map to null → posCan returns false.
 */
function posLevelForUser(user) {
  const u = user || S.posActiveUser;
  if (!u) return null;
  const rawRoles = Array.isArray(u.roles) ? u.roles : (u.role ? [u.role] : []);
  let best = null;
  for (const r of rawRoles) {
    const lvl = POS_ROLE_TO_LEVEL[r];
    if (!lvl) continue;
    if (!best || POS_LEVEL_RANK[lvl] > POS_LEVEL_RANK[best]) best = lvl;
  }
  return best;
}

/**
 * posCan(actionOrCapability, user?)
 *   Preferred usage passes a capability name (e.g. 'pos.refund'). Legacy
 *   action names ('refund', 'openRegister', …) map via POS_LEGACY_ACTION_CAP.
 *   Returns true / false. The old 'pin' return value is gone — approval
 *   is now driven by pos_settings.extra_security (Rule #9); see P2.
 */
function posCan(actionOrCapability, user) {
  // Legacy action name → capability. If the legacy shim maps to null, the
  // action is ERP-permission-gated and posCan cannot resolve it.
  let cap = actionOrCapability;
  if (Object.prototype.hasOwnProperty.call(POS_LEGACY_ACTION_CAP, actionOrCapability)) {
    cap = POS_LEGACY_ACTION_CAP[actionOrCapability];
    if (cap === null) {
      // Fall back to the ERP account permission list from /auth/login.
      const acct = S.activeSuperAdmin || S.activeCompanyAdmin || {};
      const perms = Array.isArray(acct.permissions) ? acct.permissions : [];
      const roles = Array.isArray(acct.roles) ? acct.roles : [];
      if (roles.includes('superadmin')) return true;
      const map = { viewMargin:'reports.view', manageStaff:'users.view', settings:'settings.manage' };
      const need = map[actionOrCapability];
      return need ? perms.includes(need) : false;
    }
  }
  const level = posLevelForUser(user);
  if (!level) return false;
  const rank = POS_LEVEL_RANK[level];
  for (const [capLevel, caps] of Object.entries(POS_CAPABILITIES)) {
    if (POS_LEVEL_RANK[capLevel] > rank) continue;
    if (caps.includes(cap)) return true;
  }
  return false;
}

// ============================================================
// PAYMENT-LINE HELPERS (Odoo-style split payments — P3 Stage B)
// ============================================================
// Financial identity of a method is (name, type), not the display label.
// Types drive UI + backend behaviour: cash carries tender/change; mobile
// carries an optional reference; credit is Customer Account (Deyn) and
// requires a customer at the ORDER level (not per line).

function posMethodType(name) {
  const key = String(name || '').toLowerCase();
  if (key === 'cash') return 'cash';
  if (key === 'deyn' || key === 'customer_account' || key === 'customer account') return 'credit';
  return 'mobile';
}

// Configured methods for THIS POS, in enabled order. Comes from
// pos_settings.payments (delivered by /pos/bootstrap and refreshed by
// posSaveSettings). Never hardcode the six names — an Admin can turn any
// of them off or add another method later.
function posConfiguredMethods() {
  const cfg = (S.storeSettings && S.storeSettings.payments) || {};
  return Object.keys(cfg)
    .filter(name => cfg[name])
    .map(name => ({ name, type: posMethodType(name) }));
}

function posPaymentLinesPaid() {
  return (S.posPaymentLines || []).reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
}

function posPaymentLinesRemaining(total) {
  const remaining = Number((total - posPaymentLinesPaid()).toFixed(2));
  return remaining > 0 ? remaining : 0;
}

function posHasDeynLine() {
  return (S.posPaymentLines || []).some(line => line.method_type === 'credit');
}

function posDeynLineAmount() {
  return (S.posPaymentLines || [])
    .filter(line => line.method_type === 'credit')
    .reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
}

// Add a line for the given method name. Defaults the amount to the current
// remaining (Odoo behaviour). Cash lines get a tender that defaults to the
// amount; the user can adjust for over-tender. Non-cash lines have no
// tender/change concept.
function posAddPaymentLine(name, orderTotal) {
  const type = posMethodType(name);
  const remaining = posPaymentLinesRemaining(orderTotal);
  const amount = remaining > 0 ? remaining : orderTotal;
  const line = { method_name: name, method_type: type, amount };
  if (type === 'cash') line.tendered = amount;
  S.posPaymentLines = [...(S.posPaymentLines || []), line];
}

function posRemovePaymentLine(idx) {
  S.posPaymentLines = (S.posPaymentLines || []).filter((_, i) => i !== idx);
}

function posUpdatePaymentLine(idx, patch) {
  S.posPaymentLines = (S.posPaymentLines || []).map((line, i) => {
    if (i !== idx) return line;
    const next = { ...line, ...patch };
    // Cash: if amount changed and tendered wasn't explicitly set to more,
    // keep tendered at least equal to amount (Odoo default: exact tender).
    if (next.method_type === 'cash' && (patch.amount !== undefined) && (patch.tendered === undefined)) {
      if ((Number(next.tendered) || 0) < Number(next.amount)) next.tendered = Number(next.amount);
    }
    return next;
  });
}

// Full allocation check used by the Validate button. Never trust this on
// the server — it's a UX gate only; the backend re-checks every line.
function posPaymentLinesValid(orderTotal) {
  const lines = S.posPaymentLines || [];
  if (!lines.length) return { ok:false, reason:'Add at least one payment line' };
  for (const line of lines) {
    const amt = Number(line.amount) || 0;
    if (amt <= 0) return { ok:false, reason:`${line.method_name}: amount must be > 0` };
    if (line.method_type === 'cash') {
      const tendered = Number(line.tendered) || 0;
      if (tendered + 0.001 < amt) return { ok:false, reason:`${line.method_name}: tendered less than amount` };
    }
  }
  const remaining = posPaymentLinesRemaining(orderTotal);
  if (remaining > 0.001) return { ok:false, reason:`Remaining $${remaining.toFixed(2)} unallocated` };
  if (posPaymentLinesPaid() > orderTotal + 0.001) return { ok:false, reason:'Total payment amounts exceed order total' };
  if (posHasDeynLine() && !S.posDebtCustomerId) return { ok:false, reason:'Deyn requires a customer' };
  return { ok:true };
}

function posResetPaymentLines() {
  S.posPaymentLines = [];
  S.posDebtCustomerId = null;
  S.posCashTendered = '';
}

/**
 * requireManagerApproval(action, options, onApproved)
 *   Renders a Manager PIN modal. On PIN match (against a user with role
 *   Store Manager or Admin in POS_STAFF), calls onApproved({ manager }).
 *   Cancels silently on close/×.
 */
function requireManagerApproval(action, options, onApproved) {
  S.posRegisterModal = {
    mode: 'manager-approval',
    action,
    label: options.label || action,
    reason: options.reason || '',
    onApproved,
    pin: '',
    error: '',
    busy: false,
  };
  render();
}

function renderPOSLogin() {
  const pin = S.posLoginPin || '';
  const dots = [0,1,2,3].map(i =>
    `<div class="pin-dot ${i < pin.length ? 'filled' : ''}"></div>`
  ).join('');

  const staffList = POS_STAFF.map(s => `
    <button class="login-staff-btn" data-login-id="${s.id}">
      <div class="avatar avatar-sm" style="background:var(--purple-800);color:#FFF">${initials(s.name)}</div>
      <div>
        <div style="font-weight:700;font-size:13px">${esc(s.name)}</div>
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
          <div style="font-weight:800;font-size:16px">${esc(a.name)}</div>
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
          ${pwField({ id:'pos-new-pw', placeholder:'At least 10 characters', autocomplete:'new-password', required:true })}
        </label>
        <label style="display:flex;flex-direction:column;gap:4px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--text-muted)">
          Confirm password
          ${pwField({ id:'pos-confirm-pw', placeholder:'Retype new password', autocomplete:'new-password', required:true })}
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
          ${pwField({ id:'pos-admin-pw', placeholder:'Temporary or POS password', autocomplete:'current-password', required:true })}
        </label>
        <button type="submit" class="btn btn-primary" style="margin-top:6px">Sign in</button>
      </form>
    `;
  } else if (!selectedStaff) {
    // Staff grid + (optional) admin escape hatch.
    //
    // The "Sign in as Admin (email)" link is ONLY useful when the operator
    // arrived at the POS station without a valid backoffice session (fresh
    // terminal) and needs to prove they're the tenant Admin.
    //
    // If the user is ALREADY signed in as Company Admin at the account level
    // (S.activeCompanyAdmin is set), asking them to re-enter email + password
    // is confusing and redundant. Instead, we show a subtle context banner
    // making the two-tier auth model explicit: they still need to identify
    // WHICH cashier they are operating as for this POS session.
    const alreadyAdmin = !!S.activeCompanyAdmin;
    const identityBanner = alreadyAdmin ? `
      <div style="background:var(--gray-50);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;text-align:left">
        <div style="font-size:11px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;font-weight:700">Signed in · account</div>
        <div style="font-weight:800;font-size:14px;color:var(--purple-800);margin-top:2px">${esc(S.activeCompanyAdmin.name)} <span style="font-size:11px;color:var(--text-muted);font-weight:600;letter-spacing:0.5px">· ${esc(S.activeCompanyAdmin.role || 'Admin')}</span></div>
        <div style="font-size:12px;color:var(--text-secondary);margin-top:6px;line-height:1.5">
          Choose the cashier identity for this POS session. Every sale is stamped with the cashier's PIN — a register can rotate through multiple cashiers during one open session.
        </div>
      </div>
    ` : '';
    body = `
      ${identityBanner}
      <div class="pos-login-staff-grid" id="login-staff-grid">
        ${staffList}
      </div>
      ${alreadyAdmin ? '' : `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border);text-align:center">
          <button type="button" class="btn-linklike" id="btn-open-admin-login"
            style="background:none;border:none;color:var(--purple-800);font-weight:700;font-size:13px;cursor:pointer;text-decoration:underline;padding:6px 10px">
            Sign in as Admin (email)
          </button>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Use this if you don't have a POS PIN yet.</div>
        </div>
      `}
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
        <button type="button" class="btn-linklike" id="btn-exit-pos-station" style="margin-top:16px;background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer;text-decoration:underline">Back to account sign-in</button>
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

  // Route to correct screen
  return renderPOSRouter();
}

// ============================================================
// POS — MASTER ROUTER (Odoo-style 3-screen architecture)
// ============================================================
function renderPOSRouter() {

  const wrap = document.createElement('div');
  wrap.style.minHeight = '100vh';

  switch (S.posView) {
    case 'selector': wrap.appendChild(renderPOSStoreSelector()); break;
    case 'session':  wrap.appendChild(renderPOSSession());       break;
    default:         wrap.appendChild(renderPOSBackoffice());    break;
  }

  // Register Control modal — Odoo-style Opening/Closing/Cash-in/Cash-out.
  // Renders as a fixed overlay on top of any POS screen. State lives in
  // S.posRegisterModal; wireRegisterModal() is called after paint.
  if (S.posRegisterModal) {
    const modalHost = document.createElement('div');
    modalHost.innerHTML = renderRegisterModal();
    wrap.appendChild(modalHost);
    setTimeout(() => wireRegisterModal(), 0);
  }
  // P6 — Refund modal overlay
  if (S.posRefundModal) {
    const refundHost = document.createElement('div');
    refundHost.innerHTML = renderPOSRefundModal();
    wrap.appendChild(refundHost);
    setTimeout(() => wireRefundModal(), 0);
  }
  return wrap;
}

// ============================================================
// REGISTER CONTROL — Opening, Closing, Cash In/Out modals
// Replaces the browser prompt() opening-balance flow with a proper
// Odoo-style Opening Control screen, and adds a full variance
// breakdown to the closing side.
// ============================================================
function renderRegisterModal() {
  const m = S.posRegisterModal;
  if (!m) return '';
  const summary = S.posSessionSummary || {};
  const session = S.posSession || {};
  const cashierName = S.posActiveUser?.name || '—';
  const configName  = session.config_name || S.posConfig?.name || S.storeSettings?.storeName || 'Main Register';
  const money = (n) => `$${Number(n || 0).toFixed(2)}`;
  const err = m.error ? `<div class="pin-error" style="margin:12px 0 0">${esc(m.error)}</div>` : '';

  let body = '', title = '', footer = '';

  if (m.mode === 'open') {
    // Opening Control
    title = 'Opening Control';
    const prev = Number(m.previousClosing || 0);
    body = `
      <div class="txn-detail-grid" style="margin-bottom:16px">
        <div class="txn-detail-row"><span>Register</span><strong>${esc(configName)}</strong></div>
        <div class="txn-detail-row"><span>Cashier</span><strong>${esc(cashierName)}</strong></div>
        <div class="txn-detail-row"><span>Previous closing cash</span><strong>${money(prev)}</strong></div>
      </div>
      <label class="form-label">Opening cash (USD)</label>
      <input class="form-input mono" id="rc-open-amount" type="number" min="0" step="0.01"
             value="${m.amount ?? prev.toFixed(2)}" placeholder="0.00" autofocus/>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Cash physically in the register before the first sale.</div>
      <label class="form-label" style="margin-top:14px">Note (optional)</label>
      <textarea class="form-input" id="rc-open-note" rows="2" placeholder="e.g. Started morning shift with change from safe">${esc(m.note || '')}</textarea>
      ${err}
    `;
    footer = `
      <button class="btn btn-ghost" data-rc-close>Cancel</button>
      <button class="btn btn-primary" id="rc-open-submit" ${m.busy?'disabled':''}>${m.busy?'Opening…':'Open Register'}</button>
    `;
  } else if (m.mode === 'close') {
    // Closing Control with full variance breakdown
    title = 'Closing Control';
    const opening = Number(session.opening_cash || 0);
    const cashSales   = Number(summary.cash_sales || summary.payment_methods?.find?.(p=>/cash/i.test(p.method))?.total || 0);
    const cashRefunds = Number(summary.cash_refunds || 0);
    const cashIn      = Number(summary.cash_movements?.in  || 0);
    const cashOut     = Number(summary.cash_movements?.out || 0);
    const expected    = Number(summary.expected_cash ?? (opening + cashSales - cashRefunds + cashIn - cashOut));
    const counted     = Number(m.counted || 0);
    const variance    = counted ? counted - expected : 0;
    const maxDiff     = Number(S.storeSettings?.maximumDifference ?? 2);
    const overLimit   = Math.abs(variance) > maxDiff;
    const varianceCls = variance === 0 ? 'trend-up' : overLimit ? 'trend-warn' : '';
    const varianceLabel = counted === 0 ? '—' : variance === 0 ? 'Perfect match' : variance > 0 ? `Over by ${money(variance)}` : `Short by ${money(Math.abs(variance))}`;
    body = `
      <div style="background:var(--gray-50);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-family:var(--font-mono);font-size:13px">
        <div style="display:flex;justify-content:space-between;padding:3px 0"><span>Opening cash</span><strong>${money(opening)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--green-dark)"><span>+ Cash sales</span><strong>${money(cashSales)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--red)"><span>− Cash refunds</span><strong>${money(cashRefunds)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--green-dark)"><span>+ Cash In</span><strong>${money(cashIn)}</strong></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;color:var(--red)"><span>− Cash Out</span><strong>${money(cashOut)}</strong></div>
        <hr style="border:0;border-top:1px dashed var(--border);margin:6px 0"/>
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-weight:800"><span>Expected cash</span><strong>${money(expected)}</strong></div>
      </div>
      <label class="form-label">Counted cash (USD)</label>
      <input class="form-input mono" id="rc-close-counted" type="number" min="0" step="0.01"
             value="${m.counted ?? ''}" placeholder="0.00" autofocus/>
      ${counted !== 0 ? `
        <div class="txn-detail-row" style="margin-top:10px;padding:10px 12px;background:var(--gray-50);border-radius:8px">
          <span>Difference</span>
          <strong class="${varianceCls}">${varianceLabel}</strong>
        </div>
        ${overLimit ? `
          <label class="form-label" style="margin-top:14px;color:var(--red-dark)">Manager PIN required (|variance| &gt; ${money(maxDiff)})</label>
          <input class="form-input mono" id="rc-close-manager-pin" type="password" inputmode="numeric"
                 maxlength="4" placeholder="••••" value="${m.managerPin || ''}"/>
        ` : ''}
      ` : ''}
      <label class="form-label" style="margin-top:14px">Closing note (optional)</label>
      <textarea class="form-input" id="rc-close-note" rows="2" placeholder="e.g. Missing $2 — cashier informed">${esc(m.note || '')}</textarea>
      ${err}
    `;
    footer = `
      <button class="btn btn-ghost" data-rc-close>Cancel</button>
      <button class="btn btn-primary" id="rc-close-submit" ${m.busy?'disabled':''}>${m.busy?'Closing…':'Close Register'}</button>
    `;
  } else if (m.mode === 'cash-in' || m.mode === 'cash-out') {
    // Cash In / Cash Out
    const label = m.mode === 'cash-in' ? 'Cash In' : 'Cash Out';
    title = `${label} — record cash movement`;
    body = `
      <div class="txn-detail-grid" style="margin-bottom:16px">
        <div class="txn-detail-row"><span>Register</span><strong>${esc(configName)}</strong></div>
        <div class="txn-detail-row"><span>Cashier</span><strong>${esc(cashierName)}</strong></div>
      </div>
      <label class="form-label">Amount (USD)</label>
      <input class="form-input mono" id="rc-cash-amount" type="number" min="0.01" step="0.01"
             value="${m.amount || ''}" placeholder="0.00" autofocus/>
      <label class="form-label" style="margin-top:12px">Reason</label>
      <input class="form-input" id="rc-cash-reason" placeholder="${m.mode==='cash-in'?'e.g. Additional change money':'e.g. Store supplies'}" value="${esc(m.reason || '')}"/>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">This becomes part of the register's session ledger and shows on Closing Control.</div>
      ${err}
    `;
    footer = `
      <button class="btn btn-ghost" data-rc-close>Cancel</button>
      <button class="btn btn-primary" id="rc-cash-submit" ${m.busy?'disabled':''}>${m.busy?'Recording…':'Record'}</button>
    `;
  } else if (m.mode === 'manager-approval') {
    // Manager PIN overlay — a cashier tried an action that needs approval.
    title = 'Manager approval required';
    body = `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--gray-50);border-radius:10px;margin-bottom:14px">
        <div class="avatar" style="width:44px;height:44px;background:var(--gold);color:var(--purple-800);font-size:14px;font-weight:900">!</div>
        <div>
          <div style="font-weight:800;font-size:14px">${esc(m.label)}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">
            Requested by <strong>${esc(cashierName)}</strong>. A Store Manager or Admin PIN is needed to approve.
          </div>
        </div>
      </div>
      <label class="form-label">Manager PIN</label>
      <input class="form-input mono" id="rc-mgr-pin" type="password" inputmode="numeric" maxlength="8"
             placeholder="••••" value="${m.pin || ''}" autofocus/>
      <label class="form-label" style="margin-top:12px">Reason (audit)</label>
      <input class="form-input" id="rc-mgr-reason" placeholder="e.g. Customer changed mind — 2 items returned" value="${esc(m.reason || '')}"/>
      ${err}
    `;
    footer = `
      <button class="btn btn-ghost" data-rc-close>Cancel</button>
      <button class="btn btn-primary" id="rc-mgr-submit" ${m.busy?'disabled':''}>${m.busy?'Approving…':'Approve'}</button>
    `;
  } else if (m.mode === 'closed-summary') {
    // Post-close receipt / summary shown after successful close.
    title = 'Register closed';
    const r = m.result || {};
    body = `
      <div style="background:#DEF7EC;color:#065F46;border:1px solid #86EFAC;padding:12px 14px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:12px">
        ✓ Session closed and posted.
      </div>
      <div class="txn-detail-grid">
        <div class="txn-detail-row"><span>Expected cash</span><strong>${money(r.expected_cash)}</strong></div>
        <div class="txn-detail-row"><span>Counted cash</span><strong>${money(r.counted_cash)}</strong></div>
        <div class="txn-detail-row"><span>Difference</span><strong class="${Number(r.variance)===0?'trend-up':'trend-warn'}">${money(r.variance)}</strong></div>
      </div>
    `;
    footer = `<button class="btn btn-primary" data-rc-close>Done</button>`;
  }

  return `
    <div class="crud-overlay" data-rc-close style="z-index:9999">
      <div class="crud-modal" style="max-width:480px" onclick="event.stopPropagation()">
        <div class="crud-modal-header">
          <h3>${title}</h3>
          <button class="crud-close-btn" data-rc-close>×</button>
        </div>
        <div class="crud-modal-body">${body}</div>
        <div class="crud-modal-footer">${footer}</div>
      </div>
    </div>
  `;
}

function wireRegisterModal() {
  // Close on backdrop / cancel / × / Done
  document.querySelectorAll('[data-rc-close]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) { S.posRegisterModal = null; render(); }
    });
  });

  const m = S.posRegisterModal;
  if (!m) return;

  // Live-update the counted field so the difference row + Manager PIN prompt
  // appear the moment the cashier types a value — no submit round trip.
  const countedInput = document.getElementById('rc-close-counted');
  if (countedInput) {
    countedInput.addEventListener('input', () => {
      m.counted = countedInput.value === '' ? '' : Number(countedInput.value);
      render();
    });
  }

  // Open Register
  document.getElementById('rc-open-submit')?.addEventListener('click', async () => {
    const opening = Number(document.getElementById('rc-open-amount').value);
    const note = (document.getElementById('rc-open-note')?.value || '').trim();
    if (!Number.isFinite(opening) || opening < 0) { m.error = 'Enter a valid opening cash amount.'; render(); return; }
    m.busy = true; m.error = ''; render();
    try {
      await posOpenSession(opening);      // note is a client-side field; backend will accept it later
      await posBootstrap();
      S.posRegisterModal = null;
      render();
    } catch (err) {
      m.busy = false; m.error = err.message || 'Could not open the register.';
      render();
    }
  });

  // Close Register
  document.getElementById('rc-close-submit')?.addEventListener('click', async () => {
    const counted = Number(document.getElementById('rc-close-counted').value);
    if (!Number.isFinite(counted) || counted < 0) { m.error = 'Enter a valid counted cash amount.'; render(); return; }

    // Recompute variance guard here — the backend still owns the real check.
    const expected = Number(S.posSessionSummary?.expected_cash ?? S.posSession?.opening_cash ?? 0);
    const variance = counted - expected;
    const maxDiff  = Number(S.storeSettings?.maximumDifference ?? 2);
    let approve = false;
    if (Math.abs(variance) > maxDiff) {
      const pin = (document.getElementById('rc-close-manager-pin')?.value || '').trim();
      if (!pin || pin.length !== 4) { m.error = 'Manager PIN is required to close with this difference.'; render(); return; }
      approve = true;   // Backend will re-validate the manager PIN against the users table.
    }

    m.busy = true; m.error = ''; render();
    try {
      let result;
      try {
        result = await posCloseShift(Number(S.posSession?.opened_by || S.posActiveUser?.id), counted, approve);
      } catch (err) {
        if (err.status === 409 && /approve/i.test(err.message)) {
          result = await posCloseShift(Number(S.posSession?.opened_by || S.posActiveUser?.id), counted, true);
        } else { throw err; }
      }
      S.posRegisterModal = { mode: 'closed-summary', result };
      await posBootstrap();
      render();
    } catch (err) {
      m.busy = false; m.error = err.message || 'Could not close the register.';
      render();
    }
  });

  // Manager PIN approval — server-side check against Manager+ users.
  // The cashier's session stays intact; we only record the approval.
  document.getElementById('rc-mgr-submit')?.addEventListener('click', async () => {
    const pin = (document.getElementById('rc-mgr-pin')?.value || '').trim();
    const reason = (document.getElementById('rc-mgr-reason')?.value || '').trim();
    if (!/^\d{4}$/.test(pin)) { m.error = 'Enter the 4-digit manager PIN.'; render(); return; }
    if (!reason) { m.error = 'A reason is required for the audit log.'; render(); return; }
    m.busy = true; m.error = ''; render();
    try {
      const result = await posVerifyManagerPin(pin, m.action || 'unknown', reason, S.posActiveUser?.branchId || null);
      const cb = m.onApproved;
      S.posRegisterModal = null;
      render();
      try { cb?.({ approved_by: result.approved_by, reason }); } catch (e) { alert(e.message || String(e)); }
    } catch (err) {
      m.busy = false;
      m.error = err.message || 'That PIN does not match any Store Manager or Admin.';
      render();
    }
  });

  // Cash In / Cash Out
  document.getElementById('rc-cash-submit')?.addEventListener('click', async () => {
    const amount = Number(document.getElementById('rc-cash-amount').value);
    const reason = (document.getElementById('rc-cash-reason').value || '').trim();
    if (!Number.isFinite(amount) || amount <= 0) { m.error = 'Enter an amount greater than zero.'; render(); return; }
    if (!reason) { m.error = 'A reason is required for cash movements (audit trail).'; render(); return; }
    m.busy = true; m.error = ''; render();
    try {
      await posRecordCashMovement(m.mode === 'cash-in' ? 'IN' : 'OUT', amount, reason);
      S.posRegisterModal = null;
      render();
    } catch (err) {
      m.busy = false; m.error = err.message || 'Could not record the movement.';
      render();
    }
  });
}

// Convenience openers used by buttons across POS surfaces.
function openRegisterModal(mode)         { S.posRegisterModal = { mode, error:'', busy:false }; render(); }
function openCashMovementModal(direction){ S.posRegisterModal = { mode: direction === 'IN' ? 'cash-in' : 'cash-out', error:'', busy:false }; render(); }

// ============================================================
// SCREEN 1 — STORE TYPE SELECTOR  ("Choose your store")
// ============================================================
function renderPOSStoreSelector() {
  const div = document.createElement('div');
  div.className = 'pos-selector-screen';

  const storeTypes = [
    { key:'retail',      icon:'🛒', name:'Retail',           desc:'Any shop · general merchandise' },
    { key:'bakery',      icon:'🍞', name:'Bakery & Food',    desc:'Food, over the counter' },
    { key:'clothes',     icon:'👕', name:'Clothes & Fashion',desc:'Multi sizes, colors, SKUs' },
    { key:'furniture',   icon:'🪑', name:'Furniture & Home', desc:'Stock, discounts, configurator' },
    { key:'restaurant',  icon:'🍽️', name:'Restaurant',       desc:'Tables, menus, kitchen display' },
    { key:'electronics', icon:'📱', name:'Electronics',      desc:'Tech, serial numbers, warranty' },
  ];

  div.innerHTML = `
    <div class="pos-selector-header">
      <button class="pharm-back" id="btn-pos-sel-back" style="color:rgba(255,255,255,0.7)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
        Back to workspace
      </button>
      <div style="display:flex;align-items:center;gap:10px">
        <svg width="32" height="32" viewBox="0 0 64 64" fill="none"><rect x="2" y="2" width="60" height="60" rx="12" fill="#F5C411"/><path d="M22 20 L12 32 L22 44" stroke="#2D1859" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 20 L52 32 L42 44" stroke="#2D1859" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="30" y="14" width="4" height="36" rx="2" fill="#2D1859" transform="rotate(15 32 32)"/></svg>
        <div>
          <div style="font-weight:900;font-size:18px;color:#fff">Curdun Retail POS</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.6)">Point of Sale · v3.0</div>
        </div>
      </div>
      <div style="font-size:13px;color:rgba(255,255,255,0.5)">${esc(S.currentCompany)}</div>
    </div>

    <div class="pos-selector-body">
      <div class="pos-selector-title">
        <h1>Choose your store type</h1>
        <p>This configures available features, product layout, and receipt format for your POS.</p>
      </div>
      <div class="pos-store-grid">
        ${storeTypes.map(t => `
          <button class="pos-store-tile" data-store-type="${t.key}">
            <div class="pos-store-tile-icon">${t.icon}</div>
            <div class="pos-store-tile-name">${t.name}</div>
            <div class="pos-store-tile-desc">${t.desc}</div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  div.querySelector('#btn-pos-sel-back').addEventListener('click', () => { S.view = 'workspace'; render(); });
  div.querySelectorAll('[data-store-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      S.posStoreType = btn.dataset.storeType;
      S.posView = 'backoffice';
      S.posBackofficeTab = 'dashboard';
      render();
    });
  });

  return div;
}

// ============================================================
// SCREEN 2 — POS BACK-OFFICE  (Management / Admin view)
// ============================================================
function renderPOSBackoffice() {
  const wrap = document.createElement('div');
  wrap.className = 'pos-backoffice';

  // ---- Top Navigation Bar ----
  const nav = document.createElement('header');
  nav.className = 'pos-topnav';
  nav.innerHTML = renderPOSTopNav();
  wrap.appendChild(nav);

  // ---- Content Area ----
  const content = document.createElement('main');
  content.className = 'pos-backoffice-content animate-fadein';
  content.id = 'pos-backoffice-content';
  content.innerHTML = renderPOSBackofficeTab();
  wrap.appendChild(content);

  // ---- Wire events after DOM is built ----
  setTimeout(() => {
    wirePOSTopNav(wrap);
    wirePOSEvents();
  }, 0);

  return wrap;
}

function renderPOSTopNav() {
  const u = S.posActiveUser;
  const storeTypeLabel = {retail:'Retail',bakery:'Bakery & Food',clothes:'Clothes',furniture:'Furniture',restaurant:'Restaurant',electronics:'Electronics'}[S.posStoreType] || 'Retail';
  const tab = S.posBackofficeTab;
  const dd = S.posNavDropdown;
  const isOpen = S.posSession?.state === 'OPENED';
  const notifCount = (S.posStockAlerts||[]).filter(a=>Number(a.unread)).length;

  // Role-gate the navigation dropdowns. Backend still enforces (that's the
  // real security); hiding here is just UX so cashiers aren't confronted
  // with menus that will bounce them with 403.
  const canEditProducts = posCan('editProducts') === true;
  const canManageStaff  = posCan('manageStaff')  === true;
  const canOpenSettings = posCan('settings')     === true;
  const canReports      = posCan('viewMargin')   === true; // reports leak margin — same gate

  const navItem = (key, label, hasChild) => {
    const menuTabs = { orders:['orders','sessions','payments','customers'], products:['products','categories','combos'], reporting:['reports-orders','reports-sales','reports-session','reports-stock'], configuration:['config-settings','config-payments','config-staff','config-currencies'] };
    const active = menuTabs[key]?.includes(tab) || tab === key;
    return `
      <div class="pos-topnav-item ${active?'active':''}" data-nav-menu="${key}">
        ${label}
        ${hasChild ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>` : ''}
        ${hasChild && dd === key ? `<div class="pos-topnav-dropdown">
          ${key === 'orders' ? `
            <button class="pos-dd-item" data-bo-tab="orders">Orders</button>
            <button class="pos-dd-item" data-bo-tab="sessions">Sessions</button>
            <button class="pos-dd-item" data-bo-tab="payments">Payments</button>
            <button class="pos-dd-item" data-bo-tab="customers">Customers</button>
          ` : key === 'products' ? `
            <button class="pos-dd-item" data-bo-tab="products">Products</button>
            ${canEditProducts ? `<button class="pos-dd-item" data-bo-tab="categories">Categories</button>` : ''}
            ${canEditProducts ? `<button class="pos-dd-item" data-bo-tab="combos">Combo Choices</button>` : ''}
          ` : key === 'reporting' ? `
            <button class="pos-dd-item" data-bo-tab="reports-orders">Orders</button>
            ${canReports ? `<button class="pos-dd-item" data-bo-tab="reports-sales">Sales Details</button>` : ''}
            ${canReports ? `<button class="pos-dd-item" data-bo-tab="reports-session">Session Report</button>` : ''}
            <button class="pos-dd-item" data-bo-tab="reports-stock">Stock Report</button>
          ` : `
            ${canOpenSettings ? `<button class="pos-dd-item" data-bo-tab="config-settings">Settings</button>` : ''}
            ${canOpenSettings ? `<button class="pos-dd-item" data-bo-tab="config-payments">Payment Methods</button>` : ''}
            ${canManageStaff  ? `<button class="pos-dd-item" data-bo-tab="config-staff">Staff & Users</button>` : ''}
            ${canOpenSettings ? `<button class="pos-dd-item" data-bo-tab="config-currencies">Currencies</button>` : ''}
            ${!(canOpenSettings || canManageStaff) ? `<div style="padding:12px 14px;color:var(--text-muted);font-size:12px;font-style:italic">No configuration options available for your role.</div>` : ''}
          `}
        </div>` : ''}
      </div>`;
  };

  // Whole Configuration menu is hidden for pure Cashiers (no config access at all).
  const showConfigMenu = canOpenSettings || canManageStaff;

  return `
    <div class="pos-topnav-left">
      <button class="pos-topnav-brand" id="btn-pos-home">
        <svg width="26" height="26" viewBox="0 0 64 64" fill="none"><rect x="2" y="2" width="60" height="60" rx="10" fill="#F5C411"/><path d="M22 20 L12 32 L22 44" stroke="#2D1859" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 20 L52 32 L42 44" stroke="#2D1859" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><rect x="30" y="14" width="4" height="36" rx="2" fill="#2D1859" transform="rotate(15 32 32)"/></svg>
        <span>Point of Sale</span>
        <span class="pos-topnav-store-type">${storeTypeLabel}</span>
      </button>

      <button class="pos-topnav-item${tab==='dashboard'?' active':''}" data-nav-direct="dashboard">Dashboard</button>
      ${navItem('orders','Orders',true)}
      ${navItem('products','Products',true)}
      ${navItem('reporting','Reporting',true)}
      ${showConfigMenu ? navItem('configuration','Configuration',true) : ''}
    </div>

    <div class="pos-topnav-right">
      ${notifCount > 0 ? `<button class="pos-topnav-notif" data-nav-direct="reports-stock" title="Stock alerts">${notifCount}</button>` : ''}
      <span class="pill ${isOpen?'pill-green':'pill-red'}" style="font-size:11px">${isOpen?'● Register open':'● Register closed'}</span>
      <button class="btn btn-gold btn-sm" id="btn-open-session" style="font-size:12px;padding:7px 14px">
        ${isOpen ? 'Close Register' : 'Open Register →'}
      </button>
      <div class="pos-topnav-user" id="btn-topnav-user">
        <div class="avatar" style="width:28px;height:28px;font-size:11px;background:#7A5FB8;color:#fff">${initials(u?.name||'')}</div>
        <span style="font-size:13px">${esc(u?.name||'')}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        ${dd === 'user' ? `
          <div class="pos-topnav-dropdown" style="right:0;left:auto;min-width:160px">
            <button class="pos-dd-item" id="btn-bo-back-ws">← Back to workspace</button>
            <button class="pos-dd-item" id="btn-bo-lock">🔒 Lock (staff PIN)</button>
            <hr style="margin:4px 0;border-color:var(--border)"/>
            <button class="pos-dd-item" style="color:#e53e3e" id="btn-bo-logout">Sign out</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function wirePOSTopNav(wrap) {
  // Dashboard direct link
  wrap.querySelectorAll('[data-nav-direct]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.posBackofficeTab = btn.dataset.navDirect;
      S.posNavDropdown = null;
      render();
    });
  });

  // Dropdown menus
  wrap.querySelectorAll('[data-nav-menu]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = item.dataset.navMenu;
      S.posNavDropdown = S.posNavDropdown === key ? null : key;
      render();
    });
  });

  // Dropdown tab items
  wrap.querySelectorAll('[data-bo-tab]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.posBackofficeTab = btn.dataset.boTab;
      S.posNavDropdown = null;
      render();
    });
  });

  // User dropdown
  wrap.querySelector('#btn-topnav-user')?.addEventListener('click', (e) => {
    e.stopPropagation();
    S.posNavDropdown = S.posNavDropdown === 'user' ? null : 'user';
    render();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    if (S.posNavDropdown) { S.posNavDropdown = null; render(); }
  }, { once: true });

  // POS brand → back to dashboard
  wrap.querySelector('#btn-pos-home')?.addEventListener('click', () => {
    S.posBackofficeTab = 'dashboard'; S.posNavDropdown = null; render();
  });

  // Open / Close Register — routes through the Odoo-style Register Control modal
  // instead of showing a browser prompt or bouncing to the settings tab.
  wrap.querySelector('#btn-open-session')?.addEventListener('click', () => {
    openRegisterModal(S.posSession?.state === 'OPENED' ? 'close' : 'open');
  });

  // User menu actions
  wrap.querySelector('#btn-bo-back-ws')?.addEventListener('click', () => { S.view = 'workspace'; render(); });

  // "Lock" (Switch Cashier) — Session stays OPEN, only the cashier identity is
  // dropped so someone else can PIN in. This matches Odoo: a register may
  // keep going all day while cashiers rotate through it.
  wrap.querySelector('#btn-bo-lock')?.addEventListener('click', () => {
    if (typeof posLockRegister === 'function') { posLockRegister(); return; }
    S.posActiveUser = null;    // back to PIN screen; do NOT touch S.posSession
    render();
  });

  // "Sign out" — leaves the whole workspace. If a register is open, warn the
  // operator so they don't accidentally abandon an open session with cash in it.
  wrap.querySelector('#btn-bo-logout')?.addEventListener('click', () => {
    if (S.posSession?.state === 'OPENED' &&
        !confirm('The register is still open. Sign out anyway? (The session stays open and can be closed from another device.)')) {
      return;
    }
    S.posActiveUser = null;
    S.posView = 'selector';
    S.posStoreType = null;
    S.view = 'workspace';
    render();
  });
}

// ---- Back-office tab content router ----
function renderPOSBackofficeTab() {
  // Server enforces the real gate; this stops a cashier from ending up on
  // a tab they can't use because the frontend menu was manipulated.
  const TAB_ROLE_GATE = {
    'config-settings':   () => posCan('settings')     === true,
    'config-payments':   () => posCan('settings')     === true,
    'config-staff':      () => posCan('manageStaff')  === true,
    'config-currencies': () => posCan('settings')     === true,
    'categories':        () => posCan('editProducts') === true,
    'combos':            () => posCan('editProducts') === true,
  };
  const gate = TAB_ROLE_GATE[S.posBackofficeTab];
  if (gate && !gate()) S.posBackofficeTab = 'dashboard';

  switch (S.posBackofficeTab) {
    case 'dashboard':        return renderPOSDash();
    case 'orders':           return renderPOSTransactions();
    case 'sessions':         return renderPOSSessions();
    case 'payments':         return renderPOSPayments();
    case 'customers':        return renderPOSCustomers();
    case 'products':         return renderPOSProducts();
    case 'categories':       return renderPOSCategories();
    case 'combos':           return renderPOSCombos();
    case 'reports-orders':   return renderPOSReports();
    case 'reports-sales':    return renderPOSReportSales();
    case 'reports-session':  return renderPOSReportSession();
    case 'reports-stock':    return renderPOSNotifications();
    case 'config-settings':  return renderPOSSettings();
    case 'config-payments':  return renderPOSConfigPayments();
    case 'config-staff':     return renderPOSStaff();
    case 'config-currencies':return renderPOSConfigCurrencies();
    default:                 return renderPOSDash();
  }
}

// ============================================================
// SCREEN 3 — POS SESSION  (Cashier Checkout)
// ============================================================
function renderPOSSession() {
  // If no active cashier, show PIN login first
  if (!S.posActiveUser || S.posActiveUser.role === 'Admin' || S.posActiveUser.role === 'Store Manager') {
    // Managers go straight to checkout; cashiers also go straight
  }

  const wrap = document.createElement('div');
  wrap.className = 'pos-session-wrap';

  // Thin session top bar
  const bar = document.createElement('div');
  bar.className = 'pos-session-topbar';
  bar.innerHTML = `
    <button class="pharm-back" id="btn-session-back-bo" style="color:rgba(255,255,255,0.7);font-size:12px">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      Back to management
    </button>
    <div style="display:flex;align-items:center;gap:8px">
      <svg width="20" height="20" viewBox="0 0 64 64" fill="none"><rect x="2" y="2" width="60" height="60" rx="10" fill="#F5C411"/><path d="M22 20 L12 32 L22 44" stroke="#2D1859" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M42 20 L52 32 L42 44" stroke="#2D1859" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <strong style="color:#fff;font-size:14px">${esc(S.currentCompany)} · POS Session</strong>
    </div>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="avatar" style="width:26px;height:26px;font-size:10px;background:#7A5FB8;color:#fff">${initials(S.posActiveUser?.name||'')}</div>
      <span style="font-size:12px;color:rgba(255,255,255,0.8)">${esc(S.posActiveUser?.name||'')} · ${S.posActiveUser?.role||''}</span>
      <button class="btn btn-outline btn-sm" id="btn-session-lock" style="font-size:11px;color:rgba(255,255,255,0.7);border-color:rgba(255,255,255,0.3)">🔒 Lock</button>
    </div>
  `;

  // Checkout area (existing)
  const checkoutArea = document.createElement('div');
  checkoutArea.className = 'pos-session-checkout';
  checkoutArea.innerHTML = renderPOSCheckout();

  if (S.posMobileMoneyModal) {
    const overlay = document.createElement('div');
    overlay.className = 'mm-modal-overlay';
    overlay.innerHTML = renderMobileMoneyModal();
    checkoutArea.appendChild(overlay);
  }

  wrap.appendChild(bar);
  wrap.appendChild(checkoutArea);

  setTimeout(() => {
    wrap.querySelector('#btn-session-back-bo')?.addEventListener('click', () => {
      S.posView = 'backoffice'; S.posBackofficeTab = 'dashboard'; render();
    });
    wrap.querySelector('#btn-session-lock')?.addEventListener('click', () => {
      if (typeof posLockRegister === 'function') posLockRegister();
    });
    wirePOSEvents();
  }, 0);

  return wrap;
}

// ============================================================
// POS TAB COMPAT SHIM (keeps old S.posTab refs working)
// ============================================================
function renderPOSTab() {
  // Legacy: used by old sidebar. Now routed through renderPOSBackofficeTab.
  return renderPOSBackofficeTab();
}

// ---- NEW BACK-OFFICE TABS ----

function renderPOSCategories() {
  const cats = [...new Set(POS_PRODUCTS.map(p => p.cat || 'General'))].sort();
  return `
    <div class="pharm-content">
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-gold btn-sm" id="btn-add-category">+ New Category</button>
      </div>
      <div class="pos-table-wrap">
        <table class="pos-table">
          <thead><tr><th>#</th><th>Category Name</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            ${cats.map((cat, i) => {
              const count = POS_PRODUCTS.filter(p => (p.cat||'General') === cat).length;
              return `<tr>
                <td>${i+1}</td>
                <td><strong>${esc(cat)}</strong></td>
                <td>${count} product${count!==1?'s':''}</td>
                <td><span class="pill pill-green">Active</span></td>
                <td>
                  <button class="btn btn-outline btn-sm" data-edit-cat="${esc(cat)}">Edit</button>
                  <button class="btn btn-sm" style="color:#e53e3e;background:rgba(229,62,62,0.1)" data-delete-cat="${esc(cat)}">Delete</button>
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function renderPOSCombos() {
  const combos = S.posCombos || [];
  return `
    <div class="pharm-topbar">
      <div class="pharm-tab-label">Combo Choices</div>
      <button class="btn btn-gold btn-sm" id="btn-add-combo">+ New Combo</button>
    </div>
    <div class="pharm-content">
      ${combos.length === 0 ? `
        <div style="text-align:center;padding:80px 20px;color:var(--text-muted)">
          <div style="font-size:48px;margin-bottom:16px">🎁</div>
          <div style="font-size:18px;font-weight:700;margin-bottom:8px">No combos yet</div>
          <div style="font-size:14px;margin-bottom:20px">Create bundle deals — e.g. "Family Pack" or "Meal Deal"</div>
          <button class="btn btn-gold" id="btn-add-combo-empty">+ Create first combo</button>
        </div>
      ` : `
        <div class="pos-table-wrap">
          <table class="pos-table">
            <thead><tr><th>Combo Name</th><th>Items</th><th>Price</th><th>Actions</th></tr></thead>
            <tbody>${combos.map(c => `<tr><td><strong>${esc(c.name)}</strong></td><td>${c.items?.length||0} products</td><td>$${Number(c.price||0).toFixed(2)}</td><td><button class="btn btn-outline btn-sm">Edit</button></td></tr>`).join('')}</tbody>
          </table>
        </div>
      `}
    </div>`;
}

function renderPOSReportSales() {
  const txns = POS_TRANSACTIONS || [];
  // Aggregate real transactions per cashier — refunds are stored as separate
  // rows with total < 0 (or with a `refund_of` link if the backend stores them that way).
  const stats = {};
  txns.forEach(t => {
    const k = (t.cashier || t.cashier_name || 'Unknown');
    if (!stats[k]) stats[k] = { count:0, gross:0, refunds:0 };
    const total = Number(t.total || 0);
    const isRefund = total < 0 || t.type === 'refund' || t.status === 'refunded';
    if (isRefund) {
      stats[k].refunds += Math.abs(total);
    } else {
      stats[k].count  += 1;
      stats[k].gross  += total;
    }
  });

  // Merge in staff who haven't rung anything yet, so the table lists ALL
  // active cashiers dynamically (not just those who happened to make sales).
  (POS_STAFF || []).forEach(s => {
    if (s.status === 'inactive') return;
    if (!stats[s.name]) stats[s.name] = { count:0, gross:0, refunds:0 };
  });

  const rows = Object.entries(stats)
    .map(([name, d]) => ({
      name,
      count:  d.count,
      gross:  d.gross,
      refunds:d.refunds,
      net:    d.gross - d.refunds,
      avg:    d.count ? d.gross / d.count : 0,
    }))
    .sort((a, b) => b.net - a.net);

  const grandGross   = rows.reduce((s, r) => s + r.gross, 0);
  const grandRefunds = rows.reduce((s, r) => s + r.refunds, 0);
  const grandNet     = grandGross - grandRefunds;
  const grandCount   = rows.reduce((s, r) => s + r.count, 0);

  // "Active Cashiers" = staff who have an active shift or PIN-signed-in today
  // (identified by having transactions today OR being the current cashier of an
  // open session). Falls back to all staff with any transactions if session
  // data isn't loaded.
  const currentCashierName = S.posActiveUser?.name;
  const activeCashiers = rows.filter(r =>
    r.count > 0 || r.name === currentCashierName
  ).length;

  return `
    <div class="pharm-topbar">
      <div class="pharm-tab-label">Sales Details · Per Cashier</div>
      <div style="display:flex;gap:8px;align-items:center">
        <input type="date" class="form-input" style="width:140px;font-size:12px" value="${S.posReportFrom}" id="rsd-from"/>
        <span style="font-size:12px;color:var(--text-muted)">to</span>
        <input type="date" class="form-input" style="width:140px;font-size:12px" value="${S.posReportTo}" id="rsd-to"/>
      </div>
    </div>
    <div class="pharm-content">
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Gross Sales</div><div class="kpi-value">$${grandGross.toFixed(2)}</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Refunds</div><div class="kpi-value trend-warn">$${grandRefunds.toFixed(2)}</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Net Sales</div><div class="kpi-value">$${grandNet.toFixed(2)}</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Active Cashiers</div><div class="kpi-value">${activeCashiers}</div></div>
      </div>
      <div class="pos-table-wrap">
        <table class="pos-table">
          <thead><tr>
            <th>Cashier</th>
            <th>Transactions</th>
            <th>Gross Sales</th>
            <th>Refunds</th>
            <th>Net Sales</th>
            <th>Avg. Ticket</th>
            <th>%</th>
          </tr></thead>
          <tbody>
            ${rows.length === 0 ? `
              <tr><td colspan="7" style="padding:24px;text-align:center;color:var(--text-muted);font-style:italic">No cashier activity in this period.</td></tr>
            ` : rows.map(r => {
              const pct = grandNet > 0 ? Math.round((r.net / grandNet) * 100) : 0;
              const isCurrent = r.name === currentCashierName;
              return `<tr${isCurrent ? ' style="background:rgba(245,196,17,0.06)"' : ''}>
                <td>
                  <strong>${esc(r.name)}</strong>
                  ${isCurrent ? ' <span style="font-size:10px;color:var(--gold);font-weight:800">● NOW</span>' : ''}
                  ${r.count === 0 ? ' <span style="font-size:10px;color:var(--text-muted)">(no sales yet)</span>' : ''}
                </td>
                <td>${r.count}</td>
                <td style="color:var(--gold);font-weight:700">$${r.gross.toFixed(2)}</td>
                <td style="color:${r.refunds>0?'#B91C1C':'var(--text-muted)'};font-weight:${r.refunds>0?'700':'400'}">$${r.refunds.toFixed(2)}</td>
                <td style="font-weight:800">$${r.net.toFixed(2)}</td>
                <td>$${r.avg.toFixed(2)}</td>
                <td><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:6px;background:var(--border);border-radius:3px"><div style="width:${pct}%;height:100%;background:#F5C411;border-radius:3px"></div></div><span style="font-size:11px">${pct}%</span></div></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

// P5 — CSV export for a session summary. Rows mirror the on-screen sections
// so exported totals match the report exactly (Rule #14).
function exportSessionReportCSV(sum) {
  if (!sum || !sum.session) return;
  const s = sum.session;
  const sales = sum.sales || {};
  const cr = sum.cash_reconciliation || {};
  const rows = [];
  const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
  const line = (...cells) => rows.push(cells.map(q).join(','));
  line('Session', `#${s.id}`);
  line('State', s.state);
  line('Register', s.config_name);
  line('Branch', s.branch_name);
  line('Opened By', s.opened_by_name);
  line('Opened At', s.opened_at);
  line('Closed By', s.closed_by_name || '');
  line('Closed At', s.closed_at || '');
  line('');
  line('== SALES ==');
  line('Orders', sales.orders);
  line('Sale orders', sales.sale_orders);
  line('Refund orders', sales.refund_orders);
  line('Gross sales', sales.gross_sales);
  line('Refunds', sales.refunds);
  line('Net sales', sales.net_sales);
  line('Average order', sales.average_order);
  line('');
  line('== PAYMENT METHODS ==');
  line('Method', 'Type', 'Transactions', 'Amount');
  (sum.payment_methods || []).forEach(m => line(m.method_name, m.method_type, m.transactions, m.amount));
  line('');
  line('== CASH RECONCILIATION ==');
  line('Opening cash', cr.opening_cash);
  line('+ Cash payments', cr.cash_payments);
  line('+ Cash in', cr.cash_in);
  line('- Cash out', cr.cash_out);
  line('= Expected cash', cr.expected_cash);
  line('Counted cash', cr.counted_cash);
  line('Difference', cr.difference);
  line('');
  line('== EMPLOYEES ==');
  line('Employee', 'Orders', 'Gross sales', 'Refunds', 'Net sales');
  (sum.employees || []).forEach(e => line(e.employee_name, e.orders, e.gross_sales, e.refund_amount, e.net_sales));
  line('');
  line('== CASH MOVEMENTS ==');
  line('Time', 'Type', 'Amount', 'Reason', 'Employee');
  (sum.cash_movements?.items || []).forEach(m => line(m.created_at, m.movement_type, m.amount, m.reason, m.employee_name));
  line('');
  line('== ORDERS ==');
  line('Reference', 'Date', 'Customer', 'Employee', 'Items', 'Total', 'Payment', 'Status');
  (sum.orders_list || []).forEach(o => line(o.reference_number, o.created_at, o.customer_name, o.cashier_name, o.items, o.total_amount, o.payment_method, o.refunded_order_id ? 'REFUND' : o.status));
  const csv = rows.join('\r\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `session-${s.id}-report.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderPOSReportSession() {
  // Session Report screen — P5.
  //  - CLOSED sessions: comprehensive final report (Odoo-aligned).
  //  - OPEN session:    live running totals (Curdun extension), marked as such.
  // Structure follows Rule #46 / #16 sections: Session Overview → Sales →
  // Payment Methods → Cash Reconciliation → Employees → Cash Movements → Orders.
  const all = S.posSessions || [];
  const current = S.posSession && S.posSession.state === 'OPENED' ? S.posSession : null;
  const closed = all.filter(s => s.state === 'CLOSED');

  // If the user picked a specific historical session, render it in full.
  // Otherwise show the live OPEN session (if any) plus the closed list.
  const selectedId = S.posReportSelectedSessionId
    || (current ? current.id : (closed[0]?.id || null));
  const summary = (S.posReportSelectedSummary && S.posReportSelectedSummary.session && Number(S.posReportSelectedSummary.session.id) === Number(selectedId))
    ? S.posReportSelectedSummary
    : (current && Number(selectedId) === Number(current.id) ? (S.posSessionSummary || {}) : null);

  const money = n => `$${Number(n || 0).toFixed(2)}`;
  const selectHtml = closed.length + (current ? 1 : 0) === 0 ? '' : `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
      <label style="font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:800;color:var(--text-muted)">Session</label>
      <select id="report-session-select" class="form-select" style="max-width:320px">
        ${current ? `<option value="${current.id}" ${Number(selectedId)===Number(current.id)?'selected':''}>#${current.id} — OPEN (live)</option>` : ''}
        ${closed.map(s => `<option value="${s.id}" ${Number(selectedId)===Number(s.id)?'selected':''}>#${s.id} — CLOSED · ${esc(s.opened_at || '')} · ${esc(s.opened_by_name || '')}</option>`).join('')}
      </select>
      <button class="btn btn-outline btn-sm" id="btn-report-export-csv">Export CSV</button>
    </div>`;

  // -------- render helper for one session summary --------
  const renderReport = (data) => {
    if (!data || !data.session) return `<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading session…</div>`;
    const s = data.session;
    const isOpen = !!data.is_open;
    const cr = data.cash_reconciliation || {};
    const sales = data.sales || {};
    const ca = data.customer_account || {};
    const configuredMethods = Object.keys(S.storeSettings?.payments || {});
    const methodMap = new Map((data.payment_methods || []).map(m => [String(m.method_name).toLowerCase(), m]));
    // Combine configured methods + observed methods so a configured method
    // with no rows displays $0 (Rule #3 dynamic).
    const rowsMethod = Array.from(new Set([...(data.payment_methods || []).map(m => m.method_name), ...configuredMethods]));

    return `
      <!-- SESSION OVERVIEW -->
      <div class="card" style="padding:20px;margin-bottom:16px;border-left:6px solid ${isOpen ? '#22C55E' : 'var(--purple-800)'}">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
          <span class="pill ${isOpen?'pill-green':'pill-gold'}" style="font-weight:900">Session #${s.id} — ${isOpen ? 'OPEN' : 'CLOSED'}</span>
          ${isOpen ? `<span style="font-size:11px;color:var(--amber);font-weight:700">🟢 Live — figures update until the register is closed (Curdun extension)</span>` : ''}
        </div>
        <h3 class="chart-title" style="margin-top:4px">${esc(s.config_name || 'Main Register')}</h3>
        <div class="txn-detail-grid" style="margin-top:12px">
          <div class="txn-detail-row"><span>Store / Branch</span><strong>${esc(s.branch_name || '—')}</strong></div>
          <div class="txn-detail-row"><span>Opened By</span><strong>${esc(s.opened_by_name || '—')}</strong></div>
          <div class="txn-detail-row"><span>Opened At</span><strong>${esc(s.opened_at || '—')}</strong></div>
          <div class="txn-detail-row"><span>Closed By</span><strong>${esc(s.closed_by_name || (isOpen ? '—' : ''))}</strong></div>
          <div class="txn-detail-row"><span>Closed At</span><strong>${esc(s.closed_at || (isOpen ? '—' : ''))}</strong></div>
          <div class="txn-detail-row"><span>Opening Note</span><strong>${esc(s.opening_note || '—')}</strong></div>
        </div>
      </div>

      <!-- SALES -->
      <div class="kpi-grid" style="margin-bottom:16px">
        <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Net Sales</div><div class="kpi-value">${money(sales.net_sales)}</div><div class="kpi-trend" style="color:#EFEAFB">${sales.orders} orders</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Gross Sales</div><div class="kpi-value">${money(sales.gross_sales)}</div><div class="kpi-trend">${sales.sale_orders || 0} sale orders</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Refunds</div><div class="kpi-value trend-warn">${money(sales.refunds)}</div><div class="kpi-trend">${sales.refund_orders || 0} refund orders</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Average Order</div><div class="kpi-value">${money(sales.average_order)}</div><div class="kpi-trend">Excluding refunds</div></div>
      </div>

      <!-- PAYMENT METHODS -->
      <div class="data-section" style="margin-bottom:16px">
        <div class="section-header-bar"><h3 class="chart-title">Payment Methods</h3></div>
        <div class="overflow-x-auto"><table class="data-table" style="min-width:520px">
          <thead><tr><th>Method</th><th>Type</th><th>Transactions</th><th>Amount</th></tr></thead>
          <tbody>
            ${rowsMethod.map(name => {
              const m = methodMap.get(String(name).toLowerCase()) || { method_name:name, method_type:posMethodType(name), amount:0, transactions:0 };
              return `<tr><td style="font-weight:700">${esc(m.method_name)}</td><td><span class="pill ${m.method_type==='cash'?'pill-green':m.method_type==='credit'?'pill-gold':'pill-amber'}">${esc(m.method_type)}</span></td><td>${Number(m.transactions || 0)}</td><td style="font-weight:800">${money(m.amount)}</td></tr>`;
            }).join('')}
          </tbody>
        </table></div>
      </div>

      <!-- CASH RECONCILIATION -->
      <div class="card" style="padding:20px;margin-bottom:16px">
        <h3 class="chart-title" style="margin-bottom:12px">Cash Reconciliation</h3>
        <div class="txn-detail-grid">
          <div class="txn-detail-row"><span>Opening Cash</span><strong>${money(cr.opening_cash)}</strong></div>
          <div class="txn-detail-row"><span>+ Cash Payments</span><strong>${money(cr.cash_payments)}</strong></div>
          <div class="txn-detail-row"><span>+ Cash In</span><strong>${money(cr.cash_in)}</strong></div>
          <div class="txn-detail-row"><span>− Cash Out</span><strong>${money(cr.cash_out)}</strong></div>
          <div class="txn-detail-row" style="border-top:1px solid var(--border);padding-top:8px;margin-top:6px"><span style="font-weight:900">= Expected Cash</span><strong style="color:var(--purple-800);font-size:16px">${money(cr.expected_cash)}</strong></div>
          ${!isOpen ? `
            <div class="txn-detail-row"><span>Counted Cash</span><strong>${cr.counted_cash === null ? '—' : money(cr.counted_cash)}</strong></div>
            <div class="txn-detail-row"><span>Difference</span><strong style="color:${Number(cr.difference||0)<0?'#B91C1C':'#22C55E'};font-weight:900">${cr.difference === null ? '—' : (Number(cr.difference)>=0?'+':'') + money(cr.difference).replace('$','') + ' USD'}</strong></div>
            <div class="txn-detail-row"><span>Closing Note</span><strong>${esc(s.closing_note || '—')}</strong></div>
          ` : `<div class="txn-detail-row"><span>Cash Reconciliation</span><strong style="color:var(--amber)">Available after closing</strong></div>`}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:10px">Uses the actual Cash <em>amount</em> per payment line (never tendered cash — that would inflate Expected Cash).</div>
      </div>

      <!-- EMPLOYEES WHO WORKED THE SESSION -->
      <div class="data-section" style="margin-bottom:16px">
        <div class="section-header-bar"><h3 class="chart-title">Employees</h3><span class="ml-auto" style="font-size:11px;color:var(--text-muted)">Derived from validated orders</span></div>
        ${(data.employees || []).length === 0
          ? `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No employees transacted on this session yet.</div>`
          : `<div class="overflow-x-auto"><table class="data-table" style="min-width:600px">
              <thead><tr><th>Employee</th><th>Orders</th><th>Gross Sales</th><th>Refunds</th><th>Net Sales</th></tr></thead>
              <tbody>
                ${data.employees.map(e => `<tr><td style="font-weight:700">${esc(e.employee_name)}</td><td>${Number(e.orders)}</td><td>${money(e.gross_sales)}</td><td class="trend-warn">${money(e.refund_amount)}</td><td style="font-weight:800">${money(e.net_sales)}</td></tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>

      <!-- CASH MOVEMENTS -->
      <div class="data-section" style="margin-bottom:16px">
        <div class="section-header-bar"><h3 class="chart-title">Cash Movements</h3></div>
        ${(data.cash_movements?.items || []).length === 0
          ? `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No cash in/out on this session.</div>`
          : `<div class="overflow-x-auto"><table class="data-table" style="min-width:600px">
              <thead><tr><th>Time</th><th>Type</th><th>Amount</th><th>Reason</th><th>Employee</th></tr></thead>
              <tbody>
                ${data.cash_movements.items.map(m => `<tr><td>${esc(m.created_at)}</td><td><span class="pill ${m.movement_type==='IN'?'pill-green':'pill-red'}">${m.movement_type}</span></td><td style="font-weight:800">${money(m.amount)}</td><td>${esc(m.reason)}</td><td>${esc(m.employee_name)}</td></tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>

      <!-- CUSTOMER ACCOUNT / DEYN activity -->
      ${(ca.sales || ca.collections || ca.refund_reversals) ? `
        <div class="card" style="padding:16px;margin-bottom:16px">
          <h3 class="chart-title" style="margin-bottom:10px">Customer Account (Deyn)</h3>
          <div class="txn-detail-grid">
            <div class="txn-detail-row"><span>Customer-account sales</span><strong>${money(ca.sales)}</strong></div>
            <div class="txn-detail-row"><span>Customer-account collections</span><strong>${money(ca.collections)}</strong></div>
            <div class="txn-detail-row"><span>Refund reversals</span><strong>${money(ca.refund_reversals)}</strong></div>
          </div>
        </div>` : ''}

      <!-- ORDERS -->
      <div class="data-section">
        <div class="section-header-bar"><h3 class="chart-title">Orders</h3><span class="ml-auto" style="font-size:11px;color:var(--text-muted)">${(data.orders_list || []).length} order${(data.orders_list||[]).length===1?'':'s'}</span></div>
        ${(data.orders_list || []).length === 0
          ? `<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:13px">No orders on this session yet.</div>`
          : `<div class="overflow-x-auto"><table class="data-table" style="min-width:900px">
              <thead><tr><th>Ref</th><th>Date</th><th>Customer</th><th>Employee</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
              <tbody>
                ${data.orders_list.map(o => `<tr>
                  <td style="font-family:var(--font-mono);font-weight:700">${esc(o.reference_number)}</td>
                  <td>${esc(o.created_at)}</td>
                  <td>${esc(o.customer_name)}</td>
                  <td>${esc(o.cashier_name)}</td>
                  <td>${Number(o.items)}</td>
                  <td style="font-weight:800;color:${Number(o.total_amount)<0?'#B91C1C':'inherit'}">${money(o.total_amount)}</td>
                  <td>${esc(o.payment_method)}</td>
                  <td><span class="pill ${o.refunded_order_id?'pill-red':o.status==='COMPLETED'?'pill-green':'pill-gold'}">${esc(o.refunded_order_id?'REFUND':o.status)}</span></td>
                </tr>`).join('')}
              </tbody>
            </table></div>`}
      </div>`;
  };

  const emptyBlock = `
    <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      <div style="font-size:48px;margin-bottom:12px">📋</div>
      <div style="font-size:16px;font-weight:700">No register sessions have been recorded yet.</div>
      <div style="margin-top:8px;font-size:13px">Open the register from the Sessions screen to start.</div>
    </div>`;

  // Report body: either the resolved summary, a loading state, or empty.
  const body = closed.length + (current ? 1 : 0) === 0
    ? emptyBlock
    : (summary ? renderReport(summary) : `<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading session #${selectedId}…</div>`);

  return `
    <div class="pharm-topbar"><div class="pharm-tab-label">Session Report</div></div>
    <div class="pharm-content">
      ${selectHtml}
      ${body}
    </div>`;
}

function renderPOSConfigPayments() {
  const methods = S.storeSettings?.payments || { Cash:true, 'EVC Plus':true, eDahab:true, ZAAD:true, Sahal:true, Deyn:true };
  const icons = { Cash:'💵', 'EVC Plus':'📱', eDahab:'📲', ZAAD:'💳', Sahal:'💰', Deyn:'🤝' };
  return `
    <div class="pharm-topbar">
      <div class="pharm-tab-label">Payment Methods</div>
      <button class="btn btn-gold btn-sm" id="btn-save-payment-methods">Save changes</button>
    </div>
    <div class="pharm-content">
      <div style="max-width:600px">
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:20px">Enable or disable payment methods available to cashiers at checkout.</div>
        <div style="display:flex;flex-direction:column;gap:12px">
          ${Object.entries(methods).map(([name, enabled]) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--gray-50);border:1px solid var(--border);border-radius:12px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:22px">${icons[name]||'💳'}</span>
                <div>
                  <div style="font-weight:700;font-size:14px">${name}</div>
                  <div style="font-size:12px;color:var(--text-muted)">${name==='Cash'?'Physical currency':'Mobile money · Somalia'}</div>
                </div>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" class="pm-toggle" data-pm="${name}" ${enabled?'checked':''}/>
                <span class="toggle-slider"></span>
              </label>
            </div>
          `).join('')}
        </div>
      </div>
    </div>`;
}

function renderPOSConfigCurrencies() {
  return `
    <div class="pharm-topbar">
      <div class="pharm-tab-label">Currencies · Exchange Rate</div>
      <button class="btn btn-gold btn-sm" id="btn-save-currencies">Save rate</button>
    </div>
    <div class="pharm-content">
      <div style="max-width:500px">
        <div style="font-size:14px;color:var(--text-secondary);margin-bottom:24px">Set the USD → Somali Shilling (SOS) exchange rate used throughout the POS.</div>
        <div class="form-grid" style="gap:16px">
          <div class="form-group">
            <label class="form-label">Primary Currency</label>
            <select class="form-select" id="cfg-primary-currency">
              <option value="USD" ${S.primaryCurrency==='USD'?'selected':''}>USD — US Dollar ($)</option>
              <option value="SOS" ${S.primaryCurrency==='SOS'?'selected':''}>SOS — Somali Shilling (Sh)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Exchange Rate (1 USD = X Sh)</label>
            <input type="number" class="form-input" id="cfg-exchange-rate" value="${S.exchangeRate||11800}" min="1"/>
          </div>
          <div style="grid-column:1/span 2;padding:14px 16px;background:rgba(245,196,17,0.08);border:1px solid rgba(245,196,17,0.3);border-radius:10px;font-size:13px">
            <strong>Preview:</strong> $1.00 = ${Number(S.exchangeRate||11800).toLocaleString()} Sh &nbsp;·&nbsp;
            $100.00 = ${(100*(S.exchangeRate||11800)).toLocaleString()} Sh
          </div>
        </div>
      </div>
    </div>`;
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
            <div style="font-size:22px;font-weight:900;color:var(--purple-800)">${esc(u.name)}</div>
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
          <span>🟢 Register #${S.posSession?.id || '—'} open since ${shiftStart} · Opening cash $${Number(S.posSession?.opening_cash||0).toFixed(2)}</span>
          <span class="shift-duration-badge">${shiftDuration} · Expected $${Number(S.posSessionSummary?.expected_cash||S.posSession?.opening_cash||0).toFixed(2)}</span>
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
  const dashboard = S.posDashData || {};
  const todayTotal = Number(dashboard.today_revenue||0);
  const todayTxns = Number(dashboard.today_orders||0);
  const avgTicket = todayTxns ? (todayTotal / todayTxns).toFixed(2) : '0.00';
  const hourlyRows=dashboard.hourly_sales||[];
  const hours=Array.from({length:12},(_,i)=>8+i);
  const hourlyValues=hours.map(hour=>Number(hourlyRows.find(row=>Number(row.hour)===hour)?.total||0));
  const hourlyMax=Math.max(1,...hourlyValues.map(Math.abs));
  const hourlyPoints=hourlyValues.map((value,index)=>`${Math.round(index*(600/(hours.length-1)))},${Math.round(145-(Math.max(0,value)/hourlyMax)*120)}`).join(' ');
  const paymentRows=dashboard.payment_methods||[];
  const paymentTotal=Math.max(1,paymentRows.reduce((sum,row)=>sum+Math.max(0,Number(row.amount||0)),0));
  const topProducts=dashboard.top_products||[];
  const stockAlerts = S.posStockAlerts || [];
  const unreadAlerts = stockAlerts.filter(alert=>Number(alert.unread)).length;
  const outAlerts = stockAlerts.filter(alert=>alert.severity==='out').length;
  const registerOpen = S.posSession?.state === 'OPENED';
  const registerSummary = S.posSessionSummary || {};
  return `
    <div class="card" style="width:100%;padding:14px 16px;margin-bottom:16px;border:1px solid ${registerOpen?'#86EFAC':'#FCD34D'};background:${registerOpen?'#ECFDF3':'#FFFBEB'};display:flex;align-items:center;gap:12px">
      <span style="font-size:22px">${registerOpen?'🟢':'🔒'}</span>
      <span style="flex:1">
        <strong>${registerOpen?`Register #${S.posSession.id} is open`:'The POS register is closed'}</strong>
        <span style="display:block;font-size:11px;color:var(--text-muted);margin-top:2px">${registerOpen?`${esc(S.posSession.config_name||S.posConfig?.name||'Main Register')} · Opened by ${esc(S.posSession.opened_by_name||'staff')} · Opening $${Number(S.posSession.opening_cash||0).toFixed(2)} · Expected $${Number(registerSummary.expected_cash||S.posSession.opening_cash||0).toFixed(2)} · ${Number(registerSummary.orders||0)} orders`:'Open the register and record its opening cash before validating the first sale.'}</span>
      </span>
      <button class="btn ${registerOpen?'btn-outline':'btn-primary'} btn-sm" id="btn-dashboard-register">${registerOpen?'Register control':'Open register'}</button>
    </div>
    ${stockAlerts.length ? `<button id="btn-dashboard-stock-alerts" class="card" style="width:100%;padding:14px 16px;margin-bottom:16px;border:1px solid ${outAlerts?'#FCA5A5':'#FCD34D'};background:${outAlerts?'#FEF2F2':'#FFFBEB'};display:flex;align-items:center;gap:12px;text-align:left;cursor:pointer">
      <span style="font-size:22px">${outAlerts?'🚨':'⚠️'}</span>
      <span style="flex:1"><strong>${outAlerts ? `${outAlerts} product${outAlerts===1?' is':'s are'} out of stock` : `${stockAlerts.length} product${stockAlerts.length===1?' needs':'s need'} restocking`}</strong><span style="display:block;font-size:11px;color:var(--text-muted);margin-top:2px">${unreadAlerts} unread notification${unreadAlerts===1?'':'s'} · Open Stock Notifications to review needed quantities.</span></span>
      <span style="font-weight:800;color:var(--purple-800)">Review →</span>
    </button>` : ''}
    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="kpi-eyebrow" style="color:#F5C411">Today's sales</div>
        <div class="kpi-value">$${todayTotal.toFixed(2)}</div>
        <div class="kpi-trend" style="color:#EFEAFB">Gross $${Number(dashboard.gross_sales||0).toFixed(2)} · Refunds $${Number(dashboard.refunds||0).toFixed(2)}</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Validated orders</div><div class="kpi-value">${todayTxns}</div><div class="kpi-trend">Live database total</div></div>
      <div class="kpi-card light">
        <div class="kpi-eyebrow">Avg. ticket</div>
        <div class="kpi-value">$${avgTicket}</div>
        <div class="kpi-trend">Per transaction</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Open registers</div><div class="kpi-value">${Number(dashboard.open_sessions||0)}</div><div class="kpi-trend">${Number(dashboard.active_staff||0)} active staff accounts</div></div>
    </div>
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px">
      <div class="chart-card">
        <div class="chart-header"><div><h3 class="chart-title">Hourly sales</h3><div class="chart-sub">Today · all stores</div></div></div>
        <svg viewBox="0 0 600 160" width="100%" height="160" preserveAspectRatio="none">
          <defs><linearGradient id="posFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#F5C411" stop-opacity="0.3"/><stop offset="100%" stop-color="#F5C411" stop-opacity="0"/></linearGradient></defs>
          <g stroke="#F0EEF7" stroke-width="1"><line x1="0" y1="40" x2="600" y2="40"/><line x1="0" y1="80" x2="600" y2="80"/><line x1="0" y1="120" x2="600" y2="120"/></g>
          <polyline points="${hourlyPoints}" fill="none" stroke="#F5C411" stroke-width="3"/>
        </svg>
        <div class="chart-x-axis"><span>8AM</span><span>10</span><span>12</span><span>2PM</span><span>4</span><span>7PM</span></div>
      </div>
      <div class="chart-card">
        <h3 class="chart-title" style="margin-bottom:12px">Payment methods</h3>
        ${paymentRows.map((row,index)=>{const colors=['#2D1859','#F5C411','#22C55E','#7A5FB8'];const amount=Number(row.amount||0);const pct=`${Math.round(Math.max(0,amount)/paymentTotal*100)}%`;return `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <div style="width:8px;height:8px;border-radius:50%;background:${colors[index%colors.length]};flex-shrink:0"></div>
            <div style="flex:1;font-size:13px;font-weight:600">${esc(row.name)}</div>
            <div style="font-size:12px;font-weight:700;color:var(--text-primary)">$${amount.toFixed(2)}</div>
            <div style="font-size:11px;color:var(--text-muted);width:32px;text-align:right">${pct}</div>
          </div>
        `}).join('') || '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">No payments recorded today.</div>'}
        <h3 class="chart-title" style="margin-bottom:12px;margin-top:16px">Top sellers</h3>
        ${topProducts.map((row,index)=>{const colors=['#2D1859','#F5C411','#22C55E','#7A5FB8'];return `
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <div style="width:8px;height:8px;border-radius:50%;background:${colors[index%colors.length]};flex-shrink:0"></div>
            <div style="flex:1;font-size:13px;font-weight:600">${esc(row.name)}</div>
            <div style="font-size:12px;color:var(--text-muted);font-family:var(--font-mono)">${Number(row.quantity||0)} sold</div>
          </div>
        `}).join('') || '<div style="font-size:12px;color:var(--text-muted)">No products sold today.</div>'}
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
  const subtotal = cart.reduce((s,item)=>{ const p = item.isWholesale ? item.wholesalePrice : item.price; return s + p * item.qty; }, 0);
  const taxRate = Number(S.storeSettings.taxRate || 0);
  const tax = subtotal * taxRate / 100;
  const total = Number((subtotal + tax).toFixed(2));
  const term = (S.posSearchTerm||'').toLowerCase();
  const filtered = term ? POS_PRODUCTS.filter(p=>p.name.toLowerCase().includes(term)||p.barcode.includes(term)||p.cat.toLowerCase().includes(term)) : POS_PRODUCTS;
  const catEmoji = {Groceries:'\ud83d\uded2',Beverages:'\ud83e\udd64',Household:'\ud83c\udfe0','Personal Care':'\ud83e\uddf4',Snacks:'\ud83c\udf6a',Bakery:'\ud83c\udf5e',Fresh:'\ud83e\udd6c'};
  const canViewMargin = posCan('viewMargin');

  if (S.posReceiptVisible && S.posLastReceipt) return renderPOSReceipt();

  // Payment composer state (Odoo split payments) \u2014 see P3 Stage B helpers.
  const methods = posConfiguredMethods();
  const lines = S.posPaymentLines || [];
  const paid = posPaymentLinesPaid();
  const remaining = posPaymentLinesRemaining(total);
  const hasDeyn = posHasDeynLine();
  const deynAmount = posDeynLineAmount();
  const debtCustomer = (hasDeyn && S.posDebtCustomerId) ? POS_CUSTOMERS.find(c => c.id === S.posDebtCustomerId) : null;
  const projectedBalance = debtCustomer ? Number((Number(debtCustomer.debtBalance||0) + deynAmount).toFixed(2)) : 0;
  const overLimit = !!(debtCustomer && Number(debtCustomer.creditLimit||0) > 0 && projectedBalance > Number(debtCustomer.creditLimit||0));
  const validation = posPaymentLinesValid(total);
  const canValidate = cart.length > 0
    && S.posSession?.state === 'OPENED'
    && validation.ok;

  return `
    ${S.posSession?.state==='OPENED' ? `<div class="cashier-shift-banner" style="margin-bottom:12px"><span>🟢 Register #${S.posSession.id} open · ${esc(S.posSession.config_name||S.posConfig?.name||'Main Register')}</span><span class="shift-duration-badge">Expected $${Number(S.posSessionSummary?.expected_cash||S.posSession.opening_cash||0).toFixed(2)}</span></div>` : `<div class="cashier-shift-banner cashier-shift-idle" style="margin-bottom:12px;display:flex;align-items:center"><span style="flex:1">🔒 Register closed — open it before validating an order</span><button class="btn btn-primary btn-sm" id="btn-checkout-open-register">Open register</button></div>`}
    <div class="pos-checkout-layout">
      <div class="pos-product-panel">
        <div class="pos-product-search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          <input class="pos-search-input" id="pos-search" type="text" placeholder="Search products or scan barcode..." value="${esc(S.posSearchTerm||'')}"/>
          <span style="font-size:11px;color:var(--text-muted)">${filtered.length} items</span>
        </div>
        <div class="pos-categories">
          ${['All','Groceries','Beverages','Household','Personal Care','Snacks','Bakery','Fresh'].map(cat=>`<button class="pos-cat-btn" data-pos-cat="${cat}">${cat}</button>`).join('')}
        </div>
        <div class="pos-product-grid" id="pos-products">
          ${filtered.map(p=>`
            <button class="pos-product-tile" data-add-product="${p.id}">
              <div class="pos-tile-emoji">${catEmoji[p.cat]||'\ud83d\udce6'}</div>
              <div class="pos-tile-name">${esc(p.name)}</div>
              <div class="pos-tile-price">$${p.price.toFixed(2)}</div>
              ${canViewMargin && p.wholesalePrice ? `<div class="pos-tile-wholesale">Cost: $${p.wholesalePrice.toFixed(2)}</div>` : `<div class="pos-tile-stock-inline">${p.stock} in stock</div>`}
              <div class="pos-tile-stock">${p.stock} stock</div>
            </button>
          `).join('')}
        </div>
      </div>

      <div class="pos-cart-panel">
        <div class="pos-cart-header">
          <h3 style="font-size:16px;font-weight:800;color:#FFF">Current Order</h3>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;color:rgba(255,255,255,0.6)">${cart.length} items</span>
            ${cart.length > 0 ? `<button class="btn btn-outline btn-sm" id="btn-hold-order" style="font-size:11px;padding:4px 10px;color:rgba(255,255,255,0.8);border-color:rgba(255,255,255,0.3)">⏸ Hold</button>` : ''}
            ${(S.posHeldOrders||[]).length > 0 ? `<button class="btn btn-outline btn-sm" id="btn-show-held" style="font-size:11px;padding:4px 10px;color:#F5C411;border-color:rgba(245,196,17,0.5)">📋 Held (${(S.posHeldOrders||[]).length})</button>` : ''}
          </div>
        </div>

        ${S.posShowHeld ? `
        <div class="held-orders-panel">
          <div class="held-orders-title">Held Orders — tap to resume</div>
          ${(S.posHeldOrders||[]).map((o,idx)=>`
            <div class="held-order-card">
              <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                <span style="font-weight:700;font-size:12px">#${idx+1} · ${esc(o.cashier)}</span>
                <span style="font-size:11px;color:var(--text-muted)">${new Date(o.ts).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.items.map(i=>`${i.qty}× ${i.name}`).join(', ')}</div>
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-weight:800;color:#2D1859">$${o.items.reduce((s,i)=>s+(i.price*i.qty),0).toFixed(2)}</span>
                <div style="display:flex;gap:6px">
                  <button class="btn btn-outline btn-sm" data-discard-held="${idx}">Discard</button>
                  <button class="btn btn-primary btn-sm" data-resume-held="${idx}">Resume</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>` : ''}

        <div class="pos-cart-items" id="pos-cart-items">
          ${cart.length===0 ? `
            <div class="pos-cart-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5"><path d="M3 3h18l-2 12H5L3 3z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
              <div style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:8px">Cart is empty</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.25)">Tap a product to add it</div>
            </div>
          ` : cart.map((item,i)=>{ const effPrice=item.isWholesale?item.wholesalePrice:item.price; const rowTotal=effPrice*item.qty; return `
            <div class="pos-cart-row">
              <div class="pos-cart-item-info">
                <div class="pos-cart-item-name">${esc(item.name)}</div>
                <div class="pos-cart-item-price">$${effPrice.toFixed(2)}</div>
              </div>
              ${canViewMargin ? `
              <div class="pos-wholesale-toggle">
                <span class="pos-wt-label ${!item.isWholesale?'active':''}">Retail</span>
                <label class="pos-wt-switch"><input type="checkbox" class="pos-wholesale-cb" data-cart-idx="${i}" ${item.isWholesale?'checked':''}><span class="pos-wt-track"></span></label>
                <span class="pos-wt-label ${item.isWholesale?'active':''}">Wholesale</span>
              </div>` : ''}
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
          <div class="pos-summary-row"><span>Subtotal</span><span>$${subtotal.toFixed(2)}</span></div>
          ${taxRate > 0 ? `<div class="pos-summary-row"><span>Tax (${taxRate}%)</span><span>$${tax.toFixed(2)}</span></div>` : ''}
          <div class="pos-summary-row pos-summary-total"><span>TOTAL</span><span>$${total.toFixed(2)}</span></div>
        </div>

        <div class="pos-payment-methods">
          <!-- Odoo-shaped split-payment composer (P3 Stage B). Total / Paid / Remaining
               is authoritative UX; the backend re-validates every line. -->
          <div class="pos-pay-tally" style="display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px dashed rgba(255,255,255,0.15);color:#FFF;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:800">
            <span>Total<br><span style="font-size:16px;color:#F5C411">$${total.toFixed(2)}</span></span>
            <span>Paid<br><span style="font-size:16px;color:${paid>=total?'#22C55E':'#FFF'}">$${paid.toFixed(2)}</span></span>
            <span>Remaining<br><span style="font-size:16px;color:${remaining>0?'#F5C411':'#22C55E'}">$${remaining.toFixed(2)}</span></span>
          </div>

          <div class="pos-pay-lines" style="display:flex;flex-direction:column;gap:8px;padding:8px 0">
            ${lines.length === 0 ? `<div style="text-align:center;color:rgba(255,255,255,0.45);font-size:12px;padding:8px">No payment yet — tap a method below to add a line</div>` : lines.map((line, i) => `
              <div class="pos-pay-line" data-line-idx="${i}" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:8px 10px">
                <span style="font-weight:800;color:#F5C411;flex:0 0 90px;font-size:12px">${esc(line.method_name)}</span>
                <span style="color:rgba(255,255,255,0.7);font-size:11px">$</span>
                <input class="pos-pay-line-amount" data-line-idx="${i}" type="number" step="0.01" min="0" value="${Number(line.amount||0).toFixed(2)}"
                  style="width:80px;background:rgba(0,0,0,0.35);color:#FFF;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:4px 6px;font-family:var(--font-mono)"/>
                ${line.method_type === 'cash' ? `
                  <span style="color:rgba(255,255,255,0.5);font-size:11px;margin-left:6px">Tender $</span>
                  <input class="pos-pay-line-tendered" data-line-idx="${i}" type="number" step="0.50" min="${Number(line.amount||0).toFixed(2)}" value="${Number(line.tendered||line.amount||0).toFixed(2)}"
                    style="width:80px;background:rgba(0,0,0,0.35);color:#FFF;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:4px 6px;font-family:var(--font-mono)"/>
                  ${Number(line.tendered||0) > Number(line.amount||0) ? `<span style="color:#22C55E;font-size:11px;font-weight:800">Change $${(Number(line.tendered)-Number(line.amount)).toFixed(2)}</span>` : ''}
                ` : line.method_type === 'mobile' ? `
                  <input class="pos-pay-line-reference" data-line-idx="${i}" type="text" placeholder="Txn ref…" value="${esc(line.reference||'')}"
                    style="width:120px;background:rgba(0,0,0,0.35);color:#FFF;border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:4px 6px;font-size:12px"/>
                ` : line.method_type === 'credit' ? `
                  <span style="color:rgba(255,255,255,0.5);font-size:11px;margin-left:6px">Customer Account (Deyn)</span>
                ` : ''}
                <button class="pos-pay-line-remove" data-line-idx="${i}" style="margin-left:auto;background:transparent;border:0;color:#EF4444;font-size:16px;cursor:pointer" title="Remove line">×</button>
              </div>
            `).join('')}
          </div>

          <div class="pos-pay-add" style="display:flex;flex-wrap:wrap;gap:6px;padding:6px 0">
            ${methods.length === 0 ? '<span style="color:rgba(255,255,255,0.5);font-size:12px">No payment methods enabled — open Settings → Payments</span>' : methods.map(m => `
              <button class="pos-pay-add-btn" data-add-method="${esc(m.name)}" ${cart.length===0||remaining<=0.001?'disabled':''}
                title="Add ${esc(m.name)} payment line"
                style="background:${m.type==='credit'?'rgba(245,196,17,0.15)':'rgba(255,255,255,0.08)'};border:1px solid rgba(255,255,255,0.15);color:#FFF;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer">
                + ${esc(m.name)}
              </button>
            `).join('')}
          </div>

          ${hasDeyn ? `
            <div class="pos-deyn-selector" style="margin-top:10px">
              <div class="pos-deyn-banner">
                <strong>Deyn — Customer Account</strong>
                <span>Only the Deyn line amount ($${deynAmount.toFixed(2)}) will be booked against the customer's account.</span>
              </div>
              <label class="pos-pay-section-label">Customer (Buugga Deynta)</label>
              <select id="pos-deyn-customer" class="pos-deyn-select">
                <option value="">— Select customer —</option>
                ${POS_CUSTOMERS.map(c => `<option value="${c.id}" ${S.posDebtCustomerId===c.id?'selected':''}>${esc(c.name)} — Balance: $${Number(c.debtBalance||0).toFixed(2)} / Limit: $${Number(c.creditLimit||0).toFixed(2)}</option>`).join('')}
              </select>
              ${debtCustomer ? `
                <div class="${overLimit?'pos-deyn-warning':'pos-deyn-ok'}" style="margin-top:6px">
                  ${overLimit ? '⚠' : '✓'} ${esc(debtCustomer.name)} · Balance after this sale: $${projectedBalance.toFixed(2)} / limit $${Number(debtCustomer.creditLimit||0).toFixed(2)}
                  ${overLimit ? ' — Odoo mode allows continuation; a credit warning will be recorded' : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${!validation.ok && lines.length > 0 ? `<div style="color:#F59E0B;font-size:11px;padding:4px 0;text-align:center">${esc(validation.reason)}</div>` : ''}
        </div>

        <div class="pos-cart-actions">
          <button class="pos-charge-btn" id="btn-pos-charge" ${canValidate?'':'disabled'}>
            ${canValidate ? `Validate $${total.toFixed(2)}` : `Validate`}
          </button>
          <button class="pos-clear-btn" id="btn-pos-clear" ${cart.length===0?'disabled':''}>Clear</button>
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
  const isRefund = !!r.isRefund;
  return `
    <div class="pos-receipt-overlay">
      <div class="pos-receipt-card">
        <div class="pos-receipt-header" style="${isRefund ? 'background:#FEF2F2;border-bottom:2px solid #DC2626' : ''}">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${isRefund ? '#DC2626' : '#22C55E'}" stroke-width="2">${isRefund ? '<path d="M9 14l-5-5 5-5"/><path d="M20 19v-6a5 5 0 0 0-5-5H4"/>' : '<circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/>'}</svg>
          <h3 style="font-size:18px;font-weight:900;color:${isRefund ? '#DC2626' : 'var(--text-primary)'};margin-top:8px">${isRefund ? 'Refund validated' : 'Payment successful!'}</h3>
          ${isRefund && r.originalOrder ? `<div style="font-size:11px;color:var(--text-muted);margin-top:4px">Refund of order <strong>${esc(r.originalOrder.reference_number)}</strong></div>` : ''}
        </div>
        <div class="pos-receipt-body">
          <div style="text-align:center;padding:16px 0;border-bottom:1px dashed var(--border)">
            <div style="font-weight:900;font-size:15px">${esc(S.storeSettings.receiptHeader || S.storeSettings.storeName)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${esc(S.storeSettings.defaultStore)} Store</div>
            <div style="font-size:11px;color:var(--text-muted);font-family:var(--font-mono);margin-top:4px">${esc(r.id)} · ${esc(r.date)}</div>
          </div>
          <div style="padding:12px 0;border-bottom:1px dashed var(--border)">
            ${r.items.map(item=>`
              <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0">
                <span>${esc(item.name)} × ${item.qty}</span>
                <span style="font-weight:700">$${((item.isWholesale?item.wholesalePrice:item.price)*item.qty).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div style="padding:12px 0">
            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)"><span>Subtotal</span><span>$${r.subtotal.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-muted)"><span>Tax (${Number(S.storeSettings.taxRate || 0)}%)</span><span>$${r.tax.toFixed(2)}</span></div>
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:900;margin-top:8px;color:var(--purple-800)"><span>Total</span><span>$${r.total.toFixed(2)}</span></div>
            ${Array.isArray(r.payment_lines) && r.payment_lines.length > 0 ? `
              <div style="margin-top:10px;padding-top:8px;border-top:1px dashed var(--border)">
                <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:800;color:var(--text-muted);margin-bottom:6px">Payment</div>
                ${r.payment_lines.map(line => `
                  <div style="display:flex;justify-content:space-between;font-size:13px;padding:2px 0">
                    <span>${esc(line.method)}</span>
                    <span style="font-weight:700">$${Number(line.amount||0).toFixed(2)}</span>
                  </div>
                  ${line.tendered !== undefined && Number(line.tendered) > Number(line.amount) ? `
                    <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);padding:0 8px">
                      <span>Cash received</span><span>$${Number(line.tendered).toFixed(2)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;padding:0 8px">
                      <span>Change</span><span>$${(Number(line.tendered)-Number(line.amount)).toFixed(2)}</span>
                    </div>
                  ` : ''}
                  ${line.reference ? `<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);padding:0 8px"><span>Ref</span><span style="font-family:var(--font-mono)">${esc(line.reference)}</span></div>` : ''}
                `).join('')}
              </div>
            ` : `<div style="display:flex;justify-content:space-between;font-size:12px;margin-top:8px;color:var(--text-muted)"><span>Paid via</span><span style="font-weight:700;color:var(--text-primary)">${esc(r.method)}</span></div>`}
          </div>
          <div style="text-align:center;font-size:11px;color:var(--text-muted);padding-top:12px;border-top:1px dashed var(--border)">${esc(S.storeSettings.receiptFooter)}</div>
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
              <div class="form-group"><label class="form-label">Product Name *</label><input class="form-input" id="cf-name" value="${esc(f.name||'')}"/></div>
              <div class="form-group"><label class="form-label">Category</label>
                <select class="form-select" id="cf-cat">
                  ${['Groceries','Beverages','Household','Personal Care','Snacks','Bakery','Fresh'].map(c=>`<option ${(f.cat||'Groceries')===c?'selected':''}>${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group"><label class="form-label">Retail Price (USD) *</label><input class="form-input" id="cf-price" type="number" step="0.01" min="0" value="${f.price||''}"/></div>
              <div class="form-group"><label class="form-label">Wholesale Price (USD)</label><input class="form-input" id="cf-wholesalePrice" type="number" step="0.01" min="0" value="${f.wholesalePrice||''}"/></div>
              <div class="form-group"><label class="form-label">Stock Qty *</label><input class="form-input" id="cf-stock" type="number" min="0" value="${f.stock||''}"/></div>
              <div class="form-group"><label class="form-label">Low-stock alert level</label><input class="form-input" id="cf-minimumStock" type="number" min="0" value="${f.minimumStock ?? 5}"/><div style="font-size:11px;color:var(--text-muted);margin-top:4px">Managers are notified at or below this quantity.</div></div>
              <div class="form-group"><label class="form-label">Barcode</label><input class="form-input" id="cf-barcode" value="${esc(f.barcode||'')}"/></div>
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
      <div class="kpi-card light"><div class="kpi-eyebrow">Low stock</div><div class="kpi-value trend-warn">${posCountLowStock()}</div></div>
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
                <td style="font-weight:700">${esc(p.name)}</td>
                <td><span class="pill" style="background:var(--gray-50);color:var(--text-secondary)">${esc(p.cat)}</span></td>
                <td style="font-weight:800">$${p.price.toFixed(2)}</td>
                <td style="font-size:13px;color:var(--text-muted)">$${p.wholesalePrice.toFixed(2)}</td>
                <td style="font-weight:700;color:${p.stock<40?'#B45309':'var(--text-primary)'}">${p.stock}</td>
                <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${esc(p.barcode)}</td>
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
              <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="cf-name" value="${esc(f.name||'')}"/></div>
              <div class="form-group"><label class="form-label">Phone *</label><input class="form-input" id="cf-phone" value="${esc(f.phone||'')}"/></div>
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
                <td><div class="flex items-center gap-10"><div class="avatar avatar-sm">${esc(initials(c.name))}</div><div><div style="font-weight:700">${esc(c.name)}</div><div style="font-size:10px;color:var(--text-muted)">${esc(c.tier)}</div></div></div></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${esc(c.phone)}</td>
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
            ${POS_CUSTOMERS.map(c=>{ const tc=tierColor[c.tier]||'#ccc'; return `<tr><td><div class="flex items-center gap-10"><div class="avatar avatar-sm">${esc(initials(c.name))}</div><span style="font-weight:700">${esc(c.name)}</span></div></td><td><span class="pill" style="background:${tc}22;color:${tc==='#F5C411'?'#B45309':tc};border:1px solid ${tc}44;font-weight:800">\u2605 ${esc(c.tier)}</span></td><td style="font-weight:700">${c.points.toLocaleString()}</td><td>${c.visits}</td><td style="font-size:12px;color:var(--text-muted)">${esc(c.lastVisit)}</td></tr>`; }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderPOSTransactions() {
  const completedTransactions = POS_TRANSACTIONS.filter(t=>t.status==='COMPLETED');
  const saleOrders = completedTransactions.filter(t=>!t.isRefund&&t.total>=0);
  const refundOrders = completedTransactions.filter(t=>t.isRefund||t.total<0);
  const grossSales = saleOrders.reduce((s,t)=>s+t.total,0);
  const refunds = Math.abs(refundOrders.reduce((s,t)=>s+t.total,0));
  const totalSales = grossSales-refunds;
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
              <div class="txn-detail-row"><span>ID</span><span class="mono-val">${esc(t.id)}</span></div>
              <div class="txn-detail-row"><span>Date</span><span>${esc(t.date)}</span></div>
              <div class="txn-detail-row"><span>Time</span><span class="mono-val">${esc(t.time)}</span></div>
              <div class="txn-detail-row"><span>Cashier</span><span>${esc(t.cashier)}</span></div>
              <div class="txn-detail-row"><span>Customer</span><span>${esc(t.customer)}</span></div>
              <div class="txn-detail-row"><span>Items</span><span>${t.items}</span></div>
              <div class="txn-detail-row"><span>Payment</span><span>${esc(t.method)}</span></div>
              <div class="txn-detail-row"><span>Status</span><span>${esc(t.status)}</span></div>
              <div class="txn-detail-row"><span>Order state</span><span>${esc(t.posState||'legacy')}</span></div>
              <div class="txn-detail-row"><span>Document type</span><span>${t.isRefund?'Linked refund':'Sale order'}</span></div>
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
          <h3>Refund Transaction ${t?.id}?</h3>
          <p>Amount: <strong>$${t?.total.toFixed(2)}</strong> · ${t?.method}. A linked negative refund order will be created and the original sale will remain unchanged.</p>
          <div class="crud-confirm-actions">
            <button class="btn btn-danger" id="btn-delete-confirm">Refund transaction</button>
            <button class="btn btn-outline" id="btn-delete-cancel">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  return `
    ${viewHtml}${deleteHtml}
    <div class="kpi-grid">
      <div class="kpi-card dark">
        <div class="kpi-eyebrow" style="color:#F5C411">Net sales</div>
        <div class="kpi-value">$${totalSales.toFixed(2)}</div>
      </div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Sale orders</div><div class="kpi-value">${saleOrders.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Gross sales</div><div class="kpi-value">$${grossSales.toFixed(2)}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Refunds</div><div class="kpi-value" style="color:${refunds?'#B91C1C':'inherit'}">$${refunds.toFixed(2)}</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar"><h3 class="chart-title">POS Orders</h3>
        <div class="ml-auto" style="font-size:12px;color:var(--text-muted)">Click row to view · 🗑️ to refund</div>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:820px">
          <thead><tr><th>ID</th><th>Cashier</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Time</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${POS_TRANSACTIONS.map(t=>`
              <tr class="txn-row-clickable" data-view-txn="${t.id}">
                <td style="font-family:var(--font-mono);font-weight:700;color:#2D1859">${esc(t.id)}</td>
                <td>${esc(t.cashier)}</td>
                <td style="font-size:12px;color:var(--text-muted)">${esc(t.customer)}</td>
                <td>${t.items}</td>
                <td style="font-weight:800">$${t.total.toFixed(2)}</td>
                <td><span class="pill ${t.method==='Cash'?'pill-green':'pill-gold'}">${esc(t.method)}</span></td>
                <td><span class="pill ${t.status==='COMPLETED'?'pill-green':'pill-red'}">${esc(t.status)}</span></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${esc(t.time)}</td>
                <td class="col-right" onclick="event.stopPropagation()">
                  <div class="crud-actions">
                    <button class="crud-btn" data-view-txn-btn="${t.id}" title="View details" style="color:var(--purple-800)">👁️</button>
                    ${posCan('pos.refund') && t.status==='COMPLETED' && !t.isRefund && t.refund_status !== 'REFUNDED' ? `<button class="btn btn-outline btn-sm" data-refund-txn="${t.id}" title="Refund lines from this sale" style="padding:4px 10px;font-size:12px"><span aria-hidden="true">↩</span> Refund${t.refund_status==='PARTIALLY_REFUNDED'?' more':''}</button>` : ''}
                    ${t.refund_status ? `<span class="pill ${t.refund_status==='REFUNDED'?'pill-red':'pill-gold'}" title="${t.refund_status}">${t.refund_status==='REFUNDED'?'Refunded':'Partial'}</span>` : ''}
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

// ============================================================
// P6 — REFUND MODAL (Odoo-style workflow)
// Opens for the selected original order:
//   Session A → Order line list with per-line refund-qty picker
//              → Payment composer (dynamic methods from settings)
//              → Validate → refund receipt.
// Backend independently validates every line + payment total. Frontend is
// UX only. State lives in S.posRefundModal so it survives re-renders.
// ============================================================
function renderPOSRefundModal() {
  const m = S.posRefundModal;
  if (!m) return '';
  if (m.loading) return `
    <div class="crud-overlay"><div class="crud-modal" style="max-width:520px;text-align:center;padding:40px">
      Loading refundable summary for order #${m.orderId}…
    </div></div>`;
  if (m.error) return `
    <div class="crud-overlay"><div class="crud-modal" style="max-width:520px;padding:24px">
      <div class="crud-error" style="margin-bottom:16px">${esc(m.error)}</div>
      <button class="btn btn-outline" id="btn-refund-close">Close</button>
    </div></div>`;

  const data = m.data;
  const order = data.order;
  const lines = m.lines || [];
  const total = lines.reduce((s,l) => s + (Number(l.refund_qty || 0) * Number(l.item.unit_price || 0) * (1 + Number(l.item.tax_rate || 0)/100) * (1 - Number(l.item.discount_percent || 0)/100)), 0);
  // Use the more accurate ratio calculation the backend does — line total × ratio
  const totalPrecise = lines.reduce((s, l) => {
    const orig = Number(l.item.original_qty || 0);
    if (orig <= 0) return s;
    return s + Number(l.item.total || 0) * (Number(l.refund_qty || 0) / orig);
  }, 0);
  const refundTotal = Number(totalPrecise.toFixed(2));

  const payments = m.payments || [];
  const paid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const remaining = Number((refundTotal - paid).toFixed(2));
  const methods = posConfiguredMethods();
  const money = n => `$${Number(n || 0).toFixed(2)}`;

  const validate = (() => {
    if (refundTotal <= 0) return { ok:false, reason:'Select at least one item and quantity to refund' };
    for (const l of lines) {
      const q = Number(l.refund_qty || 0);
      if (q < 0) return { ok:false, reason:`${l.item.product_name}: quantity cannot be negative` };
      if (q > Number(l.item.refundable_qty)) return { ok:false, reason:`${l.item.product_name}: over the refundable qty` };
    }
    if (payments.length === 0) return { ok:false, reason:'Add at least one refund payment method' };
    if (Math.abs(remaining) > 0.001) return { ok:false, reason:`Refund payments must total ${money(refundTotal)}` };
    return { ok:true };
  })();

  return `
    <div class="crud-overlay">
      <div class="crud-modal" style="max-width:760px">
        <div class="crud-modal-header" style="background:#FEF2F2;border-bottom:1px solid #FCA5A5">
          <h3><span aria-hidden="true">↩</span> Refund — ${esc(order.reference_number)}</h3>
          <button class="crud-close-btn" id="btn-refund-close">×</button>
        </div>
        <div class="crud-modal-body">
          <div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:12px;font-size:12px;color:var(--text-muted)">
            <span>Original cashier: <strong>${esc(order.cashier_name)}</strong></span>
            <span>Customer: <strong>${esc(order.customer_name || 'Walk-in')}</strong></span>
            <span>Original total: <strong>${money(order.total_amount)}</strong></span>
            ${data.prior_refunds?.length ? `<span>Prior refunds: <strong>${data.prior_refunds.length}</strong></span>` : ''}
          </div>

          <!-- LINE PICKER -->
          <div class="data-section" style="margin-bottom:14px">
            <div class="section-header-bar"><h3 class="chart-title">Select items to refund</h3></div>
            <div class="overflow-x-auto"><table class="data-table" style="min-width:520px">
              <thead><tr><th>Product</th><th>Unit</th><th>Refundable</th><th>Refund qty</th><th>Line total</th></tr></thead>
              <tbody>
                ${lines.map((l, i) => {
                  const perLine = Number(l.item.original_qty || 0) > 0
                    ? Number(l.item.total || 0) * (Number(l.refund_qty || 0) / Number(l.item.original_qty))
                    : 0;
                  return `<tr>
                    <td style="font-weight:700">${esc(l.item.product_name)}</td>
                    <td style="font-family:var(--font-mono)">${money(l.item.unit_price)}</td>
                    <td style="color:var(--text-muted)">${Number(l.item.refundable_qty)} of ${Number(l.item.original_qty)}</td>
                    <td><input class="form-input pos-refund-qty" data-line-idx="${i}" type="number" min="0" step="1" max="${l.item.refundable_qty}" value="${l.refund_qty}" style="width:80px" ${Number(l.item.refundable_qty)<=0?'disabled':''}/></td>
                    <td style="font-weight:800">${money(perLine)}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table></div>
            <div style="display:flex;justify-content:space-between;padding:12px 14px;background:var(--gray-50);border-radius:8px;margin-top:8px">
              <span style="font-weight:800">Refund total</span>
              <span style="font-weight:900;color:#B91C1C;font-size:16px">${money(refundTotal)}</span>
            </div>
          </div>

          <!-- REFUND PAYMENT COMPOSER (mirror of the checkout composer) -->
          <div class="data-section" style="margin-bottom:14px">
            <div class="section-header-bar"><h3 class="chart-title">Refund method</h3></div>
            <div style="display:flex;justify-content:space-between;gap:14px;padding:8px 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:800">
              <span>Total<br><span style="font-size:16px;color:#B91C1C">${money(refundTotal)}</span></span>
              <span>Allocated<br><span style="font-size:16px;color:${paid>=refundTotal?'#22C55E':'inherit'}">${money(paid)}</span></span>
              <span>Remaining<br><span style="font-size:16px;color:${remaining>0?'#F59E0B':'#22C55E'}">${money(remaining)}</span></span>
            </div>
            ${payments.map((p, i) => `
              <div style="display:flex;align-items:center;gap:8px;padding:6px;background:var(--gray-50);border-radius:6px;margin-bottom:6px">
                <span style="font-weight:800;color:var(--purple-800);flex:0 0 100px">${esc(p.method)}</span>
                <span style="color:var(--text-muted)">$</span>
                <input class="form-input pos-refund-pay-amount" data-pay-idx="${i}" type="number" step="0.01" min="0" value="${Number(p.amount || 0).toFixed(2)}" style="width:100px"/>
                <button class="btn btn-outline btn-sm pos-refund-pay-remove" data-pay-idx="${i}" style="margin-left:auto;color:#EF4444">Remove</button>
              </div>
            `).join('')}
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
              ${methods.map(mm => `<button class="btn btn-outline btn-sm pos-refund-add-method" data-add-method="${esc(mm.name)}" ${refundTotal<=0||remaining<=0.001?'disabled':''}>+ ${esc(mm.name)}</button>`).join('')}
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:8px">
              Cash refund reduces this session's Expected Cash by exactly this amount. Deyn reversals reduce the customer's outstanding balance.
              ${data.original_payments?.length ? `Original: ${data.original_payments.map(p => `${p.method_name} $${p.amount}`).join(' + ')}` : ''}
            </div>
          </div>

          ${!validate.ok ? `<div style="color:#F59E0B;font-size:12px;margin-top:8px;text-align:center">${esc(validate.reason)}</div>` : ''}
        </div>
        <div class="crud-modal-footer">
          <button class="btn btn-danger" id="btn-refund-submit" ${validate.ok?'':'disabled'}>Validate refund</button>
          <button class="btn btn-outline" id="btn-refund-close">Cancel</button>
        </div>
      </div>
    </div>`;
}

async function openRefundModal(orderId) {
  S.posRefundModal = { orderId, loading:true, error:null };
  render();
  try {
    const data = await posLoadRefundable(orderId);
    S.posRefundModal = {
      orderId,
      loading: false,
      error: null,
      data,
      lines: (data.items || []).map(item => ({
        item,
        // Default: refund the max refundable qty of the first line, 0 for the rest.
        refund_qty: 0,
      })),
      payments: [],
    };
  } catch (e) {
    S.posRefundModal = { orderId, loading:false, error: e.message };
  }
  render();
}

function wireRefundModal() {
  document.getElementById('btn-refund-close')?.addEventListener('click', () => { S.posRefundModal = null; render(); });
  document.querySelectorAll('.pos-refund-qty').forEach(inp => {
    inp.addEventListener('input', () => {
      const i = parseInt(inp.dataset.lineIdx);
      const v = Math.max(0, Number(inp.value) || 0);
      const max = Number(S.posRefundModal.lines[i].item.refundable_qty || 0);
      S.posRefundModal.lines[i].refund_qty = Math.min(v, max);
      render();
    });
  });
  document.querySelectorAll('.pos-refund-add-method').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const name = btn.dataset.addMethod;
      const lines = S.posRefundModal.lines;
      const totalPrecise = lines.reduce((s, l) => {
        const o = Number(l.item.original_qty || 0);
        return o > 0 ? s + Number(l.item.total || 0) * (Number(l.refund_qty || 0) / o) : s;
      }, 0);
      const refundTotal = Number(totalPrecise.toFixed(2));
      const already = S.posRefundModal.payments.reduce((s,p) => s + Number(p.amount || 0), 0);
      const remaining = Number((refundTotal - already).toFixed(2));
      S.posRefundModal.payments.push({ method: name, amount: Math.max(0, remaining) });
      render();
    });
  });
  document.querySelectorAll('.pos-refund-pay-amount').forEach(inp => {
    inp.addEventListener('input', () => {
      const i = parseInt(inp.dataset.payIdx);
      S.posRefundModal.payments[i].amount = Math.max(0, Number(inp.value) || 0);
      render();
    });
  });
  document.querySelectorAll('.pos-refund-pay-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.payIdx);
      S.posRefundModal.payments.splice(i, 1);
      render();
    });
  });
  const submit = document.getElementById('btn-refund-submit');
  if (submit) submit.addEventListener('click', async () => {
    if (submit.disabled) return;
    submit.disabled = true; submit.textContent = 'Validating…';
    try {
      const items = S.posRefundModal.lines
        .filter(l => Number(l.refund_qty) > 0)
        .map(l => ({ order_item_id: Number(l.item.id), quantity: Number(l.refund_qty) }));
      const payments = S.posRefundModal.payments.map(p => ({ method: p.method, amount: Number(p.amount) }));
      const result = await posSubmitRefund(S.posRefundModal.orderId, { items, payments, reason: 'POS refund via Odoo-style workflow' });
      const modalOrder = S.posRefundModal.data.order;
      S.posRefundModal = null;
      S.posLastReceipt = {
        id: result.reference_number,
        date: new Date(result.created_at || Date.now()).toLocaleString(),
        items: [],
        subtotal: 0,
        tax: 0,
        total: Number(result.total_amount || 0),
        payment_lines: result.payment_lines || [],
        method: result.payment_method || 'Refund',
        amountPaid: 0, change: 0,
        isRefund: true,
        originalOrder: modalOrder,
      };
      S.posReceiptVisible = true;
      render();
    } catch (e) {
      alert(e.message || 'Refund failed.');
      submit.disabled = false; submit.textContent = 'Validate refund';
    }
  });
}

function renderStaffCredentialResult() {
  const result=S.staffCredentialResult;
  if(!result)return '';
  return `<div class="crud-overlay">
    <div class="crud-modal" style="max-width:540px">
      <div class="crud-modal-header"><h3>Staff Account Created</h3><button class="crud-close-btn" id="btn-staff-credentials-done">×</button></div>
      <div class="crud-modal-body">
        <div style="background:#ECFDF3;border:1px solid #86EFAC;border-radius:10px;padding:12px 14px;color:#166534;font-size:13px;margin-bottom:16px"><strong>${esc(result.name)}</strong> can now select their name on the Retail POS lock screen and enter the PIN below.</div>
        <div class="txn-detail-grid">
          <div class="txn-detail-row"><span>Email</span><span class="mono-val">${esc(result.email)}</span></div>
          <div class="txn-detail-row"><span>Temporary password</span><span class="mono-val">${esc(result.temporaryPassword)}</span></div>
          <div class="txn-detail-row"><span>POS PIN</span><span class="mono-val" style="font-size:22px;letter-spacing:6px;color:var(--purple-800)">${esc(result.pin)}</span></div>
        </div>
        <div style="font-size:11px;color:#B45309;background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px;margin-top:14px">Copy these credentials now. For security, the PIN and temporary password will not be displayed again.</div>
      </div>
      <div class="crud-modal-footer"><button class="btn btn-outline" id="btn-copy-staff-credentials">Copy credentials</button><button class="btn btn-primary" id="btn-staff-credentials-done-2">Done</button></div>
    </div>
  </div>`;
}

function renderPOSStaff() {
  return `
    ${renderStaffCredentialResult()}
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Shaqaalaha guud</div><div class="kpi-value">${POS_STAFF.length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Shaqeeya</div><div class="kpi-value" style="color:#0F7A3A">${POS_STAFF.filter(s=>s.status==='active').length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Nasanaya</div><div class="kpi-value trend-warn">${POS_STAFF.filter(s=>s.status==='break').length}</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Iibka maanta</div><div class="kpi-value">${POS_STAFF.reduce((s,st)=>s+st.sales,0)}</div></div>
    </div>


    <!-- STAFF CRUD MODAL -->
    ${(()=>{
      let staffModal = '';
      if (S.crudModal && S.crudModal.type === 'staff') {
        const isEdit = S.crudModal.mode === 'edit';
        const f = S.crudForm;
        const branches = (S.posBranches||[]).length ? S.posBranches : [{id:'',name:'Main Store'}];
        staffModal = `
          <div class="crud-overlay">
            <div class="crud-modal">
              <div class="crud-modal-header">
                <h3>${isEdit ? 'Edit Staff Member' : 'Add Staff Member'}</h3>
                <button class="crud-close-btn" id="btn-crud-close">\u00d7</button>
              </div>
              <div class="crud-modal-body">
                <div class="crud-grid-2">
                  <div class="form-group"><label class="form-label">Full Name *</label><input class="form-input" id="cf-name" value="${esc(f.name||'')}"/></div>
                  <div class="form-group"><label class="form-label">Email ${isEdit?'':'(optional)'}</label><input class="form-input" id="cf-email" type="email" placeholder="${isEdit?'staff@company.so':'Auto-generated if empty'}" value="${esc(f.email||'')}" ${isEdit?'':'autocomplete="off"'}/></div>
                  <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="cf-phone" type="tel" placeholder="061…" value="${esc(f.phone||'')}"/></div>
                  <div class="form-group"><label class="form-label">Role</label>
                    <select class="form-select" id="cf-role">
                      ${['Cashier','Senior Cashier','Store Manager'].map(r=>`<option ${(f.role||'Cashier')===r?'selected':''}>${r}</option>`).join('')}
                    </select>
                  </div>
                  <div class="form-group"><label class="form-label">Store</label>
                    <select class="form-select" id="cf-branchId">
                      ${branches.map(branch=>`<option value="${branch.id}" ${Number(f.branchId||branches[0]?.id)===Number(branch.id)?'selected':''}>${esc(branch.name)}</option>`).join('')}
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
                  <div class="form-group">
                    <label class="form-label">4-digit POS PIN ${isEdit?'(leave empty to keep)':'*'}</label>
                    <div style="display:flex;gap:8px">
                      <input class="form-input mono" id="cf-pin" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" placeholder="0000" value="${esc(f.pin||'')}" style="letter-spacing:5px;font-weight:800"/>
                      <button type="button" class="btn btn-outline btn-sm" id="btn-generate-staff-pin">Generate</button>
                    </div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Give this PIN to the staff member privately. It is shown once after saving.</div>
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
                <td><div class="flex items-center gap-10"><div class="avatar avatar-sm">${esc(initials(s.name))}</div><span style="font-weight:700">${esc(s.name)}</span></div></td>
                <td style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${esc(s.username||'—')}</td>
                <td><span class="role-tag ${s.role.includes('Admin')?'role-manager':s.role.includes('Manager')?'role-manager':s.role.includes('Senior')?'role-pharmacist':'role-cashier'}">${s.role}</span></td>
                <td><span class="pin-badge">${s.hasPin ? '●●●●' : 'Not set'}</span></td>
                <td style="font-size:13px">${esc(s.store)}</td>
                <td style="font-size:12px;color:var(--text-muted)">${esc(s.shift)}</td>
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

function renderPOSSessions() {
  // Rule #9 / #16 — the CURRENT open session is a first-class card at the top;
  // history is a separate table below. The two never share a row.
  const all = S.posSessions || [];
  const current = S.posSession && S.posSession.state === 'OPENED' ? S.posSession : null;
  const closed = all.filter(row => row.state === 'CLOSED');
  const summary = S.posSessionSummary || {};
  const cashInOut = summary.cash_movements || { in:0, out:0 };
  const activeEmployee = S.posActiveUser ? S.posActiveUser.name : 'POS Locked';
  const canCloseRegister  = posCan('closeRegister');
  const canCashInOut      = posCan('cashInOut');
  const canOpenRegister   = posCan('openRegister');

  const currentCard = current ? `
    <div class="card" style="padding:20px;margin-bottom:16px;border:2px solid #22C55E;background:linear-gradient(180deg,#F0FDF4 0%,#FFF 100%)">
      <div style="display:flex;align-items:flex-start;gap:14px;flex-wrap:wrap">
        <div style="flex:1;min-width:260px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <span class="pill pill-green" style="font-weight:900">CURRENT REGISTER SESSION</span>
            <span style="font-family:var(--font-mono);font-weight:900;font-size:16px;color:var(--purple-800)">#${current.id}</span>
            <span class="pill pill-green">OPEN</span>
          </div>
          <h3 class="chart-title" style="margin-top:4px">${esc(current.config_name || S.posConfig?.name || 'Main Register')}</h3>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Opened by <strong>${esc(current.opened_by_name || '—')}</strong> · Current employee <strong>${esc(activeEmployee)}</strong></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" id="btn-continue-selling">Continue Selling</button>
          ${canCashInOut ? `<button class="btn btn-outline btn-sm" id="btn-cash-in">Cash In</button><button class="btn btn-outline btn-sm" id="btn-cash-out">Cash Out</button>` : ''}
          ${canCloseRegister ? `<button class="btn btn-primary btn-sm" id="btn-session-close">Close Register</button>` : ''}
        </div>
      </div>
      <div class="txn-detail-grid" style="margin-top:16px">
        <div class="txn-detail-row"><span>Opened at</span><strong>${esc(current.opened_at || '—')}</strong></div>
        <div class="txn-detail-row"><span>Opening cash</span><strong>$${Number(current.opening_cash || 0).toFixed(2)}</strong></div>
        <div class="txn-detail-row"><span>Expected cash</span><strong>$${Number(summary.expected_cash || current.opening_cash || 0).toFixed(2)}</strong></div>
        <div class="txn-detail-row"><span>Net sales</span><strong>$${Number(summary.net_sales || 0).toFixed(2)}</strong></div>
        <div class="txn-detail-row"><span>Orders</span><strong>${Number(summary.orders || 0)}</strong></div>
        <div class="txn-detail-row"><span>Cash in / out</span><strong>$${Number(cashInOut.in || 0).toFixed(2)} / $${Number(cashInOut.out || 0).toFixed(2)}</strong></div>
      </div>
    </div>` : `
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:240px">
          <span class="pill pill-amber" style="font-weight:900">REGISTER CLOSED</span>
          <h3 class="chart-title" style="margin-top:8px">${esc(S.posConfig?.name || 'Main Register')}</h3>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px">Open the register with an Opening Control entry before selling.</div>
        </div>
        ${canOpenRegister ? `<button class="btn btn-primary btn-sm" id="btn-session-open">Open Register</button>` : `<div style="font-size:11px;color:var(--text-muted)">A Senior Cashier or higher must open the register.</div>`}
      </div>
    </div>`;

  const closedTable = closed.length === 0
    ? `<div style="padding:28px;text-align:center;color:var(--text-muted);font-size:13px">${current ? 'No closed register sessions yet.' : 'No register sessions have been recorded yet.'}</div>`
    : `<div class="overflow-x-auto"><table class="data-table" style="min-width:1100px">
        <thead><tr><th>Session</th><th>Register</th><th>Opened by</th><th>Closed by</th><th>Opened</th><th>Closed</th><th>Orders</th><th>Net sales</th><th>Expected</th><th>Counted</th><th>Difference</th></tr></thead>
        <tbody>
          ${closed.map(row => `
            <tr>
              <td style="font-family:var(--font-mono);font-weight:800">#${row.id}</td>
              <td>${esc(row.config_name)}</td>
              <td>${esc(row.opened_by_name)}</td>
              <td>${esc(row.closed_by_name || '—')}</td>
              <td>${esc(row.opened_at || '—')}</td>
              <td>${esc(row.closed_at || '—')}</td>
              <td>${Number(row.orders || 0)}</td>
              <td>$${Number(row.net_sales || 0).toFixed(2)}</td>
              <td>$${Number(row.expected_cash || 0).toFixed(2)}</td>
              <td>${row.counted_cash == null ? '—' : `$${Number(row.counted_cash).toFixed(2)}`}</td>
              <td style="font-weight:800;color:${Number(row.difference_amount || 0) < 0 ? '#B91C1C' : 'var(--text-primary)'}">${row.difference_amount == null ? '—' : `$${Number(row.difference_amount).toFixed(2)}`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table></div>`;

  return `
    ${currentCard}
    <div class="data-section">
      <div class="section-header-bar">
        <h3 class="chart-title">Closed Register Sessions</h3>
        <span class="ml-auto" style="font-size:11px;color:var(--text-muted)">${closed.length} closed session${closed.length===1?'':'s'}</span>
      </div>
      ${closedTable}
    </div>`;
}

function renderPOSPayments() {
  const rows=S.posPayments||[];
  const total=rows.reduce((sum,row)=>sum+Number(row.amount||0),0);
  const methods=[...new Set(rows.map(row=>row.method_name))];
  return `
    <div class="kpi-grid"><div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Net payments</div><div class="kpi-value">$${total.toFixed(2)}</div></div><div class="kpi-card light"><div class="kpi-eyebrow">Payment lines</div><div class="kpi-value">${rows.length}</div></div><div class="kpi-card light"><div class="kpi-eyebrow">Methods used</div><div class="kpi-value">${methods.length}</div></div><div class="kpi-card light"><div class="kpi-eyebrow">Register</div><div class="kpi-value" style="font-size:20px">${S.posSession?.state==='OPENED'?`#${S.posSession.id} OPEN`:'CLOSED'}</div></div></div>
    <div class="data-section"><div class="section-header-bar"><h3 class="chart-title">Payment Lines</h3><div class="ml-auto" style="font-size:11px;color:var(--text-muted)">Tender and returned change are separate auditable lines.</div></div><div class="overflow-x-auto"><table class="data-table" style="min-width:900px"><thead><tr><th>ID</th><th>Order</th><th>Session</th><th>Cashier</th><th>Method</th><th>Type</th><th>Amount</th><th>Reference</th><th>Status</th><th>Time</th></tr></thead><tbody>
      ${rows.map(row=>`<tr><td>#${row.id}</td><td style="font-family:var(--font-mono)">${esc(row.order_reference)}</td><td>#${row.session_id}</td><td>${esc(row.cashier_name)}</td><td><span class="pill ${row.method_type==='cash'?'pill-green':'pill-gold'}">${esc(row.method_name)}</span></td><td>${Number(row.is_change)?'Change returned':esc(row.method_type)}</td><td style="font-weight:800;color:${Number(row.amount)<0?'#B91C1C':'inherit'}">$${Number(row.amount).toFixed(2)}</td><td>${esc(row.reference_number||'—')}</td><td>${esc(row.status)}</td><td>${esc(row.created_at)}</td></tr>`).join('')}
      ${rows.length?'':'<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text-muted)">No POS payments have been recorded.</td></tr>'}
    </tbody></table></div></div>`;
}

function renderPOSSettings() {
  const s = S.storeSettings;
  const stores = (S.posBranches || []).length
    ? S.posBranches.map(branch => branch.name)
    : [s.defaultStore || 'Main Store'];
  const savedBanner = S._settingsSaved
    ? `<div style="background:#DEF7EC;color:#0F7A3A;border:1px solid #86EFAC;padding:10px 14px;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:16px">Settings saved.</div>`
    : '';

  return `
    <div class="section-header-bar" style="margin-bottom:16px"><h3 class="chart-title">⚙️ Configuration Settings</h3></div>
    <div style="max-width:600px">
      ${savedBanner}

      <div class="card" style="padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:16px">Store Settings</h3>
        <div class="flex-col gap-14">
          <div class="form-group">
            <label class="form-label">Store name</label>
            <input class="form-input" id="ss-store-name" value="${esc(s.storeName)}"/>
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
              ${stores.map(st => `<option ${s.defaultStore===st?'selected':''}>${esc(st)}</option>`).join('')}
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
            <input class="form-input" id="ss-receipt-header" value="${esc(s.receiptHeader)}"/>
          </div>
          <div class="form-group">
            <label class="form-label">Footer message</label>
            <input class="form-input" id="ss-receipt-footer" value="${esc(s.receiptFooter)}"/>
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

      <div class="card" style="padding:24px;margin-bottom:16px">
        <h3 style="font-size:16px;font-weight:800;margin-bottom:4px">Register & Cash Control</h3>
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:16px">Controls the Odoo-style opening and closing workflow for this branch register.</div>
        <div class="flex-col gap-14">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span><strong>Cash control</strong><small style="display:block;color:var(--text-muted);margin-top:3px">Track opening, cash payments, cash in/out, and closing cash.</small></span><label class="toggle"><input type="checkbox" id="ss-cash-control" ${s.cashControl?'checked':''}/><span class="toggle-slider"></span></label></div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span><strong>Opening control</strong><small style="display:block;color:var(--text-muted);margin-top:3px">Require an opening balance before validating orders.</small></span><label class="toggle"><input type="checkbox" id="ss-opening-control" ${s.openingControl?'checked':''}/><span class="toggle-slider"></span></label></div>
          <div class="form-group"><label class="form-label">Maximum closing difference (USD)</label><input class="form-input" id="ss-max-difference" type="number" min="0" step="0.01" value="${Number(s.maximumDifference||0)}"/><div style="font-size:11px;color:var(--text-muted);margin-top:4px">A larger difference requires Company Admin or Store Manager approval.</div></div>
          <button class="btn btn-primary btn-sm" id="btn-save-register-settings" style="align-self:flex-start">Save register controls</button>
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

function posMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function posReportConfig(section, data) {
  const configs = {
    sales: {
      title:'Daily Sales', rows:data.daily_sales || [],
      columns:[['date','Date'],['orders','Orders'],['subtotal','Subtotal',posMoney],['tax','Tax',posMoney],['total','Total',posMoney]],
    },
    orders: {
      title:'Transactions', rows:data.orders || [],
      columns:[['reference_number','Reference'],['order_date','Date'],['cashier','Cashier'],['customer','Customer'],['items','Items'],['payment_method','Payment'],['status','Status'],['subtotal','Subtotal',posMoney],['tax_amount','Tax',posMoney],['total_amount','Total',posMoney]],
    },
    products: {
      title:'Top Products', rows:data.top_products || [],
      columns:[['sku','SKU'],['name','Product'],['category','Category'],['quantity_sold','Quantity Sold'],['sales','Sales',posMoney]],
    },
    payments: {
      title:'Payment Methods', rows:data.payments || [],
      columns:[['payment_method','Payment Method'],['transactions','Transactions'],['amount','Amount',posMoney]],
    },
    inventory: {
      title:'Inventory', rows:data.inventory || [],
      columns:[['sku','SKU'],['name','Product'],['category','Category'],['current_stock','Stock'],['minimum_stock','Minimum'],['purchase_price','Cost',posMoney],['selling_price','Retail',posMoney],['wholesale_price','Wholesale',posMoney],['retail_value','Retail Value',posMoney],['stock_status','Status']],
    },
    customers: {
      title:'Customers & Debt', rows:data.customers || [],
      columns:[['customer_code','Code'],['name','Customer'],['phone','Phone'],['email','Email'],['credit_limit','Credit Limit',posMoney],['balance','Debt Balance',posMoney],['status','Status'],['created_at','Created']],
    },
    staff: {
      title:'Staff Performance', rows:data.staff || [],
      columns:[['name','Staff'],['email','Email'],['roles','Role'],['branch','Branch'],['completed_orders','Completed Orders'],['sales','Sales',posMoney],['status','Status']],
    },
    shifts: {
      title:'Shift Reconciliation', rows:data.shifts || [],
      columns:[['closed_at','Closed At'],['cashier','Cashier'],['closed_by','Closed By'],['branch','Branch'],['system_cash','System Cash',posMoney],['counted_cash','Counted Cash',posMoney],['variance','Variance',posMoney],['notes','Notes']],
    },
  };
  return configs[section] || configs.sales;
}

function renderPOSReports() {
  const data = S.posReportData;
  if (S.posReportLoading && !data) return `<div class="card" style="padding:40px;text-align:center;color:var(--text-muted)">Generating report…</div>`;
  const summary = data?.summary || {};
  const sections = [['sales','Daily Sales'],['orders','Transactions'],['products','Top Products'],['payments','Payments'],['inventory','Inventory'],['customers','Customers'],['staff','Staff'],['shifts','Shifts']];
  const config = data ? posReportConfig(S.posReportSection, data) : null;
  return `
    <div class="card pos-report-controls" style="padding:18px;margin-bottom:16px">
      <div style="display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap">
        <div class="form-group"><label class="form-label">From</label><input id="pos-report-from" class="form-input" type="date" value="${esc(S.posReportFrom)}"></div>
        <div class="form-group"><label class="form-label">To</label><input id="pos-report-to" class="form-input" type="date" value="${esc(S.posReportTo)}"></div>
        <button class="btn btn-primary" id="btn-run-pos-report" ${S.posReportLoading?'disabled':''}>${S.posReportLoading?'Loading…':'Run report'}</button>
        <div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline btn-sm" id="btn-export-report-csv" ${data?'':'disabled'}>Export CSV</button>
          <button class="btn btn-outline btn-sm" id="btn-export-report-json" ${data?'':'disabled'}>Export All</button>
          <button class="btn btn-outline btn-sm" id="btn-print-pos-report" ${data?'':'disabled'}>Print / PDF</button>
        </div>
      </div>
      ${S.posReportError ? `<div class="crud-error" style="margin-top:12px">${esc(S.posReportError)}</div>` : ''}
      <div style="font-size:11px;color:var(--text-muted);margin-top:9px">Exports are limited to this company and the selected date range. “Export All” downloads every report section as JSON.</div>
    </div>
    ${data ? `
      <div class="kpi-grid">
        <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Gross sales</div><div class="kpi-value">${posMoney(summary.gross_sales)}</div><div class="kpi-trend" style="color:#EFEAFB">${Number(summary.completed_orders||0)} completed orders</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Average ticket</div><div class="kpi-value">${posMoney(summary.average_ticket)}</div><div class="kpi-trend">Tax ${posMoney(summary.tax_collected)}</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Outstanding debt</div><div class="kpi-value">${posMoney(summary.outstanding_debt)}</div><div class="kpi-trend">All current customers</div></div>
        <div class="kpi-card light"><div class="kpi-eyebrow">Inventory value</div><div class="kpi-value">${posMoney(summary.inventory_retail_value)}</div><div class="kpi-trend ${Number(summary.out_of_stock_products)>0?'trend-down':''}">${Number(summary.low_stock_products||0)} low · ${Number(summary.out_of_stock_products||0)} out</div></div>
      </div>
      <div class="data-section pos-report-table">
        <div class="section-header-bar" style="gap:8px;flex-wrap:wrap">
          ${sections.map(([key,label])=>`<button class="btn btn-sm ${S.posReportSection===key?'btn-primary':'btn-outline'}" data-report-section="${key}">${label}</button>`).join('')}
        </div>
        <div style="padding:14px 16px 0"><h3 class="chart-title">${esc(config.title)}</h3><div style="font-size:11px;color:var(--text-muted);margin-top:3px">${esc(data.range?.from)} to ${esc(data.range?.to)} · ${config.rows.length} row${config.rows.length===1?'':'s'}</div></div>
        <div class="overflow-x-auto">
          <table class="data-table" style="min-width:760px">
            <thead><tr>${config.columns.map(([,label])=>`<th>${esc(label)}</th>`).join('')}</tr></thead>
            <tbody>
              ${config.rows.map(row=>`<tr>${config.columns.map(([key,,formatter])=>`<td>${esc(formatter ? formatter(row[key]) : (row[key] ?? '—'))}</td>`).join('')}</tr>`).join('')}
              ${config.rows.length ? '' : `<tr><td colspan="${config.columns.length}" style="text-align:center;color:var(--text-muted);padding:28px">No data in this date range.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    ` : `<div class="card" style="padding:36px;text-align:center;color:var(--text-muted)">Choose a date range and run the report.</div>`}
  `;
}

function renderPOSNotifications() {
  const alerts = S.posStockAlerts || [];
  const unread = alerts.filter(alert=>Number(alert.unread));
  const out = alerts.filter(alert=>alert.severity==='out');
  const low = alerts.filter(alert=>alert.severity==='low');
  return `
    <div class="kpi-grid">
      <div class="kpi-card dark"><div class="kpi-eyebrow" style="color:#F5C411">Unread alerts</div><div class="kpi-value">${unread.length}</div><div class="kpi-trend" style="color:#EFEAFB">Personal notification count</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Out of stock</div><div class="kpi-value" style="color:${out.length?'#B91C1C':'inherit'}">${out.length}</div><div class="kpi-trend">Needs immediate restock</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Low stock</div><div class="kpi-value">${low.length}</div><div class="kpi-trend">At or below minimum level</div></div>
      <div class="kpi-card light"><div class="kpi-eyebrow">Open notifications</div><div class="kpi-value">${alerts.length}</div><div class="kpi-trend">Automatically resolves after restock</div></div>
    </div>
    <div class="data-section">
      <div class="section-header-bar">
        <div><h3 class="chart-title">Products Needed</h3><div style="font-size:11px;color:var(--text-muted);margin-top:3px">Notifications are created when stock reaches its configured minimum.</div></div>
        <button class="btn btn-outline btn-sm ml-auto" id="btn-refresh-stock-alerts">Refresh</button>
        <button class="btn btn-primary btn-sm" id="btn-read-all-stock-alerts" ${unread.length?'':'disabled'}>Mark all read</button>
      </div>
      <div class="overflow-x-auto">
        <table class="data-table" style="min-width:780px">
          <thead><tr><th>Product</th><th>SKU / Barcode</th><th>Current Stock</th><th>Minimum</th><th>Needed</th><th>Severity</th><th>Detected</th><th class="col-right">Actions</th></tr></thead>
          <tbody>
            ${alerts.map(alert=>{
              const needed=Math.max(0,Number(alert.minimum_stock||0)-Number(alert.current_stock||0)+1);
              const isOut=alert.severity==='out';
              return `<tr style="${Number(alert.unread)?'background:#FFFDF3':''}">
                <td><div style="font-weight:800">${esc(alert.product_name)}</div>${Number(alert.unread)?'<span class="pill pill-gold" style="margin-top:4px">New</span>':''}</td>
                <td style="font-family:var(--font-mono);font-size:11px">${esc(alert.sku||alert.barcode||'—')}</td>
                <td style="font-weight:900;color:${isOut?'#B91C1C':'#B45309'}">${esc(alert.current_stock)}</td>
                <td>${esc(alert.minimum_stock)}</td><td style="font-weight:800">${needed}</td>
                <td><span class="pill ${isOut?'pill-red':'pill-amber'}">${isOut?'Out of stock':'Low stock'}</span></td>
                <td style="font-size:11px;color:var(--text-muted)">${esc(alert.detected_at)}</td>
                <td class="col-right"><div class="crud-actions">
                  <button class="crud-btn crud-btn-edit" data-restock-product="${alert.product_id}" title="Update stock">Restock</button>
                  ${Number(alert.unread)?`<button class="crud-btn" data-read-stock-alert="${alert.id}" title="Mark read">Read</button>`:''}
                </div></td>
              </tr>`;
            }).join('')}
            ${alerts.length?'':'<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:32px">All products are above their minimum stock levels.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function posDownload(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function posCsvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g,'""')}"`;
}

function posExportCurrentReportCsv() {
  if (!S.posReportData) return;
  const config = posReportConfig(S.posReportSection, S.posReportData);
  const csv = [config.columns.map(([,label])=>posCsvCell(label)).join(','), ...config.rows.map(row=>config.columns.map(([key])=>posCsvCell(row[key])).join(','))].join('\r\n');
  posDownload(`curdun-pos-${S.posReportSection}-${S.posReportFrom}-to-${S.posReportTo}.csv`, `\uFEFF${csv}`, 'text/csv;charset=utf-8');
}

// ============================================================
// LOGIN EVENT HANDLER (separate from wirePOSEvents)
// ============================================================
function wirePOSLoginEvents() {
  document.getElementById('btn-exit-pos-station')?.addEventListener('click',()=>{S.view='login';S.posAuthError='';render();});
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
  document.getElementById('pos-admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('pos-admin-email').value.trim().toLowerCase();
    const pw = document.getElementById('pos-admin-pw').value;
    S.posAdminEmail = email;

    try {
      const user = await posEmailLogin(email, pw);
      if (user.must_change_password) {
        S.posPendingAdmin = user;
        S.posLoginMode = 'force-change';
        S.posAuthError = '';
        render();
        return;
      }
      const role = posRoleName(user);
      S.posActiveUser = { ...mapStaff(user), role, access:POS_ROLES[role] || POS_ROLES.Cashier };
      S.currentCompany = user.company_name || S.currentCompany;
      S.posLoginMode = 'staff';
      S.posTab = 'dash';
      await posBootstrap();
    } catch (error) {
      S.posAuthError = error.message || 'Incorrect password.';
      render();
    }
  });

  // --- Force-change form submit ---
  document.getElementById('pos-force-change-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const np = document.getElementById('pos-new-pw').value;
    const cp = document.getElementById('pos-confirm-pw').value;
    if (np.length < 10 || !/[A-Z]/.test(np) || !/\d/.test(np)) {
      S.posAuthError = 'Use at least 10 characters, one uppercase letter, and one number.';
      render();
      return;
    }
    if (np !== cp) {
      S.posAuthError = 'Passwords do not match.';
      render();
      return;
    }
    try {
      const user = await api('/auth/change-password', { method:'POST', body:{ password:np, password_confirmation:cp } });
      const role = posRoleName(user);
      S.posActiveUser = { ...mapStaff(user), role, access:POS_ROLES[role] || POS_ROLES.Cashier };
      S.currentCompany = user.company_name || S.currentCompany;
      S.posPendingAdmin = null; S.posLoginMode = 'staff'; S.posAuthError = ''; S.posTab = 'dash';
      await posBootstrap();
    } catch (error) { S.posAuthError = error.message; render(); }
  });

  // --- Numpad (staff mode) ---
  document.querySelectorAll('.numpad-key:not(.numpad-key-empty)').forEach(btn => {
    btn.addEventListener('click', async () => {
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
        const pin = S.posLoginPin;
        S.posLoginPin = '';
        const selected = POS_STAFF.find(staff => staff.id === S._loginSelectedId);
        try { await posPinLogin(pin, selected?.id, selected?.branchId); S._loginSelectedId = null; S.posAuthError = ''; render(); }
        catch (error) { S.posAuthError = error.message || 'PIN is incorrect.'; render(); }
      } else {
        render();
      }
    });
  });
}

function wirePOSEvents() {
  // Session Report — session selector + CSV export (P5).
  const reportSel = document.getElementById('report-session-select');
  if (reportSel) {
    reportSel.addEventListener('change', async () => {
      const id = parseInt(reportSel.value, 10);
      S.posReportSelectedSessionId = id;
      const current = S.posSession && S.posSession.state === 'OPENED' ? S.posSession : null;
      if (current && id === Number(current.id)) {
        // Live session — reuse the running summary; keep it fresh.
        await refreshPOSSessionState();
      } else {
        try {
          S.posReportSelectedSummary = await posApiFetch(`/pos/sessions/${id}/summary`);
        } catch (e) {
          alert(e.message || 'Could not load session report.');
        }
      }
      render();
    });
  }
  document.getElementById('btn-report-export-csv')?.addEventListener('click', () => {
    const sum = S.posReportSelectedSummary && S.posReportSelectedSummary.session && Number(S.posReportSelectedSummary.session.id) === Number(S.posReportSelectedSessionId)
      ? S.posReportSelectedSummary
      : (S.posSession && (S.posReportSelectedSessionId ? Number(S.posReportSelectedSessionId) === Number(S.posSession.id) : true) ? S.posSessionSummary : null);
    if (!sum) { alert('Select a session first.'); return; }
    exportSessionReportCSV(sum);
  });

  // Opening Control (Odoo-style modal, replaces prompt()).
  document.getElementById('btn-checkout-open-register')?.addEventListener('click', () => openRegisterModal('open'));
  document.getElementById('btn-session-open')?.addEventListener('click',           () => openRegisterModal('open'));
  // Rule #21 — Continue Selling takes an operator with an already-open session
  // straight back to the checkout screen. No duplicate register creation.
  document.getElementById('btn-continue-selling')?.addEventListener('click', () => {
    S.posBackofficeTab = 'checkout';
    S.posView = 'session';
    S.posTab  = 'checkout';
    render();
  });
  document.getElementById('btn-dashboard-register')?.addEventListener('click', () => {
    if (S.posSession?.state === 'OPENED') { S.posTab = 'staff'; render(); return; }
    openRegisterModal('open');
  });
  // Cash In / Cash Out (modal, replaces prompt()).
  // Gated: Cashiers need Manager approval; Senior Cashier and above pass silently.
  const doCashMovement = (direction) => {
    const perm = posCan('cashInOut');
    if (perm === true)  return openCashMovementModal(direction);
    if (perm === 'pin') return requireManagerApproval('cashInOut', {
      label: `Cash ${direction === 'IN' ? 'In' : 'Out'} — needs Senior Cashier or Manager`,
    }, () => openCashMovementModal(direction));
    alert('Your role cannot record cash movements.');
  };
  document.getElementById('btn-cash-in') ?.addEventListener('click', () => doCashMovement('IN'));
  document.getElementById('btn-cash-out')?.addEventListener('click', () => doCashMovement('OUT'));

  // Closing Control — gated: Cashier cannot close. Senior/Manager/Admin pass.
  document.getElementById('btn-session-close')?.addEventListener('click', () => {
    const perm = posCan('closeRegister');
    if (perm === true)  return openRegisterModal('close');
    if (perm === 'pin') return requireManagerApproval('closeRegister', {
      label: 'Close register — Manager approval required',
    }, () => openRegisterModal('close'));
    alert('Only a Senior Cashier or above can close the register.');
  });
  const closeStaffCredentials=()=>{S.staffCredentialResult=null;render();};
  document.getElementById('btn-staff-credentials-done')?.addEventListener('click',closeStaffCredentials);
  document.getElementById('btn-staff-credentials-done-2')?.addEventListener('click',closeStaffCredentials);
  document.getElementById('btn-copy-staff-credentials')?.addEventListener('click',async event=>{
    const result=S.staffCredentialResult;if(!result)return;
    const text=`Curdun Retail POS\nStaff: ${result.name}\nEmail: ${result.email}\nTemporary password: ${result.temporaryPassword}\nPOS PIN: ${result.pin}`;
    try{await navigator.clipboard.writeText(text);event.currentTarget.textContent='Copied ✓';}
    catch(_){alert(text);}
  });

  document.getElementById('btn-dashboard-stock-alerts')?.addEventListener('click', async ()=>{
    S.posTab='notifications'; render();
    try{await posLoadStockAlerts();}catch(error){alert(error.message);}
  });

  // ---- Reports ----
  document.getElementById('btn-run-pos-report')?.addEventListener('click', async () => {
    S.posReportFrom = document.getElementById('pos-report-from')?.value || S.posReportFrom;
    S.posReportTo = document.getElementById('pos-report-to')?.value || S.posReportTo;
    try { await posLoadReports(S.posReportFrom, S.posReportTo); } catch (_) {}
  });
  document.querySelectorAll('[data-report-section]').forEach(btn=>btn.addEventListener('click',()=>{ S.posReportSection=btn.dataset.reportSection; render(); }));
  document.getElementById('btn-export-report-csv')?.addEventListener('click', posExportCurrentReportCsv);
  document.getElementById('btn-export-report-json')?.addEventListener('click', () => {
    if (!S.posReportData) return;
    posDownload(`curdun-pos-complete-report-${S.posReportFrom}-to-${S.posReportTo}.json`, JSON.stringify(S.posReportData,null,2), 'application/json;charset=utf-8');
  });
  document.getElementById('btn-print-pos-report')?.addEventListener('click', ()=>window.print());

  // ---- Stock notifications ----
  document.getElementById('btn-refresh-stock-alerts')?.addEventListener('click', async ()=>{ try{await posLoadStockAlerts();}catch(error){alert(error.message);} });
  document.getElementById('btn-read-all-stock-alerts')?.addEventListener('click', async ()=>{ try{await posMarkAllStockAlertsRead();}catch(error){alert(error.message);} });
  document.querySelectorAll('[data-read-stock-alert]').forEach(btn=>btn.addEventListener('click', async ()=>{ try{await posMarkStockAlertRead(btn.dataset.readStockAlert);}catch(error){alert(error.message);} }));
  document.querySelectorAll('[data-restock-product]').forEach(btn=>btn.addEventListener('click', ()=>{
    const product=POS_PRODUCTS.find(item=>item.id===Number(btn.dataset.restockProduct));
    if(!product)return;
    S.posTab='products';
    S.crudModal={type:'product',mode:'edit',id:product.id};
    S.crudForm={name:product.name,cat:product.cat,price:product.price,wholesalePrice:product.wholesalePrice,stock:product.stock,minimumStock:product.minimumStock,barcode:product.barcode};
    render();
  }));

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
      S.crudForm = { name:p.name, cat:p.cat, price:p.price, wholesalePrice:p.wholesalePrice, stock:p.stock, minimumStock:p.minimumStock, barcode:p.barcode };
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
    S.crudForm = { pin:String(Math.floor(1000+Math.random()*9000)), branchId:(S.posBranches||[])[0]?.id||null, status:'active' };
    render();
  });
  document.getElementById('btn-generate-staff-pin')?.addEventListener('click', () => {
    S.crudForm.pin=String(Math.floor(1000+Math.random()*9000));
    render();
  });
  document.querySelectorAll('[data-edit-staff]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = POS_STAFF.find(x=>x.id===parseInt(btn.dataset.editStaff));
      if (!s) return;
      S.crudModal = { type:'staff', mode:'edit', id:s.id };
      S.crudForm = { name:s.name, email:s.email, role:s.role, branchId:s.branchId, store:s.store, shift:s.shift, status:s.status, pin:'' };
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
    // Retained for any legacy trigger — but the trash-style refund shortcut
    // is now the explicit ↩ Refund button below. This falls through to the
    // same confirmation for backwards compat.
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      S.confirmDeleteModal = { type:'transaction', id:btn.dataset.deleteTxn };
      render();
    });
  });
  // P6 — Odoo-style refund workflow. Opens the line/qty picker + payment
  // composer modal for the selected original order.
  document.querySelectorAll('[data-refund-txn]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const refId = btn.dataset.refundTxn;
      const backendId = POS_TRANSACTIONS.find(t => t.id === refId)?._backendId;
      if (!backendId) { alert('Could not resolve order id.'); return; }
      await openRefundModal(backendId);
    });
  });

  // ---- Shared modal close/cancel ----
  document.getElementById('btn-crud-close')?.addEventListener('click', () => { S.crudModal=null; S.crudForm={}; render(); });
  document.getElementById('btn-crud-cancel')?.addEventListener('click', () => { S.crudModal=null; S.crudForm={}; render(); });
  document.getElementById('btn-view-close')?.addEventListener('click', () => { S.viewModal=null; render(); });
  document.getElementById('btn-delete-cancel')?.addEventListener('click', () => { S.confirmDeleteModal=null; render(); });

  // ---- Shared SAVE ----
  document.getElementById('btn-crud-save')?.addEventListener('click', async () => {
    if (!S.crudModal) return;
    const f = {};
    // Collect form values
    ['name','email','phone','pin','cat','role','store','shift','status','tier'].forEach(id => {
      const el = document.getElementById('cf-'+id);
      if (el) f[id] = el.value.trim();
    });
    const branchInput=document.getElementById('cf-branchId');
    if(branchInput)f.branchId=parseInt(branchInput.value)||null;
    ['price','wholesalePrice','stock','minimumStock','creditLimit'].forEach(id => {
      const el = document.getElementById('cf-'+id);
      if (el) f[id] = parseFloat(el.value)||0;
    });
    ['barcode'].forEach(id => {
      const el = document.getElementById('cf-'+id);
      if (el) f[id] = el.value.trim();
    });

    const { type, mode, id } = S.crudModal;

    try {
    if (type === 'product') {
      if (!f.name) { S.crudForm._error='Product name is required.'; render(); return; }
      if (f.price<=0) { S.crudForm._error='Price must be greater than 0.'; render(); return; }
      if (mode === 'add') {
        await posCreateProduct(f);
      } else {
        await posUpdateProduct(id,f);
      }
    } else if (type === 'customer') {
      if (!f.name) { S.crudForm._error='Customer name is required.'; render(); return; }
      if (!f.phone) { S.crudForm._error='Phone number is required.'; render(); return; }
      if (mode === 'add') {
        await posCreateCustomer(f);
      } else {
        await posUpdateCustomer(id,f);
      }
    } else if (type === 'staff') {
      if (!f.name) { S.crudForm._error='Staff name is required.'; render(); return; }
      if (mode==='add' && !/^\d{4}$/.test(f.pin||'')) { S.crudForm={...S.crudForm,...f,_error:'Enter or generate a 4-digit POS PIN.'}; render(); return; }
      if (mode==='edit' && f.pin && !/^\d{4}$/.test(f.pin)) { S.crudForm={...S.crudForm,...f,_error:'POS PIN must contain exactly 4 digits.'}; render(); return; }
      if (mode === 'add') {
        const result = await posCreateStaff(f);
        S.staffCredentialResult={name:result.user.name,email:result.user.email,temporaryPassword:result.temporary_password,pin:result.pin};
      } else {
        await posUpdateStaff(id,f);
      }
    }
    S.crudModal = null; S.crudForm = {};
    render();
    } catch (error) { S.crudForm._error=error.message;render(); }
  });

  // ---- Shared DELETE CONFIRM ----
  document.getElementById('btn-delete-confirm')?.addEventListener('click', async () => {
    if (!S.confirmDeleteModal) return;
    const { type, id } = S.confirmDeleteModal;
    if (type === 'product') {
      await posDeleteProduct(id);
    } else if (type === 'customer') {
      await posDeleteCustomer(id);
    } else if (type === 'staff') {
      await api(`/platform/users/${id}`,{method:'PUT',body:{status:'inactive'}});const i=POS_STAFF.findIndex(x=>x.id===id);if(i!==-1)POS_STAFF.splice(i,1);
    } else if (type === 'transaction') {
      const transaction = POS_TRANSACTIONS.find(item=>item.id===id);
      if (!transaction?._backendId) throw new Error('Transaction record is unavailable.');
      // Refund permission — Cashier needs Manager PIN; Senior+ passes silently.
      const perm = posCan('refund');
      if (perm === false) { alert('Your role cannot issue refunds.'); return; }
      const runRefund = () => posVoidTransaction(transaction._backendId).then(()=>{ S.confirmDeleteModal = null; render(); }).catch(err=>alert(err.message));
      if (perm === 'pin') {
        S.confirmDeleteModal = null; // close the delete modal first so the PIN overlay isn't sandwiched
        requireManagerApproval('refund', {
          label: `Refund order #${transaction._backendId}`,
        }, () => runRefund());
        return;
      }
      await posVoidTransaction(transaction._backendId);
    }
    S.confirmDeleteModal = null; render();
  });

  // ---- Deyn: collect ----
  document.querySelectorAll('[data-collect-deyn]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const c = POS_CUSTOMERS.find(x=>x.id===parseInt(btn.dataset.collectDeyn));
      if (c && c.debtBalance > 0) { try{await posCollectDebt(c.id,c.debtBalance);render();}catch(error){alert(error.message);} }
    });
  });

  // ---- POS Settings tab ----
  // Store settings save
  const btnSaveStore = document.getElementById('btn-save-store-settings');
  if (btnSaveStore) btnSaveStore.addEventListener('click', async () => {
    const name = document.getElementById('ss-store-name').value.trim();
    if (!name) { alert('Store name is required.'); return; }
    S.storeSettings.storeName    = name;
    S.storeSettings.taxRate      = parseFloat(document.getElementById('ss-tax-rate').value) || 0;
    S.storeSettings.defaultStore = document.getElementById('ss-default-store').value;
    S.storeSettings.defaultBranchId = (S.posBranches || []).find(branch => branch.name === S.storeSettings.defaultStore)?.id || null;
    S.currentStore               = S.storeSettings.defaultStore + ' Store';
    try {
      await posSaveSettings(S.storeSettings);
      S._settingsSaved = true;
      render();
      setTimeout(() => { S._settingsSaved = false; render(); }, 2500);
    } catch (error) { alert(error.message); }
  });
  const btnSaveReceipt = document.getElementById('btn-save-receipt-settings');
  if (btnSaveReceipt) btnSaveReceipt.addEventListener('click', async () => {
    S.storeSettings.receiptHeader        = document.getElementById('ss-receipt-header').value;
    S.storeSettings.receiptFooter        = document.getElementById('ss-receipt-footer').value;
    S.storeSettings.showBarcodeOnReceipt = document.getElementById('ss-receipt-barcode').value === 'yes';
    try {
      await posSaveSettings(S.storeSettings);
      S._settingsSaved = true;
      render();
      setTimeout(() => { S._settingsSaved = false; render(); }, 2500);
    } catch (error) { alert(error.message); }
  });
  const btnSaveRegister = document.getElementById('btn-save-register-settings');
  if (btnSaveRegister) btnSaveRegister.addEventListener('click', async () => {
    S.storeSettings.cashControl = document.getElementById('ss-cash-control').checked;
    S.storeSettings.openingControl = document.getElementById('ss-opening-control').checked;
    S.storeSettings.maximumDifference = Math.max(0, Number(document.getElementById('ss-max-difference').value)||0);
    try { await posSaveSettings(S.storeSettings);await posBootstrap();S._settingsSaved=true;render();setTimeout(()=>{S._settingsSaved=false;render();},2500); } catch(error){alert(error.message);}
  });
  document.querySelectorAll('[data-payment-toggle]').forEach(cb => {
    cb.addEventListener('change', async () => {
      S.storeSettings.payments[cb.dataset.paymentToggle] = cb.checked;
      try { await posSaveSettings(S.storeSettings); }
      catch (error) { cb.checked = !cb.checked; S.storeSettings.payments[cb.dataset.paymentToggle] = cb.checked; alert(error.message); }
    });
  });

  // Shift reconciliation
  const shiftCashierSel = document.getElementById('shift-cashier-sel');
  if (shiftCashierSel) shiftCashierSel.addEventListener('change', () => { S.shiftCashier = parseInt(shiftCashierSel.value)||null; render(); });
  const shiftUSD = document.getElementById('shift-usd');
  if (shiftUSD) shiftUSD.addEventListener('input', () => { S.shiftCountedUSD = shiftUSD.value; render(); });
  const closeShiftBtn = document.getElementById('btn-close-shift');
  if (closeShiftBtn) closeShiftBtn.addEventListener('click', async () => {
    if (!S.shiftCashier) { alert('Select a cashier before closing the shift.'); return; }
    try {
      let result;
      try { result = await posCloseShift(S.shiftCashier, parseFloat(S.shiftCountedUSD)||0); }
      catch (error) {
        if (error.status === 409 && /approve/i.test(error.message) && confirm(`${error.message}\n\nApprove this cash difference and close the register?`)) result = await posCloseShift(S.shiftCashier, parseFloat(S.shiftCountedUSD)||0, true);
        else throw error;
      }
      alert(`Shift saved.\nSystem cash: $${Number(result.system_cash).toFixed(2)}\nCounted: $${Number(result.counted_cash).toFixed(2)}\nVariance: $${Number(result.variance).toFixed(2)}`);
      S.shiftCountedUSD=''; S.shiftCashier=null;
      render();
    } catch (error) { alert(error.message); }
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
    // ---- Odoo-style split-payment composer wiring (P3 Stage B) ----
    // Compute total for helpers that need it.
    const _payTotal = (() => {
      const _sub = S.posCart.reduce((s,item)=>{ const p = item.isWholesale?item.wholesalePrice:item.price; return s + p*item.qty; }, 0);
      const _tax = _sub * Number(S.storeSettings.taxRate||0) / 100;
      return Number((_sub + _tax).toFixed(2));
    })();
    // Add-line buttons — push a new line for the given method with amount
    // defaulted to the remaining unallocated.
    document.querySelectorAll('[data-add-method]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        posAddPaymentLine(btn.dataset.addMethod, _payTotal);
        render();
      });
    });
    // Per-line amount editing (any type).
    document.querySelectorAll('.pos-pay-line-amount').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.lineIdx);
        const v = parseFloat(inp.value);
        posUpdatePaymentLine(idx, { amount: Number.isFinite(v) ? Math.max(0, v) : 0 });
        render();
      });
    });
    // Cash line — tendered input.
    document.querySelectorAll('.pos-pay-line-tendered').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.lineIdx);
        const v = parseFloat(inp.value);
        posUpdatePaymentLine(idx, { tendered: Number.isFinite(v) ? Math.max(0, v) : 0 });
        render();
      });
    });
    // Mobile line — reference (transaction id).
    document.querySelectorAll('.pos-pay-line-reference').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = parseInt(inp.dataset.lineIdx);
        posUpdatePaymentLine(idx, { reference: inp.value });
      });
    });
    // Remove line.
    document.querySelectorAll('.pos-pay-line-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        posRemovePaymentLine(parseInt(btn.dataset.lineIdx));
        render();
      });
    });
    // Deyn customer selector (order-level — one customer per order regardless
    // of how many Deyn lines exist).
    const deynSel = document.getElementById('pos-deyn-customer');
    if (deynSel) deynSel.addEventListener('change', () => { S.posDebtCustomerId=parseInt(deynSel.value)||null; render(); });

    // ---- Hold / Resume / Discard ----
    document.getElementById('btn-hold-order')?.addEventListener('click', () => {
      if (!S.posCart.length) return;
      if (!S.posHeldOrders) S.posHeldOrders = [];
      S.posHeldOrders.push({ id: Date.now(), cashier: S.posActiveUser?.name||'?', items: [...S.posCart], customer: S.posDebtCustomerId, payment_lines: [...(S.posPaymentLines||[])], ts: Date.now() });
      S.posCart = []; posResetPaymentLines(); S.posReceiptVisible = false; S.posShowHeld = false;
      render();
    });
    document.getElementById('btn-show-held')?.addEventListener('click', () => { S.posShowHeld = !S.posShowHeld; render(); });
    document.querySelectorAll('[data-resume-held]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.resumeHeld);
        const held = (S.posHeldOrders||[])[idx];
        if (!held) return;
        if (S.posCart.length > 0 && !confirm('Replace current cart with held order?')) return;
        S.posCart = [...held.items];
        S.posDebtCustomerId = held.customer || null;
        S.posPaymentLines = Array.isArray(held.payment_lines) ? [...held.payment_lines] : [];
        S.posCashTendered = '';
        S.posHeldOrders.splice(idx, 1); S.posShowHeld = false; render();
      });
    });
    document.querySelectorAll('[data-discard-held]').forEach(btn => {
      btn.addEventListener('click', () => { const idx=parseInt(btn.dataset.discardHeld); if(S.posHeldOrders) S.posHeldOrders.splice(idx,1); render(); });
    });

    const chargeBtn = document.getElementById('btn-pos-charge');
    if (chargeBtn) {
      chargeBtn.addEventListener('click', async () => {
        if (chargeBtn.disabled) return;
        // Guard against double-click while the request is in flight —
        // idempotency UUID also protects the backend, but this is a UX belt.
        chargeBtn.disabled = true;
        chargeBtn.textContent = 'Validating…';
        try { await finalizeCharge(); }
        finally { /* render() re-renders the button anyway */ }
      });
    }
    const clearBtn = document.getElementById('btn-pos-clear');
    if (clearBtn) clearBtn.addEventListener('click', () => { S.posCart=[]; posResetPaymentLines(); render(); });
  }

  if (S.posMobileMoneyModal) {
    const phoneInput = document.getElementById('mm-phone');
    const txInput = document.getElementById('mm-txid');
    if (phoneInput) phoneInput.addEventListener('input', () => { S.mobilePhone=phoneInput.value; });
    if (txInput) txInput.addEventListener('input', () => { S.mobileTxId=txInput.value; });
    const confirmBtn = document.getElementById('btn-mm-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', async () => {
        const phone=(S.mobilePhone||'').trim();
        const txid=(S.mobileTxId||'').trim();
        if (!/^[\d\s\-+]{7,}$/.test(phone)) { S.mobileError='Geli lambarka telefoonka saxda ah.'; render(); return; }
        if (!/^\d{4,8}$/.test(txid)) { S.mobileError='Transaction ID waa inuu noqdaa 4\u20138 lambar.'; render(); return; }
        S.posMobileMoneyModal=false;
        await finalizeCharge();
      });
    }
    const cancelBtn = document.getElementById('btn-mm-cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { S.posMobileMoneyModal=false; render(); });
  }

  if (S.posReceiptVisible) {
    const newBtn = document.getElementById('btn-receipt-new');
    if (newBtn) newBtn.addEventListener('click', () => { S.posReceiptVisible=false; S.posCart=[]; posResetPaymentLines(); render(); });
    const printBtn = document.getElementById('btn-receipt-print');
    if (printBtn) printBtn.addEventListener('click', () => { window.print(); });
  }

  // ---- Cashier shift toggle (routes through the Register Control modal) ----
  const shiftToggle = document.getElementById('btn-shift-toggle');
  if (shiftToggle) {
    shiftToggle.addEventListener('click', () => {
      openRegisterModal(S.posShiftActive ? 'close' : 'open');
    });
  }

  // ---- Config → Payment Methods toggles ----
  document.querySelectorAll('.pm-toggle').forEach(cb => {
    cb.addEventListener('change', async () => {
      const pmName = cb.dataset.pm;
      if (!S.storeSettings.payments) S.storeSettings.payments = {};
      S.storeSettings.payments[pmName] = cb.checked;
      try { await posSaveSettings(S.storeSettings); }
      catch (error) {
        cb.checked = !cb.checked;
        S.storeSettings.payments[pmName] = cb.checked;
        alert(error.message);
      }
    });
  });
  document.getElementById('btn-save-payment-methods')?.addEventListener('click', async () => {
    document.querySelectorAll('.pm-toggle').forEach(cb => {
      if (!S.storeSettings.payments) S.storeSettings.payments = {};
      S.storeSettings.payments[cb.dataset.pm] = cb.checked;
    });
    try { await posSaveSettings(S.storeSettings); S._settingsSaved=true; render(); setTimeout(()=>{S._settingsSaved=false;render();},2500); }
    catch (error) { alert(error.message); }
  });

  // ---- Config → Currencies ----
  document.getElementById('btn-save-currencies')?.addEventListener('click', () => {
    const rate = parseInt(document.getElementById('cfg-exchange-rate')?.value) || 11800;
    const currency = document.getElementById('cfg-primary-currency')?.value || 'USD';
    S.exchangeRate = rate;
    S.primaryCurrency = currency;
    S._settingsSaved = true;
    render();
    setTimeout(()=>{S._settingsSaved=false;render();},2500);
  });

  // ---- Back-office stock alert link ----
  document.getElementById('btn-dashboard-stock-alerts')?.addEventListener('click', async () => {
    S.posBackofficeTab = 'reports-stock'; render();
    try { await posLoadStockAlerts(); } catch(error) { alert(error.message); }
  });

  // ---- Categories tab placeholder events ----
  document.getElementById('btn-add-category')?.addEventListener('click', () => {
    const name = prompt('New category name:');
    if (name && name.trim()) {
      // Optimistically add a placeholder product to register category
      alert(`Category "${name.trim()}" will be available when you add products to it.`);
    }
  });

  // ---- Combos tab placeholder events ----
  document.getElementById('btn-add-combo')?.addEventListener('click', () => {
    alert('Combo creation coming soon! You will be able to bundle products into meal deals and family packs.');
  });
  document.getElementById('btn-add-combo-empty')?.addEventListener('click', () => {
    alert('Combo creation coming soon! You will be able to bundle products into meal deals and family packs.');
  });

}


async function finalizeCharge() {
  if (S.isOffline) {
    alert('Checkout needs a connection so stock and the receipt can be saved safely.');
    return;
  }
  if (!S.posSession || S.posSession.state !== 'OPENED') {
    // Odoo pattern: block, force operator through Opening Control, then retry.
    openRegisterModal('open');
    alert('The register is closed. Open it (with the correct opening cash) before validating this sale.');
    render(); return;
  }
  const cart = S.posCart.map(item => ({ ...item }));
  const subtotal = S.posCart.reduce((s,item)=>{ const p=item.isWholesale?item.wholesalePrice:item.price; return s+p*item.qty; }, 0);
  const tax = subtotal * (Number(S.storeSettings.taxRate || 0) / 100);
  const total = Number((subtotal + tax).toFixed(2));
  // Front-side validation gate (backend re-validates every line).
  const check = posPaymentLinesValid(total);
  if (!check.ok) { alert(check.reason); render(); return; }
  const lines = (S.posPaymentLines || []).map(l => ({
    method: l.method_name,
    amount: Number(l.amount),
    tendered: l.method_type === 'cash' ? Number(l.tendered || l.amount) : undefined,
    reference: l.reference || undefined,
  }));
  try {
    const result = await posCompleteCheckout(cart, S.posDebtCustomerId, lines);
    // Snapshot the payment lines exactly as sent, so the receipt reflects
    // what the backend accepted (Rule #49). The stored order-response
    // payment_method field can carry a joined summary like "Cash + EVC".
    S.posLastReceipt = {
      id: result.reference_number,
      date: new Date(result.created_at || Date.now()).toLocaleString(),
      items: cart,
      subtotal: Number(result.subtotal ?? subtotal),
      tax: Number(result.tax_amount ?? tax),
      total: Number(result.total_amount ?? total),
      payment_lines: lines,
      method: result.payment_method || lines.map(l => l.method).join(' + '),
      amountPaid: lines.reduce((s,l) => s + (l.tendered || l.amount), 0),
      change: lines.filter(l => l.tendered !== undefined).reduce((s,l) => s + Math.max(0, (l.tendered - l.amount)), 0),
      credit_warning: result.credit_warning || null,
      customer_id: S.posDebtCustomerId || null,
    };
    S.posReceiptVisible = true;
    S.posCart = [];
    posResetPaymentLines();
    S.posMobileMoneyModal = false;
    await posBootstrap();
    if (S.posLastReceipt.credit_warning) {
      // Odoo-mode warn: surface after the sale succeeded (Rule #28).
      const w = S.posLastReceipt.credit_warning;
      setTimeout(() => alert(`Credit warning: this customer's balance is now $${Number(w.projected_balance).toFixed(2)}, which is $${Number(w.overage).toFixed(2)} over their $${Number(w.credit_limit).toFixed(2)} limit.`), 50);
    }
  } catch (error) {
    S.posMobileMoneyModal = false;
    alert(error.message);
    render();
  }
}

function posIcon(type) {
  const icons = {
    dash:         `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
    checkout:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h18l-2 12H5L3 3z"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>`,
    products:     `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3v4M8 3v4"/></svg>`,
    customers:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3.5-6 7-6s7 2 7 6"/><path d="M16 3c2 0 4 1 4 3s-2 3-4 3"/></svg>`,
    transactions: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/></svg>`,
    reports:      `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></svg>`,
    notifications:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
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

// Keep manager stock notifications current while another register is selling.
setInterval(async () => {
  if (S.view !== 'pos' || !['Admin','Store Manager'].includes(S.posActiveUser?.role) || S.isOffline) return;
  try {
    const previous = JSON.stringify(S.posStockAlerts || []);
    await posLoadStockAlerts(false);
    if (previous !== JSON.stringify(S.posStockAlerts || [])) render();
  } catch (_) {}
}, 60000);

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  render();

  // Global delegated handler for password show/hide toggles created by pwField().
  // Uses event delegation so it survives every re-render without re-binding.
  const EYE_OPEN  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_CLOSED= '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.6 19.6 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.6 19.6 0 0 1-3.17 4.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.pw-toggle');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.pwToggle);
    if (!input) return;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.innerHTML = showing ? EYE_OPEN : EYE_CLOSED;
    btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    input.focus();
  });
});

// Expose to window for inline event handlers
window.S = S;
window.render = render;
