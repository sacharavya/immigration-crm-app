import * as React from 'react';

/**
 * Badge — from bbi-temp@0.1.0.
 */
export interface BadgeProps {
variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link"; className?: string; children?: React.ReactNode; render?: React.ReactElement; [key: string]: unknown;
}

export declare const Badge: React.ComponentType<BadgeProps>;
