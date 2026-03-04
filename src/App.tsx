// ─────────────────────────────────────────────────────────────────────────────
// GridNova — Single-file application
// All components, hooks, utilities, and types inlined.
// Only external library imports and ./hooks/useActor are kept as imports.
// ─────────────────────────────────────────────────────────────────────────────

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useActor } from "./hooks/useActor";

// ─────────────────────────────────────────────────────────────────────────────
// Types (inlined from backend.d.ts)
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  mae: number;
  comparison: Array<HourComparison>;
  rmse: number;
  historical: Array<HistoricalDay>;
  carbonReduction: number;
  utilization: number;
}

interface ForecastMeta {
  weatherSummary: string;
  confidenceScore: number;
  peakWindow: string;
}

interface SchedulingActions {
  costSavings: number;
  actions: Array<SchedulingAction>;
  optimizationEfficiency: number;
  curtailmentReduction: number;
}

interface RiskAnalytics {
  alerts: Array<RiskAlert>;
  shortageProbability: number;
  curtailmentRisk: number;
  stressForecast: string;
}

interface HourComparison {
  hour: bigint;
  load: number;
  generation: number;
}

interface RiskAlert {
  alertId: bigint;
  message: string;
  timestamp: bigint;
  severity: string;
}

interface GridStability {
  voltage: number;
  stabilityStatus: string;
  frequency: number;
  riskLevel: string;
}

interface SchedulingAction {
  actionType: string;
  description: string;
  priority: bigint;
}

interface ForecastRecord {
  hour: bigint;
  generation: number;
  isPeak: boolean;
  upperCi: number;
  lowerCi: number;
}

interface HistoricalDay {
  date: string;
  generation: number;
}

interface DashboardMetrics {
  loadDemand: number;
  batteryLevel: number;
  surplus: number;
  gridFrequency: number;
  renewableGeneration: number;
}

interface StorageStatus {
  status: string;
  currentStored: number;
  hourlyProjections: Array<number>;
  totalCapacity: number;
}

interface SystemStatus {
  status: string;
  timestamp: bigint;
}

// ─────────────────────────────────────────────────────────────────────────────
// Format utilities
// ─────────────────────────────────────────────────────────────────────────────

