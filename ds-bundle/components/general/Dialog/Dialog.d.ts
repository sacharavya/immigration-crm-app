import * as React from 'react';

/**
 * Dialog — from bbi-temp@0.1.0.
 * @replaces dialog
 */
export interface DialogProps {
open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void; modal?: boolean; children?: React.ReactNode;
}

export declare const Dialog: React.ComponentType<DialogProps>;
