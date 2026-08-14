<?php

declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
require ROOT_PATH . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(ROOT_PATH)->safeLoad();
$config = require ROOT_PATH . '/config/database.php';
$pdo = new PDO(
    "mysql:host={$config['host']};dbname={$config['database']};charset={$config['charset']}",
    $config['username'],
    $config['password'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("SELECT id FROM companies WHERE email='retail@shifo.so' AND deleted_at IS NULL LIMIT 1");
    $stmt->execute();
    $companyId = (int)($stmt->fetchColumn() ?: 0);
    if (!$companyId) {
        $stmt = $pdo->prepare("INSERT INTO companies (name,email,phone,city,country,status) VALUES ('Shifo Retail Group','retail@shifo.so','+252-61-234-5678','Mogadishu','Somalia','active')");
        $stmt->execute();
        $companyId = (int)$pdo->lastInsertId();
    }

    $stmt = $pdo->prepare("SELECT id FROM branches WHERE company_id=? AND name='Bakaara Main' AND deleted_at IS NULL LIMIT 1");
    $stmt->execute([$companyId]);
    $branchId = (int)($stmt->fetchColumn() ?: 0);
    if (!$branchId) {
        $stmt = $pdo->prepare("INSERT INTO branches (company_id,name,address,status) VALUES (?,'Bakaara Main','Bakaara Market, Mogadishu','active')");
        $stmt->execute([$companyId]);
        $branchId = (int)$pdo->lastInsertId();
    }
    $stmt = $pdo->prepare("INSERT INTO company_modules (company_id,module_key,status,starts_at) VALUES (?,'pos','active',CURDATE()) ON DUPLICATE KEY UPDATE status='active'");
    $stmt->execute([$companyId]);

    $roleIds = [];
    foreach ($pdo->query("SELECT id,name FROM roles") as $role) $roleIds[$role['name']] = (int)$role['id'];
    $users = [
        ['Ahmed Yusuf','admin@shifo.so','Cor-7441GS-24','admin',null],
        ['Fartun Ali','fartun@shifo.so','Pos@1234Secure','senior_cashier','1234'],
        ['Mohamed Farah','mohamed@shifo.so','Pos@5678Secure','cashier','5678'],
        ['Ismail Omar','ismail@shifo.so','Pos@9012Secure','cashier','9012'],
        ['Khadija Abdi','khadija@shifo.so','Pos@3456Secure','store_manager','3456'],
        ['Hassan Yusuf','hassan@shifo.so','Pos@7890Secure','cashier','7890'],
        ['Nimco Ali','nimco@shifo.so','Pos@2468Secure','cashier','2468'],
    ];
    foreach ($users as [$name,$email,$password,$role,$pin]) {
        $stmt=$pdo->prepare("SELECT id FROM users WHERE email=? LIMIT 1");$stmt->execute([$email]);$userId=(int)($stmt->fetchColumn()?:0);
        if(!$userId){
            $stmt=$pdo->prepare("INSERT INTO users (company_id,branch_id,name,email,password,pin_hash,must_change_password,status) VALUES (?,?,?,?,?,?,?,'active')");
            $stmt->execute([$companyId,$branchId,$name,$email,password_hash($password,PASSWORD_DEFAULT),$pin?password_hash($pin,PASSWORD_DEFAULT):null,$role==='admin'?1:0]);
            $userId=(int)$pdo->lastInsertId();
        } else {
            $stmt=$pdo->prepare("UPDATE users SET company_id=?,branch_id=?,status='active' WHERE id=?");$stmt->execute([$companyId,$branchId,$userId]);
            if($pin){$stmt=$pdo->prepare("UPDATE users SET pin_hash=? WHERE id=?");$stmt->execute([password_hash($pin,PASSWORD_DEFAULT),$userId]);}
        }
        if(isset($roleIds[$role])){$stmt=$pdo->prepare("INSERT IGNORE INTO user_roles (user_id,role_id) VALUES (?,?)");$stmt->execute([$userId,$roleIds[$role]]);}
    }

    $stmt=$pdo->prepare("SELECT id FROM categories WHERE company_id=? AND name='General' AND deleted_at IS NULL LIMIT 1");$stmt->execute([$companyId]);$categoryId=(int)($stmt->fetchColumn()?:0);
    if(!$categoryId){$stmt=$pdo->prepare("INSERT INTO categories (company_id,name,status) VALUES (?,'General','active')");$stmt->execute([$companyId]);$categoryId=(int)$pdo->lastInsertId();}
    $products = [
        ['Basmati Rice 5kg',12.00,11.00,84],['Sunflower Oil 3L',8.50,7.75,62],['Sugar 1kg',1.80,1.55,150],
        ['Wheat Flour 2kg',3.20,2.80,95],['Powdered Milk 400g',6.50,5.90,45],['Coca-Cola 330ml',0.80,0.65,200],
        ['Bottled Water 1.5L',0.50,0.40,300],['Fresh Juice Mango 1L',2.40,2.00,38],['Laundry Detergent 1kg',4.20,3.70,55],
        ['Dish Soap 500ml',1.50,1.25,72],['Toothpaste 100ml',2.00,1.70,90],['Shampoo 250ml',3.80,3.30,48],
    ];
    foreach($products as $index=>$product){[$name,$retail,$wholesale,$stock]=$product;$sku='SHIFO-'.str_pad((string)($index+1),4,'0',STR_PAD_LEFT);
        $stmt=$pdo->prepare("INSERT INTO products (company_id,category_id,sku,barcode,name,selling_price,wholesale_price,minimum_stock,current_stock,status) VALUES (?,?,?,?,?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE company_id=VALUES(company_id),selling_price=VALUES(selling_price),wholesale_price=VALUES(wholesale_price),current_stock=IF(current_stock=0,VALUES(current_stock),current_stock),deleted_at=NULL,status='active'");
        $stmt->execute([$companyId,$categoryId,$sku,'6901234'.str_pad((string)($index+1),3,'0',STR_PAD_LEFT),$name,$retail,$wholesale,10,$stock]);
    }

    $customers=[['Abdi Mohamed','061-234-5678',500,120],['Halima Farah','061-345-6789',200,0],['Yusuf Hassan','061-456-7890',800,645.50],['Amina Osman','061-901-2345',700,0]];
    foreach($customers as $index=>$customer){[$name,$phone,$limit,$balance]=$customer;$code='SHIFO-C'.str_pad((string)($index+1),3,'0',STR_PAD_LEFT);
        $stmt=$pdo->prepare("INSERT INTO customers (company_id,customer_code,name,phone,credit_limit,balance,status) VALUES (?,?,?,?,?,?,'active') ON DUPLICATE KEY UPDATE company_id=VALUES(company_id),name=VALUES(name),phone=VALUES(phone),credit_limit=VALUES(credit_limit),deleted_at=NULL,status='active'");$stmt->execute([$companyId,$code,$name,$phone,$limit,$balance]);}

    $settings=['pos.store_name'=>'Shifo Retail Group','pos.tax_rate'=>'5','pos.receipt_header'=>'SHIFO RETAIL GROUP','pos.receipt_footer'=>'Thank you for shopping at Shifo!'];
    foreach($settings as $key=>$value){$type=$key==='pos.tax_rate'?'integer':'string';$stmt=$pdo->prepare("INSERT INTO settings (company_id,`key`,value,type) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE value=VALUES(value),type=VALUES(type)");$stmt->execute([$companyId,$key,$value,$type]);}
    $pdo->commit();
    echo "Retail POS seed ready for company {$companyId}.\n";
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $e;
}
