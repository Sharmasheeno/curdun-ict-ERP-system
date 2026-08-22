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
  $login="(async()=>{const pause=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<150&&typeof posPinLogin!=='function';i++)await pause(100);await posPinLogin('2468',8,1);await posBootstrap();S.view='pos';S.posStoreType='retail';S.posView='backoffice';S.posBackofficeTab='reports-stock';render();for(let i=0;i<50&&!document.querySelector('.curdun-brand-logo-nav')?.naturalWidth;i++)await pause(100);return true})()"
  $loginResult=Invoke-Cdp 'Runtime.evaluate' @{expression=$login;awaitPromise=$true;returnByValue=$true}
  if($loginResult.exceptionDetails){throw($loginResult.exceptionDetails|ConvertTo-Json -Depth 12)}

  $results=@()
  foreach($width in @(1440,1280,1024,768,640,600,390,360)){
    Invoke-Cdp 'Emulation.setDeviceMetricsOverride' @{width=$width;height=900;deviceScaleFactor=1;mobile=($width-lt721)}|Out-Null
    $measure=@"
(()=>{window.dispatchEvent(new Event('resize'));const q=s=>document.querySelector(s);const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0};const actions=[...document.querySelectorAll('[data-restock-product],[data-read-stock-alert]')].filter(visible);const overlaps=actions.some((a,i)=>actions.slice(i+1).some(b=>{const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top}));const scroller=q('.pos-stock-alert-table');const table=scroller?.querySelector('.data-table');const nav=q('.pos-topnav');const grid=q('.kpi-grid');const mobileList=q('.pos-stock-alert-mobile-list');const logo=q('.curdun-brand-logo-nav');return {width:innerWidth,bodyClient:document.documentElement.clientWidth,bodyScroll:document.documentElement.scrollWidth,navRight:Math.round(nav.getBoundingClientRect().right),contentRight:Math.round(q('.pos-backoffice-content').getBoundingClientRect().right),logoLoaded:Boolean(logo?.complete&&logo?.naturalWidth),logoWidth:Math.round(logo?.getBoundingClientRect().width||0),tableScrollContained:!table||!scroller||table.scrollWidth<=scroller.scrollWidth,tableVisible:visible(scroller),mobileCardsVisible:visible(mobileList),mobileCardCount:[...document.querySelectorAll('.pos-stock-alert-mobile-card')].filter(visible).length,kpiColumns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,scrollerOverflow:scroller?getComputedStyle(scroller).overflowX:null,actionsOverlap:overlaps,actionWidths:actions.map(a=>Math.round(a.getBoundingClientRect().width)),navRows:Math.round(nav.getBoundingClientRect().height)}})()
"@
    $measured=Invoke-Cdp 'Runtime.evaluate' @{expression=$measure;returnByValue=$true}
    if($measured.exceptionDetails){throw($measured.exceptionDetails|ConvertTo-Json -Depth 12)}
    $value=$measured.result.value
    if($value.bodyScroll-gt$value.bodyClient){throw "Page-level horizontal overflow at $width px: $($value|ConvertTo-Json -Compress)"}
    if($value.navRight-gt($width+1)-or$value.contentRight-gt($width+1)){throw "Layout exceeds viewport at $width px"}
    if(!$value.logoLoaded-or$value.logoWidth-lt90){throw "Curdun navigation logo did not load or is unreadably small at $width px`: $($value|ConvertTo-Json -Compress)"}
    if($value.actionsOverlap){throw "Stock action buttons overlap at $width px"}
    if($value.actionWidths|Where-Object{$_-lt54}){throw "Text action button is too narrow at $width px"}
    if($value.scrollerOverflow-notin@('auto','scroll')){throw "Table has no horizontal scrolling at $width px"}
    if($width-le640){
      if($value.kpiColumns-ne1){throw "KPI cards are not single-column at $width px"}
      if($value.tableVisible-or!$value.mobileCardsVisible-or$value.mobileCardCount-ne1){throw "Stock alerts did not switch to readable mobile cards at $width px"}
    } elseif(!$value.tableVisible-or$value.mobileCardsVisible){throw "Desktop/tablet stock table mode is incorrect at $width px"}
    $value|Add-Member -NotePropertyName screenChecks -NotePropertyValue 0
    foreach($tab in @('dashboard','orders','sessions','payments','customers','products','reports-stock')){
      $screen=Invoke-Cdp 'Runtime.evaluate' @{expression="(()=>{S.posBackofficeTab='$tab';render();const root=document.documentElement,content=document.querySelector('.pos-backoffice-content'),minimum=innerWidth<=720?30:24;return {tab:'$tab',bodyClient:root.clientWidth,bodyScroll:root.scrollWidth,contentRight:Math.round(content.getBoundingClientRect().right),tinyControls:[...document.querySelectorAll('button')].filter(b=>{const r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.width<minimum||r.height<minimum)}).map(b=>{const r=b.getBoundingClientRect();return {text:b.textContent.trim(),id:b.id,width:Math.round(r.width),height:Math.round(r.height)}})}})()";returnByValue=$true}
      if($screen.exceptionDetails){throw($screen.exceptionDetails|ConvertTo-Json -Depth 12)}
      $screenValue=$screen.result.value
      if($screenValue.bodyScroll-gt$screenValue.bodyClient-or$screenValue.contentRight-gt($width+1)){throw "Page overflow on $tab at $width px: $($screenValue|ConvertTo-Json -Compress)"}
      if($screenValue.tinyControls.Count-gt0){throw "Undersized visible controls on $tab at $width px`: $($screenValue.tinyControls|ConvertTo-Json -Compress)"}
      $value.screenChecks++
    }
    $results+=$value
  }
  $brandSurfaces=Invoke-Cdp 'Runtime.evaluate' @{expression="(async()=>{const pause=ms=>new Promise(r=>setTimeout(r,ms)),host=document.createElement('div'),login=document.createElement('div');host.style.position='fixed';host.style.left='-10000px';login.innerHTML=renderPOSLogin();document.body.appendChild(host);host.append(login,renderPOSStoreSelector());for(let i=0;i<50&&[...host.querySelectorAll('.curdun-brand-logo')].some(x=>!x.naturalWidth);i++)await pause(100);const logos=[...host.querySelectorAll('.curdun-brand-logo')].map(x=>({className:x.className,loaded:Boolean(x.complete&&x.naturalWidth),width:Math.round(x.getBoundingClientRect().width),height:Math.round(x.getBoundingClientRect().height)}));host.remove();return logos})()";awaitPromise=$true;returnByValue=$true}
  if($brandSurfaces.exceptionDetails){throw($brandSurfaces.exceptionDetails|ConvertTo-Json -Depth 12)}
  $invalidBrandSurfaces=@($brandSurfaces.result.value|Where-Object{!$_.loaded-or$_.width-lt160})
  if($brandSurfaces.result.value.Count-ne2-or$invalidBrandSurfaces.Count-gt0){throw "Curdun login/selector brand surfaces failed: $($brandSurfaces.result.value|ConvertTo-Json -Compress)"}
  $results|ConvertTo-Json -Depth 8
}
finally {
  if($ws){$ws.Dispose()}
  if($proc-and!$proc.HasExited){Stop-Process $proc.Id -Force}
}