function formatMWh(value: number): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} MWh`;
}

function formatKV(value: number): string {
  return `${value.toFixed(1)} kV`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getRiskColor(level: string): { bg: string; text: string } {
  const l = level.toLowerCase();
  if (l === "high" || l === "critical")
    return { bg: "oklch(0.97 0.04 27)", text: "oklch(0.45 0.20 27)" };
  if (l === "medium" || l === "warning")
    return { bg: "oklch(0.96 0.06 85)", text: "oklch(0.45 0.14 85)" };
  return { bg: "oklch(0.94 0.07 148)", text: "oklch(0.35 0.15 148)" };
}

function getStatusColor(status: string): { bg: string; text: string; dot: string } {
  const s = status.toLowerCase();
  if (s === "critical")
    return { bg: "oklch(0.97 0.04 27)", text: "oklch(0.45 0.20 27)", dot: "oklch(0.55 0.22 27)" };
  if (s === "warning")
    return { bg: "oklch(0.96 0.06 85)", text: "oklch(0.45 0.14 85)", dot: "oklch(0.65 0.15 85)" };
  return { bg: "oklch(0.94 0.07 148)", text: "oklch(0.35 0.15 148)", dot: "oklch(0.52 0.15 148)" };
}

// ─────────────────────────────────────────────────────────────────────────────
// React Query hooks
// ─────────────────────────────────────────────────────────────────────────────

function useSystemStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<SystemStatus>({
    queryKey: ["systemStatus"],
    queryFn: async () => {
      if (!actor) return { status: "Online", timestamp: BigInt(0) };
      return actor.getSystemStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

function useDashboardMetrics() {
  const { actor, isFetching } = useActor();
  return useQuery<DashboardMetrics>({
    queryKey: ["dashboardMetrics"],
    queryFn: async () => {
      if (!actor)
        return { renewableGeneration: 0, loadDemand: 0, surplus: 0, batteryLevel: 0, gridFrequency: 50 };
      return actor.getDashboardMetrics();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

function useForecastData() {
  const { actor, isFetching } = useActor();
  return useQuery<ForecastRecord[]>({
    queryKey: ["forecastData"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getForecastData();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
  });
}

function useForecastMeta() {
  const { actor, isFetching } = useActor();
  return useQuery<ForecastMeta>({
    queryKey: ["forecastMeta"],
    queryFn: async () => {
      if (!actor) return { confidenceScore: 0, weatherSummary: "", peakWindow: "" };
      return actor.getForecastMeta();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
  });
}

function useGridStability() {
  const { actor, isFetching } = useActor();
  return useQuery<GridStability>({
    queryKey: ["gridStability"],
    queryFn: async () => {
      if (!actor) return { frequency: 50, voltage: 0, stabilityStatus: "Unknown", riskLevel: "Unknown" };
      return actor.getGridStability();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 10000,
  });
}

function useSchedulingActions() {
  const { actor, isFetching } = useActor();
  return useQuery<SchedulingActions>({
    queryKey: ["schedulingActions"],
    queryFn: async () => {
      if (!actor) return { actions: [], optimizationEfficiency: 0, costSavings: 0, curtailmentReduction: 0 };
      return actor.getSchedulingActions();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

function useStorageStatus() {
  const { actor, isFetching } = useActor();
  return useQuery<StorageStatus>({
    queryKey: ["storageStatus"],
    queryFn: async () => {
      if (!actor) return { status: "Idle", currentStored: 0, hourlyProjections: [], totalCapacity: 0 };
      return actor.getStorageStatus();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 15000,
  });
}

function useRiskAnalytics() {
  const { actor, isFetching } = useActor();
  return useQuery<RiskAnalytics>({
    queryKey: ["riskAnalytics"],
    queryFn: async () => {
      if (!actor) return { curtailmentRisk: 0, shortageProbability: 0, stressForecast: "", alerts: [] };
      return actor.getRiskAnalytics();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 20000,
  });
}

function useAnalyticsData() {
  const { actor, isFetching } = useActor();
  return useQuery<AnalyticsData>({
    queryKey: ["analyticsData"],
    queryFn: async () => {
      if (!actor) return { historical: [], comparison: [], rmse: 0, mae: 0, utilization: 0, carbonReduction: 0 };
      return actor.getAnalyticsData();
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 60000,
  });
}

function useAcknowledgeAlert() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: bigint) => {
      if (!actor) return false;
      return actor.acknowledgeAlert(alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["riskAnalytics"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab type
// ─────────────────────────────────────────────────────────────────────────────

export type TabId = "dashboard" | "forecasting" | "scheduling" | "analytics" | "settings";

// ─────────────────────────────────────────────────────────────────────────────
// Header component
// ─────────────────────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "forecasting", label: "Forecasting" },
  { id: "scheduling", label: "Scheduling" },
  { id: "analytics", label: "Analytics" },
  { id: "settings", label: "Settings" },
];

function getHeaderStatusConfig(status: string) {
  const s = status.toLowerCase();
  if (s === "critical") return { dot: "bg-red-400", text: "text-red-300", label: "Critical" };
  if (s === "warning") return { dot: "bg-amber-400", text: "text-amber-300", label: "Warning" };
  return { dot: "bg-emerald-400", text: "text-emerald-300", label: status || "Online" };
}

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  systemStatus: string;
}

function Header({ activeTab, onTabChange, systemStatus }: HeaderProps) {
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const statusCfg = getHeaderStatusConfig(systemStatus);

  const timeStr = clock.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = clock.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-[72px] flex items-center px-6 gap-6"
      style={{ background: "oklch(0.17 0.04 255)", borderBottom: "1px solid oklch(0.25 0.04 255)" }}
    >
      <div className="flex items-center gap-3 shrink-0">
        <img
          src="/assets/generated/gridnova-logo-transparent.dim_200x200.png"
          alt="GridNova Logo"
          className="h-10 w-10 object-contain"
        />
        <div>
          <div className="font-display font-700 text-white leading-none tracking-tight" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
            GridNova
          </div>
          <div className="leading-none mt-0.5" style={{ fontSize: "0.67rem", color: "oklch(0.65 0.04 255)", letterSpacing: "0.04em" }}>
            Intelligent Energy. Autonomous Grid.
          </div>
        </div>
      </div>

      <nav className="flex-1 flex justify-center">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative px-4 py-2 text-sm font-medium rounded transition-all duration-150"
                style={{
                  color: isActive ? "white" : "oklch(0.70 0.04 255)",
                  background: isActive ? "oklch(0.25 0.06 255)" : "transparent",
                  fontFamily: "Plus Jakarta Sans, system-ui, sans-serif",
                  letterSpacing: "0.01em",
                }}
              >
                {tab.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ background: "oklch(0.52 0.15 148)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex items-center gap-4 shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded"
          style={{ background: "oklch(0.22 0.05 255)", border: "1px solid oklch(0.30 0.05 255)" }}
        >
          <span className={`w-2 h-2 rounded-full animate-pulse ${statusCfg.dot}`} />
          <span className={`text-xs font-medium ${statusCfg.text}`} style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {statusCfg.label}
          </span>
        </div>
        <div className="text-right">
          <div className="font-mono text-white leading-none" style={{ fontSize: "0.9rem", fontFamily: "Geist Mono, monospace", letterSpacing: "0.05em" }}>
            {timeStr}
          </div>
          <div className="leading-none mt-0.5" style={{ fontSize: "0.65rem", color: "oklch(0.60 0.03 255)" }}>
            {dateStr} UTC
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard component
// ─────────────────────────────────────────────────────────────────────────────

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  subLabel?: ReactNode;
  subValue?: ReactNode;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  loading?: boolean;
  valueColor?: string;
  extra?: ReactNode;
}

function TrendArrow({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <span style={{ color: "oklch(0.52 0.15 148)" }} className="text-sm">▲</span>;
  if (trend === "down") return <span style={{ color: "oklch(0.55 0.22 27)" }} className="text-sm">▼</span>;
  return <span style={{ color: "oklch(0.55 0.04 255)" }} className="text-sm">—</span>;
}

function MetricCard({ title, value, unit, subLabel, subValue, icon, trend, loading, valueColor, extra }: MetricCardProps) {
  return (
    <div className="gn-card p-5 flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <div className="p-1.5 rounded shrink-0" style={{ background: "oklch(0.93 0.03 255)" }}>
              {icon}
            </div>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider truncate" style={{ color: "oklch(0.52 0.02 255)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {title}
          </span>
        </div>
        {trend && <TrendArrow trend={trend} />}
      </div>

      {loading ? (
        <Skeleton className="h-8 w-32" />
      ) : (
        <div className="flex items-baseline gap-1.5">
          <span className="gn-metric-value text-2xl leading-none" style={{ color: valueColor ?? "oklch(0.17 0.04 255)" }}>
            {value}
          </span>
          {unit && <span className="text-sm" style={{ color: "oklch(0.50 0.02 255)" }}>{unit}</span>}
        </div>
      )}

      {(subLabel || subValue || extra) && (
        <div className="mt-auto">
          {extra}
          {subLabel && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs" style={{ color: "oklch(0.52 0.02 255)" }}>{subLabel}</span>
              {subValue && <span className="text-xs font-medium" style={{ color: "oklch(0.35 0.04 255)" }}>{subValue}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ForecastChart component
// ─────────────────────────────────────────────────────────────────────────────

interface ForecastChartProps {
  data: ForecastRecord[];
  height?: number;
}

interface ForecastTooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface ForecastCustomTooltipProps {
  active?: boolean;
  payload?: ForecastTooltipPayloadItem[];
  label?: string;
}

function ForecastCustomTooltip({ active, payload, label }: ForecastCustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const generation = payload.find((p) => p.name === "generation");
  const upper = payload.find((p) => p.name === "upperCi");
  const lower = payload.find((p) => p.name === "lowerCi");

  return (
    <div className="rounded px-3 py-2.5 text-xs" style={{ background: "oklch(0.17 0.04 255)", border: "1px solid oklch(0.30 0.05 255)", color: "white", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div className="font-semibold mb-1.5" style={{ color: "oklch(0.75 0.03 255)" }}>Hour {label}:00</div>
      {generation && (
        <div className="flex justify-between gap-4">
          <span style={{ color: "oklch(0.70 0.06 255)" }}>Forecast</span>
          <span className="font-semibold">{generation.value.toFixed(0)} MW</span>
        </div>
      )}
      {upper && lower && (
        <div className="flex justify-between gap-4 mt-0.5">
          <span style={{ color: "oklch(0.60 0.04 255)" }}>CI Range</span>
          <span style={{ color: "oklch(0.75 0.03 255)" }}>{lower.value.toFixed(0)}–{upper.value.toFixed(0)} MW</span>
        </div>
      )}
    </div>
  );
}

function ForecastChart({ data, height = 260 }: ForecastChartProps) {
  const chartData = data.map((d) => ({
    hour: Number(d.hour),
    generation: d.generation,
    upperCi: d.upperCi,
    lowerCi: d.lowerCi,
    isPeak: d.isPeak,
  }));

  const peakHours = chartData.filter((d) => d.isPeak).map((d) => d.hour);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.38 0.14 264)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="oklch(0.38 0.14 264)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="ciGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.65 0.08 264)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="oklch(0.65 0.08 264)" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.007 255)" vertical={false} />
        <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "oklch(0.52 0.02 255)", fontFamily: "Geist Mono, monospace" }} tickFormatter={(v: number) => `${v}h`} interval={3} />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "oklch(0.52 0.02 255)", fontFamily: "Geist Mono, monospace" }} tickFormatter={(v: number) => `${v}`} width={45} />
        <Tooltip content={<ForecastCustomTooltip />} />
        <Area type="monotone" dataKey="upperCi" stroke="none" fill="url(#ciGradient)" name="upperCi" legendType="none" />
        <Area type="monotone" dataKey="lowerCi" stroke="none" fill="oklch(0.99 0 0)" name="lowerCi" legendType="none" />
        <Area type="monotone" dataKey="generation" stroke="oklch(0.38 0.14 264)" strokeWidth={2} fill="url(#forecastGradient)" name="generation" dot={false} activeDot={{ r: 4, fill: "oklch(0.38 0.14 264)", stroke: "white", strokeWidth: 2 }} />
        {peakHours.map((h) => (
          <ReferenceLine key={h} x={h} stroke="oklch(0.75 0.15 85)" strokeDasharray="4 2" strokeWidth={1.5} />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GridStabilityCard component
// ─────────────────────────────────────────────────────────────────────────────

interface GridStabilityCardProps {
  data?: GridStability;
  loading?: boolean;
}

function FreqGauge({ frequency }: { frequency: number }) {
  const deviation = Math.abs(frequency - 50);
  const pct = Math.min(deviation / 0.5, 1);
  const color = deviation < 0.1 ? "oklch(0.52 0.15 148)" : deviation < 0.3 ? "oklch(0.65 0.15 85)" : "oklch(0.55 0.22 27)";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="gn-metric-value tabular-nums" style={{ fontSize: "2.5rem", color: "oklch(0.17 0.04 255)", lineHeight: 1 }}>
        {frequency.toFixed(2)}
      </div>
      <div className="text-sm font-medium" style={{ color: "oklch(0.52 0.02 255)" }}>Hz</div>
      <div className="w-full mt-1">
        <div className="flex justify-between text-xs mb-1" style={{ color: "oklch(0.60 0.02 255)" }}>
          <span>49.5</span>
          <span className="font-medium" style={{ color: "oklch(0.40 0.02 255)" }}>50.0 Hz ref</span>
          <span>50.5</span>
        </div>
        <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.93 0.01 255)" }}>
          <div className="absolute top-0 bottom-0 w-0.5 rounded-full" style={{ left: "50%", transform: "translateX(-50%)", background: "oklch(0.70 0.02 255)" }} />
          <div
            className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-500"
            style={{
              width: `${Math.max(2, pct * 45)}%`,
              left: frequency >= 50 ? "calc(50% + 2px)" : undefined,
              right: frequency < 50 ? "calc(50% + 2px)" : undefined,
              background: color,
            }}
          />
        </div>
        <div className="text-xs text-center mt-1" style={{ color: "oklch(0.60 0.02 255)" }}>
          {frequency >= 50 ? "+" : "−"}{Math.abs(frequency - 50).toFixed(3)} Hz deviation
        </div>
      </div>
    </div>
  );
}

function GridStabilityCard({ data, loading }: GridStabilityCardProps) {
  const statusCfg = data ? getStatusColor(data.stabilityStatus) : getStatusColor("stable");
  const riskCfg = data ? getRiskColor(data.riskLevel) : getRiskColor("low");

  return (
    <div className="gn-card p-5 flex flex-col gap-5">
      <div>
        <h3 className="gn-section-header text-sm mb-0.5">Grid Stability Monitor</h3>
        <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>Real-time frequency & voltage</p>
      </div>

      {loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : (
        <>
          <FreqGauge frequency={data.frequency} />
          <div className="flex items-center justify-between p-3 rounded" style={{ background: "oklch(0.97 0.003 255)", border: "1px solid oklch(0.92 0.005 255)" }}>
            <span className="text-sm font-medium" style={{ color: "oklch(0.35 0.02 255)" }}>Voltage</span>
            <span className="gn-metric-value text-lg" style={{ color: "oklch(0.17 0.04 255)" }}>{formatKV(data.voltage)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.02 255)" }}>Stability</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: statusCfg.bg, color: statusCfg.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                {data.stabilityStatus}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.02 255)" }}>Risk Level</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold" style={{ background: riskCfg.bg, color: riskCfg.text }}>
                {data.riskLevel}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDecisionEngine component
// ─────────────────────────────────────────────────────────────────────────────

interface AIDecisionEngineProps {
  data?: SchedulingActions;
  loading?: boolean;
  expanded?: boolean;
}

function getActionIcon(actionType: string): string {
  const t = actionType.toLowerCase();
  if (t.includes("store")) return "🔋";
  if (t.includes("dispatch") || t.includes("grid")) return "⚡";
  if (t.includes("backup")) return "🛡️";
  if (t.includes("curtail")) return "✂️";
  return "⚙️";
}

function getPriorityConfig(priority: bigint) {
  const p = Number(priority);
  if (p === 1) return { label: "High", bg: "oklch(0.97 0.04 27)", text: "oklch(0.45 0.20 27)" };
  if (p === 2) return { label: "Medium", bg: "oklch(0.96 0.06 85)", text: "oklch(0.45 0.14 85)" };
  return { label: "Low", bg: "oklch(0.94 0.07 148)", text: "oklch(0.35 0.15 148)" };
}

function AIDecisionEngine({ data, loading, expanded = false }: AIDecisionEngineProps) {
  return (
    <div className="gn-card p-5 flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="gn-section-header text-sm">AI Decision Engine</h3>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold" style={{ background: "oklch(0.93 0.03 264)", color: "oklch(0.35 0.12 264)", fontSize: "0.65rem" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            AUTONOMOUS
          </span>
        </div>
        <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>Autonomous scheduling recommendations</p>
      </div>

      {loading || !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {data.actions.map((action, idx) => {
              const priorityCfg = getPriorityConfig(action.priority);
              return (
                <div key={`${action.actionType}-${idx}`} className="flex items-start gap-3 p-3 rounded" style={{ background: "oklch(0.975 0.003 255)", border: "1px solid oklch(0.91 0.005 255)" }}>
                  <div className="p-2 rounded shrink-0 text-lg leading-none" style={{ background: "white", border: "1px solid oklch(0.91 0.005 255)" }}>
                    {getActionIcon(action.actionType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm" style={{ color: "oklch(0.20 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                        {action.actionType}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold shrink-0" style={{ background: priorityCfg.bg, color: priorityCfg.text }}>
                        P{Number(action.priority)} {priorityCfg.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "oklch(0.48 0.02 255)" }}>{action.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-px rounded overflow-hidden" style={{ background: "oklch(0.88 0.01 255)", border: "1px solid oklch(0.88 0.01 255)" }}>
            <div className="p-3 flex flex-col gap-0.5" style={{ background: "white" }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.02 255)" }}>Efficiency</span>
              <span className="gn-metric-value text-xl" style={{ color: "oklch(0.35 0.15 148)" }}>{formatPercent(data.optimizationEfficiency)}</span>
            </div>
            <div className="p-3 flex flex-col gap-0.5" style={{ background: "white" }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.02 255)" }}>Cost Savings</span>
              <span className="gn-metric-value text-xl" style={{ color: "oklch(0.38 0.14 264)" }}>{formatUSD(data.costSavings)}</span>
            </div>
            <div className="p-3 flex flex-col gap-0.5" style={{ background: "white" }}>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "oklch(0.55 0.02 255)" }}>Curtailment ↓</span>
              <span className="gn-metric-value text-xl" style={{ color: "oklch(0.38 0.14 264)" }}>{formatPercent(data.curtailmentReduction)}</span>
            </div>
          </div>

          {expanded && (
            <div className="p-4 rounded" style={{ background: "oklch(0.96 0.015 264)", border: "1px solid oklch(0.88 0.04 264)" }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.40 0.10 264)" }}>
                Scheduling Queue — Next 6 Hours
              </div>
              <div className="space-y-2">
                {data.actions.map((action, i) => (
                  <div key={`queue-${action.actionType}-${i}`} className="flex items-center gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold shrink-0" style={{ background: "oklch(0.38 0.14 264)", color: "white", fontSize: "0.7rem" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1" style={{ color: "oklch(0.30 0.05 264)" }}>
                      <span className="font-semibold">{action.actionType}</span>{" — "}{action.description}
                    </div>
                    <div className="text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(0.38 0.14 264)", color: "white" }}>
                      T+{(i + 1) * 2}h
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StorageManagement component
// ─────────────────────────────────────────────────────────────────────────────

interface StorageManagementProps {
  data?: StorageStatus;
  loading?: boolean;
}

function getStorageStatusConfig(status: string) {
  const s = status.toLowerCase();
  if (s === "charging") return { bg: "oklch(0.94 0.07 148)", text: "oklch(0.35 0.15 148)", dot: "oklch(0.52 0.15 148)", label: "Charging" };
  if (s === "discharging") return { bg: "oklch(0.96 0.06 85)", text: "oklch(0.45 0.14 85)", dot: "oklch(0.65 0.15 85)", label: "Discharging" };
  return { bg: "oklch(0.95 0.005 255)", text: "oklch(0.40 0.02 255)", dot: "oklch(0.60 0.02 255)", label: status || "Idle" };
}

interface StorageTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function StorageCustomTooltip({ active, payload, label }: StorageTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded px-2.5 py-2 text-xs" style={{ background: "oklch(0.17 0.04 255)", color: "white", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div style={{ color: "oklch(0.70 0.03 255)" }}>Hour {label}</div>
      <div className="font-semibold">{payload[0].value.toFixed(1)} MWh</div>
    </div>
  );
}

function StorageManagement({ data, loading }: StorageManagementProps) {
  const statusCfg = data ? getStorageStatusConfig(data.status) : getStorageStatusConfig("idle");
  const pct = data ? (data.currentStored / data.totalCapacity) * 100 : 0;
  const projectionData = data?.hourlyProjections.map((v, i) => ({ hour: i, stored: v })) ?? [];
  const barColor = pct > 70 ? "oklch(0.52 0.15 148)" : pct > 30 ? "oklch(0.65 0.15 85)" : "oklch(0.55 0.22 27)";

  return (
    <div className="gn-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="gn-section-header text-sm mb-0.5">Battery & Storage Management</h3>
        <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>Capacity utilization & projections</p>
      </div>

      {loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          <div className="p-4 rounded" style={{ background: "oklch(0.975 0.003 255)", border: "1px solid oklch(0.91 0.005 255)" }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="gn-metric-value text-2xl" style={{ color: "oklch(0.17 0.04 255)" }}>{formatPercent(pct)}</div>
                <div className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.02 255)" }}>
                  {formatMWh(data.currentStored)} / {formatMWh(data.totalCapacity)}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: statusCfg.bg, color: statusCfg.text }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                {statusCfg.label}
              </span>
            </div>
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: "oklch(0.91 0.005 255)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
            </div>
            <div className="flex justify-between text-xs mt-1.5" style={{ color: "oklch(0.60 0.02 255)" }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.52 0.02 255)" }}>
              24-Hour Storage Projection
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={projectionData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.52 0.15 148)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="oklch(0.52 0.15 148)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 255)" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.60 0.02 255)", fontFamily: "Geist Mono, monospace" }} interval={5} tickFormatter={(v: number) => `${v}h`} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.60 0.02 255)", fontFamily: "Geist Mono, monospace" }} width={36} />
                <Tooltip content={<StorageCustomTooltip />} />
                <Area type="monotone" dataKey="stored" stroke="oklch(0.52 0.15 148)" strokeWidth={1.5} fill="url(#storageGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RiskAnalyticsCard component
// ─────────────────────────────────────────────────────────────────────────────

interface RiskAnalyticsCardProps {
  data?: RiskAnalytics;
  loading?: boolean;
}

function RiskMeter({ value, label }: { value: number; label: string }) {
  const color = value > 60 ? "oklch(0.55 0.22 27)" : value > 30 ? "oklch(0.65 0.15 85)" : "oklch(0.52 0.15 148)";
  const textColor = value > 60 ? "oklch(0.45 0.20 27)" : value > 30 ? "oklch(0.45 0.14 85)" : "oklch(0.35 0.15 148)";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs" style={{ color: "oklch(0.52 0.02 255)" }}>{label}</span>
        <span className="gn-metric-value text-xl" style={{ color: textColor }}>{formatPercent(value)}</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "oklch(0.91 0.005 255)" }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(value, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

function RiskAnalyticsCard({ data, loading }: RiskAnalyticsCardProps) {
  return (
    <div className="gn-card p-5 flex flex-col gap-4">
      <div>
        <h3 className="gn-section-header text-sm mb-0.5">Risk & Predictive Analytics</h3>
        <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>Short-term grid risk assessment</p>
      </div>

      {loading || !data ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <RiskMeter value={data.curtailmentRisk} label="Curtailment Risk" />
            <RiskMeter value={data.shortageProbability} label="Shortage Probability" />
          </div>
          <div className="p-3 rounded" style={{ background: "oklch(0.975 0.003 255)", border: "1px solid oklch(0.91 0.005 255)" }}>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.52 0.02 255)" }}>Grid Stress Forecast</div>
            <p className="text-sm leading-relaxed" style={{ color: "oklch(0.28 0.03 255)" }}>
              {data.stressForecast || "No active stress conditions detected."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AlertPanel component
// ─────────────────────────────────────────────────────────────────────────────

interface AlertPanelProps {
  alerts: RiskAlert[];
  loading?: boolean;
}

function getSeverityConfig(severity: string) {
  const s = severity.toLowerCase();
  if (s === "critical" || s === "high")
    return { icon: "🔴", bg: "oklch(0.97 0.04 27)", border: "oklch(0.90 0.08 27)", text: "oklch(0.40 0.20 27)", badge: { bg: "oklch(0.55 0.22 27)", text: "white" } };
  if (s === "warning" || s === "medium")
    return { icon: "🟡", bg: "oklch(0.97 0.05 85)", border: "oklch(0.90 0.09 85)", text: "oklch(0.40 0.14 85)", badge: { bg: "oklch(0.65 0.15 85)", text: "white" } };
  return { icon: "🔵", bg: "oklch(0.97 0.015 264)", border: "oklch(0.90 0.04 264)", text: "oklch(0.35 0.10 264)", badge: { bg: "oklch(0.52 0.12 264)", text: "white" } };
}

function formatAlertTime(timestamp: bigint): string {
  const ms = Number(timestamp);
  if (ms === 0) return "Just now";
  const d = new Date(ms);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function AlertPanel({ alerts, loading }: AlertPanelProps) {
  const { mutateAsync: acknowledgeAlert, isPending } = useAcknowledgeAlert();

  async function handleAcknowledge(alertId: bigint) {
    try {
      await acknowledgeAlert(alertId);
      toast.success("Alert acknowledged");
    } catch {
      toast.error("Failed to acknowledge alert");
    }
  }

  return (
    <div className="gn-card p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="gn-section-header text-sm mb-0.5">Alert Notifications</h3>
          <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>Active system alerts</p>
        </div>
        {alerts.length > 0 && (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "oklch(0.55 0.22 27)", color: "white" }}>
            {alerts.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 rounded" style={{ background: "oklch(0.975 0.003 255)", border: "1px solid oklch(0.91 0.005 255)" }}>
          <div className="text-2xl mb-2">✅</div>
          <div className="text-sm font-medium" style={{ color: "oklch(0.40 0.02 255)" }}>No active alerts</div>
          <div className="text-xs mt-0.5" style={{ color: "oklch(0.60 0.02 255)" }}>All systems operating normally</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {alerts.map((alert) => {
            const cfg = getSeverityConfig(alert.severity);
            return (
              <div key={alert.alertId.toString()} className="flex items-start gap-3 p-3 rounded" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <span className="text-sm mt-0.5 shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wide" style={{ background: cfg.badge.bg, color: cfg.badge.text, fontSize: "0.6rem" }}>
                          {alert.severity}
                        </span>
                        <span className="text-xs" style={{ color: "oklch(0.55 0.02 255)" }}>{formatAlertTime(alert.timestamp)}</span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: cfg.text }}>{alert.message}</p>
                    </div>
                    <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleAcknowledge(alert.alertId)} className="text-xs h-6 px-2 shrink-0" style={{ fontSize: "0.65rem", borderColor: "oklch(0.80 0.02 255)", color: "oklch(0.40 0.02 255)" }}>
                      ACK
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionDivider & PageFooter helpers
// ─────────────────────────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "oklch(0.45 0.06 255)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
        {label}
      </div>
      <div className="flex-1 h-px" style={{ background: "oklch(0.88 0.008 255)" }} />
    </div>
  );
}

function PageFooter() {
  return (
    <footer className="pt-4 pb-2 text-center" style={{ borderTop: "1px solid oklch(0.91 0.005 255)" }}>
      <p className="text-xs" style={{ color: "oklch(0.60 0.02 255)" }}>
        © {new Date().getFullYear()}.{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-current transition-colors"
          style={{ color: "oklch(0.50 0.06 264)" }}
        >
          Built with ♥ using caffeine.ai
        </a>
      </p>
    </footer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardTab
// ─────────────────────────────────────────────────────────────────────────────

function DashboardTab() {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: forecastData, isLoading: forecastLoading } = useForecastData();
  const { data: forecastMeta, isLoading: forecastMetaLoading } = useForecastMeta();
  const { data: gridData, isLoading: gridLoading } = useGridStability();
  const { data: schedulingData, isLoading: schedulingLoading } = useSchedulingActions();
  const { data: storageData, isLoading: storageLoading } = useStorageStatus();
  const { data: riskData, isLoading: riskLoading } = useRiskAnalytics();

  const surplusPositive = (metrics?.surplus ?? 0) >= 0;
  const freqDeviation = Math.abs((metrics?.gridFrequency ?? 50) - 50);

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <SectionDivider label="Executive Summary" />
      <div className="grid grid-cols-5 gap-4">
        <MetricCard title="Renewable Generation" value={metricsLoading ? "—" : metrics ? metrics.renewableGeneration.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"} unit="MW" trend="up" loading={metricsLoading} icon={<span className="text-sm">☀️</span>} subLabel="Current output" valueColor="oklch(0.38 0.14 264)" />
        <MetricCard title="Load Demand" value={metricsLoading ? "—" : metrics ? metrics.loadDemand.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"} unit="MW" trend="neutral" loading={metricsLoading} icon={<span className="text-sm">🏭</span>} subLabel="Network demand" valueColor="oklch(0.22 0.04 255)" />
        <MetricCard
          title={surplusPositive ? "Grid Surplus" : "Grid Deficit"}
          value={metricsLoading ? "—" : metrics ? Math.abs(metrics.surplus).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"}
          unit="MW"
          trend={surplusPositive ? "up" : "down"}
          loading={metricsLoading}
          icon={<span className="text-sm">{surplusPositive ? "📈" : "📉"}</span>}
          subLabel={surplusPositive ? "Exportable capacity" : "Deficit requiring action"}
          valueColor={surplusPositive ? "oklch(0.35 0.15 148)" : "oklch(0.45 0.20 27)"}
        />
        <MetricCard
          title="Battery Storage"
          value={metricsLoading ? "—" : metrics ? metrics.batteryLevel.toFixed(1) : "—"}
          unit="%"
          loading={metricsLoading}
          icon={<span className="text-sm">🔋</span>}
          subLabel="State of charge"
          valueColor={(metrics?.batteryLevel ?? 50) > 60 ? "oklch(0.35 0.15 148)" : (metrics?.batteryLevel ?? 50) > 25 ? "oklch(0.45 0.14 85)" : "oklch(0.45 0.20 27)"}
          extra={!metricsLoading && metrics ? (
            <div className="w-full h-1.5 rounded-full overflow-hidden mb-1.5" style={{ background: "oklch(0.91 0.005 255)" }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(metrics.batteryLevel, 100)}%`, background: metrics.batteryLevel > 60 ? "oklch(0.52 0.15 148)" : metrics.batteryLevel > 25 ? "oklch(0.65 0.15 85)" : "oklch(0.55 0.22 27)" }} />
            </div>
          ) : null}
        />
        <MetricCard
          title="Grid Frequency"
          value={metricsLoading ? "—" : metrics ? metrics.gridFrequency.toFixed(2) : "—"}
          unit="Hz"
          loading={metricsLoading}
          icon={<span className="text-sm">📡</span>}
          subLabel="Deviation from 50 Hz ref"
          subValue={!metricsLoading && metrics ? `${freqDeviation >= 0 ? "+" : ""}${(metrics.gridFrequency - 50).toFixed(3)} Hz` : undefined}
          valueColor={freqDeviation < 0.1 ? "oklch(0.35 0.15 148)" : freqDeviation < 0.3 ? "oklch(0.45 0.14 85)" : "oklch(0.45 0.20 27)"}
        />
      </div>

      <SectionDivider label="AI Forecast Intelligence" />
      <div className="grid grid-cols-[1fr_340px] gap-5">
        <div className="gn-card p-5">
          <div className="mb-4">
            <h3 className="gn-section-header text-sm mb-0.5">AI Forecast Intelligence</h3>
            <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>24-hour renewable generation forecast with confidence intervals</p>
          </div>
          {forecastLoading || !forecastData ? <Skeleton className="h-[260px] w-full" /> : <ForecastChart data={forecastData} height={260} />}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4" style={{ borderTop: "1px solid oklch(0.91 0.005 255)" }}>
            {forecastMetaLoading || !forecastMeta ? (
              <>{[0,1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}</>
            ) : (
              <>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>AI Confidence</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.91 0.005 255)" }}>
                      <div className="h-full rounded-full" style={{ width: `${forecastMeta.confidenceScore * 100}%`, background: forecastMeta.confidenceScore > 0.8 ? "oklch(0.52 0.15 148)" : "oklch(0.65 0.15 85)" }} />
                    </div>
                    <span className="gn-metric-value text-sm" style={{ color: forecastMeta.confidenceScore > 0.8 ? "oklch(0.35 0.15 148)" : "oklch(0.45 0.14 85)" }}>
                      {(forecastMeta.confidenceScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>Peak Window</div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: "oklch(0.96 0.06 85)", color: "oklch(0.40 0.14 85)" }}>
                    ⏰ {forecastMeta.peakWindow}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>Weather Impact</div>
                  <p className="text-xs leading-relaxed" style={{ color: "oklch(0.35 0.03 255)" }}>{forecastMeta.weatherSummary}</p>
                </div>
              </>
            )}
          </div>
        </div>
        <GridStabilityCard data={gridData} loading={gridLoading} />
      </div>

      <SectionDivider label="Autonomous Operations" />
      <div className="grid grid-cols-2 gap-5">
        <AIDecisionEngine data={schedulingData} loading={schedulingLoading} />
        <StorageManagement data={storageData} loading={storageLoading} />
      </div>

      <SectionDivider label="Risk & Alerts" />
      <div className="grid grid-cols-2 gap-5">
        <RiskAnalyticsCard data={riskData} loading={riskLoading} />
        <AlertPanel alerts={riskData?.alerts ?? []} loading={riskLoading} />
      </div>

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ForecastingTab
// ─────────────────────────────────────────────────────────────────────────────

