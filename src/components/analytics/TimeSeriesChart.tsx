'use client';

import type { TimeSeriesData } from '@/app/shared';
import { useMemo } from 'react';

interface TimeSeriesChartProps {
    data: TimeSeriesData[];
    period: 'daily' | 'weekly';
}

function parseYyyyMmDdToUtcDate(value: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) return null;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(Date.UTC(year, month - 1, day));
}

function isoWeekStartUtc(isoYear: number, isoWeek: number): Date | null {
    if (!Number.isFinite(isoYear) || !Number.isFinite(isoWeek) || isoWeek < 1 || isoWeek > 53) return null;

    // ISO week 1 is the week containing Jan 4th. Weeks start on Monday.
    const jan4 = new Date(Date.UTC(isoYear, 0, 4));
    const jan4Weekday = jan4.getUTCDay(); // 0=Sun..6=Sat
    const mondayOffset = (jan4Weekday + 6) % 7; // days since Monday
    const week1Monday = new Date(Date.UTC(isoYear, 0, 4 - mondayOffset));

    return new Date(week1Monday.getTime() + (isoWeek - 1) * 7 * 24 * 60 * 60 * 1000);
}

function formatWeekRangeLabel(isoWeekString: string): { short: string; full: string } {
    const m = /^(\d{4})-W(\d{2})$/.exec(isoWeekString);
    if (!m) return { short: isoWeekString, full: isoWeekString };

    const isoYear = Number(m[1]);
    const isoWeek = Number(m[2]);
    const start = isoWeekStartUtc(isoYear, isoWeek);
    if (!start) return { short: isoWeekString, full: isoWeekString };

    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    const monthDay = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const monthDayYear = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();

    const startLabel = sameYear ? monthDay.format(start) : monthDayYear.format(start);
    const endLabel = sameYear ? monthDay.format(end) : monthDayYear.format(end);

    // Short label keeps the x-axis compact; full label is for tooltips/title.
    const short = sameMonth
        ? `${monthDay.format(start)}–${end.getUTCDate()}`
        : `${monthDay.format(start)}–${monthDay.format(end)}`;

    const full = `${startLabel} – ${endLabel} (W${String(isoWeek).padStart(2, '0')}, ${isoYear})`;

    return { short, full };
}

function formatDailyLabel(yyyyMmDd: string): { short: string; full: string } {
    const d = parseYyyyMmDdToUtcDate(yyyyMmDd);
    if (!d) return { short: yyyyMmDd, full: yyyyMmDd };

    const shortFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
    const fullFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

    return { short: shortFmt.format(d), full: fullFmt.format(d) };
}

export default function TimeSeriesChart({ data, period }: TimeSeriesChartProps) {
    const maxValue = useMemo(() => {
        return Math.max(...data.map((d) => Math.max(d.views, d.comments, d.likes)), 1);
    }, [data]);

    const labelStep = useMemo(() => {
        if (data.length <= 12) return 1;
        // Aim for ~10 labels max to keep the x-axis readable.
        return Math.max(1, Math.ceil(data.length / 10));
    }, [data.length]);

    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-muted">
                No data available for this period
            </div>
        );
    }

    return (
        <div className="h-64 flex items-end gap-1 overflow-x-auto pb-4">
            {data.map((point, index) => {
                const viewsHeight = maxValue > 0 ? (point.views / maxValue) * 100 : 0;
                const commentsHeight = maxValue > 0 ? (point.comments / maxValue) * 100 : 0;
                const likesHeight = maxValue > 0 ? (point.likes / maxValue) * 100 : 0;

                const label =
                    period === 'weekly' ? formatWeekRangeLabel(point.date) : formatDailyLabel(point.date);
                const showLabel = index % labelStep === 0 || index === data.length - 1;

                return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative min-w-[40px]">
                        <div className="w-full flex gap-0.5 items-end justify-center h-full">
                            <div
                                className="flex-1 bg-blue-500 rounded-t transition-all hover:opacity-80 cursor-pointer"
                                style={{ height: `${viewsHeight}%`, minHeight: '2px' }}
                                title={`Views: ${point.views}`}
                            />
                            <div
                                className="flex-1 bg-green-500 rounded-t transition-all hover:opacity-80 cursor-pointer"
                                style={{ height: `${commentsHeight}%`, minHeight: '2px' }}
                                title={`Comments: ${point.comments}`}
                            />
                            <div
                                className="flex-1 bg-pink-500 rounded-t transition-all hover:opacity-80 cursor-pointer"
                                style={{ height: `${likesHeight}%`, minHeight: '2px' }}
                                title={`Likes: ${point.likes}`}
                            />
                        </div>
                        <span
                            className="mt-2 h-4 text-[10px] text-muted whitespace-nowrap tabular-nums"
                            title={label.full}
                        >
                            {showLabel ? label.short : '\u00A0'}
                        </span>
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-card border border-border rounded px-2 py-1 text-xs text-foreground shadow-lg z-10 whitespace-nowrap">
                            <div className="text-muted">{label.full}</div>
                            <div>Views: {point.views}</div>
                            <div>Comments: {point.comments}</div>
                            <div>Likes: {point.likes}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

