param([int]$Port = 9337)
$ErrorActionPreference = 'Stop'
$edge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile = Join-Path $env:TEMP "curdun-p147-cdp-$Port"
$url = 'http://localhost:8000/app.html?pos_test_drop=ALL&pos_test_reset=1'
$proc = Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-allow-origins=*',"--remote-debugging-port=$Port","--user-data-dir=$profile",$url) -WindowStyle Hidden -PassThru
try {
    $page = $null
    for ($i=0; $i -lt 40 -and !$page; $i++) {
        Start-Sleep -Milliseconds 200
        try {
            $pages = Invoke-RestMethod "http://localhost:$Port/json/list"
            foreach ($candidate in $pages) {
                if ($candidate.type -eq 'page' -and $candidate.url -like 'http://localhost:8000/*') { $page = $candidate; break }
            }
        } catch {}
    }
    if (!$page) { throw 'CDP page unavailable.' }
    $ws = [System.Net.WebSockets.ClientWebSocket]::new()
    $wsUrl = [string]$page.webSocketDebuggerUrl
    if (!$wsUrl) { throw "Selected page has no debugger socket: $($page | ConvertTo-Json -Depth 4 -Compress)" }
    Write-Verbose "CDP target $($page.url) via $wsUrl" -Verbose
    $ws.ConnectAsync([Uri]$wsUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    Start-Sleep -Seconds 2
    $script = @'
(async()=>{
  for(let i=0;i<100&&typeof globalThis.posPinLogin!=='function';i++)await new Promise(r=>setTimeout(r,100));
  if(typeof globalThis.posPinLogin!=='function')throw new Error(`POS scripts unavailable at ${location.href}; ready=${document.readyState}; scripts=${[...document.scripts].map(s=>s.src).join(',')}`);
  window.alert=m=>{window.__p14Alerts=(window.__p14Alerts||[]).concat(String(m));};
  await posPinLogin('1234',3,1);
  if(!S.posSession||S.posSession.state!=='OPENED') await posOpenSession(0);
  async function twice(fn){let first_error=null;try{await fn();}catch(e){first_error=e.message;}const replay=await fn();return{first_error,replay};}
  const product=POS_PRODUCTS.find(p=>p.id===1)||POS_PRODUCTS[0];
  const quote=await posApiFetch('/pos/quote',{method:'POST',body:{customer_id:1,items:[{product_id:product.id,quantity:2}],payments:[]}});
  const checkout=await twice(()=>posCompleteCheckout([{...product,qty:2,isWholesale:false}],1,[{method:'Cash',amount:Number(quote.total),tendered:Number(quote.total)}]));
  const orderId=Number(checkout.replay.id);
  const refundable=await posLoadRefundable(orderId),item=refundable.items[0];
  const refundAmount=Number((Number(item.total)/Number(item.original_qty)).toFixed(2));
  const refundPayload={items:[{order_item_id:Number(item.id),quantity:1}],payments:[{method:'Cash',amount:refundAmount}],reason:'P14.7 browser lost response'};
  const refund=await twice(()=>posSubmitRefund(orderId,refundPayload));
  const cashIn=await twice(()=>posRecordCashMovement('IN',30,'P14.7 Small bills'));
  const cashOut=await twice(()=>posRecordCashMovement('OUT',20,'P14.7 Supplies'));
  const customer=POS_CUSTOMERS.find(c=>Number(c.debtBalance)>=25);if(!customer)throw new Error('No customer with $25 debt');
  const debtBefore=Number(customer.debtBalance);
  const settlement=await twice(()=>posCollectDebt(customer.id,25,'Cash','P14.7 settlement'));
  return {session_id:S.posSession.id,order_id:orderId,refund_id:refund.replay.id,cash_in_id:cashIn.replay.id,cash_out_id:cashOut.replay.id,customer_id:customer.id,debt_before:debtBefore,debt_after:Number(settlement.replay.balance),results:{checkout,refund,cashIn,cashOut,settlement},evidence:posIdempotencyEvidence()};
})()
'@
    $message = @{id=1;method='Runtime.evaluate';params=@{expression=$script;awaitPromise=$true;returnByValue=$true}} | ConvertTo-Json -Depth 8 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($message)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult() | Out-Null
    while ($true) {
        $buffer=New-Object byte[] 1048576
        $result=$ws.ReceiveAsync([ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult()
        $response=([Text.Encoding]::UTF8.GetString($buffer,0,$result.Count) | ConvertFrom-Json)
        if ($response.id -eq 1) {
            if ($response.result.exceptionDetails) { throw ($response.result.exceptionDetails | ConvertTo-Json -Depth 8) }
            $response.result.result.value | ConvertTo-Json -Depth 12
            break
        }
    }
} finally {
    if ($ws) { $ws.Dispose() }
    if ($proc -and !$proc.HasExited) { Stop-Process -Id $proc.Id -Force }
}
