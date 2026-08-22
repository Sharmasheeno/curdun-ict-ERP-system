param([int]$Port = 9470,[int]$CustomerId = 29,[double]$CashAmount = 5,[double]$DigitalAmount = 5,[switch]$PersistenceOnly)
$ErrorActionPreference = 'Stop'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile = Join-Path $env:TEMP "curdun-p148-b3-$Port"
$url = 'http://localhost:8000/app.html'

function Invoke-CdpScript([string]$script) {
  $proc = Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-allow-origins=*',"--remote-debugging-port=$Port","--user-data-dir=$profile",$url) -WindowStyle Hidden -PassThru
  $ws = $null
  try {
    $page = $null
    for ($i=0; $i -lt 60 -and !$page; $i++) {
      Start-Sleep -Milliseconds 200
      try { foreach ($candidate in (Invoke-RestMethod "http://localhost:$Port/json/list")) { if ($candidate.type -eq 'page' -and $candidate.url -like 'http://localhost:8000/*') { $page=$candidate; break } } } catch {}
    }
    if (!$page) { throw 'No browser page.' }
    $ws = [Net.WebSockets.ClientWebSocket]::new()
    $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    $msg = @{id=1;method='Runtime.evaluate';params=@{expression=$script;awaitPromise=$true;returnByValue=$true}} | ConvertTo-Json -Depth 8 -Compress
    $bytes = [Text.Encoding]::UTF8.GetBytes($msg)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    while ($true) {
      $buf = New-Object byte[] 1048576
      $recv = $ws.ReceiveAsync([ArraySegment[byte]]::new($buf),[Threading.CancellationToken]::None).GetAwaiter().GetResult()
      $response = ([Text.Encoding]::UTF8.GetString($buf,0,$recv.Count) | ConvertFrom-Json)
      if ($response.id -eq 1) {
        if ($response.result.exceptionDetails) { throw ($response.result.exceptionDetails | ConvertTo-Json -Depth 8) }
        return $response.result.result.value
      }
    }
  } finally {
    if ($ws) { $ws.Dispose() }
    if ($proc -and !$proc.HasExited) { Stop-Process -Id $proc.Id -Force }
  }
}

