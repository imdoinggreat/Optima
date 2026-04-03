import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value?: number[]
  onValueChange?: (value: number[]) => void
}) {
  const current = Array.isArray(value) ? value[0] ?? min : min
  return (
    <input
      type="range"
      data-slot="slider"
      className={cn("w-full accent-blue-600", className)}
      min={min}
      max={max}
      step={step}
      value={current}
      onChange={(e) => onValueChange?.([Number(e.target.value)])}
      {...props}
    />
  )
}

export { Slider }

