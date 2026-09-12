import * as React from 'react';

/**
 * Field — from bbi-temp@0.1.0.
 */
export interface FieldProps {
orientation?: "vertical" | "horizontal" | "responsive"; "data-invalid"?: boolean; "data-disabled"?: boolean; className?: string; children?: React.ReactNode; [key: string]: unknown;
}

export declare const Field: React.ComponentType<FieldProps>;
