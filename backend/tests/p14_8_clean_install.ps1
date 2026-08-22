param([string]$Database = 'curdun_p148_test')
$ErrorActionPreference = 'Stop'

if ($Database -ne 'curdun_p148_test') {
    throw 'Safety guard: this test may only rebuild curdun_p148_test.'
}

$mysql = 'C:\xampp\mysql\bin\mysql.exe'
$php = 'C:\xampp\php\php.exe'
$databaseDir = Resolve-Path (Join-Path $PSScriptRoot '..\database')

& $mysql -uroot -e "DROP DATABASE IF EXISTS ``$Database``; CREATE DATABASE ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($LASTEXITCODE -ne 0) { throw 'Unable to create isolated test database.' }

$schema = Get-Content (Join-Path $databaseDir 'curdun_erp.sql') -Raw
$schema = $schema.Replace('CREATE DATABASE IF NOT EXISTS curdun_erp;', "CREATE DATABASE IF NOT EXISTS $Database;").Replace('USE curdun_erp;', "USE $Database;")
$schema | & $mysql -uroot
if ($LASTEXITCODE -ne 0) { throw 'Base schema import failed.' }

$migrationOrder = @(
    '2026_08_09_add_pin_and_wholesale.sql',
    '2026_08_11_pos_platform_core.sql',
    '2026_08_12_odoo_pos_core.sql',
    '2026_08_12_password_delivery.sql',
    '2026_08_12_pos_profiles.sql',
    '2026_08_15_cash_tender.sql',
    '2026_08_15_credit_ledger.sql',
    '2026_08_15_manager_approvals.sql',
    '2026_08_22_cash_movement_subtype.sql',
    '2026_08_22_idempotency.sql',
    '2026_08_22_idempotency_pos_scope.sql',
    '2026_08_22_payment_method_metadata.sql',
    '2026_08_22_pos_config_payment_methods.sql',
    '2026_08_22_pricelists.sql',
    '2026_08_22_loyalty.sql',
    '2026_08_22_remove_stale_promotion_rule.sql'
)
$known = @(Get-ChildItem (Join-Path $databaseDir 'migrations\*.sql') | Select-Object -ExpandProperty Name)
$missingFromManifest = @($known | Where-Object { $_ -notin $migrationOrder })
if ($missingFromManifest.Count) { throw "Migration order manifest is incomplete: $($missingFromManifest -join ', ')" }
$migrationOrder | ForEach-Object {
    $migration = Get-Item (Join-Path $databaseDir "migrations\$_")
    Get-Content $migration.FullName -Raw | & $mysql -uroot $Database
    if ($LASTEXITCODE -ne 0) { throw "Migration failed: $($migration.Name)" }
}

$seedPath = ([string](Join-Path $databaseDir 'seed_pos.php')).Replace('\','/')
$seedCommand = "`$_ENV['DB_DATABASE']='$Database'; require '$seedPath';"
& $php -r "$seedCommand"
if ($LASTEXITCODE -ne 0) { throw 'First POS seed failed.' }
& $php -r "$seedCommand"
if ($LASTEXITCODE -ne 0) { throw 'Second POS seed failed.' }

$assertSql = @"
SELECT COUNT(*) AS threshold_rule_count,
       MIN(ppi.min_quantity) AS min_quantity,
       MIN(ppi.fixed_price) AS fixed_price
FROM pos_pricelist_items ppi
JOIN pos_pricelists pl ON pl.id=ppi.pricelist_id
JOIN products p ON p.id=ppi.product_id
JOIN companies c ON c.id=pl.company_id
WHERE c.name='Shifo Retail Group' AND pl.name='Promotion'
  AND p.name='Basmati Rice 5kg' AND ppi.active=1;
SELECT COUNT(*) AS stale_qty0_eight_rules
FROM pos_pricelist_items ppi
JOIN pos_pricelists pl ON pl.id=ppi.pricelist_id
JOIN products p ON p.id=ppi.product_id
JOIN companies c ON c.id=pl.company_id
WHERE c.name='Shifo Retail Group' AND pl.name='Promotion'
  AND p.name='Basmati Rice 5kg' AND ppi.min_quantity=0
  AND ppi.price_type='fixed' AND ppi.fixed_price=8;
"@
$result = $assertSql | & $mysql -uroot $Database --batch
if ($LASTEXITCODE -ne 0) { throw 'Fixture assertions failed to execute.' }
$result

$values = @($result | Where-Object { $_ -match '^\d' })
if ($values.Count -lt 2 -or $values[0] -notmatch '^1\s+10\.000\s+10\.50$' -or $values[1] -ne '0') {
    throw "Unexpected clean-install pricing fixture: $($values -join ' | ')"
}

Write-Output "P14.8 clean-install fixture PASS in $Database (database retained for browser inspection)."
