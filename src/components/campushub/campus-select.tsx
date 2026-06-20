"use client";

import * as React from "react";

import {
  CampusCombobox,
  type CampusComboboxOption,
} from "@/components/campushub/campus-combobox";

export type SelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "size"
> & {
  invalid?: boolean;
};

function getOptionText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") {
        return String(child);
      }

      if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return getOptionText(child.props.children);
      }

      return "";
    })
    .join(" ")
    .trim();
}

function getOptions(children: React.ReactNode): CampusComboboxOption[] {
  return React.Children.toArray(children)
    .filter(React.isValidElement)
    .filter((child) => child.type === "option")
    .map((child) => {
      const option = child as React.ReactElement<
        React.OptionHTMLAttributes<HTMLOptionElement>
      >;
      const label = getOptionText(option.props.children);
      const value =
        option.props.value === undefined ? label : String(option.props.value);

      return {
        label,
        value,
      };
    });
}

export const CampusSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      children,
      className,
      defaultValue,
      disabled,
      invalid,
      name,
      onChange,
      value,
      ...props
    },
    ref,
  ) => {
    const options = React.useMemo(() => getOptions(children), [children]);
    const [internalValue, setInternalValue] = React.useState(
      String(value ?? defaultValue ?? options[0]?.value ?? ""),
    );
    const resolvedValue =
      value === undefined ? internalValue : String(value ?? "");

    React.useEffect(() => {
      if (value === undefined && defaultValue !== undefined) {
        setInternalValue(String(defaultValue));
      }
    }, [defaultValue, value]);

    function handleChange(nextValue: string) {
      setInternalValue(nextValue);
      onChange?.({
        target: {
          name,
          value: nextValue,
        },
        currentTarget: {
          name,
          value: nextValue,
        },
      } as React.ChangeEvent<HTMLSelectElement>);
    }

    return (
      <>
        <select
          ref={ref}
          className="sr-only"
          disabled={disabled}
          name={name}
          tabIndex={-1}
          value={resolvedValue}
          aria-hidden="true"
          onChange={() => undefined}
          {...props}
        >
          {children}
        </select>
        <CampusCombobox
          className={className}
          disabled={disabled}
          invalid={invalid}
          options={options}
          placeholder="Select option"
          value={resolvedValue}
          onChange={handleChange}
        />
      </>
    );
  },
);

CampusSelect.displayName = "CampusSelect";
