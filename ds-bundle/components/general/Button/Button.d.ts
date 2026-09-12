import * as React from 'react';

/**
 * Button — from bbi-temp@0.1.0.
 * @replaces button
 */
export interface ButtonProps {
variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"; size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg"; disabled?: boolean; type?: "button" | "submit" | "reset"; onClick?: React.MouseEventHandler<HTMLButtonElement>; render?: React.ReactElement; className?: string; children?: React.ReactNode; [key: string]: unknown;
}

export declare const Button: React.ComponentType<ButtonProps>;
