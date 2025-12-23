import type { CommenterStats } from '@/app/shared';
import { MessageCircle, Heart, FileText, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActiveCommentersTableProps {
    commenters: CommenterStats[];
}

export default function ActiveCommentersTable({ commenters }: ActiveCommentersTableProps) {
    if (commenters.length === 0) {
        return (
            <div className="text-center py-8 text-muted">
                <p>No commenters yet.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-muted">Username</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <MessageCircle className="w-4 h-4 inline mr-1" />
                            Comments
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <Heart className="w-4 h-4 inline mr-1" />
                            Likes Received
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <FileText className="w-4 h-4 inline mr-1" />
                            Documents
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-muted">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Last Active
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {commenters.map((commenter, index) => (
                        <tr
                            key={commenter.username}
                            className="border-b border-border hover:bg-background/50 transition-colors"
                        >
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                            {commenter.username.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className="font-medium text-foreground">@{commenter.username}</span>
                                    {index < 3 && (
                                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full">
                                            Top {index + 1}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-foreground">
                                {commenter.total_comments.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-foreground">
                                {commenter.total_likes_received.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-foreground">
                                {commenter.documents_commented.toLocaleString()}
                            </td>
                            <td className="text-right py-3 px-4 text-sm text-muted">
                                {formatDistanceToNow(commenter.recent_activity, { addSuffix: true })}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

