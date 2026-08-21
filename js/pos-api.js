'use strict';

const API_BASE = '/api/v1';

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
  return Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
}

function posRoleName(user) {
  const rawRoles = Array.isArray(user.roles) ? user.roles : String(user.roles || user.role || '').split(',');
  const role = rawRoles.map(value => value.trim().toLowerCase()).find(Boolean) || 'cashier';
  return { superadmin:'Admin', admin:'Admin', store_manager:'Store Manager', senior_cashier:'Senior Cashier', cashier:'Cashier' }[role] || 'Cashier';
}

function mapProduct(product) {
  return {
    id: Number(product.id), name: product.name, cat: product.category_name || 'General',
    price: Number(product.selling_price || 0), wholesalePrice: Number(product.wholesale_price || product.selling_price || 0),
    stock: Number(product.current_stock || 0), barcode: product.barcode || product.sku || '', sku: product.sku || '',
    minimumStock: Number(product.minimum_stock || 0), status: product.status || 'active',
  };
}

function mapCustomer(customer) {
  return {
    id: Number(customer.id), name: customer.name, phone: customer.phone || '', points: Number(customer.loyalty_points || 0),
    visits: Number(customer.total_orders || 0), lastVisit: customer.last_visit || '—', tier: customer.tier || 'Bronze',
    creditLimit: Number(customer.credit_limit || 0), debtBalance: Number(customer.balance || 0), email: customer.email || '',
  };
}

function mapTransaction(order) {
  return {
    id: order.reference_number || `POS-${order.id}`, _backendId: Number(order.id), cashier: order.cashier_name || '—',
    customer: order.customer_name || 'Walk-in', items: Number(order.items_count || 0), total: Number(order.total_amount || 0),
    method: order.payment_method || 'Deyn', time: order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—',
    date: order.order_date || '', status: order.status || 'COMPLETED', isRefund:Boolean(Number(order.refunded_order_id)),
    posState:order.pos_state || null, amountPaid:Number(order.amount_paid || 0), change:Number(order.amount_return || 0),
  };
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
    S.storeSettings.payments = data.settings.payments || S.storeSettings.payments;
    const branch = S.posBranches.find(item => Number(item.id) === Number(data.settings.default_branch_id)) || S.posBranches[0];
    if (branch) { S.storeSettings.defaultStore = branch.name; S.currentStore = `${branch.name} Store`; }
  }
}

async function posBootstrap() {
  S._posLoading = { bootstrap:true };
  try { const data = await posApiFetch('/pos/bootstrap'); posApplyBootstrap(data); return data; }
  finally { S._posLoading.bootstrap = false; if (typeof render === 'function') render(); }
}

