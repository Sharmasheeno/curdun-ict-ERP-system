'use strict';

const API_BASE = '/api/v1';

// P14.7 development-only response-loss harness. It is inert unless the app
// runs on localhost AND the URL explicitly contains
//   ?pos_test_drop=CHECKOUT,REFUND,CASH_IN,CASH_OUT,CUSTOMER_ACCOUNT_PAYMENT
// The real request and response complete first; the successful response is
// then withheld from application code exactly once per action/key. Evidence
// remains in sessionStorage for browser/DB assertions. No production request
// is ever randomly intercepted.
function posTestLossAllowed(hostname) {
  return ['localhost','127.0.0.1'].includes(String(hostname || '').toLowerCase());
}
function posTestLossConfig() {
  if (!posTestLossAllowed(location.hostname)) return new Set();
  const params=new URLSearchParams(location.search);
  if (params.get('pos_test_reset')==='1' && !sessionStorage.getItem('pos_test_reset_done')) {
    sessionStorage.removeItem('pos_idempotency_evidence');
    sessionStorage.removeItem('pos_dropped_responses');
    sessionStorage.setItem('pos_test_reset_done','1');
  }
  return new Set((params.get('pos_test_drop')||'').split(',').map(v=>v.trim().toUpperCase()).filter(Boolean));
}
function posRecordIdempotencyEvidence(action,key,data,dropped) {
  if (!action || !key) return;
  let rows=[];try{rows=JSON.parse(sessionStorage.getItem('pos_idempotency_evidence')||'[]');}catch(_){}
  rows.push({action,key,entity_id:data?.id??null,reference:data?.reference_number??null,idempotent_replay:Boolean(data?.idempotent_replay),dropped:Boolean(dropped),at:new Date().toISOString()});
  sessionStorage.setItem('pos_idempotency_evidence',JSON.stringify(rows));
}
function posIdempotencyEvidence(){try{return JSON.parse(sessionStorage.getItem('pos_idempotency_evidence')||'[]');}catch(_){return[];}}

