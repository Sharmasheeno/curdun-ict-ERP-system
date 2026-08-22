param([int]$Port=9461,[int]$Width=1440,[int]$Height=900)
$ErrorActionPreference='Stop'
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile=Join-Path $env:TEMP "curdun-p14e-visual-$Port"
$proc=Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-allow-origins=*',"--remote-debugging-port=$Port","--user-data-dir=$profile",'http://localhost:8000/app.html') -WindowStyle Hidden -PassThru
$ws=$null
try {
 $page=$null;for($i=0;$i -lt 60 -and !$page;$i++){Start-Sleep -Milliseconds 200;try{foreach($candidate in (Invoke-RestMethod "http://localhost:$Port/json/list")){if($candidate.type -eq 'page' -and $candidate.url -like 'http://localhost:8000/*'){$page=$candidate;break}}}catch{}}
 if(!$page){throw 'No browser page'}
 $ws=[Net.WebSockets.ClientWebSocket]::new();$ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
 $script=@'
(async()=>{
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const wait=async(fn,label)=>{for(let i=0;i<120;i++){const v=fn();if(v)return v;await pause(100)}throw new Error('Timeout '+label)};
 await wait(()=>typeof posPinLogin==='function','scripts');await posPinLogin('1234',3,1);await posBootstrap();S.view='pos';
 const sizes=[{name:innerWidth>=1200?'Desktop':'Narrow'}];
 const tabs=['dashboard','orders','sessions','payments','customers','products','categories','reports-orders','reports-sales','reports-session','reports-stock','config-settings','config-payments','config-staff','config-currencies','config-audit'];
 const inspect=(screen,size)=>{
   const vw=innerWidth,vh=innerHeight,root=document.documentElement;
   const visible=[...document.querySelectorAll('button,input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'});
   const clipped=visible.filter(e=>{const r=e.getBoundingClientRect();return !e.closest('.overflow-x-auto,.data-section')&&(r.right>vw+2||r.left<-2)}).map(e=>e.id||e.textContent.trim().slice(0,35)||e.tagName).slice(0,10);
   const bareTables=[...document.querySelectorAll('table')].filter(t=>t.scrollWidth>t.parentElement.clientWidth+2&&!t.closest('.overflow-x-auto,.data-section')).length;
   return{screen,size,viewport:`${vw}x${vh}`,overflow:root.scrollWidth>vw+2?root.scrollWidth-vw:0,clipped,bareTables,title:(document.querySelector('.page-title,.pharm-tab-label,h1,h2')?.textContent||'').trim().slice(0,80)};
 };
 const results=[];
 for(const size of sizes){
   for(const tab of tabs){S.posView='backoffice';S.posBackofficeTab=tab;render();await pause(180);results.push(inspect(tab,size.name));}
   S.posView='session';S.posTab='checkout';S.posCheckoutUncertain=false;render();await pause(200);results.push(inspect('checkout',size.name));
   S.posCheckoutUncertain=true;render();await pause(120);const retry=document.querySelector('#btn-pos-charge');results.push({...inspect('checkout-uncertain',size.name),retry:retry?.textContent.trim(),locked:getComputedStyle(document.querySelector('.pos-product-tile')||document.body).opacity});S.posCheckoutUncertain=false;
   for(const mode of ['open','close','cash-in','cash-out','manager-approval']){S.posView='backoffice';S.posRegisterModal={mode,label:'Test approval',action:'refund',amount:12.5,error:'',busy:false};render();await pause(100);const modal=document.querySelector('.crud-modal'),footer=document.querySelector('.crud-modal-footer'),r=modal?.getBoundingClientRect();results.push({screen:`modal-${mode}`,size:size.name,inside:!!r&&r.top>=0&&r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight,footerVisible:!!footer&&footer.getBoundingClientRect().bottom<=innerHeight,bodyScrollable:!!document.querySelector('.crud-modal-body')});S.posRegisterModal=null;}
 }
 S.posCheckoutUncertain=false;S.posRegisterModal=null;render();
 return{results,failures:results.filter(x=>x.overflow||x.clipped?.length||x.bareTables||x.inside===false||x.footerVisible===false),productionHarness:{localhost:posTestLossAllowed('localhost'),loopback:posTestLossAllowed('127.0.0.1'),lookalike:posTestLossAllowed('localhost.example.com'),production:posTestLossAllowed('pos.shifo.so')}};
})()
'@
 function Send-Cdp($id,$method,$params){$msg=@{id=$id;method=$method;params=$params}|ConvertTo-Json -Depth 8 -Compress;$bytes=[Text.Encoding]::UTF8.GetBytes($msg);$ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null}
 $id=1
 Send-Cdp $id 'Emulation.setDeviceMetricsOverride' @{width=$Width;height=$Height;deviceScaleFactor=1;mobile=$false};$id++
 Send-Cdp 99 'Runtime.evaluate' @{expression=$script;awaitPromise=$true;returnByValue=$true}
 while($true){$buf=New-Object byte[] 1048576;$recv=$ws.ReceiveAsync([ArraySegment[byte]]::new($buf),[Threading.CancellationToken]::None).GetAwaiter().GetResult();$response=([Text.Encoding]::UTF8.GetString($buf,0,$recv.Count)|ConvertFrom-Json);if($response.id -eq 99){if($response.result.exceptionDetails){throw($response.result.exceptionDetails|ConvertTo-Json -Depth 8)};$response.result.result.value|ConvertTo-Json -Depth 12;break}}
} finally {if($ws){$ws.Dispose()};if($proc -and !$proc.HasExited){Stop-Process -Id $proc.Id -Force}}