async function posCreateProduct(form) { const row=await posApiFetch('/pos/products',{method:'POST',body:{name:form.name,category_name:form.cat,selling_price:form.price,wholesale_price:form.wholesalePrice,current_stock:form.stock,minimum_stock:form.minimumStock,barcode:form.barcode}});POS_PRODUCTS.push(mapProduct(row));await posLoadStockAlerts(false);return row; }
async function posUpdateProduct(id,form) { const row=await posApiFetch(`/pos/products/${id}`,{method:'PUT',body:{name:form.name,category_name:form.cat,selling_price:form.price,wholesale_price:form.wholesalePrice,current_stock:form.stock,minimum_stock:form.minimumStock,barcode:form.barcode}});const i=POS_PRODUCTS.findIndex(item=>item.id===Number(id));if(i>=0)POS_PRODUCTS[i]=mapProduct(row);await posLoadStockAlerts(false);return row; }
async function posDeleteProduct(id) { await posApiFetch(`/pos/products/${id}`,{method:'DELETE'});const i=POS_PRODUCTS.findIndex(item=>item.id===Number(id));if(i>=0)POS_PRODUCTS.splice(i,1);await posLoadStockAlerts(false); }
async function posCreateCustomer(form) { const row=await posApiFetch('/pos/customers',{method:'POST',body:{name:form.name,phone:form.phone,email:form.email,credit_limit:form.creditLimit}});POS_CUSTOMERS.push(mapCustomer(row));return row; }
async function posUpdateCustomer(id,form) { const row=await posApiFetch(`/pos/customers/${id}`,{method:'PUT',body:{name:form.name,phone:form.phone,email:form.email,credit_limit:form.creditLimit}});const i=POS_CUSTOMERS.findIndex(item=>item.id===Number(id));if(i>=0)POS_CUSTOMERS[i]=mapCustomer(row);return row; }
async function posDeleteCustomer(id) { await posApiFetch(`/pos/customers/${id}`,{method:'DELETE'});const i=POS_CUSTOMERS.findIndex(item=>item.id===Number(id));if(i>=0)POS_CUSTOMERS.splice(i,1); }
async function posCreateStaff(form) { const role={Cashier:'cashier','Senior Cashier':'senior_cashier','Store Manager':'store_manager'}[form.role]||'cashier';const slug=form.name.toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'');const email=form.email||`${slug}.${Date.now().toString().slice(-6)}@pos.curdun.so`;const pin=String(form.pin||'');const status=form.status==='break'?'inactive':(form.status||'active');const data=await posApiFetch('/pos/staff',{method:'POST',body:{name:form.name,email,phone:form.phone,role,branch_id:form.branchId||null,pin,status}});POS_STAFF.push({...mapStaff(data.user),hasPin:true});return {...data,pin}; }
async function posUpdateStaff(id,form) { const role={Cashier:'cashier','Senior Cashier':'senior_cashier','Store Manager':'store_manager'}[form.role]||'cashier';const status=form.status==='break'?'inactive':(form.status||'active');const row=await posApiFetch(`/pos/staff/${id}`,{method:'PUT',body:{name:form.name,email:form.email,phone:form.phone,role,branch_id:form.branchId||null,pin:form.pin,status}});const i=POS_STAFF.findIndex(item=>item.id===Number(id));if(i>=0)POS_STAFF[i]=mapStaff(row);return row; }
// P3 Stage B: `payments` is now an array of Odoo-style payment lines built
// by the checkout composer. Each entry: { method, amount, tendered?, reference? }.
// Backwards-compat: if a caller still passes a single method string, wrap it
// in a one-line array so we never break older code paths mid-session.
async function posCompleteCheckout(cart, customerId, payments) {
  const subtotal = cart.reduce((sum,item)=>sum+(item.isWholesale?item.wholesalePrice:item.price)*item.qty, 0);
  const total = Number((subtotal * (1 + Number(S.storeSettings.taxRate||0)/100)).toFixed(2));
  S.posPendingOrderId = S.posPendingOrderId || (globalThis.crypto?.randomUUID?.() || `${Date.now()}-0000-4000-8000-${Math.random().toString(16).slice(2).padEnd(12,'0').slice(0,12)}`);
  let lines;
  if (Array.isArray(payments)) {
    // Trust the composer — one line per method, tendered only on cash lines.
    lines = payments.map(p => {
      const line = { method: p.method, amount: Number(p.amount) };
      if (p.tendered !== undefined && p.tendered !== null) line.tendered = Number(p.tendered);
      if (p.reference) line.reference = p.reference;
      return line;
    });
  } else {
    // Legacy single-method fallback.
    const method = payments;
    const isCash = String(method).toLowerCase() === 'cash';
    const tenderRaw = parseFloat(S.posCashTendered);
    const tender = (isCash && !Number.isNaN(tenderRaw) && tenderRaw>0) ? Number(tenderRaw.toFixed(2)) : null;
    const line = { method, amount: total };
    if (isCash && tender !== null) line.tendered = Math.max(tender, total);
    if (S.mobileTxId) line.reference = S.mobileTxId;
    lines = [line];
  }
  const data = await posApiFetch('/pos/checkout', { method:'POST', body:{
    client_order_id: S.posPendingOrderId,
    customer_id: customerId || null,
    payments: lines,
    items: cart.map(item => ({ product_id:item.id, quantity:item.qty, wholesale:Boolean(item.isWholesale), discount_percent:Number(item.discountPercent||0) })),
  }});
  const mapped = mapTransaction({ ...data, id:data.id, total_amount:data.total_amount, items_count:cart.reduce((n,item)=>n+item.qty,0), customer_name:POS_CUSTOMERS.find(item=>item.id===customerId)?.name, cashier_name:S.posActiveUser?.name });
  const existing = POS_TRANSACTIONS.findIndex(item => item._backendId === mapped._backendId);
  if (existing >= 0) POS_TRANSACTIONS[existing] = mapped; else POS_TRANSACTIONS.unshift(mapped);
  S.posPendingOrderId = null;
  return data;
}
async function posVoidTransaction(orderId) { const row=await posApiFetch(`/pos/orders/${orderId}/refund`,{method:'POST',body:{reason:'Full refund by POS manager'}});await posBootstrap();return row; }
async function posCollectDebt(id,amount) { const row=await posApiFetch(`/pos/customers/${id}/collect-debt`,{method:'POST',body:{amount,payment_method:'Cash'}});const i=POS_CUSTOMERS.findIndex(item=>item.id===Number(id));if(i>=0)POS_CUSTOMERS[i]=mapCustomer(row);return row; }
async function posOpenSession(openingCash=0) { const session=await posApiFetch('/pos/sessions/open',{method:'POST',body:{opening_cash:openingCash}});S.posSession=session;S.posSessionSummary={session,expected_cash:Number(session.opening_cash||openingCash),orders:0,net_sales:0,payment_methods:[],cash_movements:{in:0,out:0}};S.posShiftActive=true;S.posShiftStart=new Date(session.opened_at||Date.now());return session; }
async function posRecordCashMovement(type,amount,reason) { if(!S.posSession?.id)throw new Error('Open the register first.');const row=await posApiFetch(`/pos/sessions/${S.posSession.id}/cash-movements`,{method:'POST',body:{type,amount,reason}});await posBootstrap();return row; }
async function posCloseShift(cashierId,countedCash,approveDifference=false) { const result=await posApiFetch('/pos/shifts/close',{method:'POST',body:{cashier_id:cashierId,counted_cash:countedCash,approve_difference:approveDifference}});if(Number(result.session_id)===Number(S.posSession?.id)){S.posSession=null;S.posSessionSummary=null;S.posShiftActive=false;S.posShiftStart=null;}return result; }
async function posSaveSettings(settings) { return posApiFetch('/pos/settings',{method:'PUT',body:{store_name:settings.storeName,tax_rate:settings.taxRate,receipt_header:settings.receiptHeader,receipt_footer:settings.receiptFooter,receipt_barcode:settings.showBarcodeOnReceipt,cash_control:settings.cashControl,opening_control:settings.openingControl,maximum_difference:settings.maximumDifference,payments:settings.payments,default_branch_id:settings.defaultBranchId||null}}); }

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

