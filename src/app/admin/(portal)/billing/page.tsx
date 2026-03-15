"use client";

import { CreditCard, Download, FileText, Plus, Search, Loader2, X, FileDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { fetchApi } from "@/lib/api";

// ─── PDF Invoice Generator ───────────────────────────────────────────────────
async function downloadInvoicePDF(inv: any) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const green = "#0F6B3E";
    const lightGreen = "#E8F5EE";
    const darkText = "#1E1E1E";
    const grayText = "#6B7280";
    const margin = 48;

    // ── Header: dark left panel + white right panel ───────────────────────────
    const headerH = 100;

    // Full-width white base
    doc.setFillColor("#FFFFFF");
    doc.rect(0, 0, pageW, headerH, "F");

    // Left green band (60% of width)
    const splitX = pageW * 0.62;
    doc.setFillColor(green);
    doc.rect(0, 0, splitX, headerH, "F");

    // Thin gold/accent bottom border on the green side
    doc.setFillColor("#C7F000");
    doc.rect(0, headerH - 4, splitX, 4, "F");

    // White logo card (rounded feel via filled rect)
    const logoCardX = margin - 6;
    const logoCardY = 16;
    const logoCardW = 70;
    const logoCardH = 70;
    doc.setFillColor("#FFFFFF");
    doc.roundedRect(logoCardX, logoCardY, logoCardW, logoCardH, 6, 6, "F");

    // Logo image inside white card
    try {
        const img = new window.Image();
        img.src = "/saflogo.png";
        await new Promise<void>(resolve => { img.onload = () => resolve(); img.onerror = () => resolve(); });
        if (img.naturalWidth > 0) {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            canvas.getContext("2d")!.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL("image/png");
            // Center logo inside the white card with 8pt padding
            doc.addImage(dataUrl, "PNG", logoCardX + 5, logoCardY + 5, logoCardW - 10, logoCardH - 10);
        }
    } catch { /* logo unavailable */ }

    // Institute name + tagline (white text on green)
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("SAF INSTITUTE", logoCardX + logoCardW + 14, 50);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor("#D1FAE5");   // very light mint — readable on green
    doc.text("German Language Centre  ·  Goethe-Institut Authorised Partner", logoCardX + logoCardW + 14, 65);

    // "INVOICE" on the white panel (right side) — dark green, large
    doc.setTextColor(green);
    doc.setFontSize(30);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageW - margin, 52, { align: "right" });

    // Thin green underline beneath INVOICE word
    const invTextW = doc.getTextWidth("INVOICE");
    doc.setDrawColor(green);
    doc.setLineWidth(2.5);
    doc.line(pageW - margin - invTextW, 58, pageW - margin, 58);

    // Small label below
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(grayText);
    doc.text("TAX INVOICE", pageW - margin, 72, { align: "right" });

    // ── Sub-header info strip ────────────────────────────────────────────────
    doc.setFillColor(lightGreen);
    doc.rect(0, headerH, pageW, 52, "F");

    const invoiceNum = `INV-${inv.id.slice(0, 8).toUpperCase()}`;
    const dateIssued = inv.dateIssued ? new Date(inv.dateIssued).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

    const stripY = headerH;
    doc.setTextColor(green);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE NO", margin, stripY + 18);
    doc.text("DATE ISSUED", margin + 150, stripY + 18);
    doc.text("STATUS", margin + 310, stripY + 18);
    doc.text("DUE DATE", margin + 430, stripY + 18);

    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(invoiceNum, margin, stripY + 36);
    doc.text(dateIssued, margin + 150, stripY + 36);

    // Status badge-style text
    const statusColor = inv.status === "Paid" ? "#16A34A" : inv.status === "Overdue" ? "#DC2626" : "#D97706";
    doc.setTextColor(statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(inv.status ?? "Pending", margin + 310, stripY + 36);

    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    const due = inv.dateIssued ? new Date(new Date(inv.dateIssued).getTime() + 30 * 86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }) : "—";
    doc.text(due, margin + 430, stripY + 36);

    // ── Two-column block: FROM / BILL TO ─────────────────────────────────────
    let y = headerH + 52 + 22;
    doc.setTextColor(green);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("FROM", margin, y);
    doc.text("BILL TO", pageW / 2, y);

    doc.setDrawColor("#D1FAE5");
    doc.setLineWidth(1);
    doc.line(margin, y + 5, margin + 210, y + 5);
    doc.line(pageW / 2, y + 5, pageW / 2 + 210, y + 5);

    y += 18;
    doc.setTextColor(darkText);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SAF Institute", margin, y);
    const studentName = `${inv.student?.firstName ?? ""} ${inv.student?.lastName ?? ""}`.trim() || "Student";
    doc.text(studentName, pageW / 2, y);

    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(grayText);
    const fromLines = [
        "No. 12 Liberation Road, Airport Residential Area",
        "Accra, Greater Accra Region, Ghana",
        "Tel: +233 302 123 456 | +233 244 567 890",
        "Email: admin@safinstitute.edu.gh",
        "Website: www.safinstitute.edu.gh",
    ];
    fromLines.forEach(line => { doc.text(line, margin, y); y += 14; });

    const billY = y + 18;
    doc.setTextColor(grayText);
    const toLines = [
        inv.student?.email ?? "—",
        `Cohort: ${inv.cohortName ?? "—"}`,
    ];
    toLines.forEach((line, i) => doc.text(line, pageW / 2, billY + 16 * i));

    // ── Line items table ─────────────────────────────────────────────────────
    y = Math.max(y, billY + 16 * toLines.length) + 32;

    // Table header
    doc.setFillColor(green);
    doc.roundedRect(margin, y, pageW - margin * 2, 28, 4, 4, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("#", margin + 10, y + 18);
    doc.text("DESCRIPTION", margin + 30, y + 18);
    doc.text("QTY", pageW - margin - 170, y + 18, { align: "right" });
    doc.text("UNIT PRICE", pageW - margin - 90, y + 18, { align: "right" });
    doc.text("TOTAL", pageW - margin - 10, y + 18, { align: "right" });

    y += 28;

    // Single line item
    const amount = Number(inv.amount) || 0;
    doc.setFillColor("#F9FAFB");
    doc.rect(margin, y, pageW - margin * 2, 32, "F");
    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text("1", margin + 10, y + 20);
    doc.text(`${inv.cohortName ?? "Course Fee"} — Tuition`, margin + 30, y + 20);
    doc.text("1", pageW - margin - 170, y + 20, { align: "right" });
    doc.text(`GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, pageW - margin - 90, y + 20, { align: "right" });
    doc.text(`GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, pageW - margin - 10, y + 20, { align: "right" });

    // Divider
    y += 32;
    doc.setDrawColor("#E5E7EB");
    doc.line(margin, y, pageW - margin, y);

    // ── Totals block (right-aligned) ─────────────────────────────────────────
    y += 20;
    const totX = pageW - margin - 220;
    const subRows = [
        ["Subtotal", `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`],
        ["Tax (0%)", "GHS 0.00"],
    ];
    doc.setFontSize(9);
    doc.setTextColor(grayText);
    subRows.forEach(([label, val]) => {
        doc.text(label, totX, y);
        doc.text(val, pageW - margin - 10, y, { align: "right" });
        y += 18;
    });

    // Total row
    y += 4;
    doc.setFillColor(green);
    doc.roundedRect(totX - 10, y - 14, pageW - margin - totX + 20, 30, 4, 4, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("TOTAL DUE", totX, y + 7);
    doc.text(`GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}`, pageW - margin - 10, y + 7, { align: "right" });

    // ── Payment instructions ──────────────────────────────────────────────────
    y += 50;
    doc.setFillColor(lightGreen);
    doc.roundedRect(margin, y, pageW - margin * 2, 72, 6, 6, "F");
    doc.setTextColor(green);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PAYMENT INSTRUCTIONS", margin + 16, y + 18);
    doc.setTextColor(darkText);
    doc.setFont("helvetica", "normal");
    const payLines = [
        "Bank: Ghana Commercial Bank (GCB) | Account Name: SAF Institute Ltd",
        "Account No: 1234567890 | Branch: Airport City, Accra",
        "Mobile Money: MTN MoMo — 0244 567 890 (SAF Institute) | Reference: " + invoiceNum,
    ];
    payLines.forEach((line, i) => doc.text(line, margin + 16, y + 34 + i * 14));

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.setFillColor(green);
    doc.rect(0, pageH - 40, pageW, 40, "F");
    doc.setTextColor("#FFFFFF");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Thank you for choosing SAF Institute — Empowering you through German language excellence.", pageW / 2, pageH - 22, { align: "center" });
    doc.text("www.safinstitute.edu.gh  |  admin@safinstitute.edu.gh  |  +233 302 123 456", pageW / 2, pageH - 10, { align: "center" });

    doc.save(`${invoiceNum}_${studentName.replace(/\s+/g, "_")}.pdf`);
}

export default function BillingPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        studentId: '',
        cohortName: 'A1 Intensive',
        amount: 1500,
        status: 'Pending'
    });

    const loadData = async () => {
        try {
            setIsLoading(true);
            // Fetch both invoices and students (for the creation dropdown)
            const [invData, studentData] = await Promise.all([
                fetchApi('/billing'),
                fetchApi('/users?role=student')
            ]);
            setInvoices(Array.isArray(invData) ? invData : []);
            setStudents(Array.isArray(studentData) ? studentData : []);
        } catch (error) {
            console.error("Failed to load billing data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreateInvoice = async () => {
        if (!formData.studentId || !formData.amount) {
            alert("Please select a student and amount.");
            return;
        }
        try {
            setIsSaving(true);
            await fetchApi('/billing', {
                method: 'POST',
                body: JSON.stringify({
                    studentId: formData.studentId,
                    cohortName: formData.cohortName,
                    amount: Number(formData.amount),
                    status: formData.status
                }),
            });
            setIsCreateModalOpen(false);
            setFormData({ studentId: '', cohortName: 'A1 Intensive', amount: 1500, status: 'Pending' });
            loadData();
        } catch (error) {
            console.error("Failed to create invoice:", error);
            alert("Failed to create invoice.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            setIsSaving(true);
            await fetchApi(`/billing/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus }),
            });
            loadData();
        } catch (error) {
            console.error("Failed to update invoice status:", error);
            alert("Failed to update invoice status.");
        } finally {
            setIsSaving(false);
        }
    };

    // Derived filtering and aggregations
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            const studentName = inv.student ? `${inv.student.firstName} ${inv.student.lastName}` : 'Unknown';
            return studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.cohortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.id?.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [invoices, searchQuery]);

    const stats = useMemo(() => {
        return invoices.reduce((acc, inv) => {
            const amount = Number(inv.amount) || 0;
            if (inv.status === 'Paid') acc.collected += amount;
            if (inv.status === 'Pending') acc.pending += amount;
            if (inv.status === 'Overdue') acc.overdue += amount;
            return acc;
        }, { collected: 0, pending: 0, overdue: 0 });
    }, [invoices]);

    const handleExport = () => {
        const rows = searchQuery ? filteredInvoices : invoices;
        if (rows.length === 0) { alert("No invoices to export."); return; }

        const headers = ["Invoice ID", "Student First Name", "Student Last Name", "Email", "Cohort", "Date Issued", "Amount (GHS)", "Status"];
        const csvRows = rows.map(inv => [
            inv.id,
            inv.student?.firstName ?? "",
            inv.student?.lastName ?? "",
            inv.student?.email ?? "",
            inv.cohortName ?? "",
            inv.dateIssued ? new Date(inv.dateIssued).toLocaleDateString("en-GB") : "",
            Number(inv.amount).toFixed(2),
            inv.status ?? "",
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

        const csv = [headers.join(","), ...csvRows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `SAF_Invoices_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Billing & Payments</h1>
                    <p className="text-gray-500 mt-1">Manage student invoices, payment plans, and revenue.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        disabled={isLoading || invoices.length === 0}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="h-4 w-4" />
                        Export Data
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white shadow hover:bg-[rgb(12,85,49)] transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Create Invoice
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <CreditCard className="h-5 w-5 text-brand-primary" />
                        <h3 className="font-medium">Total Collected (All Time)</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">GHS {stats.collected.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <FileText className="h-5 w-5 text-orange-500" />
                        <h3 className="font-medium">Pending Payments</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">GHS {stats.pending.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                        <FileText className="h-5 w-5 text-red-500" />
                        <h3 className="font-medium">Overdue Invoices</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">GHS {stats.overdue.toLocaleString()}</p>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6 flex flex-col min-h-[400px]">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
                    <div className="relative max-w-xs w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search invoices by student name..."
                            className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400">
                        <Loader2 className="h-8 w-8 animate-spin mb-4 text-brand-primary" />
                        <p>Loading financial records...</p>
                    </div>
                ) : filteredInvoices.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50/50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Invoice ID</th>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Cohort</th>
                                    <th className="px-6 py-4">Date Issued</th>
                                    <th className="px-6 py-4">Amount</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs font-medium text-brand-primary">{inv.id.split('-')[0]}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{inv.student?.firstName} {inv.student?.lastName}</td>
                                        <td className="px-6 py-4 text-gray-500">{inv.cohortName}</td>
                                        <td className="px-6 py-4 text-gray-500">{new Date(inv.dateIssued).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-semibold text-gray-900">GHS {Number(inv.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${inv.status === 'Paid' ? 'bg-green-50 text-green-700' :
                                                    inv.status === 'Pending' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {inv.status !== 'Paid' && (
                                                    <button
                                                        disabled={isSaving}
                                                        onClick={() => handleUpdateStatus(inv.id, 'Paid')}
                                                        className="text-xs font-medium text-brand-primary hover:underline"
                                                    >
                                                        Mark Paid
                                                    </button>
                                                )}
                                                {inv.status !== 'Overdue' && inv.status !== 'Paid' && (
                                                    <button
                                                        disabled={isSaving}
                                                        onClick={() => handleUpdateStatus(inv.id, 'Overdue')}
                                                        className="text-xs font-medium text-red-600 hover:underline"
                                                    >
                                                        Mark Overdue
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => downloadInvoicePDF(inv)}
                                                    title="Download PDF Invoice"
                                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-brand-primary hover:text-white px-2.5 py-1.5 rounded-lg transition-colors"
                                                >
                                                    <FileDown className="w-3.5 h-3.5" /> PDF
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-500">
                        {searchQuery ? "No invoices found matching your search." : "No invoices found. Create an invoice to begin."}
                    </div>
                )}
            </div>

            {/* Create Invoice Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Create Manual Invoice</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                                <select
                                    value={formData.studentId}
                                    onChange={e => setFormData({ ...formData, studentId: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                >
                                    <option value="" disabled>-- Select a student --</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.email})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort / Item Description</label>
                                <input
                                    type="text"
                                    value={formData.cohortName}
                                    onChange={e => setFormData({ ...formData, cohortName: e.target.value })}
                                    className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    placeholder="e.g. A1 Intensive Course Fee"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GHS)</label>
                                    <input
                                        type="number"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Paid">Paid</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
                            <button
                                disabled={isSaving || !formData.studentId}
                                onClick={handleCreateInvoice}
                                className="px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-lg hover:bg-brand-primary/90 flex items-center justify-center min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Invoice"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

