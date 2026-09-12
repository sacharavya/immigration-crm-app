import * as React from 'react';

/**
 * DateInput — from bbi-temp@0.1.0.
 */
export interface DateInputProps {
value?: string; defaultValue?: string; onChange?: React.ChangeEventHandler<HTMLInputElement>; name?: string; id?: string; placeholder?: string; disabled?: boolean; required?: boolean; min?: string; max?: string; className?: string; [key: string]: unknown;
}

export declare const DateInput: React.ComponentType<DateInputProps>;
