<?php

namespace App\Services;

use App\Repositories\PaymentRepository;
use App\Repositories\InvoiceRepository;
use App\Repositories\CustomerRepository;
use App\Repositories\AuditLogRepository;
use Core\Database;
use Core\Validator;
use Exception;

class PaymentService
{
    public function __construct(
        private PaymentRepository $paymentRepository,
        private InvoiceRepository $invoiceRepository,
        private CustomerRepository $customerRepository,
        private AuditLogRepository $auditLogRepository,
        private Database $db,
        private Validator $validator
    ) {}

    public function getAll(array $filters = []): array
    {
        return $this->paymentRepository->getAllPaginated($filters);
    }

    public function getById(int $id): array
    {
        $payment = $this->paymentRepository->findById($id);
        if (!$payment) {
            throw new Exception('Payment not found.', 404);
        }
        return $payment;
    }

    public function recordPayment(array $data): array
    {
        $this->validator->validate($data, [
            'invoice_id' => 'required|numeric',
            'amount' => 'required|numeric',
            'payment_method' => 'required'
        ]);

        $amount = (float)$data['amount'];
        if ($amount <= 0) {
            throw new Exception('Payment amount must be greater than zero.');
        }

        try {
            $this->db->beginTransaction();

            $invoice = $this->invoiceRepository->lockForUpdate($data['invoice_id']);
            if (!$invoice) {
                throw new Exception('Invoice not found.');
            }
            if ($invoice['status'] === 'CANCELLED') {
                throw new Exception('Cannot record payment for a cancelled invoice.');
            }

            $remainingBalance = $invoice['total_amount'] - $invoice['paid_amount'];
            if ($amount > $remainingBalance) {
                throw new Exception("Payment amount exceeds remaining balance ({$remainingBalance}).");
            }

            if (empty($data['payment_reference'])) {
                $data['payment_reference'] = 'PAY-' . strtoupper(uniqid());
            }

            $paymentId = $this->paymentRepository->create($data);

            $newPaidAmount = $invoice['paid_amount'] + $amount;
            $newBalance = $invoice['total_amount'] - $newPaidAmount;
            
            $status = $invoice['status'];
            if ($newBalance <= 0) {
                $status = 'PAID';
            } elseif ($newPaidAmount > 0) {
                $status = 'PARTIAL';
            }

            $this->invoiceRepository->update($invoice['id'], [
                'paid_amount' => $newPaidAmount,
                'balance' => $newBalance,
                'status' => $status
            ]);

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'PAYMENT',
                'action' => 'RECORD',
                'record_id' => $paymentId,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $payment = $this->getById($paymentId);
            $payment['invoice'] = $this->invoiceRepository->findById($invoice['id']);
            return $payment;

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }

    public function refund(int $paymentId, string $reason): array
    {
        try {
            $this->db->beginTransaction();

            $payment = $this->getById($paymentId);
            if (($payment['status'] ?? '') === 'REFUNDED') {
                throw new Exception('Payment is already refunded.');
            }

            $this->paymentRepository->update($paymentId, [
                'status' => 'REFUNDED',
                'notes' => $reason
            ]);

            $invoice = $this->invoiceRepository->findById($payment['invoice_id']);
            if ($invoice) {
                $newPaidAmount = max(0, $invoice['paid_amount'] - $payment['amount']);
                $newBalance = $invoice['total_amount'] - $newPaidAmount;
                
                $status = 'PARTIAL';
                if ($newPaidAmount <= 0) {
                    $status = 'SENT';
                }

                $this->invoiceRepository->update($invoice['id'], [
                    'paid_amount' => $newPaidAmount,
                    'balance' => $newBalance,
                    'status' => $status
                ]);
            }

            $this->db->commit();

            $this->auditLogRepository->create([
                'module' => 'PAYMENT',
                'action' => 'REFUND',
                'record_id' => $paymentId,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            return $this->getById($paymentId);

        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}
