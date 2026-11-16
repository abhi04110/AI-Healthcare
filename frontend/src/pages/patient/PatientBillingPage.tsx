import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Printer } from 'lucide-react';
import { publicService } from '@/services/publicService';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/Badge';
import { PrintableDocumentModal } from '@/components/shared/PrintableDocument';
import type { PatientBillItemResponse } from '@/types/api';

export function PatientBillingPage() {
  const [selectedBill, setSelectedBill] = useState<PatientBillItemResponse | null>(null);

  const billsQuery = useQuery({
    queryKey: ['patient-my-bills'],
    queryFn: () => publicService.getMyBills(),
  });

  const columns: ColumnDef<PatientBillItemResponse>[] = [
    {
      key: 'num',
      header: 'Invoice Number',
      render: (b) => (
        <div>
          <p className="font-semibold text-slate-900">{b.bill_number}</p>
          <p className="text-xs text-slate-500">{b.items.length} line items</p>
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
    { key: 'date', header: 'Issued', render: (b) => formatDateTime(b.created_at) },
    {
      key: 'action',
      header: 'Invoice',
      render: (b) => (
        <button
          type="button"
          onClick={() => setSelectedBill(b)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Printer className="h-3.5 w-3.5" />
          View / Print
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="My Hospital Invoices & Billing"
          subtitle="View and download itemized hospital bills and payment receipts."
          action={<CreditCard className="h-5 w-5 text-clinical-600" />}
        />
        <CardBody>
          <DataTable
            data={billsQuery.data ?? []}
            columns={columns}
            rowKey={(b) => b.id}
            isLoading={billsQuery.isLoading}
            searchPlaceholder="Search bill number or status..."
            searchFn={(b, q) => `${b.bill_number} ${b.payment_status}`.toLowerCase().includes(q)}
          />
        </CardBody>
      </Card>

      {selectedBill && (
        <PrintableDocumentModal
          open={true}
          onClose={() => setSelectedBill(null)}
          title={`Invoice ${selectedBill.bill_number}`}
          filename={`${selectedBill.bill_number}.txt`}
          plainTextSummary={[
            `MedCore AI Hospital Invoice: ${selectedBill.bill_number}`,
            `Issued: ${formatDateTime(selectedBill.created_at)} | Status: ${selectedBill.payment_status}`,
            `Subtotal: ${formatCurrency(selectedBill.subtotal)} | Discount: ${formatCurrency(selectedBill.discount)} | Tax: ${formatCurrency(selectedBill.tax)}`,
            `Total: ${formatCurrency(selectedBill.total_amount)} | Paid: ${formatCurrency(selectedBill.paid_amount)}`,
            '',
            ...selectedBill.items.map(
              (i) => `- ${i.description} (${i.item_type}): ${i.quantity} x ${formatCurrency(i.unit_price)} = ${formatCurrency(i.total_price)}`,
            ),
          ].join('\n')}
        >
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="font-bold text-slate-900">Invoice {selectedBill.bill_number}</h4>
                <p className="text-xs text-slate-500">{formatDateTime(selectedBill.created_at)}</p>
              </div>
              <StatusBadge status={selectedBill.payment_status} />
            </div>
            <div className="space-y-1.5 text-xs">
              {selectedBill.items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span>
                    {i.description} ({i.quantity}x)
                  </span>
                  <span className="font-semibold">{formatCurrency(i.total_price)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-3 text-right text-xs space-y-1">
              <p>Subtotal: {formatCurrency(selectedBill.subtotal)}</p>
              <p>Discount: -{formatCurrency(selectedBill.discount)}</p>
              <p>Tax: +{formatCurrency(selectedBill.tax)}</p>
              <p className="text-sm font-bold text-slate-900">
                Total: {formatCurrency(selectedBill.total_amount)}
              </p>
              <p className="text-emerald-700">Paid: {formatCurrency(selectedBill.paid_amount)}</p>
            </div>
          </div>
        </PrintableDocumentModal>
      )}
    </div>
  );
}