function ForecastingTab() {
  const { data: forecastData, isLoading: forecastLoading } = useForecastData();
  const { data: forecastMeta, isLoading: metaLoading } = useForecastMeta();

  const peakHours = forecastData?.filter((d) => d.isPeak) ?? [];
  const maxGen = forecastData?.length ? Math.max(...forecastData.map((d) => d.generation)) : 0;
  const avgGen = forecastData?.length ? forecastData.reduce((s, d) => s + d.generation, 0) / forecastData.length : 0;

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div>
        <h2 className="font-display font-700 text-xl" style={{ color: "oklch(0.17 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700 }}>AI Forecast Intelligence</h2>
        <p className="text-sm mt-0.5" style={{ color: "oklch(0.52 0.02 255)" }}>24-hour renewable generation forecast with confidence intervals and peak window analysis</p>
      </div>

      {metaLoading || !forecastMeta ? (
        <div className="grid grid-cols-4 gap-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>AI Confidence Score</div>
            <div className="gn-metric-value text-3xl" style={{ color: forecastMeta.confidenceScore > 0.8 ? "oklch(0.35 0.15 148)" : "oklch(0.45 0.14 85)" }}>
              {(forecastMeta.confidenceScore * 100).toFixed(1)}%
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.91 0.005 255)" }}>
              <div className="h-full rounded-full" style={{ width: `${forecastMeta.confidenceScore * 100}%`, background: forecastMeta.confidenceScore > 0.8 ? "oklch(0.52 0.15 148)" : "oklch(0.65 0.15 85)" }} />
            </div>
          </div>
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Peak Generation Window</div>
            <div className="gn-metric-value text-lg" style={{ color: "oklch(0.40 0.12 264)" }}>{forecastMeta.peakWindow}</div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded mt-2 text-xs font-semibold" style={{ background: "oklch(0.96 0.06 85)", color: "oklch(0.40 0.14 85)" }}>Peak Active</div>
          </div>
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Max Forecast Output</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.17 0.04 255)" }}>{maxGen.toFixed(0)}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 255)" }}>MW peak</div>
          </div>
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Average Generation</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.17 0.04 255)" }}>{avgGen.toFixed(0)}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.55 0.02 255)" }}>MW average</div>
          </div>
        </div>
      )}

      <div className="gn-card p-6">
        <div className="mb-4">
          <h3 className="gn-section-header text-sm mb-0.5">24-Hour Generation Forecast</h3>
          <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>Shaded band = 90% confidence interval · Dashed vertical lines = peak hours</p>
        </div>
        {forecastLoading || !forecastData ? <Skeleton className="h-[380px] w-full" /> : <ForecastChart data={forecastData} height={380} />}
      </div>

      {!forecastLoading && peakHours.length > 0 && (
        <div className="gn-card p-5">
          <h3 className="gn-section-header text-sm mb-4">Peak Generation Hours</h3>
          <div className="grid grid-cols-4 gap-3">
            {peakHours.map((d) => (
              <div key={d.hour.toString()} className="p-3 rounded" style={{ background: "oklch(0.97 0.05 85)", border: "1px solid oklch(0.90 0.08 85)" }}>
                <div className="gn-metric-value text-2xl" style={{ color: "oklch(0.40 0.14 85)" }}>{Number(d.hour).toString().padStart(2, "0")}:00</div>
                <div className="text-xs mt-1 space-y-0.5">
                  <div style={{ color: "oklch(0.45 0.10 85)" }}>Forecast: {d.generation.toFixed(0)} MW</div>
                  <div style={{ color: "oklch(0.55 0.06 85)" }}>CI: {d.lowerCi.toFixed(0)}–{d.upperCi.toFixed(0)} MW</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!metaLoading && forecastMeta && (
        <div className="gn-card p-5 flex items-start gap-4">
          <div className="p-2.5 rounded shrink-0" style={{ background: "oklch(0.93 0.03 264)", border: "1px solid oklch(0.85 0.05 264)" }}>
            <span className="text-xl">🌤️</span>
          </div>
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: "oklch(0.22 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>Weather Impact Assessment</div>
            <p className="text-sm leading-relaxed" style={{ color: "oklch(0.40 0.02 255)" }}>{forecastMeta.weatherSummary}</p>
          </div>
        </div>
      )}

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SchedulingTab
// ─────────────────────────────────────────────────────────────────────────────

function SchedulingTab() {
  const { data: schedulingData, isLoading: schedulingLoading } = useSchedulingActions();
  const { data: gridData, isLoading: gridLoading } = useGridStability();
  const { data: storageData, isLoading: storageLoading } = useStorageStatus();

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div>
        <h2 className="font-display font-700 text-xl" style={{ color: "oklch(0.17 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700 }}>Autonomous Scheduling Engine</h2>
        <p className="text-sm mt-0.5" style={{ color: "oklch(0.52 0.02 255)" }}>AI-driven grid scheduling, action prioritization, and optimization metrics</p>
      </div>

      {schedulingLoading || !schedulingData ? (
        <div className="grid grid-cols-3 gap-4">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="gn-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Optimization Efficiency</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.35 0.15 148)" }}>{formatPercent(schedulingData.optimizationEfficiency)}</div>
            <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.91 0.005 255)" }}>
              <div className="h-full rounded-full" style={{ width: `${schedulingData.optimizationEfficiency}%`, background: "oklch(0.52 0.15 148)" }} />
            </div>
            <div className="text-xs mt-1.5" style={{ color: "oklch(0.55 0.02 255)" }}>AI schedule optimization score</div>
          </div>
          <div className="gn-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Estimated Cost Savings</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.38 0.14 264)" }}>{formatUSD(schedulingData.costSavings)}</div>
            <div className="text-xs mt-1.5" style={{ color: "oklch(0.55 0.02 255)" }}>Per 24-hour cycle</div>
          </div>
          <div className="gn-card p-5">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Curtailment Reduction</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.38 0.14 264)" }}>{formatPercent(schedulingData.curtailmentReduction)}</div>
            <div className="text-xs mt-1.5" style={{ color: "oklch(0.55 0.02 255)" }}>vs baseline operations</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_380px] gap-5">
        <AIDecisionEngine data={schedulingData} loading={schedulingLoading} expanded />
        <div className="flex flex-col gap-5">
          <GridStabilityCard data={gridData} loading={gridLoading} />
        </div>
      </div>

      <StorageManagement data={storageData} loading={storageLoading} />
      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalyticsTab
// ─────────────────────────────────────────────────────────────────────────────

interface AnalyticsTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function HistoricalTooltip({ active, payload, label }: AnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded px-3 py-2 text-xs" style={{ background: "oklch(0.17 0.04 255)", color: "white", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div style={{ color: "oklch(0.70 0.03 255)" }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: "oklch(0.70 0.06 264)" }}>{p.name}</span>
          <span className="font-semibold">{p.value.toFixed(0)} MW</span>
        </div>
      ))}
    </div>
  );
}

