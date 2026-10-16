import { AppShell } from "@/components/AppShell";
import { KpiCards } from "@/components/KpiCards";
import { RevenueByDepartment } from "@/components/RevenueByDepartment";
import { FrontDeskLive } from "@/components/FrontDeskLive";
import { RevenueOverTime } from "@/components/RevenueOverTime";
import { CostCenters } from "@/components/CostCenters";
import { PLBridge } from "@/components/PLBridge";
import { NetIncomeTrend } from "@/components/NetIncomeTrend";
import { TopCostsExpenses } from "@/components/TopCostsExpenses";
import { MonthlyComparison } from "@/components/MonthlyComparison";

export default function Home() {
  return (
    <AppShell>
      <KpiCards />
      <RevenueByDepartment />
      <FrontDeskLive />
      <RevenueOverTime />
      <CostCenters />
      <PLBridge />
      <NetIncomeTrend />
      <TopCostsExpenses />
      <MonthlyComparison />
    </AppShell>
  );
}
