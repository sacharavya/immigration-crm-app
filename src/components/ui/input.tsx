import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils/index"

import { DateInput } from "./date-input"
import { INPUT_BASE_CLASS } from "./input-class"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  // Date fields use a masked text input (YYYY-MM-DD, year capped at 4 digits)
  // with a calendar affordance, instead of the native control that let the
  // year grow past four digits. Every `<Input type="date">` gets it for free.
  if (type === "date") {
    return <DateInput className={className} {...props} />
  }

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(INPUT_BASE_CLASS, className)}
      {...props}
    />
  )
}

export { Input }