$phaseOne = @'
(async()=>{
 const wait=async(fn,label)=>{for(let i=0;i<150;i++){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout '+label)};
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const fill=(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))};
 const api=async(path,method='GET',body)=>{const response=await fetch('/api/v1'+path,{method,credentials:'include',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await response.json()}catch(_){}return{status:response.status,data:data?.data,message:data?.message||null}};
 const entry=await wait(()=>document.querySelector('#login-email')||document.querySelector('[data-launch="pos"]'),'account entry');
 if(entry.id==='login-email'){fill(entry,'fartun@shifo.so');fill(document.querySelector('#login-pw'),'Pos@1234Secure');document.querySelector('#btn-signin').click();await wait(()=>document.querySelector('[data-launch="pos"]'),'workspace');}
 document.querySelector('[data-launch="pos"]').click();const retail=await wait(()=>document.querySelector('[data-store-type="retail"]')||document.querySelector('#btn-topnav-user'),'POS');if(retail.matches?.('[data-store-type]'))retail.click();
 await wait(()=>document.querySelector('#btn-topnav-user'),'navigation');await pause(300);document.querySelector('#btn-topnav-user').click();await wait(()=>document.querySelector('#btn-bo-lock'),'lock');await pause(300);document.querySelector('#btn-bo-lock').click();await wait(()=>!S.posActiveUser,'locked');await pause(700);document.querySelector('[data-login-id="3"]').click();await pause(250);for(const digit of '1234'){document.querySelector('[data-key="'+digit+'"]').click();await pause(120)}await wait(()=>S.posActiveUser?.id===3,'Fartun PIN');
 const customerId=__CUSTOMER_ID__;
 const baselineSummary=(await api('/pos/sessions/31/summary')).data;
 const baselineProducts=(await api('/pos/products')).data;
 const baselineLoyalty=(await api('/pos/customers/'+customerId+'/loyalty')).data;
 const baselineTransactions=(await api('/pos/transactions')).data;
 const openAccount=async()=>{S.posView='backoffice';S.posBackofficeTab='customers';render();await pause(350);const button=await wait(()=>document.querySelector('[data-account-customer="'+customerId+'"]'),'Account button');button.click();await wait(()=>S.posCustomerAccount?.data&&!S.posCustomerAccount.loading,'account modal');await pause(300);return S.posCustomerAccount.data};
 const settle=async(amount,method,reference='')=>{await openAccount();document.querySelector('#btn-account-payment-open').click();await wait(()=>document.querySelector('#account-payment-amount'),'payment form');await pause(300);const select=document.querySelector('#account-payment-method');if(select.value!==method){select.value=method;select.dispatchEvent(new Event('change',{bubbles:true}));await pause(300)}fill(document.querySelector('#account-payment-amount'),String(amount));if(reference){const ref=await wait(()=>document.querySelector('#account-payment-reference'),'digital reference');fill(ref,reference)}document.querySelector('#btn-account-payment-submit').click();await wait(()=>S.posCustomerAccount?.data&&!S.posCustomerAccount.settleOpen&&!S.posCustomerAccount.submitting,'payment completion');return S.posCustomerAccount.data};
 const overview=await openAccount();const modalText=document.querySelector('.crud-modal').textContent.replace(/\s+/g,' ').trim();document.querySelector('#btn-account-payment-open').click();await wait(()=>document.querySelector('#account-payment-method'),'method list');const offered=[...document.querySelector('#account-payment-method').options].map(o=>o.textContent.trim());S.posCustomerAccount=null;render();
 const deleteControl=document.querySelector('[data-account-customer="'+customerId+'"]').closest('tr').querySelector('.crud-btn-delete');
 const cashResult=await settle(__CASH_AMOUNT__,'Cash');const afterCash=(await api('/pos/sessions/31/summary')).data;
 await openAccount();document.querySelector('#btn-account-payment-open').click();await wait(()=>document.querySelector('#account-payment-amount'),'overcollect form');await pause(300);fill(document.querySelector('#account-payment-amount'),String(Number(S.posCustomerAccount.data.customer.balance)+1));document.querySelector('#btn-account-payment-submit').click();await wait(()=>S.posCustomerAccount?.submitError,'overcollection error');const overcollection={error:S.posCustomerAccount.submitError,balance:Number(S.posCustomerAccount.data.customer.balance)};S.posCustomerAccount=null;render();
 const overApi=await api('/pos/customers/'+customerId+'/collect-debt','POST',{idempotency_key:crypto.randomUUID(),amount:999,payment_method:'Cash'});
 const creditApi=await api('/pos/customers/'+customerId+'/collect-debt','POST',{idempotency_key:crypto.randomUUID(),amount:1,payment_method:'Deyn'});
 const disabledApi=await api('/pos/customers/'+customerId+'/collect-debt','POST',{idempotency_key:crypto.randomUUID(),amount:1,payment_method:'P14 Disabled Method'});
 document.querySelector('#btn-topnav-user').click();await wait(()=>document.querySelector('#btn-bo-lock'),'second lock');await pause(300);document.querySelector('#btn-bo-lock').click();await wait(()=>!S.posActiveUser,'locked for Khadija');await pause(700);document.querySelector('[data-login-id="6"]').click();await pause(250);for(const digit of '3456'){document.querySelector('[data-key="'+digit+'"]').click();await pause(120)}await wait(()=>S.posActiveUser?.id===6,'Khadija PIN');
 const digitalResult=await settle(__DIGITAL_AMOUNT__,'EVC Plus','B3-EVC-001');const afterDigital=(await api('/pos/sessions/31/summary')).data;
 const exact=Number(digitalResult.customer.balance);const finalResult=await settle(exact,'Cash');const finalSummary=(await api('/pos/sessions/31/summary')).data;
 const finalProducts=(await api('/pos/products')).data;const finalLoyalty=(await api('/pos/customers/'+customerId+'/loyalty')).data;const finalTransactions=(await api('/pos/transactions')).data;
 return {customerId,overview:{text:modalText,offered,invariant:overview.invariant_ok,ledgerSum:Number(overview.ledger_sum),balance:Number(overview.customer.balance),deleteDisabled:Boolean(deleteControl?.disabled),deleteHasMutationId:Boolean(deleteControl?.dataset.deleteCustomer)},cash:{balance:Number(cashResult.customer.balance),expectedBefore:Number(baselineSummary.expected_cash),expectedAfter:Number(afterCash.expected_cash),settlementCash:Number(afterCash.cash_reconciliation.cash_in_customer_settle)},overcollection,serverRejections:{over:overApi,credit:creditApi,disabled:disabledApi},digital:{balance:Number(digitalResult.customer.balance),expectedBefore:Number(afterCash.expected_cash),expectedAfter:Number(afterDigital.expected_cash)},final:{amount:exact,balance:Number(finalResult.customer.balance),expectedCash:Number(finalSummary.expected_cash),ledger:finalResult.entries?.slice(0,6)},separation:{salesBefore:baselineSummary.sales,salesAfter:finalSummary.sales,ordersBefore:baselineTransactions.length,ordersAfter:finalTransactions.length,stockUnchanged:JSON.stringify(baselineProducts.map(p=>[p.id,p.current_stock]))===JSON.stringify(finalProducts.map(p=>[p.id,p.current_stock])),loyaltyBefore:Number(baselineLoyalty.customer.loyalty_points),loyaltyAfter:Number(finalLoyalty.customer.loyalty_points)}};
})()
'@

$phaseTwo = @'
(async()=>{
 const wait=async(fn,label)=>{for(let i=0;i<150;i++){const value=fn();if(value)return value;await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout '+label)};
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const entry=await wait(()=>document.querySelector('#login-email')||document.querySelector('[data-launch="pos"]')||document.querySelector('#btn-topnav-user'),'persisted account');if(entry.id==='login-email'){entry.value='fartun@shifo.so';entry.dispatchEvent(new Event('input',{bubbles:true}));const password=document.querySelector('#login-pw');password.value='Pos@1234Secure';password.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#btn-signin').click();await wait(()=>document.querySelector('[data-launch="pos"]'),'persisted workspace')}const launch=document.querySelector('[data-launch="pos"]');if(launch)launch.click();const retail=await wait(()=>document.querySelector('[data-store-type="retail"]')||document.querySelector('#btn-topnav-user'),'POS');if(retail.matches?.('[data-store-type]'))retail.click();await wait(()=>document.querySelector('#btn-topnav-user'),'navigation');
 if(!S.posActiveUser){await pause(700);document.querySelector('[data-login-id="6"]').click();await pause(250);for(const digit of '3456'){document.querySelector('[data-key="'+digit+'"]').click();await pause(120)}await wait(()=>S.posActiveUser?.id===6,'Khadija PIN')}
 S.posView='backoffice';S.posBackofficeTab='customers';render();await pause(350);document.querySelector('[data-account-customer="__CUSTOMER_ID__"]').click();await wait(()=>S.posCustomerAccount?.data&&!S.posCustomerAccount.loading,'persisted account ledger');const data=S.posCustomerAccount.data;return{balance:Number(data.customer.balance),ledgerSum:Number(data.ledger_sum),invariant:Boolean(data.invariant_ok),entries:data.entries.slice(0,6).map(e=>({type:e.type,amount:Number(e.amount),method:e.payment_method,employee:e.cashier_name,session:Number(e.session_id),running:Number(e.running_balance),reference:e.reference})),visible:document.querySelector('.crud-modal').textContent.replace(/\s+/g,' ').trim()};
})()
'@

$phaseOne = $phaseOne.Replace('__CUSTOMER_ID__',[string]$CustomerId).Replace('__CASH_AMOUNT__',$CashAmount.ToString([Globalization.CultureInfo]::InvariantCulture)).Replace('__DIGITAL_AMOUNT__',$DigitalAmount.ToString([Globalization.CultureInfo]::InvariantCulture))
$phaseTwo = $phaseTwo.Replace('__CUSTOMER_ID__',[string]$CustomerId)
if ($PersistenceOnly) {
  Invoke-CdpScript $phaseTwo | ConvertTo-Json -Depth 14
} else {
  $first = Invoke-CdpScript $phaseOne
  Start-Sleep -Milliseconds 700
  $second = Invoke-CdpScript $phaseTwo
  if (!$first.overview.invariant -or [math]::Abs([double]$first.overview.ledgerSum-[double]$first.overview.balance) -gt 0.001) { throw 'Initial Customer Account ledger invariant failed.' }
  if (!$first.overview.deleteDisabled -or $first.overview.deleteHasMutationId) { throw 'Indebted customer still exposes a destructive delete action.' }
  if (@($first.overview.offered) -contains 'Deyn') { throw 'Credit method was offered for Customer Account settlement.' }
  if ([math]::Abs(([double]$first.cash.expectedAfter-[double]$first.cash.expectedBefore)-$CashAmount) -gt 0.001) { throw 'Cash settlement did not increase Expected Cash exactly.' }
  if ([math]::Abs([double]$first.digital.expectedAfter-[double]$first.digital.expectedBefore) -gt 0.001) { throw 'Digital settlement changed Expected Cash.' }
  if ($first.serverRejections.over.status -ne 422 -or $first.serverRejections.credit.status -ne 422 -or $first.serverRejections.disabled.status -ne 422) { throw 'A manipulated settlement request was not rejected server-side.' }
  if (($first.separation.salesBefore | ConvertTo-Json -Compress) -ne ($first.separation.salesAfter | ConvertTo-Json -Compress) -or $first.separation.ordersBefore -ne $first.separation.ordersAfter -or !$first.separation.stockUnchanged -or $first.separation.loyaltyBefore -ne $first.separation.loyaltyAfter) { throw 'Settlement changed sales, orders, inventory, or loyalty.' }
  if ([double]$first.final.balance -ne 0 -or [double]$second.balance -ne 0 -or [double]$second.ledgerSum -ne 0 -or !$second.invariant) { throw 'Full settlement or cold-reload ledger invariant failed.' }
  $newEntries=@($second.entries | Select-Object -First 3)
  if (@($newEntries.employee) -notcontains 'Fartun Ali' -or @($newEntries.employee) -notcontains 'Khadija Abdi' -or @($newEntries.session | Where-Object { $_ -ne 31 }).Count) { throw 'Employee/session attribution failed.' }
  @{workflow=$first;cold_reload=$second} | ConvertTo-Json -Depth 14
}
