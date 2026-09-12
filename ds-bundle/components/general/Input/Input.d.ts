import * as React from 'react';

/**
 * Input — from bbi-temp@0.1.0.
 * @replaces input
 */
export interface InputProps {
type?: string; value?: string; defaultValue?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string; name?: string; id?: string; disabled?: boolean; required?: boolean; readOnly?: boolean; "aria-invalid"?: boolean; className?: string; [key: string]: unknown;
}

export declare const Input: React.ComponentType<InputProps>;
