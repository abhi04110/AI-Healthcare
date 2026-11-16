import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { hmsService } from '@/services/hmsService';
import { patientService } from '@/services/patientService';
import { extractApiError, formatCurrency } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { Bill, BillItem } from '@/types/api';

export function ReceptionBillingPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [billModal, setBillModal] = useState(false);
  const [itemModalBill, setItemModalBill] = useState<Bill | null>(null);
  const [payModalBill, setPayModalBill] = useState<Bill | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<{ bill: Bill; items: BillItem[] } | null>(null);

  const [billForm, setBillForm] = useState({
    patient_id: '',
    bill_number: `INV-${Date.now().toString().slice(-6)}`,
    discount: '0',
    tax: '0',
    notes: '',
  });
  const [itemForm, setItemForm] = useState({
    item_type: 'consultation',
    description: '',
    quantity: '1',
    unit_price: '',
  });
  const [payAmount, setPayAmount] = useState('');
  const [mealForm, setMealForm] = useState({ menu_item_id: '', quantity: '1', patient_id: '', notes: '' });

  const billsQuery = useQuery({ queryKey: ['hms-bills'], queryFn: () => hmsService.listBills() });
  const patientsQuery = useQuery({ queryKey: ['patients'], queryFn: () => patientService.listPatients() });
  const menuQuery = useQuery({ queryKey: ['canteen-available-menu'], queryFn: () => hmsService.getAvailableMenu() });

  const createBillMutation = useMutation({
    mutationFn: () =>
      hmsService.createBill({
        patient_id: Number(billForm.patient_id),
        bill_number: billForm.bill_number,
        discount: Number(billForm.discount || 0),
        tax: Number(billForm.tax || 0),
        notes: billForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Bill created');
      setBillModal(false);
      setBillForm({
        patient_id: '',
        bill_number: `INV-${Date.now().toString().slice(-6)}`,
        discount: '0',
        tax: '0',
        notes: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['hms-bills'] });
    },
    onError: (err) => toast.error('Bill creation failed', extractApiError(err)),
  });

  const addItemMutation = useMutation({
    mutationFn: () =>
      hmsService.addBillItem({
        bill_id: itemModalBill!.id,
        item_type: itemForm.item_type,
        description: itemForm.description,
        quantity: Number(itemForm.quantity),
        unit_price: Number(itemForm.unit_price),
      }),
    onSuccess: () => {
      toast.success('Charge item added');
      setItemModalBill(null);
      setItemForm({ item_type: 'consultation', description: '', quantity: '1', unit_price: '' });
      void queryClient.invalidateQueries({ queryKey: ['hms-bills'] });
    },
    onError: (err) => toast.error('Failed to add item', extractApiError(err)),
  });

  const paymentMutation = useMutation({
    mutationFn: () => hmsService.updateBillPayment(payModalBill!.id, Number(payAmount)),
    onSuccess: () => {
      toast.success('Payment updated');
      setPayModalBill(null);
      setPayAmount('');
      void queryClient.invalidateQueries({ queryKey: ['hms-bills'] });
    },
    onError: (err) => toast.error('Payment update failed', extractApiError(err)),
  });

  const canteenMutation = useMutation({
    mutationFn: () =>
      hmsService.createCanteenOrder({
        menu_item_id: Number(mealForm.menu_item_id),
        quantity: Number(mealForm.quantity),
        patient_id: mealForm.patient_id ? Number(mealForm.patient_id) : null,
        notes: mealForm.notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Canteen order submitted');
      setMealForm({ menu_item_id: '', quantity: '1', patient_id: '', notes: '' });
      void queryClient.invalidateQueries({ queryKey: ['canteen-available-menu'] });
    },
    onError: (err) => toast.error('Canteen order failed', extractApiError(err)),
  });

  const viewInvoice = async (billId: number) => {
    try {
      const detail = await hmsService.getBillDetail(billId);
      setInvoiceDetail(detail);
    } catch (err) {
      toast.error('Unable to load invoice', extractApiError(err));
    }
  };

  const columns: ColumnDef<Bill>[] = [
    {
      key: 'num',
      header: 'Invoice Number',
      render: (b) => (
        <div>
          <p className="font-semibold text-slate-900">{b.bill_number}</p>
          <p className="text-xs text-slate-500">Patient ID {b.patient_id}</p>
        </div>
      ),
    },
    {
      key: 'totals',
      header: 'Amount Breakdown',
      render: (b) => (
        <div className="text-xs">
          <p className="font-semibold text-slate-900">Total: {formatCurrency(b.total_amount)}</p>
          <p className="text-emerald-700">Paid: {formatCurrency(b.paid_amount)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Payment Status', render: (b) => <StatusBadge status={b.payment_status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (b) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void viewInvoice(b.id)}
            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Print Receipt
          </button>
          {b.payment_status !== 'paid' && (
            <>
              <button
                type="button"
                onClick={() => setItemModalBill(b)}
                className="rounded-lg bg-clinical-50 px-2.5 py-1 text-xs font-semibold text-clinical-700 hover:bg-clinical-100"
              >
                + Charge
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayModalBill(b);
                  setPayAmount(String(b.total_amount));
                }}
                className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Collect Pay
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Billing & Invoice Settlement Desk"
          subtitle="Create invoices, add clinical/lab/pharmacy charges, collect payments & print receipts."
          action={
            <button
              type="button"
              onClick={() => setBillModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-clinical-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-clinical-700"
            >
              <Plus className="h-4 w-4" />
              New Invoice
            </button>
          }
        />
        <CardBody>
          <DataTable
            data={billsQuery.data ?? []}
            columns={columns}
            rowKey={(b) => b.id}
            isLoading={billsQuery.isLoading}
            searchPlaceholder="Search bill number or patient ID..."
            searchFn={(b, q) =>
              `${b.bill_number} ${b.patient_id} ${b.payment_status}`.toLowerCase().includes(q)
            }
            toolbarExtra={<CreditCard className="h-4 w-4 text-clinical-600" />}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Desk / Patient Canteen Meal Order"
          subtitle="Place a kitchen meal order on behalf of a patient or front desk."
          action={<UtensilsCrossed className="h-5 w-5 text-amber-600" />}
        />
        <CardBody>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              canteenMutation.mutate();
            }}
            className="grid gap-3 sm:grid-cols-4"
          >
            <select
              required
              value={mealForm.menu_item_id}
              onChange={(e) => setMealForm({ ...mealForm, menu_item_id: e.target.value })}
              className="sm:col-span-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Select meal...</option>
              {(menuQuery.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.item_name} ({formatCurrency(m.price)})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              required
              value={mealForm.quantity}
              onChange={(e) => setMealForm({ ...mealForm, quantity: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              placeholder="Patient ID (optional)"
              value={mealForm.patient_id}
              onChange={(e) => setMealForm({ ...mealForm, patient_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Delivery / Diet instructions"
              value={mealForm.notes}
              onChange={(e) => setMealForm({ ...mealForm, notes: e.target.value })}
              className="sm:col-span-3 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white">
              Submit Meal Order
            </button>
          </form>
        </CardBody>
      </Card>

      <Modal open={billModal} onClose={() => setBillModal(false)} title="Create Patient Invoice">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createBillMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            required
            value={billForm.patient_id}
            onChange={(e) => setBillForm({ ...billForm, patient_id: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select Patient...</option>
            {(patientsQuery.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.patient_code})
              </option>
            ))}
          </select>
          <input
            required
            value={billForm.bill_number}
            onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={billForm.discount}
              onChange={(e) => setBillForm({ ...billForm, discount: e.target.value })}
              placeholder="Discount"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={billForm.tax}
              onChange={(e) => setBillForm({ ...billForm, tax: e.target.value })}
              placeholder="Tax"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Create Bill
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={itemModalBill !== null}
        onClose={() => setItemModalBill(null)}
        title={`Add Line Item (${itemModalBill?.bill_number ?? ''})`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addItemMutation.mutate();
          }}
          className="space-y-3"
        >
          <select
            value={itemForm.item_type}
            onChange={(e) => setItemForm({ ...itemForm, item_type: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="consultation">Consultation</option>
            <option value="lab">Laboratory</option>
            <option value="medicine">Pharmacy</option>
            <option value="procedure">Procedure</option>
            <option value="other">Other</option>
          </select>
          <input
            required
            placeholder="Charge description"
            value={itemForm.description}
            onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              required
              value={itemForm.quantity}
              onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="Unit Price"
              value={itemForm.unit_price}
              onChange={(e) => setItemForm({ ...itemForm, unit_price: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-clinical-600 px-4 py-2 text-xs font-semibold text-white">
              Add Charge
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={payModalBill !== null}
        onClose={() => setPayModalBill(null)}
        title={`Collect Payment (${payModalBill?.bill_number ?? ''})`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            paymentMutation.mutate();
          }}
          className="space-y-3"
        >
          <p className="text-xs text-slate-600">Total Billed: {formatCurrency(payModalBill?.total_amount)}</p>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white">
              Confirm Payment
            </button>
          </div>
        </form>
      </Modal>

      {invoiceDetail && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setInvoiceDetail(null)}
          title={`Receipt ${invoiceDetail.bill.bill_number}`}
          filename={`${invoiceDetail.bill.bill_number}.txt`}
          plainTextSummary={[
            `Receipt ${invoiceDetail.bill.bill_number} (Patient ID ${invoiceDetail.bill.patient_id})`,
            `Total: ${formatCurrency(invoiceDetail.bill.total_amount)}`,
            `Paid: ${formatCurrency(invoiceDetail.bill.paid_amount)}`,
            `Status: ${invoiceDetail.bill.payment_status}`,
            ...invoiceDetail.items.map(
              (i) => `- ${i.description}: ${i.quantity} x ${formatCurrency(i.unit_price)} = ${formatCurrency(i.total_price)}`,
            ),
          ].join('\n')}
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <h4 className="font-bold">MedCore AI Hospital Receipt</h4>
              <StatusBadge status={invoiceDetail.bill.payment_status} />
            </div>
            {invoiceDetail.items.map((i) => (
              <div key={i.id} className="flex justify-between text-xs">
                <span>
                  {i.description} ({i.quantity}x)
                </span>
                <span className="font-semibold">{formatCurrency(i.total_price)}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-2 text-right text-xs font-bold">
              Total: {formatCurrency(invoiceDetail.bill.total_amount)} • Paid:{' '}
              {formatCurrency(invoiceDetail.bill.paid_amount)}
            </div>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

