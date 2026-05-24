import { TrendingUp, MessageSquare, Users, BarChart2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PREVIEW_METRICS = [
  { label: "Messages sent", icon: MessageSquare, value: "—" },
  { label: "Active contacts", icon: Users, value: "—" },
  { label: "Avg. response time", icon: Clock, value: "—" },
  { label: "Deals closed", icon: TrendingUp, value: "—" },
];

export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Coming Soon
          </span>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Insights on your conversations, contacts, and pipeline performance.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {PREVIEW_METRICS.map(({ label, icon: Icon, value }) => (
          <Card key={label} className="opacity-50 select-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="opacity-50 select-none">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <BarChart2 className="w-4 h-4" />
            Message volume (last 30 days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-end gap-1">
            {Array.from({ length: 30 }, (_, i) => (
              <div
                key={i}
                className="flex-1 bg-muted rounded-t"
                style={{ height: `${20 + Math.sin(i * 0.8) * 15 + Math.random() * 20}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center">
        <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-medium text-foreground">Analytics is in development</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
          Upgrade to Pro to be first to access message trends, contact activity, and pipeline conversion data when it launches.
        </p>
      </div>
    </div>
  );
}
