param([int]$Port=9410)
$ErrorActionPreference='Stop'
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$profile=Join-Path $env:TEMP "curdun-p148-audit-$Port"
$proc=Start-Process -FilePath $edge -ArgumentList @('--headless','--disable-gpu','--disable-extensions','--no-first-run','--remote-allow-origins=*',"--remote-debugging-port=$Port","--user-data-dir=$profile",'http://localhost:8000/app.html') -WindowStyle Hidden -PassThru
$ws=$null
try {
  $page=$null
  for($i=0;$i -lt 60 -and !$page;$i++){Start-Sleep -Milliseconds 200;try{foreach($candidate in (Invoke-RestMethod "http://localhost:$Port/json/list")){if($candidate.type -eq 'page' -and $candidate.url -like 'http://localhost:8000/*'){$page=$candidate;break}}}catch{}}
  if(!$page){throw 'No audit browser page'}
  $ws=[Net.WebSockets.ClientWebSocket]::new();$ws.ConnectAsync([Uri]$page.webSocketDebuggerUrl,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
  $script=@'
(async()=>{
 const wait=async(fn,label)=>{for(let i=0;i<120;i++){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout '+label)};
 const fill=(el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
 fill(await wait(()=>document.querySelector('#login-email'),'login'),'p14-audit-admin@test.local');fill(document.querySelector('#login-pw'),'P14Audit!2026');document.querySelector('#btn-signin').click();
 await wait(()=>document.querySelector('[data-launch="pos"]'),'workspace');document.querySelector('[data-launch="pos"]').click();
 const retail=await wait(()=>document.querySelector('[data-store-type="retail"]')||document.querySelector('[data-nav-menu="configuration"]'),'POS');if(retail.matches?.('[data-store-type]'))retail.click();
 await wait(()=>document.querySelector('[data-nav-menu="configuration"]'),'configuration menu');await new Promise(r=>setTimeout(r,800));document.querySelector('[data-nav-menu="configuration"]').click();await wait(()=>S.posNavDropdown==='configuration','configuration dropdown state');
 const nav=await wait(()=>document.querySelector('[data-bo-tab="config-audit"]'),'visible Audit Logs navigation');await new Promise(r=>setTimeout(r,500));document.querySelector('[data-bo-tab="config-audit"]').click();await wait(()=>document.querySelector('#btn-audit-run'),'audit screen');
 const noCashier={account:S.user?.name,activeCashier:S.posActiveUser?.name||null,title:document.querySelector('.page-title')?.textContent,visibleNav:!!nav};
 await new Promise(r=>setTimeout(r,500));document.querySelector('#btn-audit-run').click();await wait(()=>S.posAuditData&&!S.posAuditLoading,'initial query');
 const bounded={count:S.posAuditData.items.length,total:S.posAuditData.total,page:S.posAuditData.page,pages:S.posAuditData.pages,perPage:S.posAuditData.per_page,nextVisible:!!document.querySelector('#btn-audit-next')};
 const setFilters=async values=>{for(const el of document.querySelectorAll('.pos-audit-filter'))fill(el,values[el.dataset.auditFilter]||'');await new Promise(r=>setTimeout(r,250));document.querySelector('#btn-audit-run').click();await wait(()=>!S.posAuditLoading&&S.posAuditData,'filtered query');await new Promise(r=>setTimeout(r,250));return S.posAuditData;};
 const historical=await setFilters({entity:'189',account_user:'P14 Admin Test',pos_employee:'Mohamed Farah'});const snapshot=historical.items.find(x=>x.id===629)||historical.items[0]||null;
 const refunds=await setFilters({action:'ORDER_REFUND',pos_employee:'Fartun',session:'31'});
 const refund=refunds.items.find(x=>x.id===868)||refunds.items[0]||null;const refundDom=document.body.innerText;
 const approvals=await setFilters({action:'MANAGER_APPROVAL',pos_employee:'Fartun',session:'31'});
 const approvalItems=approvals.items.filter(x=>[42,49].includes(Number(x.details?.approval_id)));document.querySelectorAll('.audit-details').forEach(x=>x.open=true);
 const approvalDom=document.body.innerText;
 const settings=await setFilters({action:'POS_SETTINGS_UPDATE',account_user:'P14 Audit Admin Test'});document.querySelectorAll('.audit-details').forEach(x=>x.open=true);const settingsDom=document.body.innerText;
 const today=new Date().toISOString().slice(0,10);const dateRows=await setFilters({date_from:today,date_to:today});const resultRows=await setFilters({result:'SUCCESS'});const posRows=await setFilters({pos:'Bakaara Main Register'});const entityRows=await setFilters({entity:'199'});
 const api=async q=>{const r=await fetch('/api/v1/pos/audit-logs?'+q,{credentials:'include'});return{status:r.status,data:await r.json()}};
 const foreign=await api('company_id=1&action=P14_FOREIGN_AUDIT_FIXTURE&per_page=50');
 const foreignSession=await api('company_id=1&session=999999&per_page=50');
 const clean=await api('per_page=10');const serialized=JSON.stringify(clean.data);const sensitiveKeys=[...serialized.matchAll(/"(password|pin|pin_hash|token|token_prefix|approval_token|session_cookie|authorization|api_key|secret)"\s*:/gi)].map(m=>m[1]);
 document.querySelector('#btn-audit-clear').click();await wait(()=>!S.posAuditData,'clear');
 await new Promise(r=>setTimeout(r,500));document.querySelector('#btn-topnav-user').click();await wait(()=>document.querySelector('#btn-bo-lock'),'lock control');await new Promise(r=>setTimeout(r,300));document.querySelector('#btn-bo-lock').click();await wait(()=>document.querySelector('[data-login-id="4"]'),'employee selector');await new Promise(r=>setTimeout(r,300));document.querySelector('[data-login-id="4"]').click();await new Promise(r=>setTimeout(r,200));for(const d of '5678'){[...document.querySelectorAll('[data-key]')].find(b=>b.dataset.key===d).click();await new Promise(r=>setTimeout(r,120));}await wait(()=>S.posActiveUser?.id===4,'MINIMAL PIN');
 S.posView='backoffice';S.posBackofficeTab='config-audit';render();await wait(()=>document.querySelector('#btn-audit-run'),'admin plus minimal audit');
 const dual={account:(S.activeCompanyAdmin||S.activeSuperAdmin)?.name,cashier:S.posActiveUser.name,auditScreen:document.querySelector('.page-title')?.textContent};
 return {noCashier,bounded,snapshot,refund:{item:refund,visible:refundDom.includes('ORDER_REFUND')&&refundDom.includes('Fartun')},approvals:{items:approvalItems,managerVisible:approvalDom.includes('Khadija'),cashierVisible:approvalDom.includes('Fartun')},configuration:{count:settings.total,readable:settingsDom.includes('Changed fields')&&settingsDom.includes('Extra Security')&&settingsDom.includes('Before:')&&settingsDom.includes('After:')},individualFilters:{date:dateRows.total,result:resultRows.total,pos:posRows.total,entity:entityRows.total},crossTenant:{foreignStatus:foreign.status,foreignCount:foreign.data?.data?.total,foreignSessionCount:foreignSession.data?.data?.total},sensitiveKeys,dual,clearPassed:!S.posAuditData};
})()
'@
  $msg=@{id=1;method='Runtime.evaluate';params=@{expression=$script;awaitPromise=$true;returnByValue=$true}}|ConvertTo-Json -Depth 8 -Compress
  $bytes=[Text.Encoding]::UTF8.GetBytes($msg);$ws.SendAsync([ArraySegment[byte]]::new($bytes),[Net.WebSockets.WebSocketMessageType]::Text,$true,[Threading.CancellationToken]::None).GetAwaiter().GetResult()|Out-Null
  while($true){$buf=New-Object byte[] 1048576;$recv=$ws.ReceiveAsync([ArraySegment[byte]]::new($buf),[Threading.CancellationToken]::None).GetAwaiter().GetResult();$response=([Text.Encoding]::UTF8.GetString($buf,0,$recv.Count)|ConvertFrom-Json);if($response.id -eq 1){if($response.result.exceptionDetails){throw($response.result.exceptionDetails|ConvertTo-Json -Depth 8)};$response.result.result.value|ConvertTo-Json -Depth 14;break}}
} finally {if($ws){$ws.Dispose()};if($proc -and !$proc.HasExited){Stop-Process -Id $proc.Id -Force}}
