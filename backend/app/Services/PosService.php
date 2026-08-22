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
        private AuthService $auth,
        private InventoryService $inventory
    ) {}

    /**
     * Optional Curdun "Extra POS Security" (Rule #9). Odoo's default is that
     * Basic/Advanced employees perform refunds, cash out, closing variance,
     * discount overrides, and void-paid without a manager approval overlay.
     * A tenant that wants stricter behaviour enables toggles in
     * pos_settings.extra_security; only then do we require an
     * browser-safe X-Manager-Approval-ID (issued by /auth/manager-approval
     * and consumed once here). The secret token never leaves the server.
     *
     *   $action  — must match the action name the approval was issued for.
     *   $context — ['target_id'=>..., 'amount'=>...] optional constraints.
     *   $settingKey — the extra_security key (e.g. 'refund') OR a threshold
     *                 pair ['discount_above_pct'=>10.0] meaning: require
     *                 approval if $context['discount_pct'] > threshold.
     */
    private function enforceExtraSecurity(int $companyId, string $action, array $context, string|array $settingKey): ?array
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
        if (!$required) return null;

        $approvalId = isset($_SERVER['HTTP_X_MANAGER_APPROVAL_ID'])
            ? (int)$_SERVER['HTTP_X_MANAGER_APPROVAL_ID'] : null;
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $constraints = ['action' => $action, 'company_id' => $companyId];
        if (isset($context['target_type'])) $constraints['target_type'] = (string)$context['target_type'];
        if (isset($context['target_id'])) $constraints['target_id'] = (int)$context['target_id'];
        if (isset($context['amount']))    $constraints['amount']    = (float)$context['amount'];
        if (isset($context['session_id'])) $constraints['session_id'] = (int)$context['session_id'];
        // The browser only carries a safe row id. The secret token is looked
        // up and consumed inside AuthService and never exposed to JavaScript.
        return $this->auth->consumeApprovalId($approvalId, $constraints, $ip);
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
            // Inventory condition is readable at every POS level. Notification
            // read-state remains personal, but never controls condition rows.
            'stock_alerts'=>$this->stockAlertsData($companyId,(int)$user['id']),
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
        $summary=array_merge($summary,$this->inventory->getPosSummary($companyId));
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
            'inventory'=>$this->inventory->getPosProducts($companyId,true),
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
        // P11 Rule #52 — Stock alerts must be readable by every level so the
        // cross-screen "one canonical rule" invariant holds (Dashboard,
        // Products, Alerts, Reports all agree). Odoo 19 puts POS reports at
        // MINIMAL; the same principle applies here to a read-only alert list.
        [$user,$companyId]=$this->context();return $this->stockAlertsData($companyId,(int)$user['id']);
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
        $stock=$this->inventory->conditionSql('p');
        // Drive the report from live inventory, not from notification rows.
        // An alert may be read/resolved independently; the product remains in
        // this result for as long as its canonical stock condition requires it.
        return $this->db->query("SELECT a.id,p.id product_id,
                CASE WHEN {$stock['out']} THEN 'out' ELSE 'low' END severity,
                p.current_stock,p.minimum_stock,{$stock['case']} stock_status,
                GREATEST(p.minimum_stock-p.current_stock,0) needed,a.detected_at,a.last_seen_at,
                p.name product_name,p.sku,p.barcode,
                (a.id IS NOT NULL AND r.user_id IS NULL) unread,
                (a.id IS NOT NULL AND a.status='open') open_notification
            FROM products p
            LEFT JOIN pos_stock_alerts a ON a.company_id=p.company_id AND a.product_id=p.id AND a.status='open'
            LEFT JOIN pos_stock_alert_reads r ON r.alert_id=a.id AND r.user_id=:user
            WHERE p.company_id=:company AND p.deleted_at IS NULL AND p.status='active'
              AND (({$stock['out']}) OR ({$stock['low']}))
            ORDER BY ({$stock['out']}) DESC,p.name",['user'=>$userId,'company'=>$companyId])->fetchAll();
    }

    private function syncStockAlerts(int $companyId): void
    {
        $productStock=$this->inventory->conditionSql('p');
        $this->db->query("UPDATE pos_stock_alerts a LEFT JOIN products p ON p.id=a.product_id SET a.status='resolved',a.resolved_at=NOW(),a.last_seen_at=NOW() WHERE a.company_id=:company AND a.status='open' AND (p.id IS NULL OR p.deleted_at IS NOT NULL OR p.status<>'active' OR ({$productStock['normal']}))",['company'=>$companyId]);
        $products=$this->inventory->getConditionProducts($companyId);
        foreach($products as $product){$severity=(float)$product['current_stock']<=0?'out':'low';$existing=$this->db->query("SELECT id,severity,status FROM pos_stock_alerts WHERE company_id=:company AND product_id=:product",['company'=>$companyId,'product'=>$product['id']])->fetch();$changed=!$existing||$existing['status']!=='open'||$existing['severity']!==$severity;
            $this->db->query("INSERT INTO pos_stock_alerts (company_id,product_id,severity,current_stock,minimum_stock,status) VALUES (:company,:product,:severity,:stock,:minimum,'open') ON DUPLICATE KEY UPDATE detected_at=IF(status='resolved',NOW(),detected_at),severity=VALUES(severity),current_stock=VALUES(current_stock),minimum_stock=VALUES(minimum_stock),status='open',last_seen_at=NOW(),resolved_at=NULL",['company'=>$companyId,'product'=>$product['id'],'severity'=>$severity,'stock'=>$product['current_stock'],'minimum'=>$product['minimum_stock']]);
            if($changed){$alertId=$existing['id']??$this->db->lastInsertId();$this->db->query("DELETE FROM pos_stock_alert_reads WHERE alert_id=:alert",['alert'=>$alertId]);}
        }
    }

    private function dashboardData(int $companyId): array
    {
        $params=['company'=>$companyId];$inventory=$this->inventory->getPosSummary($companyId);
        return [
            'today_revenue'=>(float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id=:company AND status='COMPLETED' AND order_date=CURDATE()",$params)->fetchColumn() ?: 0),
            'gross_sales'=>(float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id=:company AND status='COMPLETED' AND total_amount>0 AND order_date=CURDATE()",$params)->fetchColumn() ?: 0),
            'refunds'=>(float)abs((float)($this->db->query("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE company_id=:company AND status='COMPLETED' AND total_amount<0 AND order_date=CURDATE()",$params)->fetchColumn() ?: 0)),
            'today_orders'=>(int)$this->db->query("SELECT COUNT(*) FROM orders WHERE company_id=:company AND status='COMPLETED' AND total_amount>0 AND order_date=CURDATE()",$params)->fetchColumn(),
            'customers'=>(int)$this->db->query("SELECT COUNT(*) FROM customers WHERE company_id=:company AND deleted_at IS NULL",$params)->fetchColumn(),
            'products'=>$inventory['total_products'],
            'normal_stock'=>$inventory['normal_products'],
            'low_stock'=>$inventory['low_stock_products'],
            'out_of_stock'=>$inventory['out_of_stock_products'],
            'inventory_cost_value'=>$inventory['inventory_cost_value'],
            'inventory_retail_value'=>$inventory['inventory_retail_value'],
            'inventory_scope'=>$inventory['inventory_scope'],
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
        return $this->inventory->getPosProducts($companyId);
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
            "SELECT c.id,c.company_id,c.customer_code,c.name,c.phone,c.email,c.address,c.credit_limit,c.balance,
                    c.loyalty_points,c.pricelist_id,pl.name pricelist_name,c.status,c.notes,c.created_at,
                    COUNT(DISTINCT o.id) total_orders,MAX(o.order_date) last_visit
             FROM customers c
             LEFT JOIN pos_pricelists pl ON pl.id=c.pricelist_id AND pl.company_id=c.company_id AND pl.active=1
             LEFT JOIN orders o ON o.customer_id=c.id AND o.status='COMPLETED'
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
        return $this->decorateStoreConfig($config);
    }

    private function normalizeStoreType(mixed $value): string
    {
        $type=strtolower(trim((string)$value));
        $aliases=['bakery'=>'bakery_food','clothes'=>'fashion','furniture'=>'furniture_home'];
        $type=$aliases[$type]??$type;
        $allowed=['retail','bakery_food','fashion','furniture_home','restaurant','electronics'];
        if(!in_array($type,$allowed,true))throw new Exception('Unsupported POS store type.',422);
        return $type;
    }

    private function storeCapabilityDefaults(string $type): array
    {
        $base=['inventory'=>true,'customer_account'=>true,'loyalty'=>true,'pricelists'=>true,'refunds'=>true,'cash_control'=>true,'variants'=>false,'batches'=>false,'expiry_tracking'=>false,'serial_numbers'=>false,'warranties'=>false,'tables'=>false,'kitchen_orders'=>false,'order_notes'=>false,'dine_in'=>false,'takeaway'=>false,'delivery'=>false];
        return array_replace($base,match($type){
            'fashion'=>['variants'=>true],
            'electronics'=>['serial_numbers'=>true,'warranties'=>true],
            'bakery_food'=>['batches'=>true,'expiry_tracking'=>true],
            'furniture_home'=>['variants'=>true,'delivery'=>true],
            'restaurant'=>['tables'=>true,'kitchen_orders'=>true,'order_notes'=>true,'dine_in'=>true,'takeaway'=>true,'delivery'=>true,'expiry_tracking'=>true],
            default=>[],
        });
    }

    private function storeCapabilityOverrideKeys(): array
    {
        return ['variants','batches','expiry_tracking','serial_numbers','warranties','tables','kitchen_orders','order_notes','dine_in','takeaway','delivery'];
    }

    private function decorateStoreConfig(array $config): array
    {
        $type=$this->normalizeStoreType($config['store_type']??$config['profile_type']??'retail');
        $overrides=json_decode((string)($config['capability_overrides']??''),true);
        if(!is_array($overrides))$overrides=[];
        $defaults=$this->storeCapabilityDefaults($type);
        $safe=[];foreach($overrides as $key=>$value)if(in_array($key,$this->storeCapabilityOverrideKeys(),true))$safe[$key]=(bool)$value;
        $config['store_type']=$type;
        $config['capability_overrides']=$safe;
        $config['capability_defaults']=$defaults;
        $config['capabilities']=array_replace($defaults,$safe);
        return $config;
    }

    /** Guard for every future store-specific service operation. */
    private function requireStoreCapability(array $config,string $capability): void
    {
        $resolved=$this->decorateStoreConfig($config);
        if(!array_key_exists($capability,$resolved['capabilities']))throw new Exception('Unknown store capability: '.$capability,422);
        if(!$resolved['capabilities'][$capability])throw new Exception('This feature is disabled for the active POS configuration.',403);
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
        // P13 - idempotency covers both IN and OUT; scoped by cash direction
        // via the action tag so a Cash In and Cash Out with the same UUID
        // don't collide (they legitimately are different intended ops).
        $idemKey = $this->idemKey($data);
        $action = 'CASH_' . $type;
        $payloadForHash = $data + ['_session' => $sessionId, '_direction' => $type];
        unset($payloadForHash['idempotency_key']);
        $replay = $this->idemBegin($companyId, $action, $idemKey, $payloadForHash);
        if ($replay !== null) return $replay;
        try {
            $session=$this->db->query("SELECT * FROM pos_sessions WHERE id=:id AND company_id=:company AND state='OPENED'",['id'=>$sessionId,'company'=>$companyId])->fetch();
            if(!$session)throw new Exception('The POS register is not open.',409);
            // Optional Curdun Extra Security (Rule #9): cash OUT can require an
            // approval token when the tenant enables the extra_security.cash_out
            // toggle. Cash IN never does — Odoo treats it as a routine deposit.
            $approval = null;
            if ($type === 'OUT') {
                $approval = $this->enforceExtraSecurity($companyId,'cash-out',['target_type'=>'pos_session','target_id'=>$sessionId,'amount'=>$amount,'session_id'=>$sessionId],'cash_out');
            }
            $this->db->query("INSERT INTO pos_cash_movements (company_id,session_id,user_id,movement_type,subtype,amount,reason) VALUES (:company,:session,:user,:type,'MANUAL',:amount,:reason)",['company'=>$companyId,'session'=>$sessionId,'user'=>$user['id'],'type'=>$type,'amount'=>$amount,'reason'=>$reason]);
            $id=(int)$this->db->lastInsertId();$this->log($user,$companyId,'CASH_'.$type,$id,['session_id'=>$sessionId,'amount'=>$amount,'reason'=>$reason,'approval_id'=>$approval['approval_id']??null,'authorized_by'=>$approval['approved_by']??null]);
            $response = ['id'=>$id,'session_id'=>$sessionId,'type'=>$type,'amount'=>$amount,'reason'=>$reason,'created_at'=>date('c')];
            $this->idemComplete($companyId, $action, $idemKey, $response);
            return $response;
        } catch (\Throwable $e) {
            $this->idemRelease($companyId, $action, $idemKey);
            throw $e;
        }
    }

    private function transactionsData(int $companyId): array
    {
        // Refund status is a computed field per Rule #16 — derived from
        // authoritative refund data so the UI can hide "Refund" on fully-
        // refunded orders and badge partial ones.
        $rows = $this->db->query(
            "SELECT o.id,o.reference_number,o.order_date,o.total_amount,o.status,o.pos_state,o.refunded_order_id,o.amount_paid,o.amount_return,o.created_at,o.pos_session_id,
                    o.loyalty_points_earned,o.loyalty_points_redeemed,o.loyalty_reward_id,o.loyalty_discount_amount,
                    c.name customer_name,u.name cashier_name,
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
        // P13 - Refund idempotency. Key is scoped to the ORIGINAL order id +
        // the client's idempotency_key so retries against the same target
        // don't double-refund. Different quantities under the same key hit
        // 409 KEY_REUSED.
        $refundKey = $this->idemKey($data);
        $payloadForHash = $data + ['_target_order' => $id];
        unset($payloadForHash['idempotency_key']);
        $replay = $this->idemBegin($companyId, 'REFUND', $refundKey, $payloadForHash);
        if ($replay !== null) return $replay;
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
            $total=round($subtotal+$tax,2);
            // Approval is scoped to the backend-calculated refund amount,
            // never the browser's payment preview. Changing lines/quantity
            // after approval therefore fails the amount constraint.
            $approval = $this->enforceExtraSecurity($companyId,'refund',['target_type'=>'order','target_id'=>$id,'amount'=>abs($total),'session_id'=>(int)$session['id']],'refund');
            $sequence=$this->nextSequence((int)$config['id']);$reference=$this->posReference($config,$sequence,'REF');$uuid=$this->uuid();
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

            // P10 - Loyalty reversal. Reverse the points EARNED proportional
            // to the refunded amount vs the original order total. Redeemed
            // rewards are NOT restored automatically (Rule #8: define
            // deterministic behaviour) - this can be extended later.
            // STRICTLY separate from Deyn: no touch to customer.balance or
            // pos_credit_ledger from this block.
            $earnedOnOriginal = (float)($order['loyalty_points_earned'] ?? 0);
            if ($earnedOnOriginal > 0.001 && $order['customer_id']) {
                $originalTotal = (float)$order['total_amount'];
                $ratio = $originalTotal > 0 ? min(1.0, abs((float)$total) / $originalTotal) : 0.0;
                $reverse = round($earnedOnOriginal * $ratio, 2);
                if ($reverse > 0.001) {
                    $bal = (float)($this->db->query(
                        "SELECT loyalty_points FROM customers WHERE id=:id AND company_id=:company FOR UPDATE",
                        ['id'=>$order['customer_id'],'company'=>$companyId]
                    )->fetchColumn() ?: 0);
                    $bal = round($bal - $reverse, 2);
                    // Find the LOYALTY_EARN row on the original order to get its program_id
                    $earnRow = $this->db->query(
                        "SELECT program_id FROM pos_loyalty_ledger WHERE order_id=:order AND type='LOYALTY_EARN' LIMIT 1",
                        ['order'=>$id]
                    )->fetch();
                    $progId = $earnRow ? (int)$earnRow['program_id'] : null;
                    if ($progId) {
                        $this->db->query(
                            "INSERT INTO pos_loyalty_ledger
                                (company_id, customer_id, program_id, order_id, session_id, cashier_id, type, points, balance_after, notes)
                             VALUES
                                (:company, :customer, :program, :order, :session, :cashier, 'LOYALTY_REFUND_REVERSAL', :points, :balance, :notes)",
                            [
                                'company'  => $companyId,
                                'customer' => $order['customer_id'],
                                'program'  => $progId,
                                'order'    => $refundId,
                                'session'  => $session['id'],
                                'cashier'  => $user['id'],
                                'points'   => -abs($reverse),
                                'balance'  => $bal,
                                'notes'    => 'Refund reversal of points earned on order ' . $id,
                            ]
                        );
                        $this->db->query(
                            "UPDATE customers SET loyalty_points = :bal WHERE id = :id AND company_id = :company",
                            ['bal' => $bal, 'id' => $order['customer_id'], 'company' => $companyId]
                        );
                    }
                }
            }

            $this->log($user,$companyId,'ORDER_REFUND',$refundId,[
                'original_order_id' => $id,
                'reference'         => $reference,
                'total'             => $total,
                'approval_id'       => $approval['approval_id']??null,
                'authorized_by'     => $approval['approved_by']??null,
                'payments'          => array_map(fn($l)=>['method'=>$l['method']['name'],'amount'=>$l['amount']], $refundPaymentLines),
            ]);
            $this->db->commit();
        } catch(\Throwable $e){
            if($this->db->getConnection()->inTransaction())$this->db->rollback();
            $this->idemRelease($companyId, 'REFUND', $refundKey);
            throw $e;
        }
        $this->syncStockAlerts($companyId);
        $response = [
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
        $this->idemComplete($companyId, 'REFUND', $refundKey, $response);
        return $response;
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
        // P13 - Real idempotency guard. The client_order_id is the intended
        // key; if absent we generate one but the guarantee only kicks in for
        // callers that reuse the SAME key on retry. Same key + same payload
        // replays the stored response. Same key + different payload rejects
        // with 409. Cross-tenant isolation via company_id in the UNIQUE.
        $clientUuid = $this->idemKey($data);
        $payloadForHash = $data; unset($payloadForHash['client_order_id'], $payloadForHash['idempotency_key'], $payloadForHash['uuid']);
        $replay = $this->idemBegin($companyId, 'CHECKOUT', $clientUuid, $payloadForHash);
        if ($replay !== null) return $replay;
        $customerId=!empty($data['customer_id'])?(int)$data['customer_id']:null;
        $customer=$customerId?$this->customer($customerId,$companyId):null;
        $config=$this->resolveConfig($companyId,isset($user['branch_id'])?(int)$user['branch_id']:null);
        $this->db->beginTransaction();
        try{
            $session=$this->currentSessionForConfig($companyId,(int)$config['id'],true);
            if(!$session||$session['state']!=='OPENED')throw new Exception('Open the POS register before validating an order.',409);

            // -------- P9 — Resolve the ACTIVE pricelist for this order --------
            //  1. Client-supplied pricelist_id: must be Available on this POS
            //     AND allowed for the acting employee.
            //  2. Otherwise: use customer's preferred pricelist if it is
            //     Available on this POS.
            //  3. Otherwise: fall back to the POS default pricelist.
            //  4. Otherwise (no pricelists configured): NULL — use base prices.
            $requestedPricelistId = isset($data['pricelist_id']) ? (int)$data['pricelist_id'] : 0;
            if ($requestedPricelistId > 0 && !PosAccess::can('pos.pricelist_select')) {
                throw new Exception('Your POS access level cannot manually select a pricelist.', 403);
            }
            $activePricelist = $this->resolvePricelistForOrder(
                $companyId,
                (int)$config['id'],
                $requestedPricelistId,
                $customerId,
                $data['pricelist_id'] ?? null
            );
            $pricelistId = $activePricelist ? (int)$activePricelist['id'] : null;
            $pricelistName = $activePricelist['name'] ?? null;

            // Backwards-compat legacy flag: {wholesale:true} on a line switches
            // that line to the Wholesale pricelist. New callers use pricelist_id.
            $legacyWholesalePricelist = null;
            if ($items) {
                foreach ($items as $legacyLine) {
                    if (!empty($legacyLine['wholesale'])) {
                        $wl = $this->db->query(
                            "SELECT pl.*
                             FROM pos_pricelists pl
                             JOIN pos_config_pricelists pcpl ON pcpl.pricelist_id = pl.id
                             WHERE pl.company_id = :company AND pcpl.pos_config_id = :config
                               AND LOWER(pl.name) = 'wholesale' AND pl.active = 1
                             LIMIT 1",
                            ['company' => $companyId, 'config' => $config['id']]
                        )->fetch();
                        if ($wl) $legacyWholesalePricelist = $wl;
                        break;
                    }
                }
            }

            // P11 Rule #10 — AGGREGATE per-product quantity across all lines
            // BEFORE the row-lock loop, so two lines of qty 3 on a stock=5
            // product get rejected up front instead of silently over-selling.
            $aggregatedQty = [];
            foreach ($items as $it) {
                $pid = (int)($it['product_id'] ?? $it['id'] ?? 0);
                $q   = (float)($it['quantity'] ?? $it['qty'] ?? 0);
                if ($pid <= 0 || $q <= 0) throw new Exception('Invalid checkout item.', 422);
                $aggregatedQty[$pid] = ($aggregatedQty[$pid] ?? 0) + $q;
            }
            // Stable lock order prevents two concurrent final-unit checkouts
            // from both passing the availability probe (and avoids deadlocks
            // when carts contain the same products in a different order).
            ksort($aggregatedQty, SORT_NUMERIC);
            foreach ($aggregatedQty as $pid => $totalQty) {
                $probe = $this->db->query(
                    "SELECT name, current_stock FROM products
                     WHERE id = :id AND company_id = :company AND deleted_at IS NULL
                     FOR UPDATE",
                    ['id' => $pid, 'company' => $companyId]
                )->fetch();
                if (!$probe) throw new Exception('A product was not found.', 404);
                if ((float)$probe['current_stock'] < $totalQty) {
                    throw new Exception("Insufficient stock for {$probe['name']}.", 409);
                }
            }
            $subtotal=0;$normalized=[];
            foreach($items as $item){
                $productId=(int)($item['product_id']??$item['id']??0);$qty=(float)($item['quantity']??$item['qty']??0);
                if($productId<=0||$qty<=0)throw new Exception('Invalid checkout item.',422);
                $p=$this->db->query("SELECT * FROM products WHERE id=:id AND company_id=:company AND deleted_at IS NULL FOR UPDATE",['id'=>$productId,'company'=>$companyId])->fetch();
                if(!$p)throw new Exception('A product was not found.',404);if((float)$p['current_stock']<$qty)throw new Exception("Insufficient stock for {$p['name']}.",409);

                // P9 — server-side price resolution. NEVER trusts client
                // `unit_price` (Rule #18 — a modified HTTP request cannot
                // buy a $12 item for $1). Legacy wholesale flag routes
                // through the Wholesale pricelist if it exists.
                $linePricelist = (!empty($item['wholesale']) && $legacyWholesalePricelist)
                    ? $legacyWholesalePricelist
                    : $activePricelist;
                $priceResult = $this->resolveUnitPrice(
                    $p, $qty, $linePricelist, date('Y-m-d')
                );
                $unit = $priceResult['unit_price'];
                $basePrice = $priceResult['base_price'];
                $pricelistPrice = $priceResult['pricelist_price'];
                $matchedItemId = $priceResult['pricelist_item_id'];

                $discount=max(0,min(100,(float)($item['discount_percent']??0)));
                $line=round($unit*$qty*(1-$discount/100),2);
                $subtotal+=$line;
                $normalized[]=[
                    'product'          => $p,
                    'quantity'         => $qty,
                    'unit_price'       => $unit,
                    'base_price'       => $basePrice,
                    'pricelist_price'  => $pricelistPrice,
                    'pricelist_item_id'=> $matchedItemId,
                    'discount_percent' => $discount,
                    'subtotal'         => $line,
                ];
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

            // -------- P10 - Loyalty redemption (order-level discount) -----
            // Client supplies loyalty_reward_id + loyalty_program_id. Backend
            // recalculates cost + discount from the CONFIGURED reward - never
            // trusts a client-supplied points_cost or reward_value (Rule #11).
            // Redemption reduces the order total BEFORE payment allocation
            // so the payment lines must sum to the discounted total.
            $loyaltyRedeem = null;
            if (!empty($data['loyalty_reward_id']) && $customerId) {
                if (!PosAccess::can('pos.loyalty_operate')) {
                    throw new Exception('Your POS access level cannot apply loyalty rewards.', 403);
                }
                $reward = $this->db->query(
                    "SELECT r.*, p.company_id AS program_company_id, p.name AS program_name
                     FROM pos_loyalty_rewards r
                     JOIN pos_loyalty_programs p ON p.id = r.program_id
                     WHERE r.id = :id AND r.active = 1 AND p.active = 1
                       AND p.company_id = :company
                     LIMIT 1",
                    ['id' => (int)$data['loyalty_reward_id'], 'company' => $companyId]
                )->fetch();
                if (!$reward) throw new Exception('Loyalty reward not available.', 422);
                // Verify the customer owns enough points BEFORE any deduction
                $balance = (float)($this->db->query(
                    "SELECT loyalty_points FROM customers WHERE id=:id AND company_id=:company",
                    ['id'=>$customerId,'company'=>$companyId]
                )->fetchColumn() ?: 0);
                $cost = round((float)$reward['points_cost'], 2);
                if ($balance + 0.0001 < $cost) {
                    throw new Exception('Customer does not have enough loyalty points to redeem this reward.', 422);
                }
                // Compute the discount amount (fixed, percent, or free product value)
                $discountAmount = 0.0;
                if ($reward['reward_type'] === 'discount_amount') {
                    $discountAmount = round((float)$reward['discount_amount'], 2);
                } elseif ($reward['reward_type'] === 'discount_percent') {
                    $discountAmount = round($total * ((float)$reward['discount_percent'] / 100), 2);
                }
                // Never let the reward reduce the total below zero.
                $discountAmount = min($discountAmount, $total);
                $total = round($total - $discountAmount, 2);
                $loyaltyRedeem = [
                    'reward' => $reward,
                    'cost'   => $cost,
                    'discount_amount' => $discountAmount,
                    'new_balance'     => round($balance - $cost, 2),
                ];
            }

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
            // P10 - Compute points earned (order-total based; program rules
            // can override in a follow-up). Points ONLY awarded when there
            // is a selected customer AND an active LOYALTY program.
            $pointsEarned = 0.0;
            $loyaltyProgram = null;
            if ($customerId) {
                $loyaltyProgram = $this->db->query(
                    "SELECT * FROM pos_loyalty_programs
                     WHERE company_id = :company AND active = 1 AND program_type = 'LOYALTY'
                       AND (start_date IS NULL OR start_date <= CURDATE())
                       AND (end_date   IS NULL OR end_date   >= CURDATE())
                     ORDER BY id LIMIT 1",
                    ['company' => $companyId]
                )->fetch();
                if ($loyaltyProgram) {
                    $eligibleAmount = $total;
                    if ($eligibleAmount >= (float)$loyaltyProgram['minimum_purchase']) {
                        $pointsEarned = round($eligibleAmount * (float)$loyaltyProgram['points_per_currency'], 2);
                    }
                }
            }
            $redeemedPoints = $loyaltyRedeem ? $loyaltyRedeem['cost'] : 0.0;
            $rewardId       = $loyaltyRedeem ? (int)$loyaltyRedeem['reward']['id'] : null;
            $rewardDiscount = $loyaltyRedeem ? $loyaltyRedeem['discount_amount'] : 0.0;

            $this->db->query("INSERT INTO orders (company_id,customer_id,user_id,warehouse_id,pos_session_id,pricelist_id,pricelist_name,loyalty_points_earned,loyalty_points_redeemed,loyalty_reward_id,loyalty_discount_amount,uuid,sequence_number,reference_number,status,pos_state,order_date,subtotal,tax_amount,discount_amount,total_amount,amount_paid,amount_return,to_invoice,notes) VALUES (:company,:customer,:user,:warehouse,:session,:pricelist_id,:pricelist_name,:pts_earned,:pts_redeemed,:reward_id,:reward_discount,:uuid,:sequence,:reference,'COMPLETED','done',CURDATE(),:subtotal,:tax,:discount,:total,:paid,:returned,:invoice,:notes)",
                ['company'=>$companyId,'customer'=>$customerId,'user'=>$user['id'],'warehouse'=>$data['warehouse_id']??null,'session'=>$session['id'],'pricelist_id'=>$pricelistId,'pricelist_name'=>$pricelistName,'pts_earned'=>$pointsEarned,'pts_redeemed'=>$redeemedPoints,'reward_id'=>$rewardId,'reward_discount'=>$rewardDiscount,'uuid'=>$clientUuid,'sequence'=>$sequence,'reference'=>$reference,'subtotal'=>$subtotal,'tax'=>$tax,'discount'=>$discount,'total'=>$total,'paid'=>$tendered-$change,'returned'=>$change,'invoice'=>$toInvoice?1:0,'notes'=>$data['notes']??null]);
            $orderId=(int)$this->db->lastInsertId();
            foreach($normalized as $line){$p=$line['product'];$after=(float)$p['current_stock']-$line['quantity'];
                // P9 — snapshot base_price + pricelist_price + pricelist_item_id
                // per line so refund/receipt/report can render Rule #10-safe
                // historical pricing regardless of later pricelist edits.
                $this->db->query("INSERT INTO order_items (order_id,line_uuid,product_id,quantity,unit_price,base_price,pricelist_price,pricelist_item_id,discount,discount_percent,tax_rate,tax_amount,total) VALUES (:order,:uuid,:product,:quantity,:price,:base_price,:pricelist_price,:pricelist_item_id,:discount_amount,:discount,:rate,:tax,:total)",['order'=>$orderId,'uuid'=>$this->uuid(),'product'=>$p['id'],'quantity'=>$line['quantity'],'price'=>$line['unit_price'],'base_price'=>$line['base_price'],'pricelist_price'=>$line['pricelist_price'],'pricelist_item_id'=>$line['pricelist_item_id'],'discount_amount'=>round($line['unit_price']*$line['quantity']-$line['subtotal'],2),'discount'=>$line['discount_percent'],'rate'=>$line['tax_rate'],'tax'=>$line['tax'],'total'=>$line['total']]);
                // P11 Rule #10 — Use a RELATIVE UPDATE so two lines of the
                // same product decrement from the live DB value, not from a
                // stale $p['current_stock'] captured earlier. Then re-read
                // the actual after-value for the stock_movements row.
                $this->db->query("UPDATE products SET current_stock = current_stock - :qty WHERE id=:id",['qty'=>$line['quantity'],'id'=>$p['id']]);
                $liveAfter = (float)$this->db->query("SELECT current_stock FROM products WHERE id=:id",['id'=>$p['id']])->fetchColumn();
                $liveBefore = $liveAfter + (float)$line['quantity'];
                $this->db->query("INSERT INTO stock_movements (product_id,warehouse_id,user_id,reference_type,reference_id,type,quantity,quantity_before,quantity_after,notes) VALUES (:product,:warehouse,:user,'POS_ORDER',:reference,'SALE',:quantity,:before,:after,'Retail POS sale')",['product'=>$p['id'],'warehouse'=>$data['warehouse_id']??null,'user'=>$user['id'],'reference'=>$orderId,'quantity'=>-$line['quantity'],'before'=>$liveBefore,'after'=>$liveAfter]);
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
            // P10 - Loyalty ledger writes. STRICTLY SEPARATE from Deyn:
            //   - Redemption (customer spending points on this order): write
            //     LOYALTY_REDEEM BEFORE the earn so balance_after chains
            //     correctly. Decrements customer.loyalty_points.
            //   - Earn (points awarded for the sale itself): write
            //     LOYALTY_EARN. Increments customer.loyalty_points.
            //   NEVER touches customer.balance or pos_credit_ledger.
            if ($customerId && ($loyaltyRedeem || $pointsEarned > 0.001) && $loyaltyProgram) {
                $runningBalance = (float)($this->db->query(
                    "SELECT loyalty_points FROM customers WHERE id=:id AND company_id=:company FOR UPDATE",
                    ['id'=>$customerId,'company'=>$companyId]
                )->fetchColumn() ?: 0);
                if ($loyaltyRedeem) {
                    $runningBalance = round($runningBalance - $loyaltyRedeem['cost'], 2);
                    $this->db->query(
                        "INSERT INTO pos_loyalty_ledger
                            (company_id, customer_id, program_id, order_id, session_id, cashier_id, reward_id, type, points, balance_after, notes)
                         VALUES
                            (:company, :customer, :program, :order, :session, :cashier, :reward, 'LOYALTY_REDEEM', :points, :balance, :notes)",
                        [
                            'company'  => $companyId,
                            'customer' => $customerId,
                            'program'  => $loyaltyRedeem['reward']['program_id'],
                            'order'    => $orderId,
                            'session'  => $session['id'],
                            'cashier'  => $user['id'],
                            'reward'   => $loyaltyRedeem['reward']['id'],
                            'points'   => -abs($loyaltyRedeem['cost']),
                            'balance'  => $runningBalance,
                            'notes'    => 'Redeemed reward "' . $loyaltyRedeem['reward']['name'] . '" on order ' . $reference,
                        ]
                    );
                }
                if ($pointsEarned > 0.001) {
                    $runningBalance = round($runningBalance + $pointsEarned, 2);
                    $this->db->query(
                        "INSERT INTO pos_loyalty_ledger
                            (company_id, customer_id, program_id, order_id, session_id, cashier_id, type, points, balance_after, notes)
                         VALUES
                            (:company, :customer, :program, :order, :session, :cashier, 'LOYALTY_EARN', :points, :balance, :notes)",
                        [
                            'company'  => $companyId,
                            'customer' => $customerId,
                            'program'  => $loyaltyProgram['id'],
                            'order'    => $orderId,
                            'session'  => $session['id'],
                            'cashier'  => $user['id'],
                            'points'   => $pointsEarned,
                            'balance'  => $runningBalance,
                            'notes'    => 'Points earned on order ' . $reference,
                        ]
                    );
                }
                // customer.loyalty_points MUST equal SUM(ledger.points) for
                // this customer -- update it in the same transaction as the
                // ledger writes so the invariant never drifts.
                $this->db->query(
                    "UPDATE customers SET loyalty_points = :bal WHERE id = :id AND company_id = :company",
                    ['bal' => $runningBalance, 'id' => $customerId, 'company' => $companyId]
                );
            }

            $this->log($user,$companyId,'CHECKOUT',$orderId,['reference'=>$reference,'uuid'=>$clientUuid,'session_id'=>$session['id'],'total'=>$total,'payments'=>array_map(fn($p)=>['method'=>$p['method']['name'],'amount'=>$p['amount']],$payments),'change'=>$change,'loyalty_earned'=>$pointsEarned,'loyalty_redeemed'=>$redeemedPoints]);$this->db->commit();
        }catch(\Throwable $e){
            if($this->db->getConnection()->inTransaction())$this->db->rollback();
            // Release the idempotency reservation so a fresh retry can proceed.
            $this->idemRelease($companyId, 'CHECKOUT', $clientUuid);
            throw $e;
        }
        $this->syncStockAlerts($companyId);
        $response = $this->checkoutResponse($orderId,$companyId,false);
        if (!empty($creditWarning)) $response['credit_warning'] = $creditWarning;
        $this->idemComplete($companyId, 'CHECKOUT', $clientUuid, $response);
        return $response;
    }

    /**
     * P14.2 — side-effect-free authoritative cart quotation.
     *
     * The browser sends identity and quantities only. Product prices,
     * pricelist rules, discounts, loyalty and warnings are all recomputed
     * from tenant-scoped database state. No stock rows are mutated or locked.
     */
    public function quote(array $data): array
    {
        [$user, $companyId] = $this->context();
        $items = $data['items'] ?? [];
        if (!is_array($items)) throw new Exception('Quote items must be an array.', 422);

        $customerId = !empty($data['customer_id']) ? (int)$data['customer_id'] : null;
        $customer = $customerId ? $this->customer($customerId, $companyId) : null;
        $config = $this->resolveConfig($companyId, isset($user['branch_id']) ? (int)$user['branch_id'] : null);
        $requestedPricelistId = isset($data['pricelist_id']) ? (int)$data['pricelist_id'] : 0;
        if ($requestedPricelistId > 0 && !PosAccess::can('pos.pricelist_select')) {
            throw new Exception('Your POS access level cannot manually select a pricelist.', 403);
        }
        $pricelist = $this->resolvePricelistForOrder(
            $companyId, (int)$config['id'], $requestedPricelistId, $customerId,
            $data['pricelist_id'] ?? null
        );

        $lines = [];
        $subtotal = 0.0;
        $manualDiscountTotal = 0.0;
        $warnings = [];
        foreach ($items as $item) {
            $productId = (int)($item['product_id'] ?? $item['id'] ?? 0);
            $qty = (float)($item['quantity'] ?? $item['qty'] ?? 0);
            if ($productId <= 0 || $qty <= 0) throw new Exception('Invalid quote item.', 422);
            $product = $this->db->query(
                "SELECT * FROM products WHERE id=:id AND company_id=:company AND deleted_at IS NULL",
                ['id'=>$productId, 'company'=>$companyId]
            )->fetch();
            if (!$product) throw new Exception('A product was not found.', 404);

            $price = $this->resolveUnitPrice($product, $qty, $pricelist, date('Y-m-d'));
            $manualPct = max(0.0, min(100.0, (float)($item['discount_percent'] ?? 0)));
            $beforeManual = round($price['unit_price'] * $qty, 2);
            $manualAmount = round($beforeManual * $manualPct / 100, 2);
            $lineSubtotal = round($beforeManual - $manualAmount, 2);
            $subtotal += $lineSubtotal;
            $manualDiscountTotal += $manualAmount;
            if ((float)$product['current_stock'] < $qty) {
                $warnings[] = [
                    'code'=>'INSUFFICIENT_STOCK', 'severity'=>'error',
                    'product_id'=>$productId,
                    'message'=>"Insufficient stock for {$product['name']}.",
                ];
            }
            $lines[] = [
                'product_id'       => $productId,
                'product_name'     => $product['name'],
                'qty'              => $qty,
                'base_price'       => $price['base_price'],
                'pricelist_price'  => $price['pricelist_price'],
                'applied_rule'     => $price['applied_rule'] ?? null,
                'loyalty_discount' => 0.0,
                'manual_discount'  => $manualAmount,
                'manual_discount_percent' => $manualPct,
                'final_unit_price' => $price['unit_price'],
                'line_subtotal'    => $lineSubtotal,
                'available_stock'  => (float)$product['current_stock'],
            ];
        }

        $subtotal = round($subtotal, 2);
        $taxRate = (float)$this->settingValue($companyId, 'pos.tax_rate', 5);
        $tax = round($subtotal * $taxRate / 100, 2);
        $beforeReward = round($subtotal + $tax, 2);

        $program = null;
        $eligibleRewards = [];
        $currentPoints = $customer ? round((float)($customer['loyalty_points'] ?? 0), 2) : 0.0;
        if ($customer) {
            $program = $this->db->query(
                "SELECT * FROM pos_loyalty_programs
                 WHERE company_id=:company AND active=1 AND program_type='LOYALTY'
                   AND (start_date IS NULL OR start_date<=CURDATE())
                   AND (end_date IS NULL OR end_date>=CURDATE())
                 ORDER BY id LIMIT 1",
                ['company'=>$companyId]
            )->fetch() ?: null;
            if ($program) {
                $rewards = $this->db->query(
                    "SELECT id,name,reward_type,points_cost,discount_percent,discount_amount,reward_product_id,`sequence`
                     FROM pos_loyalty_rewards WHERE program_id=:program AND active=1
                     ORDER BY `sequence`,id",
                    ['program'=>$program['id']]
                )->fetchAll();
                $eligibleRewards = array_values(array_filter($rewards, fn($r) => (float)$r['points_cost'] <= $currentPoints + 0.0001));
            }
        }

        $reward = null;
        $loyaltyDiscount = 0.0;
        $redeemedPoints = 0.0;
        if (!empty($data['loyalty_reward_id'])) {
            if (!$customer) throw new Exception('Select a customer before applying a loyalty reward.', 422);
            if (!PosAccess::can('pos.loyalty_operate')) throw new Exception('Your POS access level cannot apply loyalty rewards.', 403);
            foreach ($eligibleRewards as $candidate) {
                if ((int)$candidate['id'] === (int)$data['loyalty_reward_id']) { $reward = $candidate; break; }
            }
            if (!$reward) throw new Exception('Loyalty reward is not currently eligible.', 422);
            $redeemedPoints = round((float)$reward['points_cost'], 2);
            if ($reward['reward_type'] === 'discount_amount') $loyaltyDiscount = round((float)$reward['discount_amount'], 2);
            elseif ($reward['reward_type'] === 'discount_percent') $loyaltyDiscount = round($beforeReward * (float)$reward['discount_percent'] / 100, 2);
            $loyaltyDiscount = min($loyaltyDiscount, $beforeReward);
        }
        $total = round($beforeReward - $loyaltyDiscount, 2);
        $pointsEarned = ($program && $total >= (float)$program['minimum_purchase'])
            ? round($total * (float)$program['points_per_currency'], 2) : 0.0;

        $debtAmount = 0.0;
        foreach (($data['payments'] ?? []) as $payment) {
            if (empty($payment['method'])) continue;
            $method = $this->paymentMethod((string)$payment['method']);
            $this->assertPaymentEnabled($companyId, $method['name'], (int)$config['id']);
            if ($method['type'] === 'credit' || !empty($method['identify_customer'])) {
                $debtAmount += max(0, (float)($payment['amount'] ?? 0));
            }
        }
        if ($customer && $debtAmount > 0) {
            $projected = round((float)$customer['balance'] + $debtAmount, 2);
            $limit = round((float)$customer['credit_limit'], 2);
            if ($limit > 0 && $projected > $limit) $warnings[] = [
                'code'=>'CREDIT_LIMIT', 'severity'=>'warning', 'mode'=>'warn',
                'current_balance'=>round((float)$customer['balance'],2), 'new_credit'=>round($debtAmount,2),
                'projected_balance'=>$projected, 'credit_limit'=>$limit,
                'message'=>'This sale exceeds the customer credit limit.',
            ];
        }

        return [
            'customer'=>$customer ? ['id'=>(int)$customer['id'],'name'=>$customer['name']] : null,
            'pricelist'=>$pricelist ? ['id'=>(int)$pricelist['id'],'name'=>$pricelist['name']] : null,
            'lines'=>$lines,
            'subtotal'=>$subtotal,
            'tax_rate'=>$taxRate,
            'tax'=>$tax,
            'discounts'=>['manual'=>round($manualDiscountTotal,2),'loyalty'=>$loyaltyDiscount,'total'=>round($manualDiscountTotal+$loyaltyDiscount,2)],
            'total'=>$total,
            'loyalty'=>[
                'current_points'=>$currentPoints,
                'eligible_rewards'=>$eligibleRewards,
                'selected_reward'=>$reward,
                'redeemed_points'=>$redeemedPoints,
                'points_earned'=>$pointsEarned,
                'projected_points'=>round($currentPoints-$redeemedPoints+$pointsEarned,2),
            ],
            'warnings'=>$warnings,
        ];
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

    // =========================================================================
    // P13 - Backend idempotency for financial mutations
    // =========================================================================
    //
    // Contract:
    //   Same (company_id, action, idempotency_key)
    //     + same request_hash  -> replay the stored response.
    //   Same key + DIFFERENT request_hash -> 409 KEY_REUSED.
    //   Different key         -> new operation.
    //   Cross-tenant collision on the UUID is impossible because company_id
    //     is part of the UNIQUE constraint; Company B cannot read A's row.
    //
    // Reservation is atomic via the UNIQUE key: a lost race INSERT throws
    // SQLSTATE 23000 and the loser falls back to the read/replay branch.
    // On failure of the wrapped operation, the reservation row is DELETED
    // so a fresh retry with the same key succeeds — never "stuck PROCESSING".

    private function requestHash(array $payload): string
    {
        // Canonical sort so key order doesn't affect the hash.
        $canonical = function(array $arr) use (&$canonical) {
            ksort($arr);
            foreach ($arr as $k => $v) if (is_array($v)) $arr[$k] = $canonical($v);
            return $arr;
        };
        return hash('sha256', json_encode($canonical($payload)));
    }

    /**
     * Split-phase idempotency helpers. Callers use this shape:
     *
     *   $key = $this->idemKey($data);        // pick or generate
     *   $existing = $this->idemBegin($companyId, 'CHECKOUT', $key, $data);
     *   if ($existing !== null) return $existing;   // replay stored response
     *   try {
     *       ... existing operation body ...
     *       $result = ...;                   // MUST include 'id' when applicable
     *       $this->idemComplete($companyId, 'CHECKOUT', $key, $result);
     *       return $result;
     *   } catch (\Throwable $e) {
     *       $this->idemRelease($companyId, 'CHECKOUT', $key);
     *       throw $e;
     *   }
     */
    private function idemKey(array $data): string
    {
        $raw = trim((string)($data['idempotency_key'] ?? $data['client_order_id'] ?? $data['uuid'] ?? ''));
        if ($raw === '' || !preg_match('/^[a-f0-9\-]{8,64}$/i', $raw)) return $this->uuid();
        return $raw;
    }

    /**
     * P13 fix - The unique scope now includes pos_config_id so the same UUID
     * accidentally reused at Bakaara POS and Airport POS in the same company
     * does NOT collide. Callers that don't know a config pass 0 (the shared
     * bucket for events that aren't POS-config scoped, e.g. company-wide
     * settlement without a live session).
     */
    private function activeConfigId(int $companyId): int
    {
        try {
            $user = \Core\Auth::user() ?: [];
            $branchId = isset($user['branch_id']) ? (int)$user['branch_id'] : null;
            $config = $this->resolveConfig($companyId, $branchId);
            return (int)$config['id'];
        } catch (\Throwable $e) { return 0; }
    }

    private function idemBegin(int $companyId, string $action, string $key, array $payload): ?array
    {
        $hash = $this->requestHash($payload);
        $configId = $this->activeConfigId($companyId);
        try {
            $this->db->query(
                "INSERT INTO pos_idempotency_keys
                    (company_id, pos_config_id, action, idempotency_key, request_hash, status)
                 VALUES (:company, :config, :action, :key, :hash, 'PROCESSING')",
                ['company' => $companyId, 'config' => $configId, 'action' => $action, 'key' => $key, 'hash' => $hash]
            );
            return null; // caller proceeds
        } catch (\PDOException $e) {
            if (!in_array((string)$e->getCode(), ['23000', '23505'], true)) throw $e;
            $row = $this->db->query(
                "SELECT * FROM pos_idempotency_keys
                 WHERE company_id=:company AND pos_config_id=:config
                   AND action=:action AND idempotency_key=:key LIMIT 1",
                ['company' => $companyId, 'config' => $configId, 'action' => $action, 'key' => $key]
            )->fetch();
            if (!$row) throw $e;
            if ($row['request_hash'] !== $hash) {
                throw new Exception('Idempotency key already used with a different request. Generate a new key for a new operation.', 409);
            }
            if ($row['status'] === 'PROCESSING') {
                throw new Exception('This operation is already being processed. Retry momentarily.', 409);
            }
            $prior = json_decode($row['response_data'], true) ?? [];
            $prior['idempotent_replay'] = true;
            return $prior;
        }
    }

    private function idemComplete(int $companyId, string $action, string $key, array $result): void
    {
        $configId = $this->activeConfigId($companyId);
        $this->db->query(
            "UPDATE pos_idempotency_keys
             SET status='COMPLETED', response_data=:body, entity_id=:eid, http_status=201, completed_at=NOW()
             WHERE company_id=:company AND pos_config_id=:config AND action=:action AND idempotency_key=:key",
            [
                'body'    => json_encode($result),
                'eid'     => is_numeric($result['id'] ?? null) ? (int)$result['id'] : null,
                'company' => $companyId,
                'config'  => $configId,
                'action'  => $action,
                'key'     => $key,
            ]
        );
    }

    private function idemRelease(int $companyId, string $action, string $key): void
    {
        $configId = $this->activeConfigId($companyId);
        $this->db->query(
            "DELETE FROM pos_idempotency_keys
             WHERE company_id=:company AND pos_config_id=:config
               AND action=:action AND idempotency_key=:key AND status='PROCESSING'",
            ['company' => $companyId, 'config' => $configId, 'action' => $action, 'key' => $key]
        );
    }

    /**
     * @param string   $action  CHECKOUT | REFUND | CASH_MOVEMENT | CUSTOMER_ACCOUNT_PAYMENT
     * @param string   $key     Client-supplied UUID
     * @param array    $payload The request body (used for request_hash)
     * @param callable $do      fn(): array — the actual operation. Return
     *                          value becomes response_data. Must be safe to
     *                          NOT run if a duplicate is detected.
     * @param array    $extras  Optional pos_config_id / session_id snapshot.
     * @return array [ 'result' => mixed, 'replayed' => bool ]
     */
    private function withIdempotency(int $companyId, string $action, string $key, array $payload, callable $do, array $extras = []): array
    {
        if ($key === '' || !preg_match('/^[a-f0-9\-]{8,64}$/i', $key)) {
            // Auto-generate a key if the client didn't send one — protects
            // legacy callers, but the guarantee only kicks in for callers
            // that send a stable key across retries.
            $key = $this->uuid();
        }
        $hash = $this->requestHash($payload);

        try {
            $this->db->query(
                "INSERT INTO pos_idempotency_keys
                    (company_id, pos_config_id, session_id, action, idempotency_key, request_hash, status)
                 VALUES
                    (:company, :config, :session, :action, :key, :hash, 'PROCESSING')",
                [
                    'company' => $companyId,
                    'config'  => $extras['pos_config_id'] ?? null,
                    'session' => $extras['session_id'] ?? null,
                    'action'  => $action,
                    'key'     => $key,
                    'hash'    => $hash,
                ]
            );
        } catch (\PDOException $e) {
            // Duplicate key hit — investigate the existing row.
            if (!in_array((string)$e->getCode(), ['23000', '23505'], true)) {
                throw $e; // real DB error, bubble up
            }
            $existing = $this->db->query(
                "SELECT * FROM pos_idempotency_keys
                 WHERE company_id = :company AND action = :action AND idempotency_key = :key
                 LIMIT 1",
                ['company' => $companyId, 'action' => $action, 'key' => $key]
            )->fetch();
            if (!$existing) throw $e; // race + gone; unexpected
            if ($existing['request_hash'] !== $hash) {
                throw new Exception('Idempotency key already used with a different request. If this is a new operation, generate a new key.', 409);
            }
            if ($existing['status'] === 'PROCESSING') {
                // Another concurrent request holds the reservation.
                throw new Exception('This operation is already being processed. Retry momentarily.', 409);
            }
            // COMPLETED — replay the stored response.
            return [
                'result'   => json_decode($existing['response_data'], true) ?? [],
                'replayed' => true,
            ];
        }

        // Ownership secured. Run the actual operation.
        try {
            $result = $do($key);
            $this->db->query(
                "UPDATE pos_idempotency_keys
                 SET status='COMPLETED', response_data = :body, http_status = 201,
                     entity_type = :etype, entity_id = :eid, completed_at = NOW()
                 WHERE company_id = :company AND action = :action AND idempotency_key = :key",
                [
                    'body'    => json_encode($result),
                    'etype'   => $extras['entity_type'] ?? null,
                    'eid'     => is_array($result) ? ($result['id'] ?? null) : null,
                    'company' => $companyId,
                    'action'  => $action,
                    'key'     => $key,
                ]
            );
            return ['result' => $result, 'replayed' => false];
        } catch (\Throwable $e) {
            // Operation failed — release the reservation so a fresh retry
            // (with the SAME key) can proceed cleanly. Never leave the row
            // in PROCESSING forever.
            $this->db->query(
                "DELETE FROM pos_idempotency_keys
                 WHERE company_id = :company AND action = :action AND idempotency_key = :key
                   AND status = 'PROCESSING'",
                ['company' => $companyId, 'action' => $action, 'key' => $key]
            );
            throw $e;
        }
    }

    // =========================================================================
    // P9 — Pricing engine (Odoo 19 Flexible Pricelists)
    // =========================================================================

    /**
     * Resolve which pricelist applies to an entire order. Priority:
     *   1. Explicit client-supplied pricelist_id (only if Available on this
     *      POS and, for a rejection-safe check, the browser is authorized
     *      per Odoo Basic Rights to switch — enforced by the route + here).
     *   2. Selected customer's preferred pricelist (customers.pricelist_id)
     *      if it is Available on this POS.
     *   3. POS default pricelist (pos_config_pricelists.is_default=1).
     *   4. NULL — engine falls back to product.selling_price.
     */
    private function resolvePricelistForOrder(int $companyId, int $configId, int $requestedId, ?int $customerId, mixed $requestedRaw): ?array
    {
        // 1. Explicit request. If invalid or unassigned, reject — the browser
        //    should not silently downgrade to a different pricelist.
        if ($requestedId > 0) {
            $row = $this->db->query(
                "SELECT pl.*
                 FROM pos_pricelists pl
                 JOIN pos_config_pricelists pcpl ON pcpl.pricelist_id = pl.id
                 WHERE pl.id = :id AND pl.company_id = :company AND pl.active = 1
                   AND pcpl.pos_config_id = :config
                 LIMIT 1",
                ['id' => $requestedId, 'company' => $companyId, 'config' => $configId]
            )->fetch();
            if (!$row) throw new Exception('Requested pricelist is not available on this POS.', 422);
            return $row;
        }

        // 2. Customer preferred pricelist.
        if ($customerId) {
            $row = $this->db->query(
                "SELECT pl.*
                 FROM customers c
                 JOIN pos_pricelists pl        ON pl.id = c.pricelist_id
                 JOIN pos_config_pricelists pcpl ON pcpl.pricelist_id = pl.id
                 WHERE c.id = :cust AND c.company_id = :company AND pl.active = 1
                   AND pcpl.pos_config_id = :config
                 LIMIT 1",
                ['cust' => $customerId, 'company' => $companyId, 'config' => $configId]
            )->fetch();
            if ($row) return $row;
        }

        // 3. POS default.
        $row = $this->db->query(
            "SELECT pl.*
             FROM pos_config_pricelists pcpl
             JOIN pos_pricelists pl ON pl.id = pcpl.pricelist_id
             WHERE pcpl.pos_config_id = :config AND pcpl.is_default = 1 AND pl.active = 1
             ORDER BY pcpl.`sequence`, pl.id
             LIMIT 1",
            ['config' => $configId]
        )->fetch();
        return $row ?: null;
    }

    /**
     * Resolve the unit price for one order line under a given pricelist +
     * date. Rule precedence (Odoo-documented, Rule #16 deterministic):
     *   1. applies_to = 'product'  AND product_id  = $productId   (highest)
     *   2. applies_to = 'category' AND category_id = product.category
     *   3. applies_to = 'all'                                    (lowest)
     * Within same specificity, ORDER BY `sequence` ASC then id. Only items
     * whose min_quantity <= qty AND (start_date IS NULL OR <= date) AND
     * (end_date IS NULL OR >= date) are considered.
     *
     * Result is {unit_price, base_price, pricelist_price, pricelist_item_id}
     * so the checkout can snapshot every stage for Rule #10 historical
     * integrity (base / pricelist / final visible on the receipt & reports).
     */
    private function resolveUnitPrice(array $product, float $qty, ?array $pricelist, string $date): array
    {
        $base = round((float)$product['selling_price'], 2);
        if (!$pricelist) {
            return ['unit_price' => $base, 'base_price' => $base, 'pricelist_price' => $base, 'pricelist_item_id' => null, 'applied_rule' => null];
        }
        $item = $this->db->query(
            "SELECT *,
                CASE applies_to WHEN 'product' THEN 1 WHEN 'category' THEN 2 ELSE 3 END AS specificity
             FROM pos_pricelist_items
             WHERE pricelist_id = :pricelist
               AND active = 1
               AND min_quantity <= :qty
               AND (start_date IS NULL OR start_date <= :date_start)
               AND (end_date   IS NULL OR end_date   >= :date_end)
               AND (
                    (applies_to = 'product'  AND product_id  = :product)
                 OR (applies_to = 'category' AND category_id = :category)
                 OR (applies_to = 'all')
               )
             ORDER BY specificity ASC, `sequence` ASC, id ASC
             LIMIT 1",
            [
                'pricelist'  => $pricelist['id'],
                'qty'        => $qty,
                'date_start' => $date,
                'date_end'   => $date,
                'product'    => $product['id'],
                'category'   => $product['category_id'] ?? 0,
            ]
        )->fetch();

        if (!$item) {
            return ['unit_price' => $base, 'base_price' => $base, 'pricelist_price' => $base, 'pricelist_item_id' => null, 'applied_rule' => null];
        }
        $pricelistPrice = $base;
        if ($item['price_type'] === 'fixed' && $item['fixed_price'] !== null) {
            $pricelistPrice = round((float)$item['fixed_price'], 2);
        } elseif ($item['price_type'] === 'discount' && $item['discount_percent'] !== null) {
            $pct = max(0.0, min(100.0, (float)$item['discount_percent']));
            $pricelistPrice = round($base * (1 - $pct / 100), 2);
        }
        return [
            'unit_price'         => $pricelistPrice,
            'base_price'         => $base,
            'pricelist_price'    => $pricelistPrice,
            'pricelist_item_id'  => (int)$item['id'],
            'applied_rule'       => [
                'id'            => (int)$item['id'],
                'applies_to'    => $item['applies_to'],
                'price_type'    => $item['price_type'],
                'min_quantity'  => (float)$item['min_quantity'],
            ],
        ];
    }

    // P10 - Loyalty snapshot for a customer. Returns program(s), the
    // customer's current points balance, active rewards, and the ledger
    // (newest first) with an invariant flag proving
    // customer.loyalty_points == SUM(ledger.points).
    public function customerLoyalty(int $customerId): array
    {
        [$user, $companyId] = $this->context();
        $customer = $this->customer($customerId, $companyId);
        $program = $this->db->query(
            "SELECT * FROM pos_loyalty_programs
             WHERE company_id = :company AND active = 1 AND program_type = 'LOYALTY'
             ORDER BY id LIMIT 1",
            ['company' => $companyId]
        )->fetch();
        $rewards = $program ? $this->db->query(
            "SELECT id, name, reward_type, points_cost, discount_percent, discount_amount, reward_product_id, `sequence`
             FROM pos_loyalty_rewards
             WHERE program_id = :program AND active = 1
             ORDER BY `sequence`, id",
            ['program' => $program['id']]
        )->fetchAll() : [];
        $entries = $this->db->query(
            "SELECT l.id, l.type, l.points, l.balance_after, l.notes, l.created_at,
                    l.session_id, l.order_id, l.reward_id,
                    u.name AS cashier_name, o.reference_number AS order_reference,
                    r.name AS reward_name
             FROM pos_loyalty_ledger l
             LEFT JOIN users u ON u.id = l.cashier_id
             LEFT JOIN orders o ON o.id = l.order_id
             LEFT JOIN pos_loyalty_rewards r ON r.id = l.reward_id
             WHERE l.company_id = :company AND l.customer_id = :customer
             ORDER BY l.id DESC",
            ['company' => $companyId, 'customer' => $customerId]
        )->fetchAll();
        $ledgerSum = 0.0;
        foreach ($entries as $e) $ledgerSum += (float)$e['points'];
        $ledgerSum = round($ledgerSum, 2);
        $balance = round((float)$customer['loyalty_points'], 2);
        return [
            'customer'     => [
                'id'             => (int)$customer['id'],
                'name'           => $customer['name'],
                'loyalty_points' => $balance,
                'account_balance'=> round((float)$customer['balance'], 2),
            ],
            'program'      => $program,
            'rewards'      => $rewards,
            'entries'      => $entries,
            'ledger_sum'   => $ledgerSum,
            'invariant_ok' => abs($ledgerSum - $balance) < 0.01,
        ];
    }

    // Public read endpoints for the frontend Checkout composer.
    public function pricelists(): array
    {
        [$user, $companyId] = $this->context();
        $config = $this->resolveConfig($companyId, isset($user['branch_id']) ? (int)$user['branch_id'] : null);
        $rows = $this->db->query(
            "SELECT pl.id, pl.name, pl.currency, pl.`sequence`, pcpl.is_default
             FROM pos_config_pricelists pcpl
             JOIN pos_pricelists pl ON pl.id = pcpl.pricelist_id
             WHERE pcpl.pos_config_id = :config AND pl.active = 1
             ORDER BY pcpl.is_default DESC, pcpl.`sequence`, pl.name",
            ['config' => $config['id']]
        )->fetchAll();
        return ['config' => $config, 'pricelists' => $rows];
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
        // P13 - Settlement idempotency. Scoped by customer to prevent
        // accidental collision across customers.
        $idemKey = $this->idemKey($data);
        $payloadForHash = $data + ['_customer_id' => $customerId];
        unset($payloadForHash['idempotency_key']);
        $replay = $this->idemBegin($companyId, 'CUSTOMER_ACCOUNT_PAYMENT', $idemKey, $payloadForHash);
        if ($replay !== null) return $replay;
        try {
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
        $response = $this->customer($customerId,$companyId);
        $this->idemComplete($companyId, 'CUSTOMER_ACCOUNT_PAYMENT', $idemKey, $response);
        return $response;
        } catch (\Throwable $e) {
            $this->idemRelease($companyId, 'CUSTOMER_ACCOUNT_PAYMENT', $idemKey);
            throw $e;
        }
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
            ['target_type'=>'pos_session','target_id'=>(int)$session['id'],'amount'=>abs($variance),'session_id'=>(int)$session['id'],'_threshold_value'=>abs($variance)],
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
        // per company to require an X-Manager-Approval-ID for these ops.
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
        $branchId = Auth::user()['branch_id'] ?? null;$activeConfig=[];
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
        $defaults=['store_name'=>Auth::user()['company_name']??'Retail Store','tax_rate'=>5,'receipt_header'=>Auth::user()['company_name']??'Retail Store','receipt_footer'=>'Thank you for shopping with us!','receipt_barcode'=>true,'default_branch_id'=>Auth::user()['branch_id']??null,'cash_control'=>true,'opening_control'=>true,'maximum_difference'=>20,'payments'=>$paymentsDefault,'payment_methods'=>$paymentMethodsMeta,'pos_config_id'=>$activeConfigId,'store_type'=>$activeConfig['store_type']??'retail','store_capabilities'=>$activeConfig['capabilities']??$this->storeCapabilityDefaults('retail'),'store_capability_defaults'=>$activeConfig['capability_defaults']??$this->storeCapabilityDefaults('retail'),'capability_overrides'=>$activeConfig['capability_overrides']??[],'extra_security'=>$extraSecurityDefaults];
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

    /** P14.6 tenant-scoped POS audit viewer query. Client company_id is ignored. */
    public function auditLogs(array $filters=[]): array
    {
        [, $companyId] = $this->context();
        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = min(100, max(10, (int)($filters['per_page'] ?? 50)));
        $offset = ($page - 1) * $perPage;
        $where = ["a.company_id=:company", "a.module='POS'"];
        $params = ['company'=>$companyId];
        $map = [
            'action'       => "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.canonical_action')),a.action)",
            'result'       => "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.result')),'SUCCESS')",
            'account_user' => "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.actor.account_user_name')),'')",
            'pos_employee' => "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.actor.pos_cashier_name')),JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.requested_by')),u.name,'')",
            'session'      => "COALESCE(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.session_id')),JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.actor.session_id')),CAST(po.pos_session_id AS CHAR),'')",
            'pos'          => "COALESCE(pc.name,CAST(pc.id AS CHAR),'')",
            'entity'       => "CAST(a.record_id AS CHAR)",
        ];
        foreach ($map as $key=>$expr) {
            $value=trim((string)($filters[$key]??''));
            if ($value==='') continue;
            $where[]="$expr LIKE :$key"; $params[$key]='%'.$value.'%';
        }
        if (!empty($filters['date_from'])) { $where[]='DATE(a.created_at)>=:date_from';$params['date_from']=$filters['date_from']; }
        if (!empty($filters['date_to']))   { $where[]='DATE(a.created_at)<=:date_to';$params['date_to']=$filters['date_to']; }
        $whereSql = implode(' AND ', $where);
        $total = (int)($this->db->query(
            "SELECT COUNT(*) total FROM audit_logs a
             LEFT JOIN users u ON u.id=a.user_id
             LEFT JOIN orders po ON po.id=a.record_id AND a.action IN ('CHECKOUT','ORDER_REFUND') AND po.company_id=a.company_id
             LEFT JOIN pos_sessions ps ON ps.id=COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.session_id')) AS UNSIGNED),po.pos_session_id) AND ps.company_id=a.company_id
             LEFT JOIN pos_configs pc ON pc.id=ps.config_id AND pc.company_id=a.company_id
             WHERE $whereSql", $params
        )->fetch()['total'] ?? 0);
        $rows=$this->db->query(
            "SELECT a.id,a.action,a.record_id,a.old_values,a.new_values,a.created_at,u.name user_name,pc.name pos_name,po.pos_session_id order_session_id,
                    manager.name manager_name
             FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
             LEFT JOIN orders po ON po.id=a.record_id AND a.action IN ('CHECKOUT','ORDER_REFUND') AND po.company_id=a.company_id
             LEFT JOIN pos_sessions ps ON ps.id=COALESCE(CAST(JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.session_id')) AS UNSIGNED),po.pos_session_id) AND ps.company_id=a.company_id
             LEFT JOIN pos_configs pc ON pc.id=ps.config_id AND pc.company_id=a.company_id
             LEFT JOIN users manager ON manager.id=CAST(COALESCE(
                JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.approved_by_id')),
                JSON_UNQUOTE(JSON_EXTRACT(a.new_values,'$.authorized_by'))
             ) AS UNSIGNED) AND manager.company_id=a.company_id
             WHERE $whereSql ORDER BY a.id DESC LIMIT $perPage OFFSET $offset",$params
        )->fetchAll();
        $items=[];
        foreach($rows as $row){
            $meta=$this->redactAuditMetadata(json_decode((string)($row['new_values']??''),true)?:[]);
            $old=$this->redactAuditMetadata(json_decode((string)($row['old_values']??''),true)?:[]);
            $actor=(array)($meta['actor']??[]);
            $action=$meta['canonical_action']??$row['action'];
            $entityType=$meta['entity_type']??match($action){
                'ORDER_VALIDATE','ORDER_REFUND'=>'Order',
                'CASH_IN','CASH_OUT'=>'Cash Movement',
                'CUSTOMER_ACCOUNT_PAYMENT','CUSTOMER_ACCOUNT_SALE','CUSTOMER_ACCOUNT_REFUND_REVERSAL'=>'Customer Account',
                'MANAGER_APPROVAL_GRANTED','MANAGER_APPROVAL_USED'=>'Approval',
                'REGISTER_OPEN','REGISTER_CLOSE'=>'Register Session',
                default=>'Entity',
            };
            $items[]=[
                'id'=>(int)$row['id'],'date'=>$row['created_at'],
                'action'=>$action,
                'historical_action'=>$row['action']!==$action?$row['action']:null,
                'result'=>$meta['result']??'SUCCESS',
                'account_user'=>$actor['account_user_name']??$row['user_name']??null,
                'pos_employee'=>$actor['pos_cashier_name']??($meta['requested_by']??$row['user_name']),
                'approving_manager'=>$meta['approved_by']??$row['manager_name']??null,
                'pos'=>$row['pos_name']??($meta['pos_config_name']??($meta['pos_config_id']??null)),
                'session'=>$meta['session_id']??($row['order_session_id']??null),
                'entity'=>['type'=>$entityType,'id'=>$row['record_id']?(int)$row['record_id']:null,'reference'=>$meta['reference']??null],
                'before'=>$old,
                'details'=>$meta,
            ];
        }
        return ['items'=>$items,'count'=>count($items),'total'=>$total,'page'=>$page,'per_page'=>$perPage,'pages'=>max(1,(int)ceil($total/$perPage)),'company_id'=>$companyId];
    }

    /** Remove sensitive keys at every nesting level before audit data leaves the server. */
    private function redactAuditMetadata(array $values): array
    {
        $sensitive=['password','pin','pin_hash','token','token_prefix','approval_token','session_cookie','authorization','auth_token','secret','api_key'];
        foreach($values as $key=>$value){
            if(in_array(strtolower((string)$key),$sensitive,true)){unset($values[$key]);continue;}
            if(is_array($value))$values[$key]=$this->redactAuditMetadata($value);
        }
        return $values;
    }
    public function updateSettings(array $data): array
    {
        // Settings is ERP-account gated — AccountPermissionMiddleware
        // (settings.manage) is the sole enforcement point. Do NOT also require
        // POS Advanced here, otherwise a BASIC cashier PINned in over an
        // authorised admin browser account gets 403 for a purely back-office
        // action the account is allowed to perform.
        [$user,$companyId]=$this->context();$beforeSettings=$this->settingsData($companyId);$allowed=['store_name','tax_rate','receipt_header','receipt_footer','receipt_barcode','default_branch_id','cash_control','opening_control','maximum_difference','payments','extra_security','store_type','capability_overrides'];
        foreach($allowed as $key){
            if(!array_key_exists($key,$data))continue;
            // P8.1 — payments is a per-POS assignment, not a generic setting.
            // Skip the generic settings write; the per-config update below
            // handles it authoritatively.
            if (in_array($key,['payments','store_type','capability_overrides'],true)) continue;
            $value=$data[$key];$type='string';if(is_array($value)){$value=json_encode($value);$type='json';}elseif(is_bool($value)){$value=$value?'1':'0';$type='boolean';}elseif(is_int($value)){$type='integer';}
            $this->db->query("INSERT INTO settings (company_id,`key`,value,type) VALUES (:company,:key,:value,:type) ON DUPLICATE KEY UPDATE value=VALUES(value),type=VALUES(type)",['company'=>$companyId,'key'=>'pos.'.$key,'value'=>(string)$value,'type'=>$type]);
        }
        $config=$this->resolveConfig($companyId,isset($data['default_branch_id'])?(int)$data['default_branch_id']:(isset($user['branch_id'])?(int)$user['branch_id']:null));
        if(array_key_exists('store_type',$data)||array_key_exists('capability_overrides',$data)){
            $nextType=array_key_exists('store_type',$data)?$this->normalizeStoreType($data['store_type']):$config['store_type'];
            $open=(int)$this->db->query("SELECT COUNT(*) FROM pos_sessions WHERE company_id=:company AND config_id=:config AND state IN ('OPENING_CONTROL','OPENED','CLOSING_CONTROL')",['company'=>$companyId,'config'=>$config['id']])->fetchColumn();
            if($open&&$nextType!==$config['store_type'])throw new Exception('Close the register before changing its store type.',409);
            $overrides=$data['capability_overrides']??$config['capability_overrides'];if(!is_array($overrides))throw new Exception('Capability overrides must be an object.',422);
            $defaults=$this->storeCapabilityDefaults($nextType);$safe=[];foreach($overrides as $key=>$value){if(!array_key_exists($key,$defaults))throw new Exception('Unknown store capability: '.$key,422);if(!in_array($key,$this->storeCapabilityOverrideKeys(),true))throw new Exception('Core POS capability cannot be overridden: '.$key,422);$safe[$key]=(bool)$value;}
            $this->db->query("UPDATE pos_configs SET store_type=:type,capability_overrides=:overrides WHERE id=:id AND company_id=:company",['type'=>$nextType,'overrides'=>json_encode($safe),'id'=>$config['id'],'company'=>$companyId]);
            $config=$this->resolveConfig($companyId,(int)($config['branch_id']??0));
        }
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
        $afterSettings=$this->settingsData($companyId);$changes=[];
        foreach($allowed as $key){if(!array_key_exists($key,$data))continue;$changes[$key]=['before'=>$beforeSettings[$key]??null,'after'=>$afterSettings[$key]??null];}
        $this->log($user,$companyId,'SETTINGS_UPDATE',null,['changed_fields'=>$changes]);return $afterSettings;
    }
    private function settingValue(int $companyId,string $key,mixed $default): mixed{$row=$this->db->query("SELECT value FROM settings WHERE company_id=:company AND `key`=:key",['company'=>$companyId,'key'=>$key])->fetch();return $row?$row['value']:$default;}
    /**
     * P12 - Canonical POS audit writer. Preserves DUAL IDENTITY (Rule #18):
     *   account_user   the browser/ERP account (Ahmed the Admin)
     *   pos_cashier    the employee PINned in (Nimco)
     * user_id on the row stays stamped with the ACTING party (cashier when
     * present, account otherwise) so existing queries keep working, but the
     * new_values metadata now always carries both identities and a canonical
     * action alongside any legacy shape.
     *
     * Sensitive values (PINs, tokens, passwords, session cookies) MUST NOT
     * appear in $values. Callers are responsible for filtering; this method
     * additionally strips a small set of known-sensitive keys defensively.
     */
    private function log(array $user, int $companyId, string $action, ?int $recordId, array $values): void
    {
        $accountUser = \Core\Auth::user();
        $cashier     = \Core\Auth::posCashier();
        $meta = $values;
        // Defensive sanitization - never leak these into audit metadata.
        foreach (['pin', 'password', 'token', 'approval_token', 'session_cookie', 'auth_token', 'secret', 'api_key'] as $k) {
            if (array_key_exists($k, $meta)) unset($meta[$k]);
        }
        $meta['actor'] = [
            'account_user_id'   => $accountUser ? (int)$accountUser['id'] : null,
            'account_user_name' => $accountUser['name'] ?? null,
            'pos_cashier_id'    => $cashier ? (int)$cashier['id'] : null,
            'pos_cashier_name'  => $cashier['name'] ?? null,
        ];
        // Canonical action names for the P12 vocabulary. Historical action tag
        // (whatever the caller passed) stays for backward-compat queries.
        static $canonical = [
            'CHECKOUT'      => 'ORDER_VALIDATE',
            'SESSION_OPEN'  => 'REGISTER_OPEN',
            'SESSION_CLOSE' => 'REGISTER_CLOSE',
            'CASH_IN'       => 'CASH_IN',
            'CASH_OUT'      => 'CASH_OUT',
            'ORDER_REFUND'  => 'ORDER_REFUND',
            'PRODUCT_CREATE'=> 'PRODUCT_CREATE',
            'PRODUCT_UPDATE'=> 'PRODUCT_UPDATE',
            'PRODUCT_DELETE'=> 'PRODUCT_ARCHIVE',
            'CUSTOMER_CREATE'=> 'CUSTOMER_CREATE',
            'CUSTOMER_UPDATE'=> 'CUSTOMER_UPDATE',
            'CUSTOMER_DELETE'=> 'CUSTOMER_ARCHIVE',
            'CUSTOMER_ACCOUNT_PAYMENT' => 'CUSTOMER_ACCOUNT_PAYMENT',
            'SETTINGS_UPDATE'=> 'POS_SETTINGS_UPDATE',
        ];
        $meta['canonical_action'] = $canonical[$action] ?? $action;
        $this->audit->create([
            'user_id'    => $user['id'],
            'company_id' => $companyId,
            'module'     => 'POS',
            'action'     => $action,
            'record_id'  => $recordId,
            'new_values' => $meta,
            'created_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
