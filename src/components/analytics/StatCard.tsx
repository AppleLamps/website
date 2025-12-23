interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean } | null;
}

export default function StatCard({ title, value, icon, trend }: StatCardProps) {
    return (
        <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted uppercase tracking-wider">{title}</p>
                <div className="text-muted">{icon}</div>
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
                <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
            )}
        </div>
    );
}