async function posApiFetch(path, opts = {}) {
  let response;
  try {
    response = await fetch(path.startsWith('http') ? path : `${API_BASE}${path}`, {
      method: opts.method || 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch (_) {
    throw new Error('Network error — the Curdun server is unavailable.');
  }
  let payload;
  try { payload = await response.json(); } catch (_) { throw new Error(`Invalid server response (${response.status}).`); }
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.errors = payload.errors;
    throw error;
  }
  const data=Object.prototype.hasOwnProperty.call(payload,'data')?payload.data:payload;
  const action=String(opts.financialAction||'').toUpperCase();
  const key=opts.body?.idempotency_key||opts.body?.client_order_id||null;
  const enabled=posTestLossConfig();
  let dropped=[];try{dropped=JSON.parse(sessionStorage.getItem('pos_dropped_responses')||'[]');}catch(_){}
  const marker=`${action}:${key}`;
  const shouldDrop=action&&key&&(enabled.has(action)||enabled.has('ALL'))&&!dropped.includes(marker)&&!data?.idempotent_replay;
  posRecordIdempotencyEvidence(action,key,data,shouldDrop);
  if(shouldDrop){
    dropped.push(marker);sessionStorage.setItem('pos_dropped_responses',JSON.stringify(dropped));
    const error=new Error("We couldn't confirm the operation. Retry to check the committed transaction.");
    error.simulatedLostResponse=true;error.financialAction=action;throw error;
  }
  return data;
}

function posRoleName(user) {
  const rawRoles = Array.isArray(user.roles) ? user.roles : String(user.roles || user.role || '').split(',');
  const role = rawRoles.map(value => value.trim().toLowerCase()).find(Boolean) || 'cashier';
  return { superadmin:'Admin', admin:'Admin', store_manager:'Store Manager', senior_cashier:'Senior Cashier', cashier:'Cashier' }[role] || 'Cashier';
}

function mapProduct(product) {
  return {
    id: Number(product.id), name: product.name, cat: product.category_name || 'General',
    price: Number(product.selling_price || 0),
    stock: Number(product.current_stock || 0), barcode: product.barcode || product.sku || '', sku: product.sku || '',
    minimumStock: Number(product.minimum_stock || 0), status: product.status || 'active',
  };
}

function mapCustomer(customer) {
  return {
    id: Number(customer.id), name: customer.name, phone: customer.phone || '', points: Number(customer.loyalty_points || 0),
    visits: Number(customer.total_orders || 0), lastVisit: customer.last_visit || '—', tier: customer.tier || 'Bronze',
    creditLimit: Number(customer.credit_limit || 0), debtBalance: Number(customer.balance || 0), email: customer.email || '',
    pricelistId: customer.pricelist_id ? Number(customer.pricelist_id) : null,
    pricelistName: customer.pricelist_name || null,
  };
}

function mapTransaction(order) {
  return {
    id: order.reference_number || `POS-${order.id}`, _backendId: Number(order.id), cashier: order.cashier_name || '—',
    customer: order.customer_name || 'Walk-in', items: Number(order.items_count || 0), total: Number(order.total_amount || 0),
    method: order.payment_method || 'Deyn', time: order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—',
    date: order.order_date || '', status: order.status || 'COMPLETED', isRefund:Boolean(Number(order.refunded_order_id)),
    posState:order.pos_state || null, amountPaid:Number(order.amount_paid || 0), change:Number(order.amount_return || 0),
    loyaltyPointsEarned:Number(order.loyalty_points_earned || 0),
    loyaltyPointsRedeemed:Number(order.loyalty_points_redeemed || 0),
    loyaltyRewardId:order.loyalty_reward_id ? Number(order.loyalty_reward_id) : null,
    loyaltyDiscount:Number(order.loyalty_discount_amount || 0),
    // P6 — computed original-order refund status ('' | PARTIALLY_REFUNDED | REFUNDED).
    // The row action button uses this to decide whether to show "Refund",
    // "Refund more", or nothing.
    refund_status: order.refund_status || null,
    pos_session_id: order.pos_session_id ? Number(order.pos_session_id) : null,
  };
}

// P6 — Fetch the refundable-shape (original lines + refundable qty + prior
// refunds + original payments) for the Odoo-style refund modal.
// P14 - Load pricelists available on the active POS (P9 endpoint).
async function posLoadPricelists() {
  try {
    const data = await posApiFetch('/pos/pricelists');
    S.posPricelists = data.pricelists || [];
    if (!S.posSelectedPricelistId) {
      const def = S.posPricelists.find(p => Number(p.is_default) === 1);
      S.posSelectedPricelistId = def ? def.id : null;
    }
    return S.posPricelists;
  } catch (_) { S.posPricelists = []; return []; }
}

// P14 - Load loyalty snapshot for the selected order customer (P10 endpoint).
async function posLoadCustomerLoyalty(customerId) {
  if (!customerId) { S.posCustomerLoyalty = null; return null; }
  try {
    S.posCustomerLoyalty = await posApiFetch(`/pos/customers/${customerId}/loyalty`);
    return S.posCustomerLoyalty;
  } catch (_) { S.posCustomerLoyalty = null; return null; }
}

async function posLoadCustomerLedger(customerId) {
  return posApiFetch(`/pos/customers/${customerId}/ledger`);
}

async function posLoadAuditLogs(filters={}) {
  const query=new URLSearchParams();
  Object.entries(filters).forEach(([key,value])=>{if(value!==null&&value!==undefined&&String(value).trim()!=='')query.set(key,String(value).trim());});
  return posApiFetch(`/pos/audit-logs?${query}`);
}

// P14.2 — authoritative live cart quote. A monotonically increasing request
// number prevents a slow response for qty 9 from overwriting the newer qty 10
// response. The endpoint accepts no client price fields.
let _posQuoteTimer = null;
let _posQuoteRequest = 0;
function posScheduleQuote(delay = 120) {
  clearTimeout(_posQuoteTimer);
  S.posQuoteLoading = true;
  S.posQuoteError = null;
  const requestNo = ++_posQuoteRequest;
  _posQuoteTimer = setTimeout(async () => {
    const body = {
      customer_id: S.posDebtCustomerId || null,
      items: (S.posCart || []).map(item => ({
        product_id: item.id,
        quantity: item.qty,
        discount_percent: Number(item.discountPercent || 0),
      })),
      payments: (S.posPaymentLines || []).map(line => ({
        method: line.method_name,
        method_type: line.method_type,
        amount: Number(line.amount || 0),
      })),
    };
    if (S.posPricelistManual && S.posSelectedPricelistId) body.pricelist_id = S.posSelectedPricelistId;
    if (S.posSelectedRewardId) body.loyalty_reward_id = S.posSelectedRewardId;
    try {
      const quote = await posApiFetch('/pos/quote', { method:'POST', body });
      if (requestNo !== _posQuoteRequest) return;
      S.posQuote = quote;
      S.posQuoteError = null;
      if (!S.posPricelistManual && quote.pricelist?.id) S.posSelectedPricelistId = Number(quote.pricelist.id);
    } catch (error) {
      if (requestNo !== _posQuoteRequest) return;
      S.posQuote = null;
      S.posQuoteError = error.message;
    } finally {
      if (requestNo === _posQuoteRequest) {
        S.posQuoteLoading = false;
        if (typeof render === 'function') render();
      }
    }
  }, delay);
}

async function posLoadRefundable(orderId) {
  return posApiFetch(`/pos/orders/${orderId}/refundable`);
}
// Post the refund with a payments[] split.
async function posSubmitRefund(orderId, payload, approvalId=null) {
  // P14 - preserve the refund idempotency key across retries so a lost
  // response never creates a duplicate refund. Key is scoped by the target
  // order + the client-composed items[] hash so a different quantity picker
  // legitimately gets a different UUID (and thus a new refund).
  const slot = `refund:${orderId}:${JSON.stringify(payload.items || [])}`;
  const body = { ...payload, idempotency_key: _idemKey(slot) };
  const headers = approvalId ? { 'X-Manager-Approval-ID': String(approvalId) } : {};
  const row = await posApiFetch(`/pos/orders/${orderId}/refund`, { method:'POST', body, headers, financialAction:'REFUND' });
  _clearIdemKey(slot);
  await refreshPOSSessionState();
  await posBootstrap();
  return row;
}

function mapStaff(user) {
  const role = posRoleName(user);
  return {
    id: Number(user.id), name: user.name, username: (user.email || '').split('@')[0], email: user.email || '', pin: '', hasPin:Boolean(Number(user.has_pin)),
    role, store: user.branch_name || 'Main Store', branchId: user.branch_id ? Number(user.branch_id) : null,
    shift: 'Full day', sales: 0, status: user.status === 'active' ? 'active' : 'break', access: POS_ROLES[role] || POS_ROLES.Cashier,
  };
}

function posApplyBootstrap(data) {
  POS_PRODUCTS.splice(0, POS_PRODUCTS.length, ...(data.products || []).map(mapProduct));
  POS_CUSTOMERS.splice(0, POS_CUSTOMERS.length, ...(data.customers || []).map(mapCustomer));
  POS_TRANSACTIONS.splice(0, POS_TRANSACTIONS.length, ...(data.transactions || []).map(mapTransaction));
  const incomingStaff=(data.staff||[]).map(mapStaff);
  if (['Admin','Store Manager'].includes(S.posActiveUser?.role) || POS_STAFF.length===0) {
    POS_STAFF.splice(0,POS_STAFF.length,...incomingStaff);
  } else {
    incomingStaff.forEach(user=>{const index=POS_STAFF.findIndex(item=>item.id===user.id);if(index>=0)POS_STAFF[index]={...POS_STAFF[index],...user};else POS_STAFF.push(user);});
  }
  S.posDashData = data.dashboard || {};
  S.posBranches = data.branches || [];
  S.posStockAlerts = data.stock_alerts || [];
  S.posConfig = data.pos_config || null;
  S.posSession = data.current_session || null;
  S.posSessionSummary = data.current_session_summary || null;
  S.posSessions = data.sessions || [];
  S.posPayments = data.pos_payments || [];
  S.posShiftActive = Boolean(S.posSession && S.posSession.state === 'OPENED');
  S.posShiftStart = S.posSession?.opened_at ? new Date(S.posSession.opened_at) : null;
  if (data.settings) {
    S.storeSettings.storeName = data.settings.store_name || S.storeSettings.storeName;
    S.storeSettings.taxRate = Number(data.settings.tax_rate ?? S.storeSettings.taxRate);
    S.storeSettings.receiptHeader = data.settings.receipt_header || S.storeSettings.receiptHeader;
    S.storeSettings.receiptFooter = data.settings.receipt_footer || S.storeSettings.receiptFooter;
    S.storeSettings.showBarcodeOnReceipt = Boolean(data.settings.receipt_barcode ?? S.storeSettings.showBarcodeOnReceipt);
    S.storeSettings.cashControl = Boolean(data.settings.cash_control ?? S.storeSettings.cashControl);
    S.storeSettings.openingControl = Boolean(data.settings.opening_control ?? S.storeSettings.openingControl);
    S.storeSettings.maximumDifference = Number(data.settings.maximum_difference ?? S.storeSettings.maximumDifference);
    S.storeSettings.extraSecurity = { ...(S.storeSettings.extraSecurity || {}), ...(data.settings.extra_security || {}) };
    S.storeSettings.payments = data.settings.payments || S.storeSettings.payments;
    S.posPaymentMethodsMeta = data.settings.payment_methods || [];
    const branch = S.posBranches.find(item => Number(item.id) === Number(data.settings.default_branch_id)) || S.posBranches[0];
    if (branch) { S.storeSettings.defaultStore = branch.name; S.currentStore = `${branch.name} Store`; }
  }
}

async function posBootstrap() {
  S._posLoading = { bootstrap:true };
  try {
    const data = await posApiFetch('/pos/bootstrap');
    posApplyBootstrap(data);
    // P14 - fetch pricelists alongside bootstrap so the Checkout composer can
    // render the selector without a second wait.
    try { await posLoadPricelists(); } catch (_) {}
    if ((S.posCart || []).length) posScheduleQuote(0);
    return data;
  }
  finally { S._posLoading.bootstrap = false; if (typeof render === 'function') render(); }
}

/**
 * Rule #16 / #23 — one authoritative session-state refresh. All screens read
 * S.posSession / S.posSessions / S.posSessionSummary; every mutation that
 * changes those must route through here (Open / Close / Checkout / Refund /
 * Cash In / Cash Out / PIN Login / Lock). Never mutate those three keys from
 * a partial response — always call this and let the backend be the source
 * of truth.
 */
async function refreshPOSSessionState() {
  try {
    const [current, list] = await Promise.all([
      posApiFetch('/pos/session/current'),
      posApiFetch('/pos/sessions'),
    ]);
    if (current) {
      if (current.config) S.posConfig = current.config;
      S.posSession = current.session || null;
    }
    S.posSessions = Array.isArray(list) ? list : [];
    if (S.posSession && S.posSession.id) {
      try {
        S.posSessionSummary = await posApiFetch(`/pos/sessions/${S.posSession.id}/summary`);
      } catch (_) { S.posSessionSummary = null; }
    } else {
      S.posSessionSummary = null;
    }
    S.posShiftActive = Boolean(S.posSession && S.posSession.state === 'OPENED');
    S.posShiftStart  = S.posSession?.opened_at ? new Date(S.posSession.opened_at) : null;
  } finally {
    if (typeof render === 'function') render();
  }
  return S.posSession;
}

async function posCreateProduct(form) { const row=await posApiFetch('/pos/products',{method:'POST',body:{name:form.name,category_name:form.cat,selling_price:form.price,current_stock:form.stock,minimum_stock:form.minimumStock,barcode:form.barcode}});POS_PRODUCTS.push(mapProduct(row));await posLoadStockAlerts(false);return row; }
async function posUpdateProduct(id,form) { const row=await posApiFetch(`/pos/products/${id}`,{method:'PUT',body:{name:form.name,category_name:form.cat,selling_price:form.price,current_stock:form.stock,minimum_stock:form.minimumStock,barcode:form.barcode}});const i=POS_PRODUCTS.findIndex(item=>item.id===Number(id));if(i>=0)POS_PRODUCTS[i]=mapProduct(row);await posLoadStockAlerts(false);return row; }
async function posDeleteProduct(id) { await posApiFetch(`/pos/products/${id}`,{method:'DELETE'});const i=POS_PRODUCTS.findIndex(item=>item.id===Number(id));if(i>=0)POS_PRODUCTS.splice(i,1);await posLoadStockAlerts(false); }
async function posCreateCustomer(form) { const row=await posApiFetch('/pos/customers',{method:'POST',body:{name:form.name,phone:form.phone,email:form.email,credit_limit:form.creditLimit}});POS_CUSTOMERS.push(mapCustomer(row));return row; }
async function posUpdateCustomer(id,form) { const row=await posApiFetch(`/pos/customers/${id}`,{method:'PUT',body:{name:form.name,phone:form.phone,email:form.email,credit_limit:form.creditLimit}});const i=POS_CUSTOMERS.findIndex(item=>item.id===Number(id));if(i>=0)POS_CUSTOMERS[i]=mapCustomer(row);return row; }
async function posDeleteCustomer(id) { await posApiFetch(`/pos/customers/${id}`,{method:'DELETE'});const i=POS_CUSTOMERS.findIndex(item=>item.id===Number(id));if(i>=0)POS_CUSTOMERS.splice(i,1); }
async function posCreateStaff(form) { const role={Cashier:'cashier','Senior Cashier':'senior_cashier','Store Manager':'store_manager'}[form.role]||'cashier';const slug=form.name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'');const email=form.email||`${slug}.${Date.now().toString().slice(-6)}@pos.curdun.so`;const pin=String(form.pin||'');const status=form.status==='break'?'inactive':(form.status||'active');const data=await posApiFetch('/pos/staff',{method:'POST',body:{name:form.name,email,phone:form.phone,role,branch_id:form.branchId||null,pin,status}});POS_STAFF.push({...mapStaff(data.user),hasPin:true});return {...data,pin}; }
async function posUpdateStaff(id,form) { const role={Cashier:'cashier','Senior Cashier':'senior_cashier','Store Manager':'store_manager'}[form.role]||'cashier';const status=form.status==='break'?'inactive':(form.status||'active');const row=await posApiFetch(`/pos/staff/${id}`,{method:'PUT',body:{name:form.name,email:form.email,phone:form.phone,role,branch_id:form.branchId||null,pin:form.pin,status}});const i=POS_STAFF.findIndex(item=>item.id===Number(id));if(i>=0)POS_STAFF[i]=mapStaff(row);return row; }
// P3 Stage B: `payments` is now an array of Odoo-style payment lines built
// by the checkout composer. Each entry: { method, amount, tendered?, reference? }.
async function posCompleteCheckout(cart, customerId, payments) {
  if (!Array.isArray(payments)) throw new Error('Checkout requires payment lines.');
  S.posPendingOrderId = S.posPendingOrderId || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)}`);
  const lines = payments.map(p => {
    // Trust the composer — one line per method, tendered only on cash lines.
    const line = { method: p.method, amount: Number(p.amount) };
    if (p.tendered !== undefined && p.tendered !== null) line.tendered = Number(p.tendered);
    if (p.reference) line.reference = p.reference;
    return line;
  });
  const body = {
    client_order_id: S.posPendingOrderId,
    customer_id: customerId || null,
    payments: lines,
    items: cart.map(item => ({ product_id:item.id, quantity:item.qty, discount_percent:Number(item.discountPercent||0) })),
  };
  // P14 - Pass the selected pricelist (P9 backend). Null means "use POS default".
  // Only an explicit cashier choice is sent. In automatic mode the backend
  // remains authoritative and applies customer preference before POS default.
  if (S.posPricelistManual && S.posSelectedPricelistId) body.pricelist_id = S.posSelectedPricelistId;
  if (S.posSelectedRewardId) body.loyalty_reward_id = S.posSelectedRewardId;
  const data = await posApiFetch('/pos/checkout', { method:'POST', body, financialAction:'CHECKOUT' });
  const mapped = mapTransaction({ ...data, id:data.id, total_amount:data.total_amount, items_count:cart.reduce((n,item)=>n+item.qty,0), customer_name:POS_CUSTOMERS.find(item=>item.id===customerId)?.name, cashier_name:S.posActiveUser?.name });
  const existing = POS_TRANSACTIONS.findIndex(item => item._backendId === mapped._backendId);
  if (existing >= 0) POS_TRANSACTIONS[existing] = mapped; else POS_TRANSACTIONS.unshift(mapped);
  S.posPendingOrderId = null;
  return data;
}
// P14 — Frontend idempotency helper (Rule #13). Keys live in S.posPendingKeys
// keyed by an operation-specific slot so the SAME key survives fetch errors,
// timeouts, and retries; a new key is only minted after authoritative success.
function _idemKey(slot) {
  S.posPendingKeys = S.posPendingKeys || {};
  if (!S.posPendingKeys[slot]) {
    S.posPendingKeys[slot] = (globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)}`);
  }
  return S.posPendingKeys[slot];
}
function _clearIdemKey(slot) { if (S.posPendingKeys) delete S.posPendingKeys[slot]; }

