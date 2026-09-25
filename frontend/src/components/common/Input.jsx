import React, { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      name,
      type = 'text',
      icon: Icon,
      required = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = id || name;
    const describedBy = error
      ? `${inputId}-error`
      : helperText
      ? `${inputId}-helper`
      : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 mb-1.5">
            {label} {required && <span className="text-rose-500" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" aria-hidden="true" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`block w-full rounded-lg border text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 disabled:bg-slate-50 disabled:text-slate-400 ${
              Icon ? 'pl-9 pr-3 py-2' : 'px-3 py-2'
            } ${
              error
                ? 'border-rose-300 text-rose-900 focus:border-rose-500 focus-visible:ring-rose-500'
                : 'border-slate-300 text-slate-900 focus:border-indigo-500 focus-visible:ring-indigo-500'
            } ${className}`}
            {...props}
          />
        </div>
        {error ? (
          <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-rose-600 font-medium">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-slate-500">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
