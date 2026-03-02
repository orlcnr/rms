'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatPhoneNumber, maskPhoneNumber } from '../utils/format';

interface PhoneDisplayProps {
    phone?: string | null;
    masked?: boolean;
    className?: string;
    showIcon?: boolean;
}

export function PhoneDisplay({
    phone,
    masked = false,
    className,
    showIcon = false,
}: PhoneDisplayProps) {
    if (!phone) return <span className="text-text-muted">-</span>;

    const displayValue = masked ? maskPhoneNumber(phone) : formatPhoneNumber(phone);

    return (
        <div className={cn('inline-flex items-center gap-2', className)}>
            {showIcon && <Phone className="w-3 h-3 text-text-muted" />}
            <span className="tabular-nums">
                {displayValue}
            </span>
        </div>
    );
}
