param([int]$Port=9502)
$ErrorActionPreference='Stop'
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile=Join-Path $env:TEMP "curdun-responsive-$Port"
$proc=Start-Process $edge -ArgumentList @('--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-allow-origins=*',"--remote-debugging-port=$Port","--user-data-dir=$profile",'http://localhost:8000/app.html') -WindowStyle Hidden -PassThru
$ws=$null
try {
  $page=$null
  for($i=0;$i-lt60-and!$page;$i++){
    Start-Sleep -Milliseconds 200
    try { foreach($candidate in (Invoke-RestMethod "http://localhost:$Port/json/list")){if($candidate.type-eq'page'-and$candidate.url-like'http://localhost:8000/*'){$page=$candidate;break}} } catch {}
  }
  if(!$page){throw 'No browser page'}
  $ws=[Net.WebSockets.ClientWebSocket]::new()
  $ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
  $script:messageId=0
  function Invoke-Cdp([string]$Method,[hashtable]$Params){
    $script:messageId++
    $payload=@{id=$script:messageId;method=$Method;params=$Params}|ConvertTo-Json -Depth 12 -Compress
    $bytes=[Text.Encoding]::UTF8.GetBytes($payload)
    $ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
    while($true){
      $buffer=New-Object byte[] 1048576
      $received=$ws.ReceiveAsync([ArraySegment[byte]]::new($buffer),[Threading.CancellationToken]::None).GetAwaiter().GetResult()
      $reply=([Text.Encoding]::UTF8.GetString($buffer,0,$received.Count)|ConvertFrom-Json)
      if($reply.id-eq$script:messageId){if($reply.error){throw($reply.error|ConvertTo-Json -Compress)};return $reply.result}
    }
  }
  $login="(async()=>{const pause=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<150&&typeof posPinLogin!=='function';i++)await pause(100);await posPinLogin('2468',8,1);await posBootstrap();S.view='pos';S.posStoreType='retail';S.posView='backoffice';S.posBackofficeTab='reports-stock';render();await pause(250);return true})()"
  $loginResult=Invoke-Cdp 'Runtime.evaluate' @{expression=$login;awaitPromise=$true;returnByValue=$true}
  if($loginResult.exceptionDetails){throw($loginResult.exceptionDetails|ConvertTo-Json -Depth 12)}

  $results=@()
  foreach($width in @(1280,1024,768,390)){
    Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=900;deviceScaleFactor=1;mobile=($width-lt721)}|Out-Null
    $measure=@"
(()=>{window.dispatchEvent(new Event('resize'));const q=s=>document.querySelector(s);const actions=[...document.querySelectorAll('.crud-actions .crud-btn')];const overlaps=actions.some((a,i)=>actions.slice(i+1).some(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top}));const scroller=q('.overflow-x-auto');const table=q('.data-table');const nav=q('.pos-topnav');return {width:innerWidth,bodyClient:document.documentElement.clientWidth,bodyScroll:document.documentElement.scrollWidth,navRight:Math.round(nav.getBoundingClientRect().right),contentRight:Math.round(q('.pos-backoffice-content').getBoundingClientRect().right),tableScrollContained:!table||!scroller||table.scrollWidth<=scroller.scrollWidth,scrollerOverflow:scroller?getComputedStyle(scroller).overflowX:null,actionsOverlap:overlaps,actionWidths:actions.map(a=>Math.round(a.getBoundingClientRect().width)),navRows:Math.round(nav.getBoundingClientRect().height)}})()
"@
    $measured=Invoke-Cdp 'Runtime.evaluate' @{expression=$measure;returnByValue=$true}
    if($measured.exceptionDetails){throw($measured.exceptionDetails|ConvertTo-Json -Depth 12)}
    $value=$measured.result.value
    if($value.bodyScroll-gt$value.bodyClient){throw "Page-level horizontal overflow at $width px: $($value|ConvertTo-Json -Compress)"}
    if($value.navRight-gt($width+1)-or$value.contentRight-gt($width+1)){throw "Layout exceeds viewport at $width px"}
    if($value.actionsOverlap){throw "Stock action buttons overlap at $width px"}
    if($value.actionWidths|Where-Object{$_-lt45}){throw "Text action button is too narrow at $width px"}
    if($value.scrollerOverflow-notin@('auto','scroll')){throw "Table has no horizontal scrolling at $width px"}
    $results+=$value
  }
  $results|ConvertTo-Json -Depth 8
}
finally {
  if($ws){$ws.Dispose()}
  if($proc-and!$proc.HasExited){Stop-Process $proc.Id -Force}
}
