"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type SelectContextValue = {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: Array<{ value: string; label: string }>
  setOptions: (opts: Array<{ value: string; label: string }>) => void
}

const SelectContext = React.createContext<SelectContextValue | null>(null)

function Select({
  value,
  onValueChange,
  children,
}: {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}) {
  const [options, setOptions] = React.useState<Array<{ value: string; label: string }>>([])
  return (
    <SelectContext.Provider value={{ value, onValueChange, options, setOptions }}>
      <div data-slot="select">{children}</div>
    </SelectContext.Provider>
  )
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  const ctx = React.useContext(SelectContext)
  if (!ctx) return null

  // If SelectValue is used as the first child, it sets placeholder via prop.
  const selectValueChild = React.Children.toArray(children).find((child) => {
    return React.isValidElement(child) && child.type === SelectValue
  }) as React.ReactElement<{ placeholder?: string }> | undefined
  const placeholder = selectValueChild?.props?.placeholder ?? "请选择"

  return (
    <select
      data-slot="select-trigger"
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      value={ctx.value ?? ""}
      onChange={(e) => ctx.onValueChange?.(e.target.value)}
      {...props}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {ctx.options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function SelectValue({ placeholder }: { placeholder?: string }) {
  // Render nothing; SelectTrigger reads placeholder from this component.
  return <span data-slot="select-value" data-placeholder={placeholder} />
}
SelectValue.displayName = "SelectValue"

function SelectContent({ children }: { children: React.ReactNode }) {
  const ctx = React.useContext(SelectContext)
  React.useEffect(() => {
    if (!ctx) return
    const opts: Array<{ value: string; label: string }> = []
    React.Children.forEach(children, (child) => {
      if (React.isValidElement<{ value: string; children: string }>(child) && child.type === SelectItem) {
        opts.push({ value: child.props.value, label: child.props.children })
      }
    })
    ctx.setOptions(opts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children])
  return null
}

function SelectItem({
  value,
  children,
}: {
  value: string
  children: string
}) {
  return <span data-slot="select-item" data-value={value}>{children}</span>
}
SelectItem.displayName = "SelectItem"

function SelectGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SelectLabel({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function SelectSeparator() {
  return null
}

function SelectScrollUpButton() {
  return null
}

function SelectScrollDownButton() {
  return null
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
