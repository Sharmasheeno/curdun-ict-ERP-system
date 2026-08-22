<?php

namespace App\Controllers;

use App\Services\PosService;
use Core\Request;
use Core\Response;

class PosController extends BaseController
{
    public function __construct(private PosService $pos) {}
    public function bootstrap(Request $r): void { Response::success('POS workspace loaded.',$this->pos->bootstrap()); }
    public function dashboard(Request $r): void { Response::success('POS dashboard loaded.',$this->pos->dashboard()); }
    public function products(Request $r): void { Response::success('Products retrieved.',$this->pos->products()); }
    public function createProduct(Request $r): void { Response::created('Product created.',$this->pos->createProduct($r->getBody())); }
    public function updateProduct(Request $r,int $id): void { Response::success('Product updated.',$this->pos->updateProduct($id,$r->getBody())); }
    public function deleteProduct(Request $r,int $id): void { $this->pos->deleteProduct($id);Response::success('Product deleted.'); }
    public function customers(Request $r): void { Response::success('Customers retrieved.',$this->pos->customers()); }
    public function createCustomer(Request $r): void { Response::created('Customer created.',$this->pos->createCustomer($r->getBody())); }
    public function updateCustomer(Request $r,int $id): void { Response::success('Customer updated.',$this->pos->updateCustomer($id,$r->getBody())); }
    public function deleteCustomer(Request $r,int $id): void { $this->pos->deleteCustomer($id);Response::success('Customer deleted.'); }
    public function transactions(Request $r): void { Response::success('Transactions retrieved.',$this->pos->transactions()); }
    public function sessions(Request $r): void { Response::success('POS register sessions retrieved.',$this->pos->sessions()); }
    public function payments(Request $r): void { Response::success('POS payments retrieved.',$this->pos->payments()); }
    public function voidTransaction(Request $r,int $id): void { Response::success('Refund completed; the original sale remains unchanged.',$this->pos->voidTransaction($id,$r->getBody())); }
    public function refundOrder(Request $r,int $id): void { Response::created('Refund completed.',$this->pos->refundOrder($id,$r->getBody())); }
    public function refundable(Request $r,int $id): void { Response::success('Refundable summary retrieved.',$this->pos->refundable($id)); }
    public function checkout(Request $r): void { Response::created('Checkout completed.',$this->pos->checkout($r->getBody())); }
    public function collectDebt(Request $r,int $id): void { Response::success('Customer Account settlement recorded.',$this->pos->collectDebt($id,$r->getBody())); }
    public function customerLedger(Request $r,int $id): void { Response::success('Customer Account ledger retrieved.',$this->pos->customerLedger($id)); }
    public function pricelists(Request $r): void { Response::success('Pricelists retrieved.',$this->pos->pricelists()); }
    public function closeShift(Request $r): void { Response::created('Shift reconciliation saved.',$this->pos->closeShift($r->getBody())); }
    public function currentSession(Request $r): void { Response::success('POS register session retrieved.',$this->pos->currentSession()); }
    public function openSession(Request $r): void { Response::created('POS register opened.',$this->pos->openSession($r->getBody())); }
    public function sessionSummary(Request $r,int $id): void { Response::success('POS register summary generated.',$this->pos->sessionSummary($id)); }
    public function cashMovement(Request $r,int $id): void { Response::created('Cash movement recorded.',$this->pos->cashMovement($id,$r->getBody())); }
    public function closeSession(Request $r,int $id): void { $body=$r->getBody();$body['session_id']=$id;Response::success('POS register closed.',$this->pos->closeShift($body)); }
    public function staff(Request $r): void { Response::success('Staff retrieved.',$this->pos->staff()); }
    public function createStaff(Request $r): void { Response::created('Staff created.',$this->pos->createStaff($r->getBody())); }
    public function updateStaff(Request $r,int $id): void { Response::success('Staff updated.',$this->pos->updateStaff($id,$r->getBody())); }
    public function settings(Request $r): void { Response::success('POS settings retrieved.',$this->pos->settings()); }
    public function updateSettings(Request $r): void { Response::success('POS settings saved.',$this->pos->updateSettings($r->getBody())); }
    public function reports(Request $r): void { Response::success('POS report generated.',$this->pos->reports($r->getQueryParams())); }
    public function stockAlerts(Request $r): void { Response::success('Stock notifications retrieved.',$this->pos->stockAlerts()); }
    public function markStockAlertRead(Request $r,int $id): void { $this->pos->markStockAlertRead($id);Response::success('Stock notification marked as read.'); }
    public function markAllStockAlertsRead(Request $r): void { $this->pos->markAllStockAlertsRead();Response::success('All stock notifications marked as read.'); }
    public function access(Request $r): void { Response::success('POS access snapshot.', \Core\PosAccess::snapshot()); }
}
