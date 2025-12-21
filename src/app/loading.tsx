import { Loader2 } from 'lucide-react';

export default function Loading() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-gray-500 font-mono text-sm animate-pulse">LOADING ARCHIVE...</p>
        </div>
    );
}
