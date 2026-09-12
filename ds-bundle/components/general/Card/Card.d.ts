import * as React from 'react';

/**
 * Card — from bbi-temp@0.1.0.
 */
export interface CardProps {
size?: "default" | "sm"; className?: string; children?: React.ReactNode; [key: string]: unknown;
}

export declare const Card: React.ComponentType<CardProps>;
