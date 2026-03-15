'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import {
    CreditCard, CheckCircle2, Clock, AlertTriangle,
    Loader2, AlertCircle, ReceiptText, Download,
    InboxIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
    id: string;
    cohortName: string;
    amount: number;
    status: string;
    dateIssued: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const s = status?.toLowerCase();
    if (s === 'paid') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Paid
            </span>
        );
    }
    if (s === 'overdue') {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Overdue
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" /> {status || 'Unpaid'}
        </span>
    );
}

function formatGHS(amount: number) {
    return `GHS ${amount.toLocaleString('en-GH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await fetchApi<Invoice[]>('/billing');
                setInvoices(data);
            } catch (err: any) {
                setError(err.message ?? 'Failed to load billing information.');
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const outstanding = invoices
        .filter((inv) => inv.status?.toLowerCase() !== 'paid')
        .reduce((sum, inv) => sum + Number(inv.amount || 0), 0);

    const nextDue = invoices
        .filter((inv) => inv.status?.toLowerCase() !== 'paid')
        .sort((a, b) => new Date(a.dateIssued).getTime() - new Date(b.dateIssued).getTime())[0];

    function handleDownload(inv: Invoice) {
        console.log('Download invoice:', inv.id, inv.cohortName);
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Payments</h1>
                <p className="text-sm text-gray-500 mt-0.5">Manage your invoices and payment history.</p>
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <>
                    {/* Summary Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div
                                className={`p-3.5 rounded-xl shrink-0 ${
                                    outstanding > 0 ? 'bg-amber-50' : 'bg-green-50'
                                }`}
                            >
                                <CreditCard
                                    className={`w-6 h-6 ${outstanding > 0 ? 'text-amber-600' : 'text-green-600'}`}
                                />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-500">Total Outstanding</p>
                                <h3
                                    className={`text-3xl font-bold mt-0.5 ${
                                        outstanding > 0 ? 'text-gray-900' : 'text-green-600'
                                    }`}
                                >
                                    {formatGHS(outstanding)}
                                </h3>
                                {outstanding > 0 && nextDue && (
                                    <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        Next payment due{' '}
                                        {new Date(nextDue.dateIssued).toLocaleDateString('en-GB', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                        })}
                                    </p>
                                )}
                                {outstanding === 0 && (
                                    <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> All payments up to date
                                    </p>
                                )}
                            </div>
                            {outstanding > 0 && (
                                <button className="sm:ml-auto bg-brand-primary text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-primary/90 transition-colors shrink-0">
                                    Pay Now
                                </button>
                            )}
                        </div>

                        {/* Quick stats */}
                        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
                            {[
                                {
                                    label: 'Total Invoices',
                                    value: invoices.length,
                                    color: 'text-gray-900',
                                },
                                {
                                    label: 'Paid',
                                    value: invoices.filter((i) => i.status?.toLowerCase() === 'paid').length,
                                    color: 'text-green-600',
                                },
                                {
                                    label: 'Outstanding',
                                    value: invoices.filter(
                                        (i) => i.status?.toLowerCase() !== 'paid'
                                    ).length,
                                    color: outstanding > 0 ? 'text-amber-600' : 'text-gray-900',
                                },
                            ].map((stat) => (
                                <div key={stat.label}>
                                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Invoice List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                            <ReceiptText className="w-4 h-4 text-gray-400" />
                            <h2 className="font-semibold text-gray-900 text-sm">Invoice History</h2>
                        </div>

                        {invoices.length === 0 ? (
                            <div className="py-16 text-center">
                                <InboxIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500 font-medium">No invoices found.</p>
                                <p className="text-gray-400 text-sm mt-1">
                                    Your billing history will appear here.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                Description
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                                                Due Date
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                Amount
                                            </th>
                                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                Status
                                            </th>
                                            <th className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wide">
                                                Receipt
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {invoices.map((inv) => (
                                            <tr
                                                key={inv.id}
                                                className={`hover:bg-gray-50/60 transition-colors ${
                                                    inv.status === 'overdue' ? 'bg-red-50/30' : ''
                                                }`}
                                            >
                                                <td className="px-5 py-4">
                                                    <p className="font-medium text-gray-900">
                                                        {inv.cohortName}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{inv.id}</p>
                                                </td>
                                                <td className="px-5 py-4 text-gray-500 hidden sm:table-cell">
                                                    {new Date(inv.dateIssued).toLocaleDateString('en-GB', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-5 py-4 font-semibold text-gray-900">
                                                    {formatGHS(inv.amount)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <StatusBadge status={inv.status} />
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDownload(inv)}
                                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-700 transition-colors"
                                                    >
                                                        <Download className="w-3.5 h-3.5" /> Download
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
