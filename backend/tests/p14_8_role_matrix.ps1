param([int]$BasePort = 9360,[string]$Only = '')
$ErrorActionPreference='Stop'
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$cases=@(
  @{name='MINIMAL';id=4;pin='5678';email='mohamed@shifo.so';password='Pos@5678Secure'},
  @{name='BASIC';id=3;pin='1234';email='fartun@shifo.so';password='Pos@1234Secure'},
  @{name='ADVANCED';id=6;pin='3456';email='khadija@shifo.so';password='Pos@3456Secure'},
  @{name='BASIC_REOPEN';id=3;pin='1234';email='fartun@shifo.so';password='Pos@1234Secure'},
  @{name='DUAL_MINIMAL';id=4;pin='5678';email='admin@shifo.so';password='Cor-7441GS-24'}
)
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
 await wait(()=>document.querySelector('#login-email'),'account login');
 const fill=(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))};
 fill(document.querySelector('#login-email'),'$($case.email)');fill(document.querySelector('#login-pw'),'$($case.password)');document.querySelector('#btn-signin').click();
 await wait(()=>document.querySelector('[data-launch="pos"]'),'workspace POS');document.querySelector('[data-launch="pos"]').click();
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
 S.posView='backoffice';S.posBackofficeTab='sessions';render();await new Promise(r=>setTimeout(r,150));
 const sessions={cash_in:!!document.querySelector('#btn-cash-in'),cash_out:!!document.querySelector('#btn-cash-out'),close:!!document.querySelector('#btn-session-close'),open:!!document.querySelector('#btn-session-open')};
 document.querySelector('[data-nav-menu="orders"]')?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('[data-bo-tab="orders"]')?.click();await new Promise(r=>setTimeout(r,200));
 const orders={screen:document.body.textContent.includes('Transactions')||document.body.textContent.includes('Orders'),refund:!!document.querySelector('[data-refund-txn]')};
 document.querySelector('[data-nav-menu="reporting"]')?.click();await new Promise(r=>setTimeout(r,200));document.querySelector('[data-bo-tab="reports-orders"]')?.click();await new Promise(r=>setTimeout(r,200));
 const reports={screen:document.body.textContent.includes('Orders')&&!!document.querySelector('[data-nav-menu="reporting"]')};
 const probes={transactions:await api('/pos/transactions'),reports:await api('/pos/reports'),settings:await api('/pos/settings'),manual_pricelist:await api('/pos/quote','POST',{pricelist_id:6,items:[{product_id:1,quantity:1}],payments:[]}),refund:await api('/pos/orders/0/refund','POST',{idempotency_key:crypto.randomUUID(),reason:'authorization probe'}),cash:await api('/pos/sessions/0/cash-movements','POST',{idempotency_key:crypto.randomUUID(),type:'IN',amount:1,reason:'authorization probe'}),open:await api('/pos/sessions/open','POST',{config_id:0,opening_cash:0}),close:await api('/pos/sessions/0/close','POST',{counted_cash:0}),loyalty:await api('/pos/quote','POST',{customer_id:1,loyalty_reward_id:1,items:[{product_id:1,quantity:1}],payments:[]})};
 return {role:'$($case.name)',employee:S.posActiveUser.name,level:posLevelForUser(S.posActiveUser),caps,visible:{checkout,sessions,orders,reports},probes};
})()
"@
    $msg=@{id=1;method='Runtime.evaluate';params=@{expression=$script;awaitPromise=$true;returnByValue=$true}}|ConvertTo-Json -Depth 8 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($msg);$ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
    while($true){$buf=New-Object byte[] 1048576;$recv=$ws.ReceiveAsync([ArraySegment[byte]]::new($buf),[Threading.CancellationToken]::None).GetAwaiter().GetResult();$response=([Text.Encoding]::UTF8.GetString($buf,0,$recv.Count)|ConvertFrom-Json);if($response.id -eq 1){if($response.result.exceptionDetails){throw($response.result.exceptionDetails|ConvertTo-Json -Depth 8)};return $response.result.result.value}}
  } finally {if($ws){$ws.Dispose()};if($proc -and !$proc.HasExited){Stop-Process -Id $proc.Id -Force}}
}

$results=@();for($i=0;$i -lt $cases.Count;$i++){$results+=Invoke-RoleCase $cases[$i] ($BasePort+$i)}
$results|ConvertTo-Json -Depth 12