async function posPinLogin(pin,userId,branchId) { const result=await posApiFetch('/auth/pin-login',{method:'POST',body:{pin,user_id:userId,branch_id:branchId||null}});const user=result.user||result;S.posActiveUser={...mapStaff(user),role:posRoleName(user)};S.currentCompany=user.company_name||S.currentCompany;S.posTab='dash';await posBootstrap(); }

// Manager PIN approval — verifies a Store Manager or Admin PIN WITHOUT
// hijacking the current cashier's session. Returns { approved_by, action, reason }.
async function posVerifyManagerPin(pin, action, reason, branchId) {
  return posApiFetch('/auth/manager-approval', {
    method: 'POST',
    body: { pin, action, reason, branch_id: branchId || null },
  });
}
async function posEmailLogin(email,password) { const result=await posApiFetch('/auth/login',{method:'POST',body:{email,password}});return result.user||result; }
async function posLogout() { try{await posApiFetch('/auth/logout',{method:'POST'});}catch(_){}S.posActiveUser=null;S.activeCompanyAdmin=null;S.activeSuperAdmin=null;S.view='login';render(); }
async function posLockRegister() { try{await posApiFetch('/auth/logout',{method:'POST'});}catch(_){}S.posActiveUser=null;S.activeCompanyAdmin=null;S.activeSuperAdmin=null;S.posLoginMode='staff';S.posLoginPin='';S._loginSelectedId=null;S.view='pos';render(); }
async function posCheckSession() { if(new URLSearchParams(location.search).has('reset'))return;try{const user=await posApiFetch('/auth/me');if(user&&user.id&&typeof handleAuthenticatedUser==='function')await handleAuthenticatedUser(user,true);}catch(_){} }
