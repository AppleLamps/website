import { Suspense } from 'react';
import {
    getDashboardStats,
    getMostViewedDocuments,
    getTrendingDiscussions,
    getMostActiveCommenters,
    getTimeSeriesStats,
} from '@/app/actions';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { Metadata } from 'next';
import Header from '@/components/Header';

export const metadata: Metadata = {
    title: 'Analytics Dashboard - Epstein Files Browser',
    description: 'View analytics and insights about document views, discussions, and community engagement.',
};

export default async function AnalyticsPage() {
    // Fetch all analytics data in parallel
    const [dashboardStats, mostViewed, trendingDiscussions, activeCommenters, dailyStats, weeklyStats] =
        await Promise.all([
            getDashboardStats(),
            getMostViewedDocuments(20),
            getTrendingDiscussions(20, 7),
            getMostActiveCommenters(20),
            getTimeSeriesStats('daily', 30),
            getTimeSeriesStats('weekly', 90),
        ]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <Suspense fallback={<AnalyticsLoading />}>
                <AnalyticsDashboard
                    dashboardStats={dashboardStats}
                    mostViewed={mostViewed}
                    trendingDiscussions={trendingDiscussions}
                    activeCommenters={activeCommenters}
                    dailyStats={dailyStats}
                    weeklyStats={weeklyStats}
                />
            </Suspense>
        </div>
    );
}

function AnalyticsLoading() {
    return (
        <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="animate-pulse space-y-8">
                <div className="h-12 bg-card rounded w-64"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-24 bg-card rounded-xl"></div>
                    ))}
                </div>
                <div className="h-64 bg-card rounded-xl"></div>
            </div>
        </div>
    );
}