async function posVoidTransaction(orderId, approvalId=null) {
  const key = _idemKey(`refund:${orderId}`);
  const headers = approvalId ? { 'X-Manager-Approval-ID': String(approvalId) } : {};
  const row = await posApiFetch(`/pos/orders/${orderId}/refund`, { method:'POST', body:{ idempotency_key:key, reason:'Full refund from POS' }, headers, financialAction:'REFUND' });
  _clearIdemKey(`refund:${orderId}`);
  await refreshPOSSessionState();
  await posBootstrap();
  return row;
}
async function posCollectDebt(id, amount, method='Cash', reference='') {
  const slot = `settlement:${id}:${amount}:${method}:${reference}`;
  const key = _idemKey(slot);
  const row = await posApiFetch(`/pos/customers/${id}/collect-debt`, { method:'POST', body:{ idempotency_key:key, amount, payment_method:method, reference:reference||null }, financialAction:'CUSTOMER_ACCOUNT_PAYMENT' });
  _clearIdemKey(slot);
  const i = POS_CUSTOMERS.findIndex(item => item.id === Number(id));
  if (i >= 0) POS_CUSTOMERS[i] = mapCustomer(row);
  await refreshPOSSessionState();
  return row;
}
async function posOpenSession(openingCash=0, note=null) {
  // Fire-and-refresh: post the open, then let refreshPOSSessionState() be
  // the source of truth for every downstream screen (Rule #16). Never
  // mutate S.posSession from the open response directly — the summary,
  // sessions list, and config all need to update atomically.
  const body = { opening_cash: openingCash };
  if (note !== null && note !== '') body.note = note;
  await posApiFetch('/pos/sessions/open', { method:'POST', body });
  await refreshPOSSessionState();
  return S.posSession;
}
async function posRecordCashMovement(type, amount, reason, approvalId=null) {
  if (!S.posSession?.id) throw new Error('Open the register first.');
  const slot = `cash:${type}:${amount}:${reason}`;
  const key = _idemKey(slot);
  const headers = approvalId ? { 'X-Manager-Approval-ID': String(approvalId) } : {};
  const row = await posApiFetch(`/pos/sessions/${S.posSession.id}/cash-movements`, { method:'POST', body:{ idempotency_key:key, type, amount, reason }, headers, financialAction:`CASH_${type}` });
  _clearIdemKey(slot);
  await refreshPOSSessionState();
  return row;
}
async function posCloseShift(cashierId, countedCash, approveDifference=false, approvalId=null, notes='') {
  const headers = approvalId ? { 'X-Manager-Approval-ID': String(approvalId) } : {};
  const result = await posApiFetch('/pos/shifts/close', { method:'POST', body:{
    cashier_id:cashierId,
    session_id:Number(S.posSession?.id),
    counted_cash:countedCash,
    approve_difference:approveDifference,
    notes:String(notes || '').trim() || null,
  }, headers });
  await refreshPOSSessionState();
  return result;
}
async function posSaveSettings(settings) { return posApiFetch('/pos/settings',{method:'PUT',body:{store_name:settings.storeName,tax_rate:settings.taxRate,receipt_header:settings.receiptHeader,receipt_footer:settings.receiptFooter,receipt_barcode:settings.showBarcodeOnReceipt,cash_control:settings.cashControl,opening_control:settings.openingControl,maximum_difference:settings.maximumDifference,payments:settings.payments,extra_security:settings.extraSecurity,default_branch_id:settings.defaultBranchId||null}}); }

