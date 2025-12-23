import Link from 'next/link';
import Image from 'next/image';
import type { DocumentAnalytics } from '@/app/shared';
import { Heart, MessageCircle, TrendingUp } from 'lucide-react';

interface TrendingDiscussionsTableProps {
    documents: DocumentAnalytics[];
}

export default function TrendingDiscussionsTable({ documents }: TrendingDiscussionsTableProps) {
    if (documents.length === 0) {
        return (
            <div className="text-center py-8 text-muted">
                <p>No recent discussions in the last 7 days.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Document</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <MessageCircle className="w-4 h-4 inline mr-1" />
                            Comments
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <Heart className="w-4 h-4 inline mr-1" />
                            Likes
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <TrendingUp className="w-4 h-4 inline mr-1" />
                            Score
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {documents.map((doc) => (
                        <tr
                            key={doc.document_id}
                            className="border-b border-border hover:bg-background/50 transition-colors"
                        >
                            <td className="py-3 px-4">
                                <Link
                                    href={`/viewer/${doc.document_id}`}
                                    className="flex items-center gap-3 group"
                                >
                                    <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0">
                                        <Image
                                            src={doc.thumbnail}
                                            alt={doc.title}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform"
                                            sizes="48px"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-foreground group-hover:text-blue-500 transition-colors truncate">
                                            {doc.title}
                                        </p>
                                        <p className="text-xs text-muted">{doc.pageCount} pages</p>
                                    </div>
                                </Link>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-foreground">
                                {doc.comments.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-foreground">
                                {doc.likes.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-sm font-mono text-muted">
                                {doc.engagement_score.toLocaleString()}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

