import React, { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const normalizeOption = (option) => {
  if (typeof option === 'object' && option !== null) {
    return {
      value: String(option.value ?? ''),
      label: String(option.label ?? option.name ?? option.value ?? ''),
      disabled: Boolean(option.disabled),
    };
  }
  return { value: String(option ?? ''), label: String(option ?? ''), disabled: false };
};

export const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      name,
      options = [],
      placeholder = 'Select an option',
      required = false,
      disabled = false,
      value = '',
      onChange,
      onBlur,
      className = '',
      labelClassName = '',
      ...props
    },
    forwardedRef
  ) => {
    const generatedId = useId();
    const selectId = id || name || `select-${generatedId}`;
    const listboxId = `${selectId}-listbox`;
    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const optionRefs = useRef([]);
    const [isOpen, setIsOpen] = useState(false);
    const [opensUpward, setOpensUpward] = useState(false);
    const normalizedOptions = options.map(normalizeOption);
    const currentValue = String(value ?? '');
    const selectedOption = currentValue === '' && placeholder
      ? undefined
      : normalizedOptions.find((option) => option.value === currentValue);
    const selectedIndex = currentValue === '' && placeholder
      ? -1
      : normalizedOptions.findIndex((option) => option.value === currentValue);
    const placeholderOffset = Number(Boolean(placeholder));
    const totalOptions = normalizedOptions.length + placeholderOffset;
    const activeSelectedIndex = selectedIndex >= 0 ? selectedIndex + placeholderOffset : 0;
    const [activeIndex, setActiveIndex] = useState(activeSelectedIndex);
    const describedBy = error
      ? `${selectId}-error`
      : helperText
        ? `${selectId}-helper`
        : undefined;

    useEffect(() => {
      setActiveIndex(activeSelectedIndex);
    }, [activeSelectedIndex]);

    useEffect(() => {
      if (!isOpen) return undefined;
      const closeOnOutsideClick = (event) => {
        if (!rootRef.current?.contains(event.target)) setIsOpen(false);
      };
      const closeOnEscape = (event) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
          buttonRef.current?.focus();
        }
      };
      document.addEventListener('pointerdown', closeOnOutsideClick);
      document.addEventListener('keydown', closeOnEscape);
      return () => {
        document.removeEventListener('pointerdown', closeOnOutsideClick);
        document.removeEventListener('keydown', closeOnEscape);
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && activeIndex >= 0) {
        optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
      }
    }, [isOpen, activeIndex]);

    const setButtonRef = (node) => {
      buttonRef.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    };

    const chooseOption = (option) => {
      if (option.disabled) return;
      onChange?.({ target: { name, value: option.value } });
      setIsOpen(false);
      buttonRef.current?.focus();
    };

    const handleKeyDown = (event) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setActiveIndex(activeSelectedIndex);
          return;
        }
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        setActiveIndex((current) => {
          let next = current;
          for (let attempt = 0; attempt < totalOptions; attempt += 1) {
            next = (next + direction + totalOptions) % totalOptions;
            const optionIndex = next - placeholderOffset;
            if (optionIndex < 0 || !normalizedOptions[optionIndex]?.disabled) return next;
          }
          return current;
        });
      } else if ((event.key === 'Enter' || event.key === ' ') && isOpen) {
        event.preventDefault();
        const optionIndex = activeIndex - placeholderOffset;
        if (optionIndex < 0 && placeholder) chooseOption({ value: '', label: placeholder });
        else if (normalizedOptions[optionIndex]) chooseOption(normalizedOptions[optionIndex]);
      } else if (event.key === 'Home' && isOpen) {
        event.preventDefault();
        const firstEnabledIndex = normalizedOptions.findIndex((option) => !option.disabled);
        setActiveIndex(firstEnabledIndex < 0 ? 0 : firstEnabledIndex + placeholderOffset);
      } else if (event.key === 'End' && isOpen) {
        event.preventDefault();
        let lastEnabledIndex = -1;
        for (let index = normalizedOptions.length - 1; index >= 0; index -= 1) {
          if (!normalizedOptions[index].disabled) {
            lastEnabledIndex = index;
            break;
          }
        }
        setActiveIndex(lastEnabledIndex < 0 ? 0 : lastEnabledIndex + placeholderOffset);
      } else if (event.key === 'Tab') {
        setIsOpen(false);
      }
    };

    return (
      <div ref={rootRef} className="relative w-full">
        {label && (
          <label htmlFor={selectId} className={`mb-1.5 block text-xs font-medium text-slate-700 ${labelClassName}`}>
            {label} {required && <span className="text-rose-500" aria-hidden="true">*</span>}
          </label>
        )}

        <button
          ref={setButtonRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={isOpen ? (activeIndex < placeholderOffset ? `${listboxId}-placeholder` : `${listboxId}-option-${activeIndex - placeholderOffset}`) : undefined}
          aria-required={required || undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          disabled={disabled}
          {...props}
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              const triggerRect = buttonRef.current?.getBoundingClientRect();
              const dialogRect = buttonRef.current?.closest('[role="dialog"]')?.getBoundingClientRect();
              const boundaryTop = dialogRect?.top ?? 0;
              const boundaryBottom = dialogRect?.bottom ?? window.innerHeight;
              const spaceAbove = triggerRect ? triggerRect.top - boundaryTop : 0;
              const spaceBelow = triggerRect ? boundaryBottom - triggerRect.bottom : 0;
              setOpensUpward(spaceBelow < 190 && spaceAbove > spaceBelow);
              setIsOpen(true);
              setActiveIndex(0);
            }
          }}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
            error
              ? 'border-rose-300 text-rose-900'
              : 'border-slate-300 text-slate-900 hover:border-slate-400'
          } ${className}`}
        >
          <span className={`min-w-0 truncate ${selectedOption ? '' : 'text-slate-400'}`}>
            {selectedOption?.label || placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>

        {isOpen && (
          <div className={`absolute left-0 right-0 z-[60] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] ${opensUpward ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
            <div id={listboxId} role="listbox" aria-labelledby={label ? undefined : selectId} className="max-h-40 overflow-y-auto p-1.5">
              {placeholder && (
                <div
                  ref={(node) => { optionRefs.current[0] = node; }}
                  id={`${listboxId}-placeholder`}
                  role="option"
                  aria-selected={!selectedOption}
                  onMouseEnter={() => setActiveIndex(0)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseOption({ value: '', label: placeholder })}
                  className={`flex min-h-9 cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-sm ${activeIndex === 0 ? 'bg-blue-50 text-blue-900' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="truncate">{placeholder}</span>
                  {!selectedOption && <Check className="h-4 w-4 text-blue-600" aria-hidden="true" />}
                </div>
              )}
              {normalizedOptions.map((option, index) => {
                const optionIndex = index + (placeholder ? 1 : 0);
                const isSelected = option.value === currentValue && !(currentValue === '' && placeholder);
                return (
                  <div
                    key={option.value || `option-${index}`}
                    ref={(node) => { optionRefs.current[optionIndex] = node; }}
                    id={`${listboxId}-option-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    onMouseEnter={() => setActiveIndex(optionIndex)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseOption(option)}
                    className={`flex min-h-9 cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      option.disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : activeIndex === optionIndex
                          ? 'bg-blue-50 text-blue-900'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
                  </div>
                );
              })}
              {normalizedOptions.length === 0 && <p className="px-2.5 py-3 text-sm text-slate-500">No options available</p>}
            </div>
            {totalOptions > 4 && (
              <div className="border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-center text-[10px] font-medium text-slate-400">
                Scroll to see more
              </div>
            )}
          </div>
        )}

        {error ? (
          <p id={`${selectId}-error`} role="alert" className="mt-1 text-xs font-medium text-rose-600">{error}</p>
        ) : helperText ? (
          <p id={`${selectId}-helper`} className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
        {name && <input type="hidden" name={name} value={value ?? ''} />}
      </div>
    );
  }
);

Select.displayName = 'Select';