async function posLoadReports(from = S.posReportFrom, to = S.posReportTo) {
  S.posReportLoading = true;
  S.posReportError = '';
  if (typeof render === 'function') render();
  try {
    const query = new URLSearchParams({ from, to });
    S.posReportData = await posApiFetch(`/pos/reports?${query}`);
    return S.posReportData;
  } catch (error) {
    S.posReportError = error.message || 'The report could not be loaded.';
    throw error;
  } finally {
    S.posReportLoading = false;
    if (typeof render === 'function') render();
  }
}

async function posLoadStockAlerts(renderAfter = true) {
  const alerts = await posApiFetch('/pos/stock-alerts');
  S.posStockAlerts = alerts || [];
  if (renderAfter && typeof render === 'function') render();
  return S.posStockAlerts;
}

async function posMarkStockAlertRead(id) {
  await posApiFetch(`/pos/stock-alerts/${id}/read`, { method:'POST' });
  return posLoadStockAlerts();
}

async function posMarkAllStockAlertsRead() {
  await posApiFetch('/pos/stock-alerts/read-all', { method:'POST' });
  return posLoadStockAlerts();
}

async function posPinLogin(pin, userId, branchId) {
  const result = await posApiFetch('/auth/pin-login', { method:'POST', body:{ pin, user_id:userId, branch_id:branchId || null }});
  const user = result.user || result;
  S.posActiveUser = { ...mapStaff(user), role: posRoleName(user) };
  S.currentCompany = user.company_name || S.currentCompany;
  S.posTab = 'dash';
  await posBootstrap();
  await refreshPOSSessionState();
}