function ComparisonTooltip({ active, payload, label }: AnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded px-3 py-2 text-xs" style={{ background: "oklch(0.17 0.04 255)", color: "white", fontFamily: "Plus Jakarta Sans, sans-serif" }}>
      <div style={{ color: "oklch(0.70 0.03 255)" }}>Hour {label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-semibold">{p.value.toFixed(0)} MW</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsTab() {
  const { data: analyticsData, isLoading } = useAnalyticsData();
  const comparisonData = analyticsData?.comparison.map((d) => ({ hour: Number(d.hour), Load: d.load, Generation: d.generation })) ?? [];

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
      <div>
        <h2 className="font-display font-700 text-xl" style={{ color: "oklch(0.17 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700 }}>Analytics & Performance</h2>
        <p className="text-sm mt-0.5" style={{ color: "oklch(0.52 0.02 255)" }}>Historical generation trends, forecast accuracy, and renewable utilization metrics</p>
      </div>

      {isLoading || !analyticsData ? (
        <div className="grid grid-cols-4 gap-4">{[0,1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Forecast RMSE</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.17 0.04 255)" }}>{analyticsData.rmse.toFixed(2)}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.60 0.02 255)" }}>Root Mean Square Error</div>
          </div>
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Forecast MAE</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.17 0.04 255)" }}>{analyticsData.mae.toFixed(2)}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.60 0.02 255)" }}>Mean Absolute Error</div>
          </div>
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Renewable Utilization</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.35 0.15 148)" }}>{formatPercent(analyticsData.utilization)}</div>
            <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(0.91 0.005 255)" }}>
              <div className="h-full rounded-full" style={{ width: `${analyticsData.utilization}%`, background: "oklch(0.52 0.15 148)" }} />
            </div>
          </div>
          <div className="gn-card p-4">
            <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "oklch(0.55 0.02 255)" }}>Carbon Reduction</div>
            <div className="gn-metric-value text-3xl" style={{ color: "oklch(0.35 0.15 148)" }}>{analyticsData.carbonReduction.toLocaleString("en-US", { maximumFractionDigits: 0 })}</div>
            <div className="text-xs mt-1" style={{ color: "oklch(0.60 0.02 255)" }}>tonnes CO₂ equivalent</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <div className="gn-card p-5">
          <div className="mb-4">
            <h3 className="gn-section-header text-sm mb-0.5">Historical Renewable Generation</h3>
            <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>30-day generation trend (MW)</p>
          </div>
          {isLoading || !analyticsData ? <Skeleton className="h-[280px] w-full" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analyticsData.historical} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.007 255)" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.55 0.02 255)", fontFamily: "Geist Mono, monospace" }} interval={4} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.55 0.02 255)", fontFamily: "Geist Mono, monospace" }} width={42} />
                <Tooltip content={<HistoricalTooltip />} />
                <Bar dataKey="generation" fill="oklch(0.52 0.15 148)" radius={[3, 3, 0, 0]} name="generation" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="gn-card p-5">
          <div className="mb-4">
            <h3 className="gn-section-header text-sm mb-0.5">Load vs Generation Comparison</h3>
            <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>24-hour hourly comparison (MW)</p>
          </div>
          {isLoading || !analyticsData ? <Skeleton className="h-[280px] w-full" /> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={comparisonData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.007 255)" vertical={false} />
                <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.55 0.02 255)", fontFamily: "Geist Mono, monospace" }} tickFormatter={(v: number) => `${v}h`} interval={3} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: "oklch(0.55 0.02 255)", fontFamily: "Geist Mono, monospace" }} width={42} />
                <Tooltip content={<ComparisonTooltip />} />
                <Legend iconType="line" iconSize={16} wrapperStyle={{ fontSize: "11px", fontFamily: "Plus Jakarta Sans, sans-serif" }} />
                <Line type="monotone" dataKey="Load" stroke="oklch(0.62 0.10 200)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Generation" stroke="oklch(0.52 0.15 148)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {!isLoading && analyticsData && (
        <div className="gn-card p-5">
          <h3 className="gn-section-header text-sm mb-4">Model Accuracy Summary</h3>
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>RMSE (Root Mean Square Error)</div>
              <div className="text-2xl gn-metric-value" style={{ color: "oklch(0.22 0.04 255)" }}>{analyticsData.rmse.toFixed(2)} MW</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.55 0.02 255)" }}>Measures the standard deviation of forecast residuals. Lower is better.</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>MAE (Mean Absolute Error)</div>
              <div className="text-2xl gn-metric-value" style={{ color: "oklch(0.22 0.04 255)" }}>{analyticsData.mae.toFixed(2)} MW</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.55 0.02 255)" }}>Average absolute difference between forecast and actual generation.</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>Renewable Utilization</div>
              <div className="text-2xl gn-metric-value" style={{ color: "oklch(0.35 0.15 148)" }}>{formatPercent(analyticsData.utilization)}</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.55 0.02 255)" }}>Fraction of available renewable capacity actively delivered to grid.</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "oklch(0.55 0.02 255)" }}>Carbon Reduction</div>
              <div className="text-2xl gn-metric-value" style={{ color: "oklch(0.35 0.15 148)" }}>{analyticsData.carbonReduction.toLocaleString()} t</div>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: "oklch(0.55 0.02 255)" }}>Equivalent CO₂ emissions avoided through renewable dispatch.</p>
            </div>
          </div>
        </div>
      )}

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsTab
// ─────────────────────────────────────────────────────────────────────────────

