"use client"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface SelectOption {
  id: string
  name: string
  description?: string
}

// The picker used for the model and the prompt.
export function OptionSelect({
  label,
  options,
  value,
  onValueChange,
}: {
  label: string
  options: SelectOption[]
  value: string
  onValueChange: (value: string) => void
}) {
  const items = options.map((option) => ({
    label: option.name,
    value: option.id,
  }))

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (typeof next === "string") onValueChange(next)
      }}
    >
      <SelectTrigger aria-label={label} className="bg-background">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-96">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.description ? (
                <div className="flex flex-col gap-0.5">
                  <span>{option.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </div>
              ) : (
                option.name
              )}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
