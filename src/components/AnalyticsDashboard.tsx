'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Users, MessageCircle, Heart, Eye, Calendar } from 'lucide-react';
import StatCard from './analytics/StatCard';
import MostViewedTable from './analytics/MostViewedTable';
import TrendingDiscussionsTable from './analytics/TrendingDiscussionsTable';
import ActiveCommentersTable from './analytics/ActiveCommentersTable';
import TimeSeriesChart from './analytics/TimeSeriesChart';
import type { DashboardStats, DocumentAnalytics, CommenterStats, TimeSeriesData } from '@/app/shared';

interface AnalyticsDashboardProps {
    dashboardStats: DashboardStats;
    mostViewed: DocumentAnalytics[];
    trendingDiscussions: DocumentAnalytics[];
    activeCommenters: CommenterStats[];
    dailyStats: TimeSeriesData[];
    weeklyStats: TimeSeriesData[];
}

export default function AnalyticsDashboard({
    dashboardStats,
    mostViewed,
    trendingDiscussions,
    activeCommenters,
    dailyStats,
    weeklyStats,
}: AnalyticsDashboardProps) {
    const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly'>('daily');
    const stats = timePeriod === 'daily' ? dailyStats : weeklyStats;

    return (
        <div className="container mx-auto px-4 md:px-6 py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                        <BarChart3 className="w-8 h-8" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-muted mt-2">
                        Insights into document views, discussions, and community engagement
                    </p>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Views"
                    value={dashboardStats.total_views.toLocaleString()}
                    icon={<Eye className="w-5 h-5" />}
                    trend={null}
                />
                <StatCard
                    title="Total Comments"
                    value={dashboardStats.total_comments.toLocaleString()}
                    icon={<MessageCircle className="w-5 h-5" />}
                    trend={null}
                />
                <StatCard
                    title="Total Likes"
                    value={dashboardStats.total_likes.toLocaleString()}
                    icon={<Heart className="w-5 h-5" />}
                    trend={null}
                />
                <StatCard
                    title="Active Users"
                    value={dashboardStats.active_users.toLocaleString()}
                    icon={<Users className="w-5 h-5" />}
                    trend={null}
                />
                <StatCard
                    title="Avg Engagement"
                    value={dashboardStats.avg_engagement_per_doc.toFixed(1)}
                    icon={<TrendingUp className="w-5 h-5" />}
                    trend={null}
                />
            </div>

            {/* Time Series Chart */}
            <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Activity Over Time
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTimePeriod('daily')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                timePeriod === 'daily'
                                    ? 'bg-foreground text-background'
                                    : 'bg-background text-muted hover:text-foreground'
                            }`}
                        >
                            Daily
                        </button>
                        <button
                            onClick={() => setTimePeriod('weekly')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                timePeriod === 'weekly'
                                    ? 'bg-foreground text-background'
                                    : 'bg-background text-muted hover:text-foreground'
                            }`}
                        >
                            Weekly
                        </button>
                    </div>
                </div>
                <TimeSeriesChart data={stats} period={timePeriod} />
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Most Viewed Documents */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                        <Eye className="w-5 h-5" />
                        Most Viewed Documents
                    </h2>
                    <MostViewedTable documents={mostViewed.slice(0, 10)} />
                </div>

                {/* Trending Discussions */}
                <div className="bg-card border border-border rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5" />
                        Trending Discussions (7 days)
                    </h2>
                    <TrendingDiscussionsTable documents={trendingDiscussions.slice(0, 10)} />
                </div>
            </div>

            {/* Most Active Commenters */}
            <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5" />
                    Most Active Commenters
                </h2>
                <ActiveCommentersTable commenters={activeCommenters} />
            </div>
        </div>
    );
}

