"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Users, TrendingUp, TrendingDown, Award, BookOpen,
    AlertTriangle, PenTool, CreditCard, GraduationCap,
    UserPlus, BarChart2, Clock, CheckCircle, Loader2,
    Activity, ChevronRight, Minus, Megaphone, CalendarCheck,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface Trend   { month: string; year: string; paidRevenue: number; newEnrollments: number; }
interface Cefr    { level: string; count: number; }
interface Attn    { type: string; severity: string; message: string; linkPath: string; linkText: string; }
interface Activity { type: string; description: string; timestamp: string; linkPath: string; initials: string; }

interface Metrics {
    totalStudents: number;
    activeStudentsThisMonth: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    outstandingRevenue: number;
    passRate90d: number;
    passRatePrev90d: number;
    gradedExamCount: number;
    enrollingClasses: number;
    activeClasses: number;
    completingThisMonth: number;
    pendingInvoiceCount: number;
    ungradedSubmissions: number;
    classesEndingThisWeek: number;
    studentsWithVisaIssues: number;
    monthlyTrends: Trend[];
    cefrDistribution: Cefr[];
    needsAttention: Attn[];
    recentActivity: Activity[];
    generatedAt: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const BRANCHES = ["All Branches", "Accra", "Kumasi", "Tamale"];

// SAF brand colours cycling per CEFR level
const CEFR_COLORS: Record<string, string> = {
    A1: "#0F6B3E",
    A2: "#4CAF50",
    B1: "#FFCC00",
    B2: "#FF9800",
    C1: "#00305E",
    C2: "#C7F000",
};

// Fallback "needs attention" items for demo / when data is empty
const DEMO_ALERTS: Attn[] = [
    {
        type: "attendance",
        severity: "critical",
        message: "5 students in Kumasi B1 cohort missed 3 consecutive classes.",
        linkPath: "/admin/classes",
        linkText: "View cohort",
    },
    {
        type: "certification",
        severity: "warning",
        message: "Instructor Sarah's Goethe certification expires in 30 days.",
        linkPath: "/admin/instructors",
        linkText: "Review",
    },
    {
        type: "billing",
        severity: "warning",
        message: "12 outstanding invoices in Accra branch.",
        linkPath: "/admin/billing",
        linkText: "Chase payments",
    },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number) {
    return n.toLocaleString("en-GH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

const SEVERITY_STYLES: Record<string, string> = {
    critical: "bg-red-50 border-red-200 text-red-700",
    warning:  "bg-amber-50 border-amber-200 text-amber-700",
    info:     "bg-blue-50 border-blue-200 text-blue-700",
};

const ACTIVITY_COLOR: Record<string, string> = {
    new_student:  "bg-brand-primary/10 text-brand-primary",
    invoice_paid: "bg-green-100 text-green-700",
    exam_graded:  "bg-blue-100 text-blue-700",
};

function TrendPill({ current, previous, suffix = "" }: { current: number; previous: number; suffix?: string }) {
    if (previous === 0 && current === 0) return <span className="text-xs text-gray-400">No data</span>;
    const delta = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
    if (delta === null) return <span className="text-xs text-gray-400">—</span>;
    if (delta > 0) return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
            <TrendingUp className="w-3 h-3" />+{delta}%{suffix}
        </span>
    );
    if (delta < 0) return (
        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-red-500">
            <TrendingDown className="w-3 h-3" />{delta}%{suffix}
        </span>
    );
    return <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-400"><Minus className="w-3 h-3" />0%</span>;
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
function CefrTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg">
            <p className="font-semibold mb-0.5">{label}</p>
            <p>{payload[0].value} student{payload[0].value !== 1 ? "s" : ""}</p>
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const router = useRouter();
    const [m, setM] = useState<Metrics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [branch, setBranch] = useState("All Branches");

    const load = (b?: string) => {
        setIsLoading(true);
        setLoadError(null);
        const query = b && b !== "All Branches" ? `?branch=${encodeURIComponent(b)}` : "";
        fetchApi(`/analytics/admin-dashboard${query}`)
            .then((data: any) => setM(data))
            .catch((err: any) => setLoadError(err?.message || "Failed to load dashboard metrics"))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => { load(); }, []);

    const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        setBranch(val);
        load(val);
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const revDelta = (m?.revenueLastMonth ?? 0) > 0
        ? Math.round((((m?.revenueThisMonth ?? 0) - (m?.revenueLastMonth ?? 0)) / (m?.revenueLastMonth ?? 1)) * 100)
        : null;

    const maxRevenue  = Math.max(...(m?.monthlyTrends ?? []).map(t => t.paidRevenue), 1);
    const maxEnroll   = Math.max(...(m?.monthlyTrends ?? []).map(t => t.newEnrollments), 1);

    const cefrData    = (m?.cefrDistribution ?? []).map(c => ({ level: c.level, students: c.count }));
    const alertItems  = (m?.needsAttention?.length ?? 0) > 0 ? m!.needsAttention : DEMO_ALERTS;
    const criticals   = alertItems.filter(a => a.severity === "critical");

    // Attendance — demo value (no real data source yet)
    const avgAttendance = 88;

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            <p className="text-sm">Loading dashboard…</p>
        </div>
    );

    if (loadError) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <div className="text-center">
                <p className="text-base font-semibold text-gray-800">Could not load dashboard</p>
                <p className="text-sm text-gray-400 mt-1 max-w-sm">{loadError}</p>
            </div>
            <button
                onClick={() => load(branch)}
                className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors"
            >
                Retry
            </button>
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── Critical alert bar ──────────────────────────────────── */}
            {criticals.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-red-800">Action required</p>
                        <ul className="mt-1 space-y-0.5">
                            {criticals.map((a, i) => (
                                <li key={i} className="text-xs text-red-700 flex items-center gap-1">
                                    <span>{a.message}</span>
                                    <button onClick={() => router.push(a.linkPath)} className="underline font-medium hover:no-underline">{a.linkText}</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold text-gray-900">Institute Overview</h1>
                        {/* Branch Toggle */}
                        <div className="relative">
                            <select
                                value={branch}
                                onChange={handleBranchChange}
                                className="appearance-none pl-3 pr-8 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                    </div>
                    <p className="text-gray-500 text-sm mt-0.5">
                        SAF Institute · {m?.generatedAt
                            ? new Date(m.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
                            : "—"}
                    </p>
                </div>
                {isLoading && <Activity className="w-4 h-4 text-brand-primary animate-spin" />}
            </div>

            {/* ── 5 KPI Cards ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

                {/* Active Students */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                            <Users className="w-5 h-5 text-brand-primary" />
                        </div>
                        <span className="text-xs text-gray-400">{m?.totalStudents ?? 0} total</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Active Students</p>
                    <p className="text-2xl font-bold text-gray-900">{fmt(m?.activeStudentsThisMonth ?? 0)}</p>
                    <div className="mt-1.5">
                        <TrendPill current={m?.activeStudentsThisMonth ?? 0} previous={0} />
                    </div>
                </div>

                {/* Revenue */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        {revDelta !== null && (
                            revDelta >= 0
                                ? <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{revDelta}%</span>
                                : <span className="text-xs font-semibold text-red-500 flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{revDelta}%</span>
                        )}
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Revenue This Month</p>
                    <p className="text-2xl font-bold text-gray-900">GHS {fmt(m?.revenueThisMonth ?? 0)}</p>
                    <p className="text-xs text-gray-400 mt-1">Outstanding: <span className="font-medium text-amber-600">GHS {fmt(m?.outstandingRevenue ?? 0)}</span></p>
                </div>

                {/* Pass Rate */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Award className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-xs text-gray-400">{m?.gradedExamCount ?? 0} graded</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Goethe Pass Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{m?.passRate90d ?? 0}%</p>
                    <div className="mt-1.5">
                        <TrendPill current={m?.passRate90d ?? 0} previous={m?.passRatePrev90d ?? 0} suffix=" vs prev 90d" />
                    </div>
                </div>

                {/* Active Classes */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-violet-600" />
                        </div>
                        <span className="text-xs text-gray-400">{m?.enrollingClasses ?? 0} enrolling</span>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Active Classes</p>
                    <p className="text-2xl font-bold text-gray-900">{m?.activeClasses ?? 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Completing this month: <span className="font-medium text-violet-600">{m?.completingThisMonth ?? 0}</span></p>
                </div>

                {/* Average Attendance — 5th card */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-3">
                        <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
                            <CalendarCheck className="w-5 h-5 text-teal-600" />
                        </div>
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" />+2%
                        </span>
                    </div>
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Avg. Attendance</p>
                    <p className="text-2xl font-bold text-gray-900">{avgAttendance}%</p>
                    <p className="text-xs text-gray-400 mt-1">+2% from last month</p>
                </div>
            </div>

            {/* ── Quick Actions ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <button
                    onClick={() => router.push("/admin/students")}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors shadow-sm"
                >
                    <UserPlus className="w-4 h-4" /> Enrol Student
                </button>
                <button
                    onClick={() => router.push("/admin/classes")}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <GraduationCap className="w-4 h-4" /> New Class
                </button>
                <button
                    onClick={() => router.push("/admin/grading")}
                    className="relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <PenTool className="w-4 h-4" /> Grade Exams
                    {(m?.ungradedSubmissions ?? 0) > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {m!.ungradedSubmissions}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => router.push("/admin/billing")}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <CreditCard className="w-4 h-4" /> Billing
                </button>
                <button
                    onClick={() => alert("Announcement composer coming soon!")}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <Megaphone className="w-4 h-4" /> Send Announcement
                </button>
            </div>

            {/* ── Main Grid ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* ── LEFT COLUMN ──────────────────────────────────────── */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Revenue + Enrolment Trends (CSS dual-bar) */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Revenue & Enrolment Trends</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-brand-primary inline-block" />Revenue</span>
                                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-300 inline-block" />Enrolments</span>
                            </div>
                        </div>

                        <div className="relative h-52">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className="border-t border-dashed border-gray-100 w-full" />
                                ))}
                            </div>

                            {(m?.monthlyTrends?.length ?? 0) === 0 ? (
                                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">No data yet</div>
                            ) : (
                                <div className="absolute inset-0 flex items-end gap-1 pb-6">
                                    {(m?.monthlyTrends ?? []).map((t, i) => {
                                        const revH = Math.max(4, (t.paidRevenue / maxRevenue) * 100);
                                        const enrH = Math.max(4, (t.newEnrollments / maxEnroll) * 100);
                                        return (
                                            <div key={i} className="flex-1 flex items-end gap-0.5 group relative">
                                                <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap shadow-lg">
                                                    <p className="font-semibold">{t.month} {t.year}</p>
                                                    <p>Rev: GHS {fmt(t.paidRevenue)}</p>
                                                    <p>Enr: {t.newEnrollments}</p>
                                                </div>
                                                <div className="flex-1 bg-brand-primary/80 hover:bg-brand-primary rounded-t-sm transition-all cursor-default" style={{ height: `${revH}%` }} />
                                                <div className="flex-1 bg-violet-300 hover:bg-violet-400 rounded-t-sm transition-all cursor-default" style={{ height: `${enrH}%` }} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 flex">
                                {(m?.monthlyTrends ?? []).map((t, i) => (
                                    <div key={i} className="flex-1 text-center text-xs text-gray-400 font-medium">{t.month}</div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Goethe Level Distribution (Recharts) */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                        <div className="mb-5">
                            <h3 className="font-semibold text-gray-900 text-sm">Goethe Level Distribution</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Active students per CEFR level</p>
                        </div>

                        {cefrData.every(c => c.students === 0) ? (
                            <div className="flex items-center justify-center h-48 text-xs text-gray-400">No active enrolments yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={cefrData} barSize={36} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                                    <XAxis dataKey="level" tick={{ fontSize: 12, fontWeight: 600, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<CefrTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                                    <Bar dataKey="students" radius={[6, 6, 0, 0]}>
                                        {cefrData.map((entry) => (
                                            <Cell key={entry.level} fill={CEFR_COLORS[entry.level] || "#0F6B3E"} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 mt-4">
                            {cefrData.map(c => (
                                <span key={c.level} className="flex items-center gap-1.5 text-xs text-gray-600">
                                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CEFR_COLORS[c.level] }} />
                                    {c.level} <span className="font-semibold text-gray-800">({c.students})</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Secondary metrics row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: "Overdue Invoices",    value: m?.pendingInvoiceCount ?? 0,    icon: <CreditCard className="w-4 h-4" />, alert: (m?.pendingInvoiceCount ?? 0) > 0 },
                            { label: "Ungraded Exams",      value: m?.ungradedSubmissions ?? 0,    icon: <PenTool className="w-4 h-4" />,    alert: (m?.ungradedSubmissions ?? 0) > 0 },
                            { label: "Classes Ending (7d)", value: m?.classesEndingThisWeek ?? 0,  icon: <Clock className="w-4 h-4" />,      alert: false },
                            { label: "Visa Issues",         value: m?.studentsWithVisaIssues ?? 0, icon: <CheckCircle className="w-4 h-4" />,alert: (m?.studentsWithVisaIssues ?? 0) > 0 },
                        ].map(({ label, value, icon, alert }) => (
                            <div key={label} className={`bg-white rounded-xl border shadow-sm p-4 ${alert && value > 0 ? "border-amber-200" : "border-gray-100"}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${alert && value > 0 ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400"}`}>
                                    {icon}
                                </div>
                                <p className="text-xl font-bold text-gray-900">{value}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT COLUMN ──────────────────────────────────────── */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Needs Attention */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 text-sm">Needs Attention</h3>
                            <BarChart2 className="w-4 h-4 text-gray-300" />
                        </div>
                        <div className="p-3 space-y-2">
                            {alertItems.map((item, i) => (
                                <button
                                    key={i}
                                    onClick={() => router.push(item.linkPath)}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-opacity hover:opacity-80 ${SEVERITY_STYLES[item.severity] || "bg-gray-50 border-gray-200 text-gray-700"}`}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium leading-snug">{item.message}</p>
                                        <p className="text-xs underline mt-0.5">{item.linkText} →</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 text-sm">Recent Activity</h3>
                            <button onClick={() => router.push("/admin/students")} className="text-xs text-brand-primary hover:underline flex items-center gap-0.5">
                                View all <ChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {(m?.recentActivity?.length ?? 0) === 0 ? (
                                <div className="text-center py-8 text-xs text-gray-400">No recent activity</div>
                            ) : (
                                (m?.recentActivity ?? []).map((a, i) => (
                                    <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors cursor-default">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ACTIVITY_COLOR[a.type] || "bg-gray-100 text-gray-500"}`}>
                                            {a.initials}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-gray-700 leading-snug line-clamp-2">{a.description}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{a.timestamp ? timeAgo(a.timestamp) : ""}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h3 className="font-semibold text-gray-900 text-sm">Quick Links</h3>
                        </div>
                        <div className="p-2">
                            {[
                                { label: "All Students",       path: "/admin/students" },
                                { label: "All Classes",        path: "/admin/classes" },
                                { label: "Courses",            path: "/admin/courses" },
                                { label: "Instructors",        path: "/admin/instructors" },
                                { label: "Billing & Invoices", path: "/admin/billing" },
                                { label: "Assignments",        path: "/admin/assignments" },
                                { label: "Branch Offices",     path: "/admin/branches" },
                            ].map(({ label, path }) => (
                                <button
                                    key={path}
                                    onClick={() => router.push(path)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
                                >
                                    <span className="font-medium">{label}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-brand-primary transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
