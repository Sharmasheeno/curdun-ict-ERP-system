/* ============================================================
   CURDUN ICT SOLUTION — WEBSITE JAVASCRIPT
   index.html — SPA navigation, contact form, FAQ
   ============================================================ */

'use strict';

// ---- DATA ------------------------------------------------
const DATA = {
  cityChips: ['Mogadishu','Hargeisa','Bosaso','Kismayo','Baidoa','Garowe','Galkayo','Beledweyne'],

  modules: [
    { key:'pharma', icon:'💊', name:'Pharmacy', tag:'Health', bg:'#F5C41122', fg:'#8B5A00',
      desc:'Sell medicine, track batches and expiry dates, and print receipts in seconds. Made for Somali pharmacies of any size.',
      features:['Batch & expiry','Prescriptions','SOS + USD','Barcode'] },
    { key:'hosp', icon:'🏥', name:'Hospital', tag:'Health', bg:'#EEF4FF', fg:'#1E4EBB',
      desc:'Patient records, appointments, doctor rotas, lab results, and billing — all connected in one place.',
      features:['Patients','Lab','Rota','Billing'] },
    { key:'uni', icon:'🎓', name:'University', tag:'Education', bg:'#F0EEF7', fg:'#2D1859',
      desc:'Students, courses, grades, transcripts, fee collection and parent messages for Somali universities and schools.',
      features:['Students','Grades','Fees','Timetable'] },
    { key:'hotel', icon:'🏨', name:'Hotel Booking', tag:'Hospitality', bg:'#FFF3EA', fg:'#B25A00',
      desc:'Take room bookings, manage check-in and check-out, and handle payments through EVC Plus or card.',
      features:['Rooms','Front desk','Housekeeping','Reports'] },
    { key:'pos', icon:'🛒', name:'Retail POS', tag:'Trade', bg:'#EAFBF1', fg:'#0F7A3A',
      desc:'A fast cash register for shops and supermarkets. Works on tablet or PC, with stock and daily sales reports.',
      features:['Cashier','Stock','Barcodes','Receipts'] },
    { key:'fin', icon:'💰', name:'Finance', tag:'Back office', bg:'#FFECEA', fg:'#B42318',
      desc:'Track income, expenses, salaries, and taxes for your whole company across every module you use.',
      features:['Ledger','Salaries','VAT','Reports'] },
  ],

  steps: [
    { n:'01', title:'Tell us what you need', body:'Fill out the contact form with your business type and the modules you need. Our team calls you within one working day.' },
    { n:'02', title:'We set up your workspace', body:'Curdun creates your company workspace, assigns your admin login, and configures your chosen modules in 2–3 days.' },
    { n:'03', title:'You go live', body:'Sign in, create your staff accounts, and start running your business on Cor Curdun the same week.' },
  ],

  plans: [
    { tag:'Starter', name:'One module', price:29, popular:false,
      bg:'#FFF', fg:'#1B1233', border:'#E5E1F0', check:'#0F7A3A', btnBg:'#F4F5F9', btnFg:'#2D1859', cta:'Talk to sales',
      items:['1 active module','Up to 5 users','Community support','Data hosted in Somalia'] },
    { tag:'Business', name:'Any 3 modules', price:79, popular:true,
      bg:'#2D1859', fg:'#FFF', border:'#F5C411', check:'#F5C411', btnBg:'#F5C411', btnFg:'#2D1859', cta:'Request access',
      items:['3 active modules','Up to 25 users','Priority phone support','SOS + USD invoicing','EVC Plus / ZAAD payments'] },
    { tag:'Enterprise', name:'Unlimited', price:199, popular:false,
      bg:'#FFF', fg:'#1B1233', border:'#E5E1F0', check:'#0F7A3A', btnBg:'#2D1859', btnFg:'#F5C411', cta:'Book a demo',
      items:['All modules','Unlimited users','Dedicated account manager','Custom reports & integrations','24 / 7 support'] },
  ],

  differentiators: [
    { icon:'🇸🇴', title:'Built for Somalia', body:'SOS + USD, EVC Plus, ZAAD, Somali regions and cities, local phone formats — out of the box.' },
    { icon:'🔗', title:'One login, all systems', body:'Your admin signs in once and can move between pharmacy, hospital, hotel and POS without new passwords.' },
    { icon:'🛡️', title:'Your data stays yours', body:'Every company has its own private workspace. Curdun cannot see your daily sales or patient records.' },
    { icon:'📞', title:'Real human support', body:'Somali-speaking support in Mogadishu, Hargeisa, Bosaso and Kismayo — by phone, WhatsApp, or on-site.' },
  ],

  numbers: [
    { v:'120+', label:'Companies onboarded' },
    { v:'9',    label:'Somali regions served' },
    { v:'6',    label:'Live modules' },
    { v:'99.9%',label:'Platform uptime' },
  ],

  values: [
    { icon:'🎯', title:'Simple beats clever', body:'If a shopkeeper cannot use it in one hour, we redesign it. No feature ships without a real Somali business trying it first.' },
    { icon:'🤝', title:'We answer the phone', body:'When your system matters, so does our support. We do not hide behind ticket forms.' },
    { icon:'🔒', title:'Trust is earned daily', body:'Backups every hour. Encrypted at rest. Access logs you can read. Your data is never a product.' },
  ],

  timeline: [
    { year:'2022', title:'Curdun starts in Mogadishu', body:'Two engineers build a small pharmacy point-of-sale for a family shop in Hodan District.' },
    { year:'2023', title:'First 10 companies', body:'Pharmacies and shops in Mogadishu and Bosaso ask for the same system. The Cor Curdun idea is born.' },
    { year:'2024', title:'Hospital & University modules', body:'Jamhuriya University and Kismayo General Hospital go live on the shared platform.' },
    { year:'2026', title:'One platform, six modules', body:'Curdun now serves 120+ companies across 9 Somali regions with one login and one bill.' },
  ],

  contactCards: [
    { icon:'📞', label:'Sales · Somalia', value:'+252 61 900 0100', hint:'Sat–Thu · 8:00–17:00', mono:true },
    { icon:'💬', label:'WhatsApp',        value:'+252 61 900 0101', hint:'Reply within 30 minutes', mono:true },
    { icon:'✉️', label:'Email',           value:'hello@curdun.so',   hint:'For sales & new business', mono:false },
    { icon:'🛠️', label:'Support',         value:'support@curdun.so', hint:'24 / 7 for existing clients', mono:false },
  ],

  faqs: [
    { q:'Can I pay in Somali Shilling?', a:'Yes. You can pay in SOS or USD, through EVC Plus, ZAAD, or a bank transfer to our Salaam Bank / Premier Bank account.' },
    { q:'Do I need to buy servers?', a:'No. Curdun runs on our cloud with backups in Mogadishu. You only need a phone or a PC with internet.' },
    { q:'How fast can we start?', a:'For one module (e.g. Pharmacy or POS) most companies go live in 2–3 working days. Full multi-branch setups take 2–3 weeks.' },
    { q:'Who owns the data?', a:'Your company owns 100% of its data. You can export everything to Excel at any time. If you leave, we delete your data after 30 days.' },
    { q:'Do you offer training?', a:'Yes. Every company gets a free onboarding session by phone or in person (Mogadishu and Hargeisa). More training is available on request.' },
  ],

  moduleChips: [
    { key:'pharma', icon:'💊', name:'Pharmacy' },
    { key:'hosp',   icon:'🏥', name:'Hospital' },
    { key:'uni',    icon:'🎓', name:'University' },
    { key:'hotel',  icon:'🏨', name:'Hotel' },
    { key:'pos',    icon:'🛒', name:'Retail POS' },
    { key:'fin',    icon:'💰', name:'Finance' },
  ],
};