function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="gn-card p-6">
      <div className="mb-5">
        <h3 className="gn-section-header text-sm mb-1">{title}</h3>
        {description && <p className="text-xs" style={{ color: "oklch(0.52 0.02 255)", paddingLeft: 13 }}>{description}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingsRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3" style={{ borderBottom: "1px solid oklch(0.93 0.005 255)" }}>
      <div className="flex-1">
        <div className="text-sm font-medium" style={{ color: "oklch(0.22 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif" }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.02 255)" }}>{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SettingsTab() {
  return (
    <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
      <div>
        <h2 className="font-display font-700 text-xl" style={{ color: "oklch(0.17 0.04 255)", fontFamily: "Plus Jakarta Sans, sans-serif", fontWeight: 700 }}>System Configuration</h2>
        <p className="text-sm mt-0.5" style={{ color: "oklch(0.52 0.02 255)" }}>Configure notification thresholds, model parameters, and data source connections</p>
      </div>

      <SettingsSection title="Notification Thresholds" description="Configure alert trigger thresholds for grid monitoring parameters">
        <SettingsRow label="Frequency Deviation Threshold" description="Alert when grid frequency deviates beyond this value from 50 Hz">
          <div className="flex items-center gap-2">
            <Input type="number" defaultValue="0.2" step="0.05" className="w-24 text-sm h-8" style={{ fontFamily: "Geist Mono, monospace" }} />
            <span className="text-xs" style={{ color: "oklch(0.55 0.02 255)" }}>Hz</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Battery Low Alert" description="Trigger alert when battery storage falls below this level">
          <div className="flex items-center gap-2">
            <Input type="number" defaultValue="20" step="5" className="w-24 text-sm h-8" style={{ fontFamily: "Geist Mono, monospace" }} />
            <span className="text-xs" style={{ color: "oklch(0.55 0.02 255)" }}>%</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Curtailment Risk Alert" description="Send notification when curtailment risk exceeds this percentage">
          <div className="flex items-center gap-2">
            <Input type="number" defaultValue="40" step="5" className="w-24 text-sm h-8" style={{ fontFamily: "Geist Mono, monospace" }} />
            <span className="text-xs" style={{ color: "oklch(0.55 0.02 255)" }}>%</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Shortage Probability Alert" description="Alert threshold for grid shortage probability">
          <div className="flex items-center gap-2">
            <Input type="number" defaultValue="30" step="5" className="w-24 text-sm h-8" style={{ fontFamily: "Geist Mono, monospace" }} />
            <span className="text-xs" style={{ color: "oklch(0.55 0.02 255)" }}>%</span>
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="AI Model Settings" description="Configure forecasting model parameters and autonomous scheduling behavior">
        <SettingsRow label="Forecast Horizon" description="Number of hours ahead for generation forecasting">
          <Select defaultValue="24">
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="48">48 hours</SelectItem>
              <SelectItem value="72">72 hours</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Confidence Interval" description="Statistical confidence interval for forecast uncertainty bands">
          <Select defaultValue="90">
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="80">80%</SelectItem>
              <SelectItem value="90">90%</SelectItem>
              <SelectItem value="95">95%</SelectItem>
              <SelectItem value="99">99%</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="Autonomous Scheduling" description="Allow AI engine to execute grid scheduling actions automatically">
          <Switch defaultChecked id="auto-schedule" />
        </SettingsRow>
        <SettingsRow label="Curtailment Optimization" description="Enable AI-driven curtailment reduction scheduling">
          <Switch defaultChecked id="curtailment-opt" />
        </SettingsRow>
        <SettingsRow label="Emergency Override Mode" description="Automatically override schedules during critical grid events">
          <Switch defaultChecked id="emergency-override" />
        </SettingsRow>
        <SettingsRow label="Model Refresh Interval" description="How often the forecast model re-trains on new data">
          <Select defaultValue="60">
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="360">6 hours</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Data Source Configuration" description="Configure external data feeds and API connections for the forecasting engine">
        <SettingsRow label="Weather Data Provider" description="Meteorological data source for solar irradiance and wind forecasts">
          <Select defaultValue="meteomatics">
            <SelectTrigger className="w-48 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="meteomatics">Meteomatics API</SelectItem>
              <SelectItem value="openweather">OpenWeatherMap</SelectItem>
              <SelectItem value="tomorrow">Tomorrow.io</SelectItem>
              <SelectItem value="dwd">DWD (Germany)</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
        <SettingsRow label="SCADA Integration" description="Real-time connection to grid SCADA system">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: "oklch(0.94 0.07 148)", color: "oklch(0.35 0.15 148)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />Connected
          </span>
        </SettingsRow>
        <SettingsRow label="Market Price Feed" description="Electricity market price data for cost optimization">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold" style={{ background: "oklch(0.94 0.07 148)", color: "oklch(0.35 0.15 148)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />Connected
          </span>
        </SettingsRow>
        <SettingsRow label="Historical Data Retention" description="How long to retain raw telemetry and forecast history">
          <Select defaultValue="365">
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">180 days</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
              <SelectItem value="730">2 years</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsSection>

      <div className="flex items-center gap-3 justify-end pt-2">
        <Button variant="outline" className="text-sm h-9">Reset to Defaults</Button>
        <Button className="text-sm h-9 text-white" style={{ background: "oklch(0.38 0.14 264)", border: "none" }}>
          Save Configuration
        </Button>
      </div>

      <PageFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App export
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const { data: systemStatus } = useSystemStatus();

  useEffect(() => {
    document.title = "GridNova — Intelligent Energy. Autonomous Grid.";
  }, []);

  return (
    <div className="min-h-screen bg-[oklch(0.975_0.004_255)] font-body">
      <Header activeTab={activeTab} onTabChange={setActiveTab} systemStatus={systemStatus?.status ?? "Online"} />
      <main className="pt-[72px]">
        {activeTab === "dashboard" && <DashboardTab />}
        {activeTab === "forecasting" && <ForecastingTab />}
        {activeTab === "scheduling" && <SchedulingTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </main>
      <Toaster position="bottom-right" />
    </div>
  );
}