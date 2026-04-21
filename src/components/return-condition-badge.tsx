'use client';
import { Badge } from "@/components/ui/badge";
import type { BorrowHistory } from "@/lib/types";

type ReturnCondition = NonNullable<BorrowHistory['returnCondition']>;

export const ReturnConditionBadge = ({ condition }: { condition: ReturnCondition }) => {
    switch (condition) {
        case 'Good':
            return <Badge variant="secondary" className="bg-green-800/80 border-green-700 text-green-300">Returned</Badge>;
        case 'Defected':
            return <Badge variant="outline" className="border-yellow-500 text-yellow-400">Returned (Defected)</Badge>;
        case 'Broken':
            return <Badge variant="destructive" className="bg-orange-900/80 border-orange-700 text-orange-300">Returned (Broken)</Badge>;
        case 'Lost':
            return <Badge variant="destructive">Lost</Badge>;
        default:
             return <Badge variant="secondary" className="bg-green-800/80 border-green-700 text-green-300">Returned</Badge>;
    }
}
