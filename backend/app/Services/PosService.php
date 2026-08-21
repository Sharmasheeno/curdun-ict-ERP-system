<?php

namespace App\Services;

use App\Repositories\AuditLogRepository;
use Core\Auth;
use Core\Database;
use Core\PosAccess;
use Exception;

class PosService
{
    public function __construct(
        private Database $db,
        private PlatformService $platform,
        private AuditLogRepository $audit,
        private AuthService $auth
    ) {}

    /**
     * Optional Curdun "Extra POS Security" (Rule #9). Odoo's default is that
     * Basic/Advanced employees perform refunds, cash out, closing variance,
     * discount overrides, and void-paid without a manager approval overlay.
     * A tenant that wants stricter behaviour enables toggles in
     * pos_settings.extra_security; only then do we require an
     * X-Manager-Approval token (issued by /auth/manager-approval and
     * consumed once here).
     *
     *   $action  — must match the action name the approval was issued for.
     *   $context — ['target_id'=>..., 'amount'=>...] optional constraints.
     *   $settingKey — the extra_security key (e.g. 'refund') OR a threshold
     *                 pair ['discount_above_pct'=>10.0] meaning: require
     *                 approval if $context['discount_pct'] > threshold.
     */
    private function enforceExtraSecurity(int $companyId, string $action, array $context, string|array $settingKey): void
    {
        $settings = $this->settingsData($companyId);
        $extra = (array)($settings['extra_security'] ?? []);

        // Boolean gate (always-on) or threshold gate (on when a numeric
        // constraint is exceeded).
        $required = false;
        if (is_string($settingKey)) {
            $required = !empty($extra[$settingKey]);
        } else {
            foreach ($settingKey as $key => $threshold) {
                if (!array_key_exists($key, $extra)) continue;
                $configured = $extra[$key];
                if ($configured === null || $configured === '' || $configured === false) continue;
                $actual = (float)($context['_threshold_value'] ?? 0);
                if ($actual > (float)$configured) { $required = true; break; }
            }
        }
        if (!$required) return;

        $headerToken = $_SERVER['HTTP_X_MANAGER_APPROVAL'] ?? null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $constraints = ['action' => $action];
        if (isset($context['target_id'])) $constraints['target_id'] = (int)$context['target_id'];
        if (isset($context['amount']))    $constraints['amount']    = (float)$context['amount'];
        // consumeApproval throws with a clear 403 on any mismatch/expiry/reuse.
        $this->auth->consumeApproval($headerToken, $constraints, $ip);
    }

    /**
     * Resolve the acting party and enforce the required Odoo access level.
     *
     * The optional $requireCapability lets a service method assert a specific
     * capability (e.g. 'pos.product_admin') without going through the router
     * — used by helpers that are called from more than one route.
     */
    private function context(bool $manager = false, ?string $requireCapability = null): array
    {
        // Dual-identity: prefer the currently-active POS cashier when
        // authorizing/attributing POS actions. Fall back to the account
        // holder for terminals where no cashier has PINned in yet.
        $account = Auth::user();
        $cashier = Auth::posCashier() ?: $account;
        if (!$cashier) throw new Exception('Unauthenticated.', 401);

        // Odoo-style access gate. PosAccess reads effectiveRoles(), so a
        // cashier PINned in wins over the underlying account.
        if (PosAccess::level() === null) throw new Exception('Retail POS access is not assigned.', 403);
        // "manager" flag = POS Advanced level. Routes that truly require an
        // ERP permission (Staff, Settings, Products admin) are also gated by
        // AccountPermissionMiddleware — see routes/api.php.
        if ($manager && PosAccess::level() !== PosAccess::ADVANCED) {
            throw new Exception('This action requires Advanced POS rights.', 403);
        }
        if ($requireCapability !== null && !PosAccess::can($requireCapability)) {
            throw new Exception('This action requires a higher POS access level.', 403);
        }

        // Company always comes from the underlying account, never the
        // cashier — cashiers cannot be moved across companies mid-session.
        $companyId = (int)($account['company_id'] ?? $cashier['company_id'] ?? 0);
        if ($companyId <= 0) throw new Exception('No company is assigned to this account.', 403);
        $module = $this->db->query(
            "SELECT status FROM company_modules WHERE company_id=:company AND module_key='pos' LIMIT 1",
            ['company'=>$companyId]
        )->fetch();
        if (!$module || $module['status'] !== 'active') throw new Exception('Retail POS subscription is not active.', 403);

        // Return the CASHIER as the "user" so every downstream write
        // (orders.user_id, stock_movements.user_id, pos_payments.user_id,
        // audit_logs.user_id) is stamped with the person who actually rang
        // the sale — not the browser account holder.
        return [$cashier, $companyId];
    }

    public function bootstrap(): array
    {
        [$user,$companyId] = $this->context();
        // Odoo separates POS access from ERP account permission. Full staff
        // roster / sessions listing is offered only when the underlying ERP
        // account can manage users — POS-Advanced alone is not enough.
        $canManageStaff = Auth::hasPermission('users.view') || Auth::accountHasRole('superadmin');
        $config = $this->resolveConfig($companyId, isset($user['branch_id']) ? (int)$user['branch_id'] : null);
        $currentSession = $this->currentSessionForConfig($companyId,(int)$config['id']);
        return [
            'user'=>$user,
            'dashboard'=>$this->dashboardData($companyId),
            'products'=>$this->productsData($companyId),
            'customers'=>$this->customersData($companyId),
            'transactions'=>$this->transactionsData($companyId),
            'staff'=>$canManageStaff ? $this->platform->users(['company_id'=>$companyId]) : [$user],
            'branches'=>$this->platform->branches($companyId),
            'settings'=>$this->settingsData($companyId),
            'stock_alerts'=>$canManageStaff ? $this->stockAlertsData($companyId,(int)$user['id']) : [],
            'pos_config'=>$config,
            'current_session'=>$currentSession,
            'current_session_summary'=>$currentSession ? $this->sessionSummary((int)$currentSession['id']) : null,
            'sessions'=>$canManageStaff ? $this->sessionsData($companyId) : [],
            'pos_payments'=>$canManageStaff ? $this->paymentsData($companyId) : [],
        ];
    }

    public function dashboard(): array { [, $companyId]=$this->context(); return $this->dashboardData($companyId); }
    public function products(): array { [, $companyId]=$this->context(); return $this->productsData($companyId); }
    public function customers(): array { [, $companyId]=$this->context(); return $this->customersData($companyId); }
    public function transactions(): array { [, $companyId]=$this->context(); return $this->transactionsData($companyId); }
    // Odoo 19: MINIMAL cashiers get orders overview and POS reports. Sessions
    // and payment-lines listings are read-only support views for those; kept
    // at the plain-context level. Back-office admin gates (staff / settings /
    // catalog admin) are the ones that stay ERP-permission-gated.
    public function sessions(): array { [, $companyId]=$this->context();return $this->sessionsData($companyId); }
    public function payments(): array { [, $companyId]=$this->context();return $this->paymentsData($companyId); }
    public function staff(): array { [, $companyId]=$this->context(); return $this->platform->users(['company_id'=>$companyId]); }
    public function createStaff(array $data): array
    {
        // ERP-account gated (users.create) — see AccountPermissionMiddleware.
        // No duplicate POS Advanced check here so a BASIC cashier PINned in
        // over an authorised admin account can still act.
        $this->context();
        if (!preg_match('/^\d{4}$/', (string)($data['pin'] ?? ''))) {
            throw new Exception('A unique 4-digit POS PIN is required.', 422);
        }
        return $this->platform->createUser($data);
    }
    public function updateStaff(int $id,array $data): array
    {
        $this->context();
        if (array_key_exists('pin',$data) && $data['pin'] !== '' && !preg_match('/^\d{4}$/',(string)$data['pin'])) {
            throw new Exception('POS PIN must contain exactly 4 digits.',422);
        }
        return $this->platform->updateUser($id,$data);
    }