// ---- STATE -----------------------------------------------
const state = {
  page: 'home',
  menuOpen: false,
  chosen: {},
  formSent: false,
  sentName: '', sentPhone: '',
  formError: '',
  fName:'', fCompany:'', fPhone:'', fEmail:'', fCity:'', fType:'', fNotes:'',
};

// ---- DOM HELPERS -----------------------------------------
const $ = (id) => document.getElementById(id);
const show = (el) => { if(el) el.style.display = ''; };
const hide = (el) => { if(el) el.style.display = 'none'; };
const showId = (id) => { const e = $(id); if(e) e.style.display = ''; };
const hideId = (id) => { const e = $(id); if(e) e.style.display = 'none'; };

// ---- NAVIGATION ------------------------------------------
function navigate(page) {
  state.page = page;
  state.menuOpen = false;

  // Hide all pages
  ['page-home','page-about','page-contact','page-pricing'].forEach(id => hideId(id));
  // Show target
  showId('page-' + page);

  // Update nav active states
  ['home','about','contact','pricing'].forEach(p => {
    const link = $('nav-' + p);
    if (link) {
      link.classList.toggle('active', p === page);
    }
  });

  // Close mobile menu
  const mm = $('mobile-menu');
  if (mm) mm.classList.remove('open');

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- RENDER PAGES ----------------------------------------
function renderHome() {
  // Trust chips
  const chips = $('trust-chips');
  if (chips) {
    chips.innerHTML = DATA.cityChips.map(c => `<div class="trust-chip">${c}</div>`).join('');
  }

  // Modules
  const mods = $('modules-grid');
  if (mods) {
    mods.innerHTML = DATA.modules.map(m => `
      <div class="module-card">
        <div class="module-icon" style="background:${m.bg}; color:${m.fg}">${m.icon}</div>
        <div class="module-tag">${m.tag}</div>
        <div class="module-name">${m.name}</div>
        <p class="module-desc">${m.desc}</p>
        <div class="module-features">${m.features.map(f=>`<span class="module-feature-tag">${f}</span>`).join('')}</div>
      </div>
    `).join('');
  }

  // Steps
  const steps = $('steps-grid');
  if (steps) {
    steps.innerHTML = DATA.steps.map(s => `
      <div class="step-card">
        <div class="step-number">${s.n}</div>
        <div class="step-title">${s.title}</div>
        <p class="step-desc">${s.body}</p>
      </div>
    `).join('');
  }

  // Pricing
  const pricing = $('pricing-grid');
  if (pricing) {
    pricing.innerHTML = DATA.plans.map(p => `
      <div class="pricing-card" style="background:${p.bg}; color:${p.fg}; border-color:${p.border};">
        ${p.popular ? `<div class="pricing-popular-badge">Most chosen</div>` : ''}
        <div class="pricing-tag" style="opacity:0.7">${p.tag}</div>
        <div class="pricing-name">${p.name}</div>
        <div class="pricing-price">
          <span class="pricing-amount">$${p.price}</span>
          <span class="pricing-period">/ module / month</span>
        </div>
        <div class="pricing-divider"></div>
        <div class="pricing-items">
          ${p.items.map(it=>`<div class="pricing-item"><span class="pricing-check" style="color:${p.check}">✓</span><span>${it}</span></div>`).join('')}
        </div>
        <button onclick="navigate('contact')" class="btn w-full" style="margin-top:22px; background:${p.btnBg}; color:${p.btnFg};">${p.cta}</button>
      </div>
    `).join('');
  }
}

function renderAbout() {
  // Differentiators
  const diffs = $('differentiators');
  if (diffs) {
    diffs.innerHTML = DATA.differentiators.map(d => `
      <div class="diff-card">
        <div class="diff-icon">${d.icon}</div>
        <div>
          <div class="diff-title">${d.title}</div>
          <div class="diff-body">${d.body}</div>
        </div>
      </div>
    `).join('');
  }

  // Numbers
  const nums = $('numbers-grid');
  if (nums) {
    nums.innerHTML = DATA.numbers.map(n => `
      <div class="number-card">
        <div class="number-val">${n.v}</div>
        <div class="number-label">${n.label}</div>
      </div>
    `).join('');
  }

  // Values
  const vals = $('values-grid');
  if (vals) {
    vals.innerHTML = DATA.values.map(v => `
      <div class="value-card">
        <div class="value-icon">${v.icon}</div>
        <div class="value-title">${v.title}</div>
        <p class="value-body">${v.body}</p>
      </div>
    `).join('');
  }

  // Timeline
  const tl = $('timeline');
  if (tl) {
    tl.innerHTML = DATA.timeline.map(t => `
      <div class="timeline-row">
        <div class="timeline-year">${t.year}</div>
        <div>
          <div class="timeline-title">${t.title}</div>
          <div class="timeline-body">${t.body}</div>
        </div>
      </div>
    `).join('');
  }
}

function renderContact() {
  // Contact cards
  const cc = $('contact-cards');
  if (cc) {
    cc.innerHTML = DATA.contactCards.map(c => `
      <div class="contact-card">
        <div class="contact-card-icon">${c.icon}</div>
        <div>
          <div class="contact-card-label">${c.label}</div>
          <div class="contact-card-value"${c.mono?' style="font-family:var(--font-mono)"':''}>${c.value}</div>
          <div class="contact-card-hint">${c.hint}</div>
        </div>
      </div>
    `).join('');
  }

  // Module chips
  const mc = $('module-chips');
  if (mc) {
    mc.innerHTML = DATA.moduleChips.map(m => `
      <button class="module-chip${state.chosen[m.key]?' selected':''}" id="chip-${m.key}"
        onclick="toggleModule('${m.key}')">${m.icon} ${m.name}</button>
    `).join('');
  }

  // FAQ
  renderFAQ();
}

function renderFAQ() {
  const faq = $('faq-list');
  if (!faq) return;
  faq.innerHTML = DATA.faqs.map((f,i) => `
    <div class="faq-item" id="faq-${i}" onclick="toggleFAQ(${i})">
      <div class="faq-q">
        ${f.q}
        <span class="faq-chevron">▾</span>
      </div>
      <div class="faq-a">${f.a}</div>
    </div>
  `).join('');
}

function toggleFAQ(i) {
  const item = $('faq-' + i);
  if (item) item.classList.toggle('open');
}

// ---- PRICING PAGE ----------------------------------------
const PRICING_MODULE_PRICES = [
  { icon:'💊', name:'Pharmacy',      price:49,  popular:false, tag:'Health',     desc:'POS · prescriptions · batch tracking · expiry alerts' },
  { icon:'🏥', name:'Hospital',      price:89,  popular:false, tag:'Health',     desc:'EMR · appointments · lab · billing · doctor rotas' },
  { icon:'🎓', name:'University',    price:79,  popular:true,  tag:'Education',  desc:'Students · courses · grades · fees · timetable' },
  { icon:'🏨', name:'Hotel',         price:59,  popular:false, tag:'Hospitality',desc:'Rooms · bookings · housekeeping · front desk' },
  { icon:'🛒', name:'Retail POS',    price:39,  popular:false, tag:'Trade',      desc:'Cashier · stock · barcodes · daily sales reports' },
  { icon:'💰', name:'Finance',       price:45,  popular:false, tag:'Back office',desc:'Ledger · payroll · VAT · expenses · reports' },
];

const PRICING_COMPARISON = [
  { feature:'Active modules',              starter:'1',              business:'Any 3',         enterprise:'All 6' },
  { feature:'Users per module',            starter:'Up to 5',        business:'Up to 25',      enterprise:'Unlimited' },
  { feature:'Branches',                    starter:'1',              business:'Up to 5',       enterprise:'Unlimited' },
  { feature:'Currency support',            starter:'USD only',       business:'USD + SOS',     enterprise:'USD + SOS' },
  { feature:'Payment via EVC / ZAAD',      starter:'✗',              business:'✓',             enterprise:'✓' },
  { feature:'Priority phone support',      starter:'✗',              business:'✓',             enterprise:'✓' },
  { feature:'Dedicated account manager',   starter:'✗',              business:'✗',             enterprise:'✓' },
  { feature:'Custom reports',              starter:'✗',              business:'Basic',         enterprise:'Advanced' },
  { feature:'API access',                  starter:'✗',              business:'✗',             enterprise:'✓' },
  { feature:'Data export (Excel)',          starter:'✓',              business:'✓',             enterprise:'✓' },
  { feature:'On-site training',            starter:'✗',              business:'1 session',     enterprise:'Ongoing' },
  { feature:'24/7 emergency support',      starter:'✗',              business:'✗',             enterprise:'✓' },
];

const PRICING_FAQS = [
  { q:'Can I switch plans later?',         a:'Yes. Upgrade at any time — the change takes effect next billing cycle. Downgrading takes effect at the end of the current month.' },
  { q:'Is there a setup fee?',             a:'No hidden setup fees for Starter and Business. Enterprise companies pay a one-off onboarding fee based on the number of modules and branches.' },
  { q:'Can I pay monthly or yearly?',      a:'Monthly billing by default. Pay yearly and get 2 months free — that is effectively a 16% discount.' },
  { q:'What payment methods do you accept?', a:'EVC Plus (Hormuud), ZAAD (Telesom), eDahab (Somtel), Sahal (Golis), bank transfer (Salaam Bank / Premier Bank / Amal). Card payments (Visa/Mastercard) coming soon.' },
  { q:'Can I add a module to an existing plan?', a:'Yes. Each additional module is billed at the per-module rate for your current plan tier. Your admin can request this directly from the workspace.' },
  { q:'What happens if I stop paying?',    a:'After a 7-day grace period your workspace is suspended (read-only). After 30 days of non-payment it is permanently deleted. You can export your data at any time before that.' },
];

function renderPricing() {
  // Plans grid
  const pg = $('pricing-page-grid');
  if (pg) {
    pg.innerHTML = DATA.plans.map(p => `
      <div class="pricing-card" style="background:${p.bg}; color:${p.fg}; border-color:${p.border};">
        ${p.popular ? `<div class="pricing-popular-badge">Most chosen</div>` : ''}
        <div class="pricing-tag" style="opacity:0.7">${p.tag}</div>
        <div class="pricing-name">${p.name}</div>
        <div class="pricing-price">
          <span class="pricing-amount">$${p.price}</span>
          <span class="pricing-period">/ module / month</span>
        </div>
        <div class="pricing-divider"></div>
        <div class="pricing-items">
          ${p.items.map(it=>`<div class="pricing-item"><span class="pricing-check" style="color:${p.check}">✓</span><span>${it}</span></div>`).join('')}
        </div>
        <button onclick="navigate('contact')" class="btn w-full" style="margin-top:22px; background:${p.btnBg}; color:${p.btnFg};">${p.cta}</button>
      </div>
    `).join('');
  }

  // Per-module pricing cards
  const mpc = $('module-price-grid');
  if (mpc) {
    mpc.innerHTML = PRICING_MODULE_PRICES.map(m => `
      <div class="module-price-card${m.popular?' featured':''}">
        ${m.popular ? '<div class="module-price-badge">Most popular</div>' : ''}
        <div class="module-price-head">
          <span class="module-price-icon">${m.icon}</span>
          <div>
            <div class="module-price-tag">${m.tag}</div>
            <div class="module-price-name">${m.name}</div>
          </div>
        </div>
        <p class="module-price-desc">${m.desc}</p>
        <div class="module-price-amt">$${m.price}<span class="module-price-per"> / month</span></div>
        <button onclick="navigate('contact')" class="btn w-full" style="margin-top:14px; background:${m.popular?'#2D1859':'#F4F5F9'}; color:${m.popular?'#F5C411':'#2D1859'};">Get started</button>
      </div>
    `).join('');
  }

  // Comparison table
  const ct = $('comparison-tbody');
  if (ct) {
    ct.innerHTML = PRICING_COMPARISON.map(row => `
      <tr>
        <td class="comp-feature">${row.feature}</td>
        <td class="comp-cell">${row.starter}</td>
        <td class="comp-cell comp-highlight">${row.business}</td>
        <td class="comp-cell">${row.enterprise}</td>
      </tr>
    `).join('');
  }

  // Pricing FAQ
  const pfaq = $('pricing-faq-list');
  if (pfaq) {
    pfaq.innerHTML = PRICING_FAQS.map((f,i) => `
      <div class="faq-item" id="pfaq-${i}" onclick="togglePricingFAQ(${i})">
        <div class="faq-q">${f.q}<span class="faq-chevron">▾</span></div>
        <div class="faq-a">${f.a}</div>
      </div>
    `).join('');
  }
}

function togglePricingFAQ(i) {
  const item = $('pfaq-' + i);
  if (item) item.classList.toggle('open');
}

function toggleModule(key) {
  state.chosen[key] = !state.chosen[key];
  const btn = $('chip-' + key);
  if (btn) btn.classList.toggle('selected', !!state.chosen[key]);
}

// ---- CONTACT FORM ----------------------------------------
function submitContact() {
  const name    = ($('f-name')?.value || '').trim();
  const company = ($('f-company')?.value || '').trim();
  const phone   = ($('f-phone')?.value || '').trim();
  const email   = ($('f-email')?.value || '').trim();
  const city    = ($('f-city')?.value || '');
  const type    = ($('f-type')?.value || '');

  const err = (msg) => {
    const el = $('form-error');
    if (el) { el.textContent = '⚠ ' + msg; el.style.display = ''; }
  };
  const clearErr = () => { const el = $('form-error'); if (el) el.style.display = 'none'; };
  clearErr();

  if (!name)                             return err('Please enter your full name.');
  if (!company)                          return err('Please enter your company name.');
  if (!/^\+?[\d\s]{7,}$/.test(phone))   return err('Please enter a valid phone number.');
  if (!/^\S+@\S+\.\S+$/.test(email))    return err('Please enter a valid email address.');
  if (!city)                             return err('Please choose your city.');
  if (!type)                             return err('Please choose your business type.');

  state.sentName = name; state.sentPhone = phone;

  // Show success
  const form = $('contact-form');
  const success = $('contact-success');
  if (form) form.style.display = 'none';
  if (success) {
    success.style.display = '';
    $('success-name').textContent = name;
    $('success-phone').textContent = phone;
  }
}

function resetForm() {
  const form = $('contact-form');
  const success = $('contact-success');
  if (form) { form.style.display = ''; form.reset(); }
  if (success) success.style.display = 'none';
  state.chosen = {};
  renderContact();
}

// ---- MOBILE MENU -----------------------------------------
function toggleMenu() {
  state.menuOpen = !state.menuOpen;
  const mm = $('mobile-menu');
  if (mm) mm.classList.toggle('open', state.menuOpen);
}

// ---- INIT ------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // Render static data into all pages
  renderHome();
  renderAbout();
  renderContact();
  renderPricing();

  // Show home by default
  navigate('home');

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
});

// Expose to inline handlers
window.navigate        = navigate;
window.toggleMenu      = toggleMenu;
window.toggleFAQ       = toggleFAQ;
window.togglePricingFAQ = togglePricingFAQ;
window.toggleModule    = toggleModule;
window.submitContact   = submitContact;
window.resetForm       = resetForm;
