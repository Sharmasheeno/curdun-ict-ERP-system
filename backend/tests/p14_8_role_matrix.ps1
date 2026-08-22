param([int]$BasePort = 9360,[string]$Only = '',[switch]$SkipSale,[switch]$SkipProbes,[switch]$PricelistWorkflow,[string]$DualEmail = '',[string]$DualPassword = '')
$ErrorActionPreference='Stop'
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$cases=@(
  @{name='MINIMAL';id=4;pin='5678';email='mohamed@shifo.so';password='Pos@5678Secure'},
  @{name='BASIC';id=3;pin='1234';email='fartun@shifo.so';password='Pos@1234Secure'},
  @{name='ADVANCED';id=6;pin='3456';email='khadija@shifo.so';password='Pos@3456Secure'}
)
if($DualEmail -and $DualPassword){
  $cases+=@{name='BASIC_REOPEN';id=3;pin='1234';email='fartun@shifo.so';password='Pos@1234Secure'}
  $cases+=@{name='DUAL_MINIMAL';id=4;pin='5678';email=$DualEmail;password=$DualPassword}
}
if($Only){$cases=@($cases|Where-Object{$_.name -eq $Only});if(!$cases.Count){throw "Unknown role case: $Only"}}

function Invoke-RoleCase($case,[int]$port) {
  $profile=Join-Path $env:TEMP "curdun-p148-role-$($case.name)-$port"
  $url='http://localhost:8000/app.html'
  $proc=Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-allow-origins=*',"--remote-debugging-port=$port","--user-data-dir=$profile",$url) -WindowStyle Hidden -PassThru
  $ws=$null
  try {
    $page=$null
    for($i=0;$i -lt 50 -and !$page;$i++){
      Start-Sleep -Milliseconds 200
      try { foreach($candidate in (Invoke-RestMethod "http://localhost:$port/json/list")){if($candidate.type -eq 'page' -and $candidate.url -like 'http://localhost:8000/*'){$page=$candidate;break}} } catch {}
    }
    if(!$page){throw "No browser page for $($case.name)"}
    $ws=[Net.WebSockets.ClientWebSocket]::new();$ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
    $script=@"
(async()=>{
 const wait=async(fn,label)=>{for(let i=0;i<100;i++){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout '+label)};
 const fill=(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))};
 const entry=await wait(()=>document.querySelector('#login-email')||document.querySelector('[data-launch="pos"]'),'account state');if(entry.id==='login-email'){fill(entry,'$($case.email)');fill(document.querySelector('#login-pw'),'$($case.password)');document.querySelector('#btn-signin').click();await wait(()=>document.querySelector('[data-launch="pos"]'),'workspace POS');}document.querySelector('[data-launch="pos"]').click();
 const retail=await wait(()=>document.querySelector('[data-store-type="retail"]')||document.querySelector('#btn-topnav-user'),'store selector');if(retail.matches?.('[data-store-type]'))retail.click();
 await wait(()=>document.querySelector('#btn-topnav-user'),'POS navigation');await new Promise(r=>setTimeout(r,300));document.querySelector('#btn-topnav-user').click();
 await wait(()=>document.querySelector('#btn-bo-lock'),'lock control');await new Promise(r=>setTimeout(r,300));document.querySelector('#btn-bo-lock').click();await wait(()=>!S.posActiveUser,'locked state');
 await new Promise(r=>setTimeout(r,1000));await wait(()=>document.querySelector('[data-login-id="$($case.id)"]'),'staff card');
 document.querySelector('[data-login-id="$($case.id)"]').click();await new Promise(r=>setTimeout(r,300));
 let entered=0;for(const digit of '$($case.pin)'){const key=await wait(()=>[...document.querySelectorAll('[data-key]')].find(b=>b.dataset.key===digit),'PIN key');await new Promise(r=>setTimeout(r,100));key.click();entered++;if(entered<4)await wait(()=>S.posLoginPin.length===entered,'PIN digit '+entered);}
 for(let i=0;i<100&&!S.posActiveUser;i++)await new Promise(r=>setTimeout(r,100));if(!S.posActiveUser)throw new Error('PIN login failed: error='+S.posAuthError+'; pin='+S.posLoginPin+'; selected='+S._loginSelectedId+'; view='+S.view);await new Promise(r=>setTimeout(r,300));
 const api=async(path,method='GET',body)=>{const r=await fetch('/api/v1'+path,{method,credentials:'include',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});let data=null;try{data=await r.json()}catch(_){}return{status:r.status,message:data?.message||null}};
 const caps={sell:posCan('pos.sell'),orders:posCan('pos.orders_view'),reports:posCan('pos.reports_view'),pricelist:posCan('pos.pricelist_select'),refund:posCan('pos.refund'),cash:posCan('pos.cash_in'),open:posCan('pos.register_open'),close:posCan('pos.register_close'),loyalty:posCan('pos.loyalty_operate')};
 S.posView='session';S.posTab='checkout';render();await new Promise(r=>setTimeout(r,150));
 const checkout={screen:!!document.querySelector('.pos-checkout-layout'),pricelist_disabled:document.querySelector('#pos-pricelist-select')?.disabled??null,reward_disabled:document.querySelector('#btn-pos-rewards')?.disabled??null,open_button:!!document.querySelector('#btn-checkout-open-register')};
 let pricelistWorkflow=null;if($($PricelistWorkflow.IsPresent.ToString().ToLower())){
   const quoteAt=async qty=>{await wait(()=>S.posCart[0]?.qty===qty&&!S.posQuoteLoading&&Number(S.posQuote?.lines?.[0]?.qty)===qty,'quote qty '+qty);return{qty,unit:Number(S.posQuote.lines[0].final_unit_price),label:document.querySelector('.pos-cart-item-price')?.textContent.trim(),pricelist:document.querySelector('#pos-pricelist-select')?.selectedOptions[0]?.textContent.trim()}};
   const setQty=async qty=>{while(Number(S.posCart[0]?.qty||0)<qty){const before=Number(S.posCart[0].qty);await new Promise(r=>setTimeout(r,150));document.querySelector('[data-qty-plus="0"]').click();await wait(()=>Number(S.posCart[0]?.qty)===before+1,'qty plus')}while(Number(S.posCart[0]?.qty||0)>qty){const before=Number(S.posCart[0].qty);await new Promise(r=>setTimeout(r,150));document.querySelector('[data-qty-minus="0"]').click();await wait(()=>Number(S.posCart[0]?.qty)===before-1,'qty minus')}return quoteAt(qty)};
   await new Promise(r=>setTimeout(r,350));const initialPricelist=document.querySelector('#pos-pricelist-select').selectedOptions[0].textContent.trim();document.querySelector('[data-add-product="1"]').click();await wait(()=>S.posCart.length===1,'visible product add');
   const standard9=await setQty(9),standard10=await setQty(10);
   const priceSelect=document.querySelector('#pos-pricelist-select');priceSelect.value='6';priceSelect.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>Number(S.posSelectedPricelistId)===6&&!S.posQuoteLoading,'Promotion selection');
   const promotion9=await setQty(9),promotion10=await setQty(10),promotion9Again=await setQty(9);
   const customerSelect=document.querySelector('#pos-deyn-customer');customerSelect.value='44';customerSelect.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>Number(S.posDebtCustomerId)===44&&Number(S.posSelectedPricelistId)===6&&!S.posQuoteLoading,'preferred Promotion');const preferred={customer:customerSelect.selectedOptions[0].textContent,pricelist:document.querySelector('#pos-pricelist-select').selectedOptions[0].textContent.trim(),unit:Number(S.posQuote.lines[0].final_unit_price)};
   customerSelect.value='45';customerSelect.dispatchEvent(new Event('change',{bubbles:true}));await wait(()=>Number(S.posDebtCustomerId)===45&&Number(S.posSelectedPricelistId)===2&&!S.posQuoteLoading,'unavailable fallback');const fallback={customer:customerSelect.selectedOptions[0].textContent,pricelist:document.querySelector('#pos-pricelist-select').selectedOptions[0].textContent.trim(),unit:Number(S.posQuote.lines[0].final_unit_price)};
   pricelistWorkflow={initialPricelist,standard9,standard10,promotion9,promotion10,promotion9Again,preferred,fallback};
 }
 let dualSale=null;if('$($case.name)'==='DUAL_MINIMAL'&&!$($SkipSale.IsPresent.ToString().ToLower())){await new Promise(r=>setTimeout(r,300));document.querySelector('[data-add-product="1"]').click();await wait(()=>S.posCart.length===1&&S.posQuote&&!S.posQuoteLoading,'quoted visible cart');await new Promise(r=>setTimeout(r,300));[...document.querySelectorAll('[data-add-method]')].find(b=>b.dataset.addMethod==='Cash').click();await wait(()=>!document.querySelector('#btn-pos-charge').disabled,'enabled Validate');document.querySelector('#btn-pos-charge').click();await wait(()=>S.posReceiptVisible&&S.posLastReceipt,'visible receipt');dualSale={reference:S.posLastReceipt.id,total:S.posLastReceipt.total};}
 S.posView='backoffice';S.posBackofficeTab='sessions';render();await new Promise(r=>setTimeout(r,150));
 const sessions={cash_in:!!document.querySelector('#btn-cash-in'),cash_out:!!document.querySelector('#btn-cash-out'),close:!!document.querySelector('#btn-session-close'),open:!!document.querySelector('#btn-session-open')};
 document.querySelector('[data-nav-menu="orders"]')?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('[data-bo-tab="orders"]')?.click();await new Promise(r=>setTimeout(r,200));
 const orders={screen:document.body.textContent.includes('Transactions')||document.body.textContent.includes('Orders'),refund:!!document.querySelector('[data-refund-txn]')};
 document.querySelector('[data-nav-menu="reporting"]')?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('[data-bo-tab="reports-orders"]')?.click();await new Promise(r=>setTimeout(r,200));
 const reports={screen:document.body.textContent.includes('Orders')&&!!document.querySelector('[data-nav-menu="reporting"]')};
 let probes={};if(!$($SkipProbes.IsPresent.ToString().ToLower()))probes={transactions:await api('/pos/transactions'),reports:await api('/pos/reports'),settings:await api('/pos/settings'),manual_pricelist:await api('/pos/quote','POST',{pricelist_id:6,items:[{product_id:1,quantity:1}],payments:[]}),refund:await api('/pos/orders/0/refund','POST',{idempotency_key:crypto.randomUUID(),reason:'authorization probe'}),cash:await api('/pos/sessions/0/cash-movements','POST',{idempotency_key:crypto.randomUUID(),type:'IN',amount:1,reason:'authorization probe'}),open:await api('/pos/sessions/open','POST',{config_id:0,opening_cash:0}),close:await api('/pos/sessions/0/close','POST',{counted_cash:0}),loyalty:await api('/pos/quote','POST',{customer_id:1,loyalty_reward_id:1,items:[{product_id:1,quantity:1}],payments:[]})};
 return {role:'$($case.name)',account:'$($case.email)',employee:S.posActiveUser.name,level:posLevelForUser(S.posActiveUser),register_id:S.posSession?.id||null,caps,visible:{checkout,sessions,orders,reports},pricelistWorkflow,dualSale,probes};
})()
"@
    $msg=@{id=1;method='Runtime.evaluate';params=@{expression=$script;awaitPromise=$true;returnByValue=$true}}|ConvertTo-Json -Depth 8 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($msg);$ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
    while($true){$buf=New-Object byte[] 1048576;$recv=$ws.ReceiveAsync([ArraySegment[byte]]::new($buf),[Threading.CancellationToken]::None).GetAwaiter().GetResult();$response=([Text.Encoding]::UTF8.GetString($buf,0,$recv.Count)|ConvertFrom-Json);if($response.id -eq 1){if($response.result.exceptionDetails){throw($response.result.exceptionDetails|ConvertTo-Json -Depth 8)};return $response.result.result.value}}
  } finally {if($ws){$ws.Dispose()};if($proc -and !$proc.HasExited){Stop-Process -Id $proc.Id -Force}}
}

$results=@();for($i=0;$i -lt $cases.Count;$i++){$results+=Invoke-RoleCase $cases[$i] ($BasePort+$i)}
$results|ConvertTo-Json -Depth 12