    public function reports(array $filters = []): array
    {
        // Odoo 19: Minimal-Rights employees can generate/download/print POS
        // reports. We do NOT hold reports back to Advanced. Route-level gate
        // stays open too (no capability required); MINIMAL cashiers can view.
        [, $companyId]=$this->context();[$from,$to]=$this->reportRange($filters);
        $range=['company'=>$companyId,'from'=>$from,'to'=>$to];
        $summary=$this->db->query(
            "SELECT COALESCE(SUM(CASE WHEN status='COMPLETED' AND total_amount>0 THEN total_amount ELSE 0 END),0) gross_sales,
                    COALESCE(SUM(CASE WHEN status='COMPLETED' THEN total_amount ELSE 0 END),0) net_sales,
                    ABS(COALESCE(SUM(CASE WHEN status='COMPLETED' AND total_amount<0 THEN total_amount ELSE 0 END),0)) refund_amount,
                    COALESCE(SUM(CASE WHEN status='COMPLETED' THEN tax_amount ELSE 0 END),0) tax_collected,
                    SUM(status='COMPLETED' AND total_amount>0) completed_orders,SUM(status='COMPLETED' AND total_amount<0) refund_orders,SUM(status='CANCELLED') voided_orders,
                    COALESCE(AVG(CASE WHEN status='COMPLETED' AND total_amount>0 THEN total_amount END),0) average_ticket
             FROM orders WHERE company_id=:company AND order_date BETWEEN :from AND :to",$range)->fetch();
        $summary['outstanding_debt']=(float)($this->db->query("SELECT COALESCE(SUM(balance),0) FROM customers WHERE company_id=:company AND deleted_at IS NULL",['company'=>$companyId])->fetchColumn()?:0);
        $summary['inventory_retail_value']=(float)($this->db->query("SELECT COALESCE(SUM(current_stock*selling_price),0) FROM products WHERE company_id=:company AND deleted_at IS NULL",['company'=>$companyId])->fetchColumn()?:0);
        $summary['low_stock_products']=(int)$this->db->query("SELECT COUNT(*) FROM products WHERE company_id=:company AND deleted_at IS NULL AND current_stock<=minimum_stock",['company'=>$companyId])->fetchColumn();
        $summary['out_of_stock_products']=(int)$this->db->query("SELECT COUNT(*) FROM products WHERE company_id=:company AND deleted_at IS NULL AND current_stock<=0",['company'=>$companyId])->fetchColumn();
        return [
            'range'=>['from'=>$from,'to'=>$to],
            'summary'=>$summary,
            'daily_sales'=>$this->db->query("SELECT order_date date,COUNT(*) orders,ROUND(SUM(subtotal),2) subtotal,ROUND(SUM(tax_amount),2) tax,ROUND(SUM(total_amount),2) total FROM orders WHERE company_id=:company AND status='COMPLETED' AND order_date BETWEEN :from AND :to GROUP BY order_date ORDER BY order_date",$range)->fetchAll(),
            'payments'=>$this->db->query("SELECT payment_method,SUM(transactions) transactions,ROUND(SUM(amount),2) amount FROM (
                    SELECT pp.method_name payment_method,COUNT(DISTINCT pp.order_id) transactions,SUM(pp.amount) amount FROM pos_payments pp JOIN orders o ON o.id=pp.order_id WHERE pp.company_id=:company AND pp.status='COMPLETED' AND pp.is_change=0 AND o.order_date BETWEEN :from AND :to GROUP BY pp.method_name
                    UNION ALL
                    SELECT COALESCE(pm.name,'Deyn'),COUNT(DISTINCT o.id),SUM(o.total_amount) FROM orders o LEFT JOIN invoices i ON i.id=o.invoice_id LEFT JOIN payments pay ON pay.invoice_id=i.id AND pay.status='COMPLETED' LEFT JOIN payment_methods pm ON pm.id=pay.payment_method_id WHERE o.company_id=:legacy_company AND o.status='COMPLETED' AND o.order_date BETWEEN :legacy_from AND :legacy_to AND NOT EXISTS (SELECT 1 FROM pos_payments pp2 WHERE pp2.order_id=o.id) GROUP BY COALESCE(pm.name,'Deyn')
                ) methods GROUP BY payment_method ORDER BY amount DESC",['company'=>$companyId,'from'=>$from,'to'=>$to,'legacy_company'=>$companyId,'legacy_from'=>$from,'legacy_to'=>$to])->fetchAll(),
            'top_products'=>$this->db->query("SELECT p.id,p.sku,p.name,COALESCE(c.name,'General') category,ROUND(SUM(oi.quantity),3) quantity_sold,ROUND(SUM(oi.total),2) sales FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id LEFT JOIN categories c ON c.id=p.category_id WHERE o.company_id=:company AND o.status='COMPLETED' AND o.order_date BETWEEN :from AND :to GROUP BY p.id,p.sku,p.name,c.name ORDER BY quantity_sold DESC LIMIT 100",$range)->fetchAll(),
            'orders'=>$this->db->query("SELECT o.reference_number,o.order_date,o.created_at,o.status,o.pos_state,o.refunded_order_id,u.name cashier,COALESCE(c.name,'Walk-in') customer,COUNT(DISTINCT oi.id) items,o.subtotal,o.tax_amount,o.total_amount,COALESCE(GROUP_CONCAT(DISTINCT pp.method_name ORDER BY pp.id SEPARATOR ' + '),MAX(pm.name),'Deyn') payment_method FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN invoices i ON i.id=o.invoice_id LEFT JOIN payments pay ON pay.invoice_id=i.id AND pay.status IN ('COMPLETED','REFUNDED') LEFT JOIN payment_methods pm ON pm.id=pay.payment_method_id LEFT JOIN pos_payments pp ON pp.order_id=o.id AND pp.status='COMPLETED' WHERE o.company_id=:company AND o.order_date BETWEEN :from AND :to GROUP BY o.id,o.reference_number,o.order_date,o.created_at,o.status,o.pos_state,o.refunded_order_id,u.name,c.name,o.subtotal,o.tax_amount,o.total_amount ORDER BY o.created_at DESC LIMIT 1000",$range)->fetchAll(),
            'inventory'=>$this->db->query("SELECT p.sku,p.barcode,p.name,COALESCE(c.name,'General') category,p.current_stock,p.minimum_stock,p.purchase_price,p.selling_price,p.wholesale_price,ROUND(p.current_stock*p.selling_price,2) retail_value,CASE WHEN p.current_stock<=0 THEN 'Out of stock' WHEN p.current_stock<=p.minimum_stock THEN 'Low stock' ELSE 'In stock' END stock_status FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.company_id=:company AND p.deleted_at IS NULL ORDER BY p.name",['company'=>$companyId])->fetchAll(),
            'customers'=>$this->db->query("SELECT customer_code,name,phone,email,credit_limit,balance,status,created_at FROM customers WHERE company_id=:company AND deleted_at IS NULL ORDER BY balance DESC,name",['company'=>$companyId])->fetchAll(),
            'staff'=>$this->db->query("SELECT u.name,u.email,u.status,COALESCE(b.name,'Unassigned') branch,
                    GROUP_CONCAT(DISTINCT r.display_name) roles,COALESCE(MAX(performance.completed_orders),0) completed_orders,
                    COALESCE(MAX(performance.sales),0) sales
                FROM users u
                LEFT JOIN branches b ON b.id=u.branch_id
                LEFT JOIN user_roles ur ON ur.user_id=u.id
                LEFT JOIN roles r ON r.id=ur.role_id
                LEFT JOIN (
                    SELECT user_id,COUNT(*) completed_orders,ROUND(SUM(total_amount),2) sales
                    FROM orders WHERE company_id=:orders_company AND status='COMPLETED' AND order_date BETWEEN :from AND :to
                    GROUP BY user_id
                ) performance ON performance.user_id=u.id
                WHERE u.company_id=:user_company AND u.deleted_at IS NULL
                GROUP BY u.id,u.name,u.email,u.status,b.name ORDER BY sales DESC",
                ['orders_company'=>$companyId,'user_company'=>$companyId,'from'=>$from,'to'=>$to])->fetchAll(),
            'shifts'=>$this->db->query("SELECT s.id,s.closed_at,c.name cashier,closer.name closed_by,COALESCE(b.name,'Unassigned') branch,s.system_cash,s.counted_cash,s.variance,s.notes FROM pos_shift_closures s JOIN users c ON c.id=s.cashier_id JOIN users closer ON closer.id=s.closed_by LEFT JOIN branches b ON b.id=s.branch_id WHERE s.company_id=:company AND DATE(s.closed_at) BETWEEN :from AND :to ORDER BY s.closed_at DESC",$range)->fetchAll(),
        ];
    }

    private function reportRange(array $filters): array
    {
        $to=(string)($filters['to']??date('Y-m-d'));$from=(string)($filters['from']??date('Y-m-d',strtotime('-29 days')));
        foreach([$from,$to] as $date){$parsed=\DateTimeImmutable::createFromFormat('Y-m-d',$date);if(!$parsed||$parsed->format('Y-m-d')!==$date)throw new Exception('Report dates must use YYYY-MM-DD.',422);}
        if($from>$to)throw new Exception('Report start date cannot be after the end date.',422);
        if((strtotime($to)-strtotime($from))/86400>366)throw new Exception('Report range cannot exceed 366 days.',422);
        return [$from,$to];
    }

    public function stockAlerts(): array
    {
        [$user,$companyId]=$this->context(true);return $this->stockAlertsData($companyId,(int)$user['id']);
    }

    public function markStockAlertRead(int $id): void
    {
        [$user,$companyId]=$this->context(true);$alert=$this->db->query("SELECT id FROM pos_stock_alerts WHERE id=:id AND company_id=:company AND status='open'",['id'=>$id,'company'=>$companyId])->fetch();
        if(!$alert)throw new Exception('Stock alert not found.',404);
        $this->db->query("INSERT IGNORE INTO pos_stock_alert_reads (alert_id,user_id) VALUES (:alert,:user)",['alert'=>$id,'user'=>$user['id']]);
    }

    public function markAllStockAlertsRead(): void
    {
        [$user,$companyId]=$this->context(true);$this->syncStockAlerts($companyId);
        $this->db->query("INSERT IGNORE INTO pos_stock_alert_reads (alert_id,user_id) SELECT id,:user FROM pos_stock_alerts WHERE company_id=:company AND status='open'",['user'=>$user['id'],'company'=>$companyId]);
    }

    private function stockAlertsData(int $companyId,int $userId): array
    {
        $this->syncStockAlerts($companyId);
        return $this->db->query("SELECT a.id,a.product_id,a.severity,a.current_stock,a.minimum_stock,a.detected_at,a.last_seen_at,p.name product_name,p.sku,p.barcode,(r.user_id IS NULL) unread FROM pos_stock_alerts a JOIN products p ON p.id=a.product_id LEFT JOIN pos_stock_alert_reads r ON r.alert_id=a.id AND r.user_id=:user WHERE a.company_id=:company AND a.status='open' ORDER BY (a.severity='out') DESC,a.detected_at DESC",['user'=>$userId,'company'=>$companyId])->fetchAll();
    }

    private function syncStockAlerts(int $companyId): void
    {
        $this->db->query("UPDATE pos_stock_alerts a LEFT JOIN products p ON p.id=a.product_id SET a.status='resolved',a.resolved_at=NOW(),a.last_seen_at=NOW() WHERE a.company_id=:company AND a.status='open' AND (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.current_stock>p.minimum_stock)",['company'=>$companyId]);
        $products=$this->db->query("SELECT id,current_stock,minimum_stock FROM products WHERE company_id=:company AND deleted_at IS NULL AND current_stock<=minimum_stock",['company'=>$companyId])->fetchAll();
        foreach($products as $product){$severity=(float)$product['current_stock']<=0?'out':'low';$existing=$this->db->query("SELECT id,severity,status FROM pos_stock_alerts WHERE company_id=:company AND product_id=:product",['company'=>$companyId,'product'=>$product['id']])->fetch();$changed=!$existing||$existing['status']!=='open'||$existing['severity']!==$severity;
            $this->db->query("INSERT INTO pos_stock_alerts (company_id,product_id,severity,current_stock,minimum_stock,status) VALUES (:company,:product,:severity,:stock,:minimum,'open') ON DUPLICATE KEY UPDATE detected_at=IF(status='resolved',NOW(),detected_at),severity=VALUES(severity),current_stock=VALUES(current_stock),minimum_stock=VALUES(minimum_stock),status='open',last_seen_at=NOW(),resolved_at=NULL",['company'=>$companyId,'product'=>$product['id'],'severity'=>$severity,'stock'=>$product['current_stock'],'minimum'=>$product['minimum_stock']]);
            if($changed){$alertId=$existing['id']??$this->db->lastInsertId();$this->db->query("DELETE FROM pos_stock_alert_reads WHERE alert_id=:alert",['alert'=>$alertId]);}
        }
    }

    private function dashboardData(int $companyId): array
    {
        $params=['company'=>$companyId];
        return [
            'today_revenue'=>(float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id=:company AND status='COMPLETED' AND order_date=CURDATE()",$params)->fetchColumn() ?: 0),
            'gross_sales'=>(float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id=:company AND status='COMPLETED' AND total_amount>0 AND order_date=CURDATE()",$params)->fetchColumn() ?: 0),
            'refunds'=>(float)abs((float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id=:company AND status='COMPLETED' AND total_amount<0 AND order_date=CURDATE()",$params)->fetchColumn() ?: 0)),
            'today_orders'=>(int)$this->db->query("SELECT COUNT(*) FROM orders WHERE company_id=:company AND status='COMPLETED' AND total_amount>0 AND order_date=CURDATE()",$params)->fetchColumn(),
            'customers'=>(int)$this->db->query("SELECT COUNT(*) FROM customers WHERE company_id=:company AND deleted_at IS NULL",$params)->fetchColumn(),
            'products'=>(int)$this->db->query("SELECT COUNT(*) FROM products WHERE company_id=:company AND deleted_at IS NULL",$params)->fetchColumn(),
            'low_stock'=>(int)$this->db->query("SELECT COUNT(*) FROM products WHERE company_id=:company AND deleted_at IS NULL AND current_stock<=minimum_stock",$params)->fetchColumn(),
            'active_staff'=>(int)$this->db->query("SELECT COUNT(*) FROM users WHERE company_id=:company AND deleted_at IS NULL AND status='active'",$params)->fetchColumn(),
            'outstanding_debt'=>(float)($this->db->query("SELECT COALESCE(SUM(balance),0) FROM customers WHERE company_id=:company AND deleted_at IS NULL",$params)->fetchColumn() ?: 0),
            'hourly_sales'=>$this->db->query("SELECT HOUR(created_at) hour,ROUND(SUM(total_amount),2) total,COUNT(*) orders FROM orders WHERE company_id=:company AND status='COMPLETED' AND order_date=CURDATE() GROUP BY HOUR(created_at) ORDER BY hour",$params)->fetchAll(),
            'payment_methods'=>$this->db->query("SELECT method_name name,ROUND(SUM(amount),2) amount,COUNT(DISTINCT order_id) transactions FROM pos_payments WHERE company_id=:company AND status='COMPLETED' AND is_change=0 AND DATE(created_at)=CURDATE() GROUP BY method_name ORDER BY amount DESC",$params)->fetchAll(),
            'top_products'=>$this->db->query("SELECT p.name,ROUND(SUM(oi.quantity),3) quantity,ROUND(SUM(oi.total),2) sales FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id WHERE o.company_id=:company AND o.status='COMPLETED' AND o.order_date=CURDATE() GROUP BY p.id,p.name ORDER BY quantity DESC LIMIT 4",$params)->fetchAll(),
            'open_sessions'=>(int)$this->db->query("SELECT COUNT(*) FROM pos_sessions WHERE company_id=:company AND state IN ('OPENING_CONTROL','OPENED','CLOSING_CONTROL')",$params)->fetchColumn(),
        ];
    }

    private function sessionsData(int $companyId): array
    {
        return $this->db->query("SELECT s.id,s.uuid,s.state,s.opening_cash,s.expected_cash,s.counted_cash,s.difference_amount,s.opening_note,s.closing_note,s.opened_at,s.closed_at,
                pc.name config_name,COALESCE(b.name,'Main') branch_name,opener.name opened_by_name,closer.name closed_by_name,
                COUNT(DISTINCT o.id) orders,ROUND(COALESCE(SUM(o.total_amount),0),2) net_sales,
                ROUND(s.opening_cash+COALESCE((SELECT SUM(pp.amount) FROM pos_payments pp WHERE pp.session_id=s.id AND pp.status='COMPLETED' AND pp.method_type='cash' AND pp.is_change=0),0)
                    +COALESCE((SELECT SUM(cm.amount) FROM pos_cash_movements cm WHERE cm.session_id=s.id AND cm.movement_type='IN'),0)
                    -COALESCE((SELECT SUM(cm.amount) FROM pos_cash_movements cm WHERE cm.session_id=s.id AND cm.movement_type='OUT'),0),2) calculated_cash
             FROM pos_sessions s JOIN pos_configs pc ON pc.id=s.config_id LEFT JOIN branches b ON b.id=s.branch_id
             JOIN users opener ON opener.id=s.opened_by LEFT JOIN users closer ON closer.id=s.closed_by LEFT JOIN orders o ON o.pos_session_id=s.id AND o.pos_state='done'
             WHERE s.company_id=:company GROUP BY s.id ORDER BY s.id DESC LIMIT 200",['company'=>$companyId])->fetchAll();
    }

    private function paymentsData(int $companyId): array
    {
        // tendered_amount + change_amount exposed so the payments ledger,
        // split-payment receipt, and reconciliation views can render the
        // cash-tender detail. Non-cash lines carry null for both — those
        // methods have no tender concept (Rule #34).
        return $this->db->query("SELECT pp.id,pp.session_id,pp.order_id,o.reference_number order_reference,pp.method_name,pp.method_type,pp.amount,pp.tendered_amount,pp.change_amount,pp.is_change,pp.reference_number,pp.status,pp.created_at,u.name cashier_name
             FROM pos_payments pp JOIN orders o ON o.id=pp.order_id JOIN users u ON u.id=pp.user_id
             WHERE pp.company_id=:company ORDER BY pp.id DESC LIMIT 500",['company'=>$companyId])->fetchAll();
    }

    private function productsData(int $companyId): array
    {
        return $this->db->query(
            "SELECT p.id,p.company_id,p.category_id,p.sku,p.barcode,p.name,p.description,p.purchase_price,
                    p.selling_price,p.wholesale_price,p.minimum_stock,p.current_stock,p.status,p.created_at,
                    COALESCE(c.name,'General') category_name
             FROM products p LEFT JOIN categories c ON c.id=p.category_id
             WHERE p.company_id=:company AND p.deleted_at IS NULL ORDER BY p.name",
            ['company'=>$companyId]
        )->fetchAll();
    }

    public function createProduct(array $data): array
    {
        [$user,$companyId]=$this->context(true);
        $name=trim((string)($data['name']??''));
        $price=(float)($data['selling_price']??$data['price']??0);
        $minimum=(float)($data['minimum_stock']??0);
        $stock=(float)($data['current_stock']??$data['stock_quantity']??$data['stock']??0);
        if ($name==='' || $price<=0) throw new Exception('Product name and a positive selling price are required.',422);
        if ($minimum<0 || $stock<0) throw new Exception('Stock and the low-stock alert level cannot be negative.',422);
        $categoryId=$this->categoryId($companyId,(string)($data['category_name']??'General'));
        $sku=trim((string)($data['sku']??$data['barcode']??'')) ?: 'PRD-'.strtoupper(substr(bin2hex(random_bytes(5)),0,8));
        $this->db->query(
            "INSERT INTO products (company_id,category_id,sku,barcode,name,description,purchase_price,selling_price,wholesale_price,minimum_stock,current_stock,status)
             VALUES (:company,:category,:sku,:barcode,:name,:description,:purchase,:selling,:wholesale,:minimum,:stock,:status)",
            ['company'=>$companyId,'category'=>$categoryId,'sku'=>$sku,'barcode'=>$data['barcode']??null,'name'=>$name,
             'description'=>$data['description']??null,'purchase'=>(float)($data['purchase_price']??0),'selling'=>$price,
             'wholesale'=>isset($data['wholesale_price'])?(float)$data['wholesale_price']:null,'minimum'=>$minimum,
             'stock'=>$stock,'status'=>$data['status']??'active']
        );
        $id=(int)$this->db->lastInsertId();
        $this->log($user,$companyId,'PRODUCT_CREATE',$id,['name'=>$name]);
        $this->syncStockAlerts($companyId);
        return $this->product($id,$companyId);
    }

    public function updateProduct(int $id,array $data): array
    {
        [$user,$companyId]=$this->context(true);
        $current=$this->product($id,$companyId);
        $map=['name'=>'name','description'=>'description','sku'=>'sku','barcode'=>'barcode','purchase_price'=>'purchase_price','selling_price'=>'selling_price','wholesale_price'=>'wholesale_price','minimum_stock'=>'minimum_stock','current_stock'=>'current_stock','status'=>'status'];
        if (isset($data['price'])) $data['selling_price']=$data['price'];
        if (isset($data['stock'])) $data['current_stock']=$data['stock'];
        if (isset($data['current_stock']) && (float)$data['current_stock']<0) throw new Exception('Stock cannot be negative.',422);
        if (isset($data['minimum_stock']) && (float)$data['minimum_stock']<0) throw new Exception('The low-stock alert level cannot be negative.',422);
        if (isset($data['category_name'])) $data['category_id']=$this->categoryId($companyId,(string)$data['category_name']);
        $map['category_id']='category_id';
        $sets=[];$params=['id'=>$id,'company'=>$companyId];
        foreach($map as $input=>$column){if(array_key_exists($input,$data)){$sets[]="$column=:$input";$params[$input]=$data[$input];}}
        if($sets)$this->db->query("UPDATE products SET ".implode(',',$sets)." WHERE id=:id AND company_id=:company",$params);
        $this->log($user,$companyId,'PRODUCT_UPDATE',$id,['before'=>$current,'changes'=>$data]);
        $this->syncStockAlerts($companyId);
        return $this->product($id,$companyId);
    }

    public function deleteProduct(int $id): void
    {
        [$user,$companyId]=$this->context(true);
        $this->product($id,$companyId);
        $this->db->query("UPDATE products SET deleted_at=NOW(),status='inactive' WHERE id=:id AND company_id=:company",['id'=>$id,'company'=>$companyId]);
        $this->log($user,$companyId,'PRODUCT_DELETE',$id,[]);
        $this->syncStockAlerts($companyId);
    }

    private function product(int $id,int $companyId): array
    {
        $row=$this->db->query("SELECT p.*,COALESCE(c.name,'General') category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.id=:id AND p.company_id=:company AND p.deleted_at IS NULL",['id'=>$id,'company'=>$companyId])->fetch();
        if(!$row)throw new Exception('Product not found.',404);
        return $row;
    }

    private function categoryId(int $companyId,string $name): int
    {
        $name=trim($name)?:'General';
        $row=$this->db->query("SELECT id FROM categories WHERE company_id=:company AND name=:name AND deleted_at IS NULL LIMIT 1",['company'=>$companyId,'name'=>$name])->fetch();
        if($row)return (int)$row['id'];
        $this->db->query("INSERT INTO categories (company_id,name,status) VALUES (:company,:name,'active')",['company'=>$companyId,'name'=>$name]);
        return (int)$this->db->lastInsertId();
    }

    private function customersData(int $companyId): array
    {
        return $this->db->query(
            "SELECT c.id,c.company_id,c.customer_code,c.name,c.phone,c.email,c.address,c.credit_limit,c.balance,c.status,c.notes,c.created_at,
                    COUNT(DISTINCT o.id) total_orders,MAX(o.order_date) last_visit
             FROM customers c LEFT JOIN orders o ON o.customer_id=c.id AND o.status='COMPLETED'
             WHERE c.company_id=:company AND c.deleted_at IS NULL GROUP BY c.id ORDER BY c.name",
            ['company'=>$companyId]
        )->fetchAll();
    }

    public function createCustomer(array $data): array
    {
        [$user,$companyId]=$this->context();
        $name=trim((string)($data['name']??''));
        if($name==='')throw new Exception('Customer name is required.',422);
        $code='CUS-'.strtoupper(substr(bin2hex(random_bytes(4)),0,7));
        $this->db->query("INSERT INTO customers (company_id,customer_code,name,phone,email,address,credit_limit,balance,status,notes) VALUES (:company,:code,:name,:phone,:email,:address,:credit,0,'active',:notes)",
            ['company'=>$companyId,'code'=>$code,'name'=>$name,'phone'=>$data['phone']??null,'email'=>$data['email']??null,'address'=>$data['address']??null,'credit'=>(float)($data['credit_limit']??0),'notes'=>$data['notes']??null]);
        $id=(int)$this->db->lastInsertId();$this->log($user,$companyId,'CUSTOMER_CREATE',$id,['name'=>$name]);
        return $this->customer($id,$companyId);
    }

    public function updateCustomer(int $id,array $data): array
    {
        [$user,$companyId]=$this->context();$this->customer($id,$companyId);
        $allowed=['name','phone','email','address','credit_limit','status','notes'];$sets=[];$params=['id'=>$id,'company'=>$companyId];
        foreach($allowed as $field){if(array_key_exists($field,$data)){$sets[]="$field=:$field";$params[$field]=$data[$field];}}
        if($sets)$this->db->query("UPDATE customers SET ".implode(',',$sets)." WHERE id=:id AND company_id=:company",$params);
        $this->log($user,$companyId,'CUSTOMER_UPDATE',$id,$data);return $this->customer($id,$companyId);
    }

    public function deleteCustomer(int $id): void
    {
        // ERP-account gated (customers.delete) — see AccountPermissionMiddleware.
        [$user,$companyId]=$this->context();
        $customer = $this->customer($id,$companyId);
        // P7 Rule (customer protection) — a customer with outstanding Customer
        // Account debt must not be destructively deleted; that would silently
        // erase money the company is owed and break the ledger invariant.
        if ((float)$customer['balance'] > 0.001) {
            throw new Exception('Cannot delete a customer with outstanding Customer Account debt of $'
                . number_format((float)$customer['balance'], 2)
                . '. Settle the balance or archive the customer instead.', 409);
        }
        // Soft-delete (archive) so historical orders and ledger entries keep
        // pointing at this customer for financial traceability.
        $this->db->query("UPDATE customers SET deleted_at=NOW(),status='inactive' WHERE id=:id AND company_id=:company",['id'=>$id,'company'=>$companyId]);
        $this->log($user,$companyId,'CUSTOMER_DELETE',$id,[]);
    }

    private function customer(int $id,int $companyId): array
    {
        $row=$this->db->query("SELECT * FROM customers WHERE id=:id AND company_id=:company AND deleted_at IS NULL",['id'=>$id,'company'=>$companyId])->fetch();
        if(!$row)throw new Exception('Customer not found.',404);return $row;
    }

    private function resolveConfig(int $companyId, ?int $branchId = null): array
    {
        if (!$branchId) {
            $branchId=(int)($this->settingValue($companyId,'pos.default_branch_id',0) ?: 0);
        }
        if (!$branchId) {
            $branchId=(int)($this->db->query("SELECT id FROM branches WHERE company_id=:company AND status='active' AND deleted_at IS NULL ORDER BY id LIMIT 1",['company'=>$companyId])->fetchColumn() ?: 0);
        }
        $config=$this->db->query(
            "SELECT pc.*,b.name branch_name FROM pos_configs pc LEFT JOIN branches b ON b.id=pc.branch_id
             WHERE pc.company_id=:company AND pc.active=1 AND ((:branch>0 AND pc.branch_id=:branch_match) OR (:branch_zero=0 AND pc.branch_id IS NULL)) ORDER BY pc.id LIMIT 1",
            ['company'=>$companyId,'branch'=>$branchId,'branch_match'=>$branchId,'branch_zero'=>$branchId]
        )->fetch();
        if (!$config) {
            $branchName=$branchId ? (string)($this->db->query("SELECT name FROM branches WHERE id=:id AND company_id=:company",['id'=>$branchId,'company'=>$companyId])->fetchColumn() ?: 'Main') : 'Main';
            $this->db->query("INSERT INTO pos_configs (company_id,branch_id,name) VALUES (:company,:branch,:name)",['company'=>$companyId,'branch'=>$branchId ?: null,'name'=>$branchName.' Register']);
            $config=$this->db->query("SELECT pc.*,b.name branch_name FROM pos_configs pc LEFT JOIN branches b ON b.id=pc.branch_id WHERE pc.id=:id",['id'=>(int)$this->db->lastInsertId()])->fetch();
        }
        return $config;
    }

    private function currentSessionForConfig(int $companyId,int $configId,bool $lock=false): ?array
    {
        $sql="SELECT s.*,u.name opened_by_name,c.name config_name,b.name branch_name
              FROM pos_sessions s JOIN users u ON u.id=s.opened_by JOIN pos_configs c ON c.id=s.config_id
              LEFT JOIN branches b ON b.id=s.branch_id
              WHERE s.company_id=:company AND s.config_id=:config AND s.state IN ('OPENING_CONTROL','OPENED','CLOSING_CONTROL')
              ORDER BY s.id DESC LIMIT 1".($lock?' FOR UPDATE':'');
        $row=$this->db->query($sql,['company'=>$companyId,'config'=>$configId])->fetch();
        return $row ?: null;
    }

    public function currentSession(): array
    {
        [$user,$companyId]=$this->context();
        $config=$this->resolveConfig($companyId,isset($user['branch_id'])?(int)$user['branch_id']:null);
        return ['config'=>$config,'session'=>$this->currentSessionForConfig($companyId,(int)$config['id'])];
    }

    public function openSession(array $data): array
    {
        [$user,$companyId]=$this->context();
        $config=$this->resolveConfig($companyId,isset($user['branch_id'])?(int)$user['branch_id']:null);
        $opening=round((float)($data['opening_cash']??0),2);
        if($opening<0)throw new Exception('Opening cash cannot be negative.',422);
        $this->db->beginTransaction();
        try {
            $this->db->query("SELECT id FROM pos_configs WHERE id=:id AND company_id=:company FOR UPDATE",['id'=>$config['id'],'company'=>$companyId]);
            $existing=$this->currentSessionForConfig($companyId,(int)$config['id'],true);
            // Rule #5 — an already-open session must reject a fresh open with 409.
            // Client can still discover the existing session via GET /pos/session/current
            // and route the operator to "Continue Selling" (Rule #4).
            if($existing){
                $this->db->commit();
                throw new Exception('A register session is already open for this POS. Continue selling on session #'.$existing['id'].' or close it first.', 409);
            }
            $uuid=$this->uuid();
            $this->db->query("INSERT INTO pos_sessions (uuid,company_id,config_id,branch_id,opened_by,state,opening_cash,opening_note,opened_at) VALUES (:uuid,:company,:config,:branch,:user,'OPENED',:cash,:note,NOW())",
                ['uuid'=>$uuid,'company'=>$companyId,'config'=>$config['id'],'branch'=>$config['branch_id'],'user'=>$user['id'],'cash'=>$opening,'note'=>$data['note']??null]);
            $id=(int)$this->db->lastInsertId();
            $this->log($user,$companyId,'SESSION_OPEN',$id,['opening_cash'=>$opening,'config_id'=>$config['id']]);
            $this->db->commit();
            return $this->db->query("SELECT s.*,u.name opened_by_name,c.name config_name,b.name branch_name FROM pos_sessions s JOIN users u ON u.id=s.opened_by JOIN pos_configs c ON c.id=s.config_id LEFT JOIN branches b ON b.id=s.branch_id WHERE s.id=:id",['id'=>$id])->fetch();
        } catch(\Throwable $e){if($this->db->getConnection()->inTransaction())$this->db->rollback();throw $e;}
    }

    /**
     * P5 — Odoo-style Session Report (Rule #46).
     *
     * CLOSED sessions → the canonical Odoo post-close report (this is the
     * ODOO-ALIGNED half). OPEN sessions → running totals, marked live
     * (CURDUN EXTENSION). Every number here is derived from the
     * authoritative tables (orders, pos_payments, pos_cash_movements,
     * pos_credit_ledger) — never from cached frontend totals or per-cashier
     * shift objects. Cash reconciliation strictly uses payment amounts,
     * NOT tendered_amount (Rule #4 / #19).
     */
    public function sessionSummary(int $sessionId=0): array
    {
        [$user,$companyId]=$this->context();
        // Resolve session — either explicit id (any historical session
        // belonging to this company) or the currently-open one for the
        // acting cashier's POS config.
        if(!$sessionId){
            $config=$this->resolveConfig($companyId,isset($user['branch_id'])?(int)$user['branch_id']:null);
            $session=$this->currentSessionForConfig($companyId,(int)$config['id']);
        } else {
            $session=$this->db->query(
                "SELECT s.*, u.name opened_by_name, closer.name closed_by_name,
                        c.name config_name, b.name branch_name
                 FROM pos_sessions s
                 JOIN users u ON u.id=s.opened_by
                 LEFT JOIN users closer ON closer.id=s.closed_by
                 JOIN pos_configs c ON c.id=s.config_id
                 LEFT JOIN branches b ON b.id=s.branch_id
                 WHERE s.id=:id AND s.company_id=:company",
                ['id'=>$sessionId,'company'=>$companyId]
            )->fetch();
        }
        if(!$session) throw new Exception('Session not found.', 404);

        $sid = (int)$session['id'];
        $params = ['company'=>$companyId,'session'=>$sid];

        // ---- Payment methods (dynamic — every method with recorded lines
        //      shows up; a configured method with no rows shows $0 on the
        //      frontend by merging with the settings.payments list).
        $methods = $this->db->query(
            "SELECT method_name, method_type,
                    ROUND(SUM(amount),2)                        AS amount,
                    ROUND(SUM(CASE WHEN amount>0 THEN amount END),2) AS gross,
                    ROUND(SUM(CASE WHEN amount<0 THEN amount END),2) AS refunded,
                    COUNT(DISTINCT order_id)                    AS transactions
             FROM pos_payments
             WHERE company_id=:company AND session_id=:session AND status='COMPLETED' AND is_change=0
             GROUP BY method_name, method_type
             ORDER BY method_name",
            $params
        )->fetchAll();

        // Cash payments only — the number that feeds Expected Cash. Uses
        // AMOUNT never TENDERED (Rule #19 / #43).
        $cashPayments = 0.0;
        foreach ($methods as $m) if ($m['method_type'] === 'cash') $cashPayments += (float)$m['amount'];

        // ---- Cash movements — break down by (direction, subtype). Reports
        //      need to distinguish MANUAL cash in from SETTLEMENT cash in so
        //      the operator can read where the drawer money actually came from.
        //      Expected Cash still sums every IN and OUT regardless.
        $movementsAgg = $this->db->query(
            "SELECT movement_type, subtype, ROUND(SUM(amount),2) amount
             FROM pos_cash_movements
             WHERE company_id=:company AND session_id=:session
             GROUP BY movement_type, subtype",
            $params
        )->fetchAll();
        $cashIn = 0.0; $cashOut = 0.0;
        $cashInManual = 0.0; $cashInSettlement = 0.0;
        $cashOutManual = 0.0; $cashOutOther = 0.0;
        foreach ($movementsAgg as $mv) {
            $amt = (float)$mv['amount'];
            if ($mv['movement_type'] === 'IN') {
                $cashIn += $amt;
                if ($mv['subtype'] === 'SETTLEMENT') $cashInSettlement += $amt;
                else                                  $cashInManual     += $amt;
            } else {
                $cashOut += $amt;
                if ($mv['subtype'] === 'MANUAL') $cashOutManual += $amt;
                else                              $cashOutOther  += $amt;
            }
        }
        $movementList = $this->db->query(
            "SELECT cm.id, cm.movement_type, cm.subtype, cm.amount, cm.reason, cm.created_at, u.name AS employee_name
             FROM pos_cash_movements cm
             JOIN users u ON u.id = cm.user_id
             WHERE cm.company_id=:company AND cm.session_id=:session
             ORDER BY cm.created_at DESC, cm.id DESC",
            $params
        )->fetchAll();

        // ---- Sales — gross (positive orders) vs refunds (negative orders)
        //      vs net. Order attribution is the trusted server-side field.
        $sales = $this->db->query(
            "SELECT
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN total_amount>0 THEN total_amount END),0) AS gross_sales,
                COALESCE(SUM(CASE WHEN total_amount<0 THEN total_amount END),0) AS refund_amount_signed,
                COALESCE(SUM(total_amount),0)                                    AS net_sales,
                COALESCE(AVG(CASE WHEN total_amount>0 THEN total_amount END),0) AS average_order,
                SUM(CASE WHEN total_amount>0 THEN 1 ELSE 0 END) AS sale_orders,
                SUM(CASE WHEN total_amount<0 THEN 1 ELSE 0 END) AS refund_orders
             FROM orders
             WHERE company_id=:company AND pos_session_id=:session AND pos_state='done'",
            $params
        )->fetch();
        $refundAmount = abs((float)$sales['refund_amount_signed']);
        $expected = round((float)$session['opening_cash'] + $cashPayments + $cashIn - $cashOut, 2);

        // ---- Employees who transacted on this session — derived from the
        //      real orders, not any per-cashier shift object (Rule #47 / #6).
        $employees = $this->db->query(
            "SELECT
                u.id, u.name AS employee_name,
                COUNT(o.id) AS orders,
                COALESCE(SUM(CASE WHEN o.total_amount>0 THEN o.total_amount END),0) AS gross_sales,
                COALESCE(SUM(CASE WHEN o.total_amount<0 THEN o.total_amount END),0) AS refund_amount_signed,
                COALESCE(SUM(o.total_amount),0)                                     AS net_sales
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.company_id=:company AND o.pos_session_id=:session AND o.pos_state='done'
             GROUP BY u.id, u.name
             ORDER BY net_sales DESC",
            $params
        )->fetchAll();
        // Add unsigned refund_amount for display convenience.
        foreach ($employees as &$emp) { $emp['refund_amount'] = abs((float)$emp['refund_amount_signed']); }
        unset($emp);

        // ---- Orders detail list for this session
        $orders = $this->db->query(
            "SELECT
                o.id, o.reference_number, o.order_date, o.created_at,
                o.status, o.pos_state, o.refunded_order_id,
                o.subtotal, o.tax_amount, o.total_amount,
                COALESCE(c.name,'Walk-in') AS customer_name,
                u.name AS cashier_name,
                COUNT(DISTINCT oi.id) AS items,
                COALESCE(GROUP_CONCAT(DISTINCT pp.method_name ORDER BY pp.id SEPARATOR ' + '), 'Deyn') AS payment_method
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN customers c ON c.id = o.customer_id
             LEFT JOIN order_items oi ON oi.order_id = o.id
             LEFT JOIN pos_payments pp ON pp.order_id = o.id AND pp.status='COMPLETED' AND pp.is_change=0
             WHERE o.company_id=:company AND o.pos_session_id=:session
             GROUP BY o.id
             ORDER BY o.created_at DESC, o.id DESC",
            $params
        )->fetchAll();

        // ---- Customer Account (Deyn) activity on this session
        $deynActivity = $this->db->query(
            "SELECT type, ROUND(SUM(amount),2) AS amount, COUNT(*) AS entries
             FROM pos_credit_ledger
             WHERE company_id=:company AND session_id=:session
             GROUP BY type",
            $params
        )->fetchAll();
        $deynSales = 0.0; $deynPayments = 0.0; $deynReversals = 0.0;
        foreach ($deynActivity as $d) {
            $amt = (float)$d['amount'];
            if     ($d['type'] === 'DEYN_SALE')             $deynSales     = $amt;
            elseif ($d['type'] === 'DEYN_PAYMENT')          $deynPayments  = abs($amt);
            elseif ($d['type'] === 'DEYN_REFUND_REVERSAL') $deynReversals = abs($amt);
        }

        return [
            'session'          => $session,
            'is_open'          => ($session['state'] ?? '') === 'OPENED',
            'sales'            => [
                'orders'         => (int)$sales['orders'],
                'sale_orders'    => (int)$sales['sale_orders'],
                'refund_orders'  => (int)$sales['refund_orders'],
                'gross_sales'    => round((float)$sales['gross_sales'], 2),
                'refunds'        => round($refundAmount, 2),
                'net_sales'      => round((float)$sales['net_sales'], 2),
                'average_order'  => round((float)$sales['average_order'], 2),
            ],
            'payment_methods'  => $methods,
            'cash_reconciliation' => [
                'opening_cash'             => round((float)$session['opening_cash'], 2),
                'cash_payments'            => round($cashPayments, 2),
                'cash_in'                  => $cashIn,
                'cash_in_manual'           => round($cashInManual, 2),
                'cash_in_customer_settle'  => round($cashInSettlement, 2),
                'cash_out'                 => $cashOut,
                'cash_out_manual'          => round($cashOutManual, 2),
                'cash_out_other'           => round($cashOutOther, 2),
                'expected_cash'            => $expected,
                'counted_cash'             => $session['counted_cash'] === null ? null : round((float)$session['counted_cash'], 2),
                'difference'               => $session['difference_amount'] === null ? null : round((float)$session['difference_amount'], 2),
            ],
            'cash_movements'   => [
                'in' => $cashIn, 'out' => $cashOut,
                'in_manual' => round($cashInManual, 2), 'in_customer_settle' => round($cashInSettlement, 2),
                'out_manual' => round($cashOutManual, 2), 'out_other' => round($cashOutOther, 2),
                'items' => $movementList,
            ],
            'employees'        => $employees,
            'orders_list'      => $orders,
            'customer_account' => [
                'sales'            => $deynSales,
                'collections'      => $deynPayments,
                'refund_reversals' => $deynReversals,
            ],
            // Back-compat top-level fields consumed by older frontend paths.
            'expected_cash'    => $expected,
            'orders'           => (int)$sales['orders'],
            'net_sales'        => round((float)$sales['net_sales'], 2),
        ];
    }

    public function cashMovement(int $sessionId,array $data): array
    {
        [$user,$companyId]=$this->context();$type=strtoupper((string)($data['type']??''));$amount=round((float)($data['amount']??0),2);$reason=trim((string)($data['reason']??''));
        if(!in_array($type,['IN','OUT'],true)||$amount<=0||$reason==='')throw new Exception('Cash movement type, amount, and reason are required.',422);
        // Optional Curdun Extra Security (Rule #9): cash OUT can require an
        // approval token when the tenant enables the extra_security.cash_out
        // toggle. Cash IN never does — Odoo treats it as a routine deposit.
        if ($type === 'OUT') {
            $this->enforceExtraSecurity($companyId,'cash-out',['target_id'=>$sessionId,'amount'=>$amount],'cash_out');
        }
        $session=$this->db->query("SELECT * FROM pos_sessions WHERE id=:id AND company_id=:company AND state='OPENED'",['id'=>$sessionId,'company'=>$companyId])->fetch();
        if(!$session)throw new Exception('The POS register is not open.',409);
        $this->db->query("INSERT INTO pos_cash_movements (company_id,session_id,user_id,movement_type,subtype,amount,reason) VALUES (:company,:session,:user,:type,'MANUAL',:amount,:reason)",['company'=>$companyId,'session'=>$sessionId,'user'=>$user['id'],'type'=>$type,'amount'=>$amount,'reason'=>$reason]);
        $id=(int)$this->db->lastInsertId();$this->log($user,$companyId,'CASH_'.$type,$id,['session_id'=>$sessionId,'amount'=>$amount,'reason'=>$reason]);
        return ['id'=>$id,'session_id'=>$sessionId,'type'=>$type,'amount'=>$amount,'reason'=>$reason,'created_at'=>date('c')];
    }

    private function transactionsData(int $companyId): array
    {
        // Refund status is a computed field per Rule #16 — derived from
        // authoritative refund data so the UI can hide "Refund" on fully-
        // refunded orders and badge partial ones.
        $rows = $this->db->query(
            "SELECT o.id,o.reference_number,o.order_date,o.total_amount,o.status,o.pos_state,o.refunded_order_id,o.amount_paid,o.amount_return,o.created_at,o.pos_session_id,c.name customer_name,u.name cashier_name,
                    COUNT(DISTINCT oi.id) items_count,COALESCE(GROUP_CONCAT(DISTINCT pp.method_name ORDER BY pp.id SEPARATOR ' + '),MAX(pm.name)) payment_method,
                    (SELECT COALESCE(SUM(oi2.quantity),0) FROM order_items oi2 WHERE oi2.order_id=o.id) original_qty_sum,
                    (SELECT COALESCE(SUM(ABS(ri.quantity)),0) FROM order_items ri JOIN orders ro ON ro.id=ri.order_id
                     WHERE ro.company_id=o.company_id AND ro.pos_state='done'
                       AND ri.refunded_order_item_id IN (SELECT id FROM order_items WHERE order_id=o.id)) refunded_qty_sum
             FROM orders o LEFT JOIN customers c ON c.id=o.customer_id LEFT JOIN users u ON u.id=o.user_id
             LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN invoices i ON i.id=o.invoice_id
             LEFT JOIN payments p ON p.invoice_id=i.id AND p.status IN ('COMPLETED','REFUNDED') LEFT JOIN payment_methods pm ON pm.id=p.payment_method_id
             LEFT JOIN pos_payments pp ON pp.order_id=o.id AND pp.status='COMPLETED'
             WHERE o.company_id=:company GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200",
            ['company'=>$companyId]
        )->fetchAll();
        foreach ($rows as &$row) {
            $row['refund_status'] = null;
            if ((float)$row['total_amount'] > 0 && empty($row['refunded_order_id'])) {
                $orig = (float)$row['original_qty_sum'];
                $ref  = (float)$row['refunded_qty_sum'];
                if ($orig > 0 && $ref > 0) {
                    $row['refund_status'] = ($ref + 0.0001 >= $orig) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
                }
            }
            unset($row['original_qty_sum'], $row['refunded_qty_sum']);
        }
        unset($row);
        return $rows;
    }

    public function voidTransaction(int $id, array $data = []): array
    {
        // Refund is BASIC in Odoo — the route middleware already enforces
        // pos.refund. No duplicate ADVANCED gate here.
        return $this->refundOrder($id,['reason'=>$data['reason']??'Full refund by POS employee']);
    }

    /**
     * Return refundable-shape info for the Odoo-style refund workflow:
     *   - original order header + customer + cashier + session
     *   - each order_item with its original quantity + already-refunded qty
     *     + refundable_qty (original − already)
     *   - the original payment breakdown so the refund UI can pre-select
     *     the same methods
     *   - the computed refund_status of the original ('' / PARTIALLY_REFUNDED
     *     / REFUNDED) so callers can hide "Refund" once fully refunded.
     */
    public function refundable(int $id): array
    {
        [$user, $companyId] = $this->context();
        $order = $this->db->query(
            "SELECT o.*, u.name AS cashier_name, c.name AS customer_name,
                    ps.state AS original_session_state
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN customers c ON c.id = o.customer_id
             LEFT JOIN pos_sessions ps ON ps.id = o.pos_session_id
             WHERE o.id = :id AND o.company_id = :company",
            ['id'=>$id,'company'=>$companyId]
        )->fetch();
        if (!$order) throw new Exception('Order not found.', 404);
        if (!empty($order['refunded_order_id'])) throw new Exception('This document is itself a refund, not a refundable sale.', 409);
        if ((float)$order['total_amount'] < 0) throw new Exception('Refund documents cannot be refunded.', 409);
        if ($order['status'] !== 'COMPLETED') throw new Exception('Only completed sales can be refunded.', 409);

        $items = $this->db->query(
            "SELECT oi.id, oi.product_id, p.name AS product_name, p.sku,
                    oi.quantity AS original_qty, oi.unit_price, oi.discount_percent,
                    oi.tax_rate, oi.tax_amount, oi.total
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :id
             ORDER BY oi.id",
            ['id'=>$id]
        )->fetchAll();
        foreach ($items as &$it) {
            $refunded = (float)($this->db->query(
                "SELECT COALESCE(SUM(ABS(ri.quantity)),0)
                 FROM order_items ri
                 JOIN orders ro ON ro.id = ri.order_id
                 WHERE ri.refunded_order_item_id = :item
                   AND ro.company_id = :company AND ro.pos_state='done'",
                ['item'=>$it['id'],'company'=>$companyId]
            )->fetchColumn() ?: 0);
            $it['refunded_qty']   = round($refunded, 3);
            $it['refundable_qty'] = round(max(0, (float)$it['original_qty'] - $refunded), 3);
        }
        unset($it);

        $payments = $this->db->query(
            "SELECT method_name, method_type,
                    ROUND(SUM(amount),2) AS amount, COUNT(*) AS line_count
             FROM pos_payments
             WHERE order_id = :id AND company_id = :company
               AND status='COMPLETED' AND is_change=0
             GROUP BY method_name, method_type
             ORDER BY amount DESC",
            ['id'=>$id,'company'=>$companyId]
        )->fetchAll();

        $priorRefunds = $this->db->query(
            "SELECT id, reference_number, total_amount, created_at
             FROM orders
             WHERE refunded_order_id = :id AND company_id = :company AND pos_state='done'
             ORDER BY id",
            ['id'=>$id,'company'=>$companyId]
        )->fetchAll();

        return [
            'order'              => [
                'id'               => (int)$order['id'],
                'reference_number' => $order['reference_number'],
                'customer_id'      => $order['customer_id'] ? (int)$order['customer_id'] : null,
                'customer_name'    => $order['customer_name'],
                'cashier_name'     => $order['cashier_name'],
                'session_id'       => $order['pos_session_id'] ? (int)$order['pos_session_id'] : null,
                'subtotal'         => (float)$order['subtotal'],
                'tax_amount'       => (float)$order['tax_amount'],
                'total_amount'     => (float)$order['total_amount'],
                'created_at'       => $order['created_at'],
            ],
            'items'              => $items,
            'original_payments'  => $payments,
            'prior_refunds'      => $priorRefunds,
            'refund_status'      => $this->computeRefundStatus($companyId, $id),
        ];
    }

    public function refundOrder(int $id,array $data=[]): array
    {
        // BASIC-level operation — pos.refund is enforced by the route.
        [$user,$companyId]=$this->context();
        // Optional Curdun Extra Security (Rule #9). Odoo default = off.
        $this->enforceExtraSecurity($companyId,'refund',['target_id'=>$id],'refund');
        $this->db->beginTransaction();
        try {
            $order=$this->db->query("SELECT * FROM orders WHERE id=:id AND company_id=:company FOR UPDATE",['id'=>$id,'company'=>$companyId])->fetch();
            if(!$order)throw new Exception('Transaction not found.',404);
            if(($order['pos_state']??null)==='cancel'||$order['status']!=='COMPLETED'||!empty($order['refunded_order_id']))throw new Exception('Only a completed sale can be refunded.',409);
            $config=$this->resolveConfig($companyId,isset($user['branch_id'])?(int)$user['branch_id']:null);
            $session=$this->currentSessionForConfig($companyId,(int)$config['id'],true);
            if(!$session||$session['state']!=='OPENED')throw new Exception('Open the POS register before processing a refund.',409);
            $requested=[];foreach(($data['items']??[]) as $line){$requested[(int)($line['order_item_id']??0)]=(float)($line['quantity']??0);}
            $items=$this->db->query("SELECT oi.*,p.name,p.current_stock FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=:order FOR UPDATE",['order'=>$id])->fetchAll();
            if(!$items)throw new Exception('The original sale has no refundable lines.',409);
            $refundLines=[];$subtotal=0.0;$tax=0.0;
            foreach($items as $item){
                $already=(float)($this->db->query("SELECT COALESCE(SUM(ABS(ri.quantity)),0) FROM order_items ri JOIN orders ro ON ro.id=ri.order_id WHERE ri.refunded_order_item_id=:item AND ro.company_id=:company AND ro.pos_state='done'",['item'=>$item['id'],'company'=>$companyId])->fetchColumn()?:0);
                $available=max(0,(float)$item['quantity']-$already);$qty=array_key_exists((int)$item['id'],$requested)?$requested[(int)$item['id']]:($requested?0:$available);
                if($qty<0||$qty>$available+0.0001)throw new Exception("Refund quantity exceeds the remaining quantity for {$item['name']}.",422);
                if($qty<=0)continue;
                $ratio=$qty/(float)$item['quantity'];$storedTax=(float)$item['tax_amount'];$modernLine=$storedTax!=0.0||(float)($item['tax_rate']??0)!=0.0;
                $lineBase=$modernLine?(float)$item['total']-$storedTax:(float)$item['total'];
                if(!$modernLine&&(float)$order['subtotal']!=0.0)$storedTax=round((float)$order['tax_amount']*((float)$item['total']/(float)$order['subtotal']),2);
                $lineSubtotal=round($lineBase*$ratio,2);$lineTax=round($storedTax*$ratio,2);
                $subtotal-=$lineSubtotal;$tax-=$lineTax;$refundLines[]=['item'=>$item,'quantity'=>$qty,'subtotal'=>$lineSubtotal,'tax'=>$lineTax,'total'=>round($lineSubtotal+$lineTax,2)];
            }
            if(!$refundLines)throw new Exception('Select at least one refundable item.',422);
            $total=round($subtotal+$tax,2);$sequence=$this->nextSequence((int)$config['id']);$reference=$this->posReference($config,$sequence,'REF');$uuid=$this->uuid();
            $this->db->query("INSERT INTO orders (company_id,customer_id,user_id,warehouse_id,pos_session_id,uuid,sequence_number,reference_number,status,pos_state,order_date,subtotal,tax_amount,discount_amount,total_amount,amount_paid,refunded_order_id,notes) VALUES (:company,:customer,:user,:warehouse,:session,:uuid,:sequence,:reference,'COMPLETED','done',CURDATE(),:subtotal,:tax,0,:total,:paid,:original,:notes)",
                ['company'=>$companyId,'customer'=>$order['customer_id'],'user'=>$user['id'],'warehouse'=>$order['warehouse_id'],'session'=>$session['id'],'uuid'=>$uuid,'sequence'=>$sequence,'reference'=>$reference,'subtotal'=>$subtotal,'tax'=>$tax,'total'=>$total,'paid'=>$total,'original'=>$id,'notes'=>$data['reason']??'POS refund']);
            $refundId=(int)$this->db->lastInsertId();
            foreach($refundLines as $line){$item=$line['item'];$before=(float)$item['current_stock'];$after=$before+$line['quantity'];
                $this->db->query("INSERT INTO order_items (order_id,line_uuid,product_id,quantity,unit_price,discount,discount_percent,tax_rate,tax_amount,total,refunded_order_item_id) VALUES (:order,:uuid,:product,:quantity,:price,0,:discount,:rate,:tax,:total,:original)",
                    ['order'=>$refundId,'uuid'=>$this->uuid(),'product'=>$item['product_id'],'quantity'=>-$line['quantity'],'price'=>$item['unit_price'],'discount'=>$item['discount_percent']??0,'rate'=>$item['tax_rate']??0,'tax'=>-$line['tax'],'total'=>-$line['total'],'original'=>$item['id']]);
                $this->db->query("UPDATE products SET current_stock=:stock WHERE id=:id AND company_id=:company",['stock'=>$after,'id'=>$item['product_id'],'company'=>$companyId]);
                $this->db->query("INSERT INTO stock_movements (product_id,warehouse_id,user_id,reference_type,reference_id,type,quantity,quantity_before,quantity_after,notes) VALUES (:product,:warehouse,:user,'POS_REFUND',:reference,'RETURN',:quantity,:before,:after,:notes)",['product'=>$item['product_id'],'warehouse'=>$order['warehouse_id'],'user'=>$user['id'],'reference'=>$refundId,'quantity'=>$line['quantity'],'before'=>$before,'after'=>$after,'notes'=>$data['reason']??'POS refund']);
            }
            // ---- Refund payment allocation (Rule #7 / #12) ---------------
            // Accept a full split-refund via data['payments'] = [{method,amount},…].
            // Backwards-compat: data['payment_method'] still works as single method.
            // Total across refund payment lines must equal |refund total|.
            $refundAbs = round(abs($total), 2);
            $originalPayments = $this->db->query(
                "SELECT method_name, method_type, ROUND(SUM(amount),2) amount
                 FROM pos_payments
                 WHERE order_id=:order AND company_id=:company AND status='COMPLETED' AND is_change=0
                 GROUP BY method_name, method_type
                 ORDER BY amount DESC",
                ['order'=>$id,'company'=>$companyId]
            )->fetchAll();
            $legacyDebt = !$originalPayments && $order['invoice_id']
                && (float)($this->db->query("SELECT balance FROM invoices WHERE id=:id",['id'=>$order['invoice_id']])->fetchColumn() ?: 0) > 0;

            $refundPaymentLines = [];
            if (!empty($data['payments']) && is_array($data['payments'])) {
                // Client-provided split refund
                $sum = 0.0;
                foreach ($data['payments'] as $p) {
                    $amt = round((float)($p['amount'] ?? 0), 2);
                    if ($amt <= 0) throw new Exception('Refund payment amounts must be greater than zero.', 422);
                    $name = (string)($p['method'] ?? $p['payment_method'] ?? '');
                    if ($name === '') throw new Exception('Refund payment method is required.', 422);
                    $pm = $this->paymentMethod($name);
                    $this->assertPaymentEnabled($companyId, $pm['name'], (int)$config['id']);
                    $refundPaymentLines[] = ['method'=>$pm, 'amount'=>$amt, 'reference'=>$p['reference'] ?? null];
                    $sum += $amt;
                }
                if (round($sum, 2) + 0.0001 < $refundAbs)  throw new Exception('Refund payment total is less than the refund amount.', 422);
                if (round($sum, 2) > $refundAbs + 0.0001)  throw new Exception('Refund payment total exceeds the refund amount.', 422);
            } else {
                // Single-method (legacy) — default to the largest original
                // method, falling back to Cash (or Deyn for legacy invoice debt).
                $methodName = (string)($data['payment_method']
                    ?? ($originalPayments[0]['method_name'] ?? ($legacyDebt ? 'Deyn' : 'Cash')));
                $pm = $this->paymentMethod($methodName);
                $this->assertPaymentEnabled($companyId, $pm['name'], (int)$config['id']);
                $refundPaymentLines[] = ['method'=>$pm, 'amount'=>$refundAbs, 'reference'=>null];
            }

            $deynRefundAmount = 0.0;
            foreach ($refundPaymentLines as $line) {
                $pm = $line['method'];
                // pos_payments row (signed negative — this is money leaving
                // the till). Cash refund reduces Expected Cash by exactly
                // this amount (Rule #9 / #43).
                $this->db->query(
                    "INSERT INTO pos_payments
                        (company_id, session_id, order_id, user_id, payment_method_id,
                         method_name, method_type, amount, reference_number, status)
                     VALUES
                        (:company, :session, :order, :user, :method,
                         :name, :type, :amount, :reference, 'COMPLETED')",
                    [
                        'company'  => $companyId,
                        'session'  => $session['id'],
                        'order'    => $refundId,
                        'user'     => $user['id'],
                        'method'   => $pm['id'],
                        'name'     => $pm['name'],
                        'type'     => $pm['type'],
                        'amount'   => -$line['amount'],
                        'reference'=> $line['reference'] ?? $reference,
                    ]
                );
                // P8 — Refund reversal amount aggregation keys on TYPE not name.
                if ($pm['type'] === 'credit') $deynRefundAmount += $line['amount'];
            }

            // ---- Deyn / Customer-Account reversal (Rule #11) --------------
            // Only the Deyn portion of the refund reduces the customer's debt.
            if ($deynRefundAmount > 0 && $order['customer_id']) {
                $this->db->query(
                    "INSERT INTO pos_credit_ledger
                        (company_id, branch_id, session_id, customer_id, cashier_id,
                         order_id, type, amount, reference, notes)
                     VALUES
                        (:company, :branch, :session, :customer, :cashier,
                         :order, 'DEYN_REFUND_REVERSAL', :amount, :reference, :notes)",
                    [
                        'company'  => $companyId,
                        'branch'   => $user['branch_id'] ?? null,
                        'session'  => $session['id'],
                        'customer' => $order['customer_id'],
                        'cashier'  => $user['id'],
                        'order'    => $refundId,
                        'amount'   => -abs($deynRefundAmount),
                        'reference'=> $reference,
                        'notes'    => 'Refund reversal of order '.$id,
                    ]
                );
                $this->db->query(
                    "UPDATE customers SET balance = GREATEST(0, balance - :amt)
                     WHERE id=:id AND company_id=:company",
                    ['amt'=>$deynRefundAmount,'id'=>$order['customer_id'],'company'=>$companyId]
                );
            }

            if ($order['invoice_id']) {
                $this->createInvoice($companyId,$user,$refundId,$order['customer_id']?(int)$order['customer_id']:null,$refundLines,$subtotal,$tax,$total,false,true);
            }
            $this->log($user,$companyId,'ORDER_REFUND',$refundId,[
                'original_order_id' => $id,
                'reference'         => $reference,
                'total'             => $total,
                'payments'          => array_map(fn($l)=>['method'=>$l['method']['name'],'amount'=>$l['amount']], $refundPaymentLines),
            ]);
            $this->db->commit();
        } catch(\Throwable $e){if($this->db->getConnection()->inTransaction())$this->db->rollback();throw $e;}
        $this->syncStockAlerts($companyId);
        return [
            'id'                => $refundId,
            'reference_number'  => $reference,
            'status'            => 'COMPLETED',
            'pos_state'         => 'done',
            'refunded_order_id' => $id,
            'total_amount'      => $total,
            'payment_method'    => implode(' + ', array_map(fn($l)=>$l['method']['name'], $refundPaymentLines)),
            'payment_lines'     => array_map(fn($l)=>['method'=>$l['method']['name'],'type'=>$l['method']['type'],'amount'=>$l['amount']], $refundPaymentLines),
            'created_at'        => date('c'),
            'original_refund_status' => $this->computeRefundStatus($companyId, $id),
        ];
    }

    /**
     * Compute the ORIGINAL order's refund status from authoritative refund
     * data. Rule #16 — status is a computed view over the linked refunds.
     * Returns 'REFUNDED', 'PARTIALLY_REFUNDED', or null when nothing yet.
     */
    private function computeRefundStatus(int $companyId, int $originalOrderId): ?string
    {
        $row = $this->db->query(
            "SELECT
                COALESCE(SUM(oi.quantity),0)                            AS total_qty,
                COALESCE((SELECT SUM(ABS(ri.quantity))
                          FROM order_items ri
                          JOIN orders ro ON ro.id = ri.order_id
                          WHERE ro.company_id = :company
                            AND ro.pos_state='done'
                            AND ri.refunded_order_item_id IN
                                (SELECT id FROM order_items WHERE order_id = :order)
                        ),0)                                            AS refunded_qty
             FROM order_items oi
             WHERE oi.order_id = :order2",
            ['company'=>$companyId,'order'=>$originalOrderId,'order2'=>$originalOrderId]
        )->fetch();
        $totalQty = (float)$row['total_qty'];
        $refQty   = (float)$row['refunded_qty'];
        if ($totalQty <= 0 || $refQty <= 0) return null;
        if ($refQty + 0.0001 >= $totalQty) return 'REFUNDED';
        return 'PARTIALLY_REFUNDED';
    }

    public function checkout(array $data): array
    {
        [$user,$companyId]=$this->context();
        $items=$data['items']??[];if(!is_array($items)||!$items)throw new Exception('Cart is empty.',422);
        $clientUuid=trim((string)($data['client_order_id']??$data['uuid']??''));if($clientUuid===''||!preg_match('/^[a-f0-9-]{36}$/i',$clientUuid))$clientUuid=$this->uuid();
        $existing=$this->db->query("SELECT id FROM orders WHERE company_id=:company AND uuid=:uuid LIMIT 1",['company'=>$companyId,'uuid'=>$clientUuid])->fetch();
        if($existing)return $this->checkoutResponse((int)$existing['id'],$companyId,true);
        $customerId=!empty($data['customer_id'])?(int)$data['customer_id']:null;
        $customer=$customerId?$this->customer($customerId,$companyId):null;
        $config=$this->resolveConfig($companyId,isset($user['branch_id'])?(int)$user['branch_id']:null);
        $this->db->beginTransaction();
        try{
            $session=$this->currentSessionForConfig($companyId,(int)$config['id'],true);
            if(!$session||$session['state']!=='OPENED')throw new Exception('Open the POS register before validating an order.',409);
            $subtotal=0;$normalized=[];
            foreach($items as $item){
                $productId=(int)($item['product_id']??$item['id']??0);$qty=(float)($item['quantity']??$item['qty']??0);
                if($productId<=0||$qty<=0)throw new Exception('Invalid checkout item.',422);
                $p=$this->db->query("SELECT * FROM products WHERE id=:id AND company_id=:company AND deleted_at IS NULL FOR UPDATE",['id'=>$productId,'company'=>$companyId])->fetch();
                if(!$p)throw new Exception('A product was not found.',404);if((float)$p['current_stock']<$qty)throw new Exception("Insufficient stock for {$p['name']}.",409);
                $wholesale=!empty($item['wholesale']);
                $unit=$wholesale && $p['wholesale_price'] !== null ? (float)$p['wholesale_price'] : (float)$p['selling_price'];
                $discount=max(0,min(100,(float)($item['discount_percent']??0)));$line=round($unit*$qty*(1-$discount/100),2);$subtotal+=$line;
                $normalized[]=['product'=>$p,'quantity'=>$qty,'unit_price'=>$unit,'discount_percent'=>$discount,'subtotal'=>$line];
            }
            $taxRate=(float)$this->settingValue($companyId,'pos.tax_rate',5);$tax=0.0;foreach($normalized as &$line){$line['tax_rate']=$taxRate;$line['tax']=round($line['subtotal']*$taxRate/100,2);$line['total']=round($line['subtotal']+$line['tax'],2);$tax+=$line['tax'];}unset($line);
            $discount=round(array_sum(array_map(fn($line)=>$line['unit_price']*$line['quantity']-$line['subtotal'],$normalized)),2);$total=round($subtotal+$tax,2);
            $paymentLines=$data['payments']??[['method'=>$data['payment_method']??'Cash','amount'=>$total,'reference'=>$data['payment_reference']??null]];
            if(!is_array($paymentLines)||!$paymentLines)throw new Exception('At least one payment line is required.',422);
            // Point 12/13 model: each payment line stands on its own. For cash lines,
            // `tendered` is what the customer physically handed over; change belongs
            // to that specific cash line (tendered - amount). Non-cash lines cannot
            // carry tender/change — reject explicitly so it can't be smuggled in.
            $payments=[];$applied=0.0;$change=0.0;$debtAmount=0.0;$hasCash=false;$hasDebt=false;
            foreach($paymentLines as $paymentLine){
                $payment=$this->paymentMethod((string)($paymentLine['method']??$paymentLine['payment_method']??'Cash'));
                // P8.1 — every payment line must be assigned to THIS POS config.
                $this->assertPaymentEnabled($companyId,$payment['name'],(int)$config['id']);
                $amount=round((float)($paymentLine['amount']??0),2);
                if($amount<=0)throw new Exception('Payment amounts must be greater than zero.',422);
                $isCash=($payment['type']==='cash');
                $tenderedRaw=$paymentLine['tendered']??$paymentLine['tendered_amount']??null;
                $lineTendered=null;$lineChange=null;
                if($tenderedRaw!==null&&$tenderedRaw!==''){
                    if(!$isCash)throw new Exception('Only cash payment lines may include a tendered amount.',422);
                    $lineTendered=round((float)$tenderedRaw,2);
                    if($lineTendered+0.0001<$amount)throw new Exception('Cash tendered for this line is less than the line amount.',422);
                    $lineChange=round($lineTendered-$amount,2);
                }elseif($isCash){
                    // Legacy caller sent `amount` > line share: treat the excess as
                    // change on this line so old UIs keep working. Split-aware
                    // callers should pass `tendered` explicitly.
                    $lineTendered=$amount;$lineChange=0.0;
                }
                $applied+=$amount;$change+=($lineChange??0);
                $hasCash=$hasCash||$isCash;
                // P8 — Financial identity is method TYPE, not display name.
                // A tenant renaming Deyn to "Customer Account" must not break checkout.
                $isDebt = ($payment['type'] === 'credit') || !empty($payment['identify_customer']);
                $hasDebt = $hasDebt || $isDebt;
                if($isDebt)$debtAmount+=$amount;
                $payments[]=['method'=>$payment,'amount'=>$amount,'tendered'=>$lineTendered,'line_change'=>$lineChange,'reference'=>$paymentLine['reference']??$data['payment_reference']??null];
            }
            if($hasDebt&&!$customerId)throw new Exception('A customer is required for credit sales.',422);
            if(round($applied,2)+0.0001<$total)throw new Exception('The order is not fully paid.',422);
            if(round($applied,2)>$total+0.0001)throw new Exception('Payment amounts exceed the order total. Use the tendered field for cash overpayment, not the amount.',422);
            $tendered=$applied+$change; // for legacy fields in orders row
            // Rule #28 — Odoo's Customer Account credit limit is warn-only by
            // default. The response carries a `credit_warning` field so the
            // POS can surface it. A tenant that wants Odoo blocking behaviour
            // enables extra_security.credit_over_limit_strict — then we hard
            // reject at 422 as before.
            $creditWarning = null;
            if ($hasDebt) {
                $limit   = (float)($customer['credit_limit'] ?? 0);
                $balance = (float)($customer['balance'] ?? 0);
                $projected = $balance + $debtAmount;
                if ($limit > 0 && $projected > $limit) {
                    $strict = !empty($this->settingsData($companyId)['extra_security']['credit_over_limit_strict']);
                    if ($strict) {
                        throw new Exception('This sale exceeds the customer credit limit.', 422);
                    }
                    $creditWarning = [
                        'customer_id'      => $customerId,
                        'credit_limit'     => $limit,
                        'previous_balance' => $balance,
                        'projected_balance'=> $projected,
                        'overage'          => round($projected - $limit, 2),
                    ];
                }
            }
            $sequence=$this->nextSequence((int)$config['id']);$reference=$this->posReference($config,$sequence);$toInvoice=!empty($data['to_invoice'])||$hasDebt;
            $this->db->query("INSERT INTO orders (company_id,customer_id,user_id,warehouse_id,pos_session_id,uuid,sequence_number,reference_number,status,pos_state,order_date,subtotal,tax_amount,discount_amount,total_amount,amount_paid,amount_return,to_invoice,notes) VALUES (:company,:customer,:user,:warehouse,:session,:uuid,:sequence,:reference,'COMPLETED','done',CURDATE(),:subtotal,:tax,:discount,:total,:paid,:returned,:invoice,:notes)",
                ['company'=>$companyId,'customer'=>$customerId,'user'=>$user['id'],'warehouse'=>$data['warehouse_id']??null,'session'=>$session['id'],'uuid'=>$clientUuid,'sequence'=>$sequence,'reference'=>$reference,'subtotal'=>$subtotal,'tax'=>$tax,'discount'=>$discount,'total'=>$total,'paid'=>$tendered-$change,'returned'=>$change,'invoice'=>$toInvoice?1:0,'notes'=>$data['notes']??null]);
            $orderId=(int)$this->db->lastInsertId();
            foreach($normalized as $line){$p=$line['product'];$after=(float)$p['current_stock']-$line['quantity'];
                $this->db->query("INSERT INTO order_items (order_id,line_uuid,product_id,quantity,unit_price,discount,discount_percent,tax_rate,tax_amount,total) VALUES (:order,:uuid,:product,:quantity,:price,:discount_amount,:discount,:rate,:tax,:total)",['order'=>$orderId,'uuid'=>$this->uuid(),'product'=>$p['id'],'quantity'=>$line['quantity'],'price'=>$line['unit_price'],'discount_amount'=>round($line['unit_price']*$line['quantity']-$line['subtotal'],2),'discount'=>$line['discount_percent'],'rate'=>$line['tax_rate'],'tax'=>$line['tax'],'total'=>$line['total']]);
                $this->db->query("UPDATE products SET current_stock=:stock WHERE id=:id",['stock'=>$after,'id'=>$p['id']]);
                $this->db->query("INSERT INTO stock_movements (product_id,warehouse_id,user_id,reference_type,reference_id,type,quantity,quantity_before,quantity_after,notes) VALUES (:product,:warehouse,:user,'POS_ORDER',:reference,'SALE',:quantity,:before,:after,'Retail POS sale')",['product'=>$p['id'],'warehouse'=>$data['warehouse_id']??null,'user'=>$user['id'],'reference'=>$orderId,'quantity'=>-$line['quantity'],'before'=>$p['current_stock'],'after'=>$after]);
            }
            foreach($payments as $paymentLine){
                $payment=$paymentLine['method'];
                $this->db->query(
                    "INSERT INTO pos_payments (company_id,session_id,order_id,user_id,payment_method_id,method_name,method_type,amount,tendered_amount,change_amount,reference_number,status)
                     VALUES (:company,:session,:order,:user,:method,:name,:type,:amount,:tendered,:change,:reference,'COMPLETED')",
                    ['company'=>$companyId,'session'=>$session['id'],'order'=>$orderId,'user'=>$user['id'],'method'=>$payment['id'],'name'=>$payment['name'],'type'=>$payment['type'],'amount'=>$paymentLine['amount'],'tendered'=>$paymentLine['tendered'],'change'=>$paymentLine['line_change'],'reference'=>$paymentLine['reference']??$reference]
                );
            }
            // No separate is_change=1 row: from Point 12 onward, change_amount is
            // stored directly on the CASH line, and amount already equals the true
            // cash contribution (net gain to the drawer). Reporting sums pp.amount
            // and filters is_change=0 defensively for any legacy rows.
            $invoiceId=null;$invoiceNo=null;if($toInvoice){[$invoiceId,$invoiceNo]=$this->createInvoice($companyId,$user,$orderId,$customerId,$normalized,$subtotal,$tax,$total,$hasDebt,false,$debtAmount);}
            if($hasDebt){
                // Ledger row FIRST (atomic with the balance write inside this same
                // transaction). Positive amount — sale INCREASES outstanding debt.
                $this->db->query(
                    "INSERT INTO pos_credit_ledger
                        (company_id, branch_id, session_id, customer_id, cashier_id,
                         order_id, type, amount, reference, notes)
                     VALUES
                        (:company, :branch, :session, :customer, :cashier,
                         :order, 'DEYN_SALE', :amount, :reference, :notes)",
                    [
                        'company'  => $companyId,
                        'branch'   => $user['branch_id'] ?? null,
                        'session'  => $session['id'],
                        'customer' => $customerId,
                        'cashier'  => $user['id'],
                        'order'    => $orderId,
                        'amount'   => abs($debtAmount),
                        'reference'=> $reference,
                        'notes'    => 'Deyn portion of order ' . $reference,
                    ]
                );
                $this->db->query("UPDATE customers SET balance=balance+:total WHERE id=:id AND company_id=:company",['total'=>$debtAmount,'id'=>$customerId,'company'=>$companyId]);
            }
            $this->log($user,$companyId,'CHECKOUT',$orderId,['reference'=>$reference,'uuid'=>$clientUuid,'session_id'=>$session['id'],'total'=>$total,'payments'=>array_map(fn($p)=>['method'=>$p['method']['name'],'amount'=>$p['amount']],$payments),'change'=>$change]);$this->db->commit();
        }catch(\Throwable $e){if($this->db->getConnection()->inTransaction())$this->db->rollback();throw $e;}
        $this->syncStockAlerts($companyId);
        $response = $this->checkoutResponse($orderId,$companyId,false);
        if (!empty($creditWarning)) $response['credit_warning'] = $creditWarning;
        return $response;
    }

    /**
     * Resolve a payment method by its display name to its canonical record.
     *
     * Returns { id, name, type, integration_type, identify_customer, sequence }.
     * Financial code MUST key on `type` / `identify_customer` / `integration_type`
     * — never the display name. That way an admin can rename "Deyn" to
     * "Customer Account" (or the Somali equivalent) without breaking checkout,
     * refund, settlement, or reporting.
     *
     * A small alias map remains only for CASE folding of the six seeded
     * Curdun labels; new custom methods are stored verbatim.
     */
    private function paymentMethod(string $raw): array
    {
        $key = strtolower(trim($raw));
        $aliases = ['evc' => 'EVC Plus', 'evc plus' => 'EVC Plus'];
        $name = $aliases[$key] ?? trim($raw);
        if ($name === '') $name = 'Cash';

        $row = $this->db->query(
            "SELECT id, name, type, integration_type, identify_customer, `sequence`, status
             FROM payment_methods
             WHERE LOWER(name) = LOWER(:name)
             LIMIT 1",
            ['name' => $name]
        )->fetch();

        if (!$row) {
            // Auto-create for a first-time reference. Type defaults to 'other'
            // — an admin should edit it in Settings → Payments to pick the
            // correct financial type before using it for real transactions.
            $this->db->query(
                "INSERT INTO payment_methods (name, type, integration_type, identify_customer, status)
                 VALUES (:name, 'other', 'MANUAL', 0, 'active')",
                ['name' => $name]
            );
            $row = [
                'id' => (int)$this->db->lastInsertId(),
                'name' => $name,
                'type' => 'other',
                'integration_type' => 'MANUAL',
                'identify_customer' => 0,
                'sequence' => 100,
                'status' => 'active',
            ];
        }

        return [
            'id'                => (int)$row['id'],
            'name'              => $row['name'],
            'type'              => $row['type'],
            'integration_type'  => $row['integration_type'] ?? 'MANUAL',
            'identify_customer' => (int)($row['identify_customer'] ?? 0),
            'sequence'          => (int)($row['sequence'] ?? 100),
        ];
    }

    /**
     * P8.1 — Gate a payment method against the ACTIVE POS configuration.
     * The pos_config_payment_methods join is the authoritative source.
     * If $configId is null (unusual — settlement path from an old caller),
     * we fall back to the company-level enable dict for backwards compat.
     * A method that is not assigned to the POS is rejected before any
     * financial write, and the operator sees a clear message.
     */
    private function assertPaymentEnabled(int $companyId, string $name, ?int $configId = null): void
    {
        if ($configId !== null) {
            $row = $this->db->query(
                "SELECT pcpm.enabled, pm.name
                 FROM pos_config_payment_methods pcpm
                 JOIN payment_methods pm ON pm.id = pcpm.payment_method_id
                 WHERE pcpm.pos_config_id = :config AND LOWER(pm.name) = LOWER(:name)
                 LIMIT 1",
                ['config' => $configId, 'name' => $name]
            )->fetch();
            if (!$row) {
                throw new Exception("{$name} is not assigned to this POS. An administrator can add it in Settings → Payments.", 422);
            }
            if (!(int)$row['enabled']) {
                throw new Exception("{$name} is disabled on this POS.", 422);
            }
            return;
        }
        // Legacy fallback — company-wide enable map (pre-P8.1 callers).
        $configured = $this->settingsData($companyId)['payments'] ?? [];
        foreach ($configured as $configuredName => $enabled) {
            if (strtolower((string)$configuredName) === strtolower($name)) {
                if (!$enabled) throw new Exception("{$name} is disabled in POS settings.", 422);
                return;
            }
        }
        throw new Exception("{$name} is not configured for this POS.", 422);
    }

    private function nextSequence(int $configId): int
    {
        $row=$this->db->query("SELECT next_order_sequence FROM pos_configs WHERE id=:id FOR UPDATE",['id'=>$configId])->fetch();if(!$row)throw new Exception('POS configuration not found.',404);
        $sequence=(int)$row['next_order_sequence'];$this->db->query("UPDATE pos_configs SET next_order_sequence=next_order_sequence+1 WHERE id=:id",['id'=>$configId]);return $sequence;
    }

    private function posReference(array $config,int $sequence,string $prefix='POS'): string
    {
        return $prefix.'-'.date('Ymd').'-'.str_pad((string)$config['id'],2,'0',STR_PAD_LEFT).'-'.str_pad((string)$sequence,6,'0',STR_PAD_LEFT);
    }

    private function uuid(): string
    {
        $bytes=random_bytes(16);$bytes[6]=chr((ord($bytes[6])&0x0f)|0x40);$bytes[8]=chr((ord($bytes[8])&0x3f)|0x80);$hex=bin2hex($bytes);return substr($hex,0,8).'-'.substr($hex,8,4).'-'.substr($hex,12,4).'-'.substr($hex,16,4).'-'.substr($hex,20);
    }

    private function createInvoice(int $companyId,array $user,int $orderId,?int $customerId,array $lines,float $subtotal,float $tax,float $total,bool $debt,bool $creditNote,?float $debtAmount=null): array
    {
        $number=($creditNote?'CRN-':'INV-').date('Ymd-His').'-'.strtoupper(substr(bin2hex(random_bytes(3)),0,5));
        $balance=$debt?round($debtAmount??$total,2):0;$paid=$debt?round($total-$balance,2):$total;$status=$debt?($paid>0?'PARTIAL':'SENT'):'PAID';
        $this->db->query("INSERT INTO invoices (company_id,customer_id,order_id,user_id,invoice_number,status,invoice_date,due_date,subtotal,tax_amount,discount_amount,total_amount,paid_amount,balance,notes) VALUES (:company,:customer,:order,:user,:number,:status,CURDATE(),:due,:subtotal,:tax,0,:total,:paid,:balance,:notes)",
            ['company'=>$companyId,'customer'=>$customerId,'order'=>$orderId,'user'=>$user['id'],'number'=>$number,'status'=>$status,'due'=>$debt?date('Y-m-d',strtotime('+30 days')):date('Y-m-d'),'subtotal'=>$subtotal,'tax'=>$tax,'total'=>$total,'paid'=>$paid,'balance'=>$balance,'notes'=>$creditNote?'POS credit note':null]);
        $invoiceId=(int)$this->db->lastInsertId();
        foreach($lines as $line){$product=$line['product']??$line['item'];$quantity=(float)$line['quantity']*($creditNote?-1:1);$lineTotal=(float)$line['total']*($creditNote?-1:1);$lineTax=(float)($line['tax']??0)*($creditNote?-1:1);
            $this->db->query("INSERT INTO invoice_items (invoice_id,product_id,description,quantity,unit_price,discount,tax_amount,total) VALUES (:invoice,:product,:description,:quantity,:price,:discount,:tax,:total)",['invoice'=>$invoiceId,'product'=>$product['product_id']??$product['id'],'description'=>$product['name'],'quantity'=>$quantity,'price'=>$line['unit_price']??$product['unit_price']??0,'discount'=>0,'tax'=>$lineTax,'total'=>$lineTotal]);}
        $this->db->query("UPDATE orders SET invoice_id=:invoice WHERE id=:order",['invoice'=>$invoiceId,'order'=>$orderId]);return [$invoiceId,$number];
    }

    private function checkoutResponse(int $orderId,int $companyId,bool $idempotent): array
    {
        $row=$this->db->query("SELECT o.*,u.name cashier_name,GROUP_CONCAT(DISTINCT pp.method_name ORDER BY pp.id SEPARATOR ' + ') payment_method FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN pos_payments pp ON pp.order_id=o.id AND pp.status='COMPLETED' AND pp.is_change=0 WHERE o.id=:id AND o.company_id=:company GROUP BY o.id",['id'=>$orderId,'company'=>$companyId])->fetch();
        if(!$row)throw new Exception('POS order was not found.',404);$row['idempotent_replay']=$idempotent;return $row;
    }

    public function collectDebt(int $customerId,array $data): array
    {
        [$user,$companyId]=$this->context();
        $customer=$this->customer($customerId,$companyId);
        $amount = round((float)($data['amount'] ?? $customer['balance']), 2);
        if ($amount <= 0) throw new Exception('Settlement amount must be greater than zero.', 422);
        // P7 Rule (over-collection) — cannot collect more than the current debt.
        if ($amount > round((float)$customer['balance'], 2) + 0.001) {
            throw new Exception('Settlement amount exceeds the customer\'s outstanding balance of $'
                . number_format((float)$customer['balance'], 2) . '.', 422);
        }
        $method = (string)($data['payment_method'] ?? 'Cash');
        // Validate the settlement method against configured payment methods.
        // A method with type='credit' (Customer Account) cannot be used to
        // settle a Customer Account balance — you can't pay debt with more
        // debt (Rule #11). P8: keyed on TYPE not name.
        $pm = $this->paymentMethod($method);
        if ($pm['type'] === 'credit') {
            throw new Exception('A Customer-Account method cannot be used to settle a Customer Account balance.', 422);
        }
        // P8.1 — settlement method must be assigned to the cashier's active
        // POS. Resolve the config for the acting user, then gate.
        $settleConfig = $this->resolveConfig($companyId, isset($user['branch_id']) ? (int)$user['branch_id'] : null);
        $this->assertPaymentEnabled($companyId, $pm['name'], (int)$settleConfig['id']);
        $sessionId = $this->currentOpenSessionId($companyId, $user);

        // Atomically: ledger entry + balance update + (cash → session cash IN) —
        // must succeed together. Cash settlements physically arrive in the
        // drawer so they contribute to Expected Cash via a pos_cash_movements
        // row (Rule #11 / cash reconciliation).
        $this->db->beginTransaction();
        try {
            $this->db->query(
                "INSERT INTO pos_credit_ledger
                    (company_id, branch_id, session_id, customer_id, cashier_id,
                     type, amount, payment_method, reference, notes)
                 VALUES
                    (:company, :branch, :session, :customer, :cashier,
                     'DEYN_PAYMENT', :amount, :method, :reference, :notes)",
                [
                    'company'  => $companyId,
                    'branch'   => $user['branch_id'] ?? null,
                    'session'  => $sessionId,
                    'customer' => $customerId,
                    'cashier'  => $user['id'],
                    // Negative signed amount — payment REDUCES outstanding debt.
                    'amount'   => -abs($amount),
                    'method'   => $pm['name'],
                    'reference'=> $data['reference'] ?? null,
                    'notes'    => $data['notes'] ?? null,
                ]
            );
            $this->db->query(
                "UPDATE customers SET balance = balance - :amount
                 WHERE id = :id AND company_id = :company",
                ['amount'=>$amount,'id'=>$customerId,'company'=>$companyId]
            );
            // Cash settlement → physical cash into the drawer. Recorded with
            // subtype='SETTLEMENT' so reports can distinguish it from a
            // manual Cash In. Expected Cash still counts it because it is an
            // IN movement — this is only about classification for reporting.
            if ($pm['type'] === 'cash' && $sessionId) {
                $this->db->query(
                    "INSERT INTO pos_cash_movements
                        (company_id, session_id, user_id, movement_type, subtype, amount, reason)
                     VALUES
                        (:company, :session, :user, 'IN', 'SETTLEMENT', :amount, :reason)",
                    [
                        'company' => $companyId,
                        'session' => $sessionId,
                        'user'    => $user['id'],
                        'amount'  => $amount,
                        'reason'  => 'Customer Account settlement — customer #'.$customerId,
                    ]
                );
            }
            $this->log($user, $companyId, 'CUSTOMER_ACCOUNT_PAYMENT', $customerId, [
                'amount' => $amount,
                'method' => $pm['name'],
                'method_type' => $pm['type'],
                'session_id' => $sessionId,
                'ledger_id' => (int)$this->db->lastInsertId(),
            ]);
            $this->db->commit();
        } catch (\Throwable $e) {
            if ($this->db->getConnection()->inTransaction()) $this->db->rollback();
            throw $e;
        }
        return $this->customer($customerId,$companyId);
    }

    /**
     * P7 — Full Customer Account ledger for the given customer. Returns rows
     * newest-first with method + employee + running balance so the frontend
     * (and audit tools) can verify balance = SUM(ledger).
     */
    public function customerLedger(int $customerId): array
    {
        [$user, $companyId] = $this->context();
        $customer = $this->customer($customerId, $companyId);
        $rows = $this->db->query(
            "SELECT l.id, l.type, l.amount, l.payment_method, l.reference, l.notes,
                    l.created_at, l.session_id, l.order_id,
                    u.name AS cashier_name,
                    o.reference_number AS order_reference
             FROM pos_credit_ledger l
             LEFT JOIN users  u ON u.id = l.cashier_id
             LEFT JOIN orders o ON o.id = l.order_id
             WHERE l.company_id = :company AND l.customer_id = :customer
             ORDER BY l.id DESC",
            ['company'=>$companyId,'customer'=>$customerId]
        )->fetchAll();

        // Aggregate totals so the customer-account header shows purchases /
        // payments / reversals cleanly.
        $totals = ['purchases'=>0.0, 'payments'=>0.0, 'reversals'=>0.0];
        foreach ($rows as $r) {
            if     ($r['type'] === 'DEYN_SALE')             $totals['purchases'] += (float)$r['amount'];
            elseif ($r['type'] === 'DEYN_PAYMENT')          $totals['payments']  += abs((float)$r['amount']);
            elseif ($r['type'] === 'DEYN_REFUND_REVERSAL') $totals['reversals'] += abs((float)$r['amount']);
        }
        // Compute a running balance from oldest → newest and re-order desc.
        $forward = array_reverse($rows);
        $running = 0.0;
        foreach ($forward as &$r) { $running += (float)$r['amount']; $r['running_balance'] = round($running, 2); }
        unset($r);
        $withBalance = array_reverse($forward);

        // The critical invariant: SUM(ledger) MUST equal customer.balance.
        $ledgerSum = round($running, 2);
        $balance = round((float)$customer['balance'], 2);

        return [
            'customer' => [
                'id'           => (int)$customer['id'],
                'name'         => $customer['name'],
                'balance'      => $balance,
                'credit_limit' => round((float)$customer['credit_limit'], 2),
                'available_credit' => max(0, round((float)$customer['credit_limit'] - $balance, 2)),
            ],
            'totals'       => [
                'purchases' => round($totals['purchases'], 2),
                'payments'  => round($totals['payments'], 2),
                'reversals' => round($totals['reversals'], 2),
            ],
            'entries'      => $withBalance,
            'invariant_ok' => abs($ledgerSum - $balance) < 0.01,
            'ledger_sum'   => $ledgerSum,
        ];
    }

    /**
     * Best-effort lookup of the current OPEN pos_session id for the acting
     * user's branch — used to stamp ledger rows so a payment/sale is bound
     * to the register session it happened on. Returns null if none open.
     */
    private function currentOpenSessionId(int $companyId, array $user): ?int
    {
        try {
            $branchId = isset($user['branch_id']) ? (int)$user['branch_id'] : null;
            $config = $this->resolveConfig($companyId, $branchId);
            $sess = $this->currentSessionForConfig($companyId, (int)$config['id']);
            return $sess && $sess['state'] === 'OPENED' ? (int)$sess['id'] : null;
        } catch (\Throwable $e) { return null; }
    }

    public function closeShift(array $data): array
    {
        [$user,$companyId]=$this->context();$cashierId=(int)($data['cashier_id']??$user['id']);$counted=round((float)($data['counted_cash']??-1),2);if($counted<0)throw new Exception('Counted cash is required.',422);
        $cashier=$this->db->query("SELECT id,branch_id,name FROM users WHERE id=:id AND company_id=:company AND status='active' AND deleted_at IS NULL",['id'=>$cashierId,'company'=>$companyId])->fetch();if(!$cashier)throw new Exception('Cashier not found for this company.',404);
        $config=$this->resolveConfig($companyId,$cashier['branch_id']?(int)$cashier['branch_id']:null);
        $sessionId=(int)($data['session_id']??0);$session=$sessionId?$this->db->query("SELECT * FROM pos_sessions WHERE id=:id AND company_id=:company AND state IN ('OPENED','CLOSING_CONTROL')",['id'=>$sessionId,'company'=>$companyId])->fetch():$this->currentSessionForConfig($companyId,(int)$config['id']);if(!$session)throw new Exception('No open POS register session was found.',404);
        if((int)$session['config_id']!==(int)$config['id'])throw new Exception('The selected cashier is not assigned to this register.',403);
        $summary=$this->sessionSummary((int)$session['id']);$expected=(float)$summary['expected_cash'];$variance=round($counted-$expected,2);$approved=!empty($data['approve_difference']);
        // Odoo default: no hardcoded maximum difference — the closer chooses
        // whether the count is accepted. If the tenant enables the Curdun
        // extra_security.variance_above threshold, require a manager approval
        // token when |variance| exceeds that amount. Rule #45.
        $this->enforceExtraSecurity(
            $companyId,
            'close-variance',
            ['target_id'=>(int)$session['id'],'amount'=>abs($variance),'_threshold_value'=>abs($variance)],
            ['variance_above'=>(float)($this->settingsData($companyId)['extra_security']['variance_above']??0)]
        );
        $this->db->beginTransaction();try{
            $locked=$this->db->query("SELECT * FROM pos_sessions WHERE id=:id AND company_id=:company FOR UPDATE",['id'=>$session['id'],'company'=>$companyId])->fetch();if(!$locked||$locked['state']==='CLOSED')throw new Exception('This register session is already closed.',409);
            $this->db->query("UPDATE pos_sessions SET state='CLOSED',expected_cash=:expected,counted_cash=:counted,difference_amount=:variance,closing_note=:notes,closed_by=:closed_by,closed_at=NOW() WHERE id=:id",['expected'=>$expected,'counted'=>$counted,'variance'=>$variance,'notes'=>$data['notes']??null,'closed_by'=>$user['id'],'id'=>$session['id']]);
            $this->db->query("INSERT INTO pos_shift_closures (company_id,branch_id,cashier_id,closed_by,system_cash,counted_cash,variance,notes) VALUES (:company,:branch,:cashier,:closed_by,:system,:counted,:variance,:notes)",['company'=>$companyId,'branch'=>$cashier['branch_id'],'cashier'=>$cashierId,'closed_by'=>$user['id'],'system'=>$expected,'counted'=>$counted,'variance'=>$variance,'notes'=>$data['notes']??null]);$closureId=(int)$this->db->lastInsertId();
            $this->log($user,$companyId,'SESSION_CLOSE',(int)$session['id'],['closure_id'=>$closureId,'expected_cash'=>$expected,'counted_cash'=>$counted,'variance'=>$variance,'approved'=>$approved]);$this->db->commit();
        }catch(\Throwable $e){if($this->db->getConnection()->inTransaction())$this->db->rollback();throw $e;}
        return ['id'=>$closureId,'session_id'=>(int)$session['id'],'cashier_id'=>$cashierId,'cashier_name'=>$cashier['name'],'system_cash'=>$expected,'expected_cash'=>$expected,'counted_cash'=>$counted,'variance'=>$variance,'payment_methods'=>$summary['payment_methods'],'closed_at'=>date('c')];
    }

    private function settingsData(int $companyId): array
    {
        // Odoo defaults for Extra Security (Rule #9): every toggle OFF. Enable
        // per company to require an X-Manager-Approval header for these ops.
        $extraSecurityDefaults = [
            'refund'                     => false,
            'cash_out'                   => false,
            'void_paid'                  => false,
            'price_override'             => false,
            'discount_above_pct'         => null, // null OR numeric %; approval kicks in when the line discount exceeds
            'variance_above'             => null, // null OR numeric $; approval kicks in on close when |variance| exceeds
            'credit_over_limit_strict'   => false, // Rule #28 — Odoo mode warns; enable to hard-block
        ];
        // P8 / P8.1 — payments come from the pos_config_payment_methods join
        // for the ACTING user's active POS config. A method that is not
        // assigned to the config shows enabled=false in the response, and
        // checkout/refund/settlement will reject it server-side. Historical
        // pos_payments rows are unaffected by any change here (Rule #10).
        $branchId = Auth::user()['branch_id'] ?? null;
        try {
            $activeConfig = $this->resolveConfig($companyId, $branchId ? (int)$branchId : null);
            $activeConfigId = (int)$activeConfig['id'];
        } catch (\Throwable $_) { $activeConfigId = null; }

        $methodRows = $this->db->query(
            "SELECT pm.id, pm.name, pm.type, pm.integration_type, pm.identify_customer,
                    COALESCE(pcpm.`sequence`, pm.`sequence`) AS `sequence`,
                    COALESCE(pcpm.enabled, 0) AS assigned_enabled,
                    (pcpm.pos_config_id IS NOT NULL) AS is_assigned
             FROM payment_methods pm
             LEFT JOIN pos_config_payment_methods pcpm
                    ON pcpm.payment_method_id = pm.id AND pcpm.pos_config_id = :config
             WHERE pm.status='active'
             ORDER BY COALESCE(pcpm.`sequence`, pm.`sequence`), pm.id",
            ['config' => $activeConfigId ?? 0]
        )->fetchAll();
        $paymentsDefault = [];
        $paymentMethodsMeta = [];
        foreach ($methodRows as $m) {
            $enabled = (int)$m['assigned_enabled'] === 1;
            $paymentsDefault[$m['name']] = $enabled;
            $paymentMethodsMeta[] = [
                'id'                => (int)$m['id'],
                'name'              => $m['name'],
                'type'              => $m['type'],
                'integration_type'  => $m['integration_type'],
                'identify_customer' => (int)$m['identify_customer'],
                'sequence'          => (int)$m['sequence'],
                'enabled'           => $enabled,
                'assigned'          => (int)$m['is_assigned'] === 1,
            ];
        }
        $defaults=['store_name'=>Auth::user()['company_name']??'Retail Store','tax_rate'=>5,'receipt_header'=>Auth::user()['company_name']??'Retail Store','receipt_footer'=>'Thank you for shopping with us!','receipt_barcode'=>true,'default_branch_id'=>Auth::user()['branch_id']??null,'cash_control'=>true,'opening_control'=>true,'maximum_difference'=>20,'payments'=>$paymentsDefault,'payment_methods'=>$paymentMethodsMeta,'pos_config_id'=>$activeConfigId,'extra_security'=>$extraSecurityDefaults];
        $rows=$this->db->query("SELECT `key`,value,type FROM settings WHERE company_id=:company AND `key` LIKE 'pos.%'",['company'=>$companyId])->fetchAll();
        foreach($rows as $row){
            $key=substr($row['key'],4);
            // 'payments' is now sourced from pos_config_payment_methods per
            // P8.1; ignore any stale settings-row copy so the UI reflects the
            // authoritative per-POS assignment.
            if ($key === 'payments' || $key === 'payment_methods') continue;
            $value=$row['value'];if($row['type']==='json')$value=json_decode($value,true);elseif($row['type']==='integer')$value=(int)$value;elseif($row['type']==='boolean')$value=(bool)$value;$defaults[$key]=$value;
        }
        return $defaults;
    }
    public function settings(): array { [, $companyId]=$this->context();return $this->settingsData($companyId); }
    public function updateSettings(array $data): array
    {
        // Settings is ERP-account gated — AccountPermissionMiddleware
        // (settings.manage) is the sole enforcement point. Do NOT also require
        // POS Advanced here, otherwise a BASIC cashier PINned in over an
        // authorised admin browser account gets 403 for a purely back-office
        // action the account is allowed to perform.
        [$user,$companyId]=$this->context();$allowed=['store_name','tax_rate','receipt_header','receipt_footer','receipt_barcode','default_branch_id','cash_control','opening_control','maximum_difference','payments','extra_security'];
        foreach($allowed as $key){
            if(!array_key_exists($key,$data))continue;
            // P8.1 — payments is a per-POS assignment, not a generic setting.
            // Skip the generic settings write; the per-config update below
            // handles it authoritatively.
            if ($key === 'payments') continue;
            $value=$data[$key];$type='string';if(is_array($value)){$value=json_encode($value);$type='json';}elseif(is_bool($value)){$value=$value?'1':'0';$type='boolean';}elseif(is_int($value)){$type='integer';}
            $this->db->query("INSERT INTO settings (company_id,`key`,value,type) VALUES (:company,:key,:value,:type) ON DUPLICATE KEY UPDATE value=VALUES(value),type=VALUES(type)",['company'=>$companyId,'key'=>'pos.'.$key,'value'=>(string)$value,'type'=>$type]);
        }
        $config=$this->resolveConfig($companyId,isset($data['default_branch_id'])?(int)$data['default_branch_id']:(isset($user['branch_id'])?(int)$user['branch_id']:null));
        // P8.1 — apply payment-method enable/disable to THIS POS config.
        if (isset($data['payments']) && is_array($data['payments'])) {
            foreach ($data['payments'] as $methodName => $enabled) {
                $pmRow = $this->db->query(
                    "SELECT id FROM payment_methods WHERE LOWER(name)=LOWER(:name) LIMIT 1",
                    ['name' => (string)$methodName]
                )->fetch();
                if (!$pmRow) continue;
                $this->db->query(
                    "INSERT INTO pos_config_payment_methods
                        (pos_config_id, payment_method_id, `sequence`, enabled)
                     VALUES (:config, :pm, 100, :en)
                     ON DUPLICATE KEY UPDATE enabled = VALUES(enabled)",
                    ['config' => $config['id'], 'pm' => $pmRow['id'], 'en' => ($enabled ? 1 : 0)]
                );
            }
            // Delete any stale generic pos.payments row so it stops shadowing.
            $this->db->query(
                "DELETE FROM settings WHERE company_id=:company AND `key`='pos.payments'",
                ['company' => $companyId]
            );
        }
        $this->db->query("UPDATE pos_configs SET cash_control=:cash,opening_control=:opening,maximum_difference=:difference WHERE id=:id AND company_id=:company",['cash'=>array_key_exists('cash_control',$data)?(!empty($data['cash_control'])?1:0):($config['cash_control']??1),'opening'=>array_key_exists('opening_control',$data)?(!empty($data['opening_control'])?1:0):($config['opening_control']??1),'difference'=>max(0,(float)($data['maximum_difference']??$config['maximum_difference']??20)),'id'=>$config['id'],'company'=>$companyId]);
        $this->log($user,$companyId,'SETTINGS_UPDATE',null,$data);return $this->settingsData($companyId);
    }
    private function settingValue(int $companyId,string $key,mixed $default): mixed{$row=$this->db->query("SELECT value FROM settings WHERE company_id=:company AND `key`=:key",['company'=>$companyId,'key'=>$key])->fetch();return $row?$row['value']:$default;}
    private function log(array $user,int $companyId,string $action,?int $recordId,array $values): void{$this->audit->create(['user_id'=>$user['id'],'company_id'=>$companyId,'module'=>'POS','action'=>$action,'record_id'=>$recordId,'new_values'=>$values,'created_at'=>date('Y-m-d H:i:s')]);}
}