// Manager PIN approval — verifies a Store Manager or Admin PIN WITHOUT
// hijacking the current cashier's session. Returns { approved_by, action, reason }.
async function posVerifyManagerPin(pin, action, reason, branchId, scope={}) {
  return posApiFetch('/auth/manager-approval', {
    method: 'POST',
    body: { pin, action, reason, branch_id: branchId || null,
      target_type:scope.targetType||null, target_id:scope.targetId||null,
      amount:scope.amount??null, session_id:scope.sessionId||null },
  });
}
async function posEmailLogin(email,password) { const result=await posApiFetch('/auth/login',{method:'POST',body:{email,password}});return result.user||result; }
async function posLogout() { try{await posApiFetch('/auth/logout',{method:'POST'});}catch(_){}S.posActiveUser=null;S.activeCompanyAdmin=null;S.activeSuperAdmin=null;S.view='login';render(); }
async function posLockRegister() {
  // Rule #15 — POS Lock ≠ Close Register. Drop the POS employee only;
  // keep the ERP account session and let the register session stay OPEN.
  // The backend /auth/pos-lock endpoint removes session['pos_cashier']
  // without touching session['user']. We do NOT hit /auth/logout because
  // that would sign the account out too.
  try { await posApiFetch('/auth/pos-lock', { method:'POST' }); } catch (_) {}
  S.posActiveUser = null;
  S.posLoginMode = 'staff';
  S.posLoginPin = '';
  S._loginSelectedId = null;
  // Register state persists — same session, ready for another PIN login.
  await refreshPOSSessionState();
  render();
}
async function posCheckSession() { if(new URLSearchParams(location.search).has('reset'))return;try{const user=await posApiFetch('/auth/me');if(user&&user.id&&typeof handleAuthenticatedUser==='function')await handleAuthenticatedUser(user,true);}catch(_){} }
