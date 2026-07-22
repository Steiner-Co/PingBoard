'use client'

import * as React from 'react'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DateTimePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  id?: string
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick a date and time',
  id,
  className,
}: DateTimePickerProps) {
  // Local mirrors so the time fields don't fight the popover's open/close
  // cycle on every keystroke. We sync to props on each render.
  const [hours, setHours] = React.useState<string>(
    value ? String(value.getHours()).padStart(2, '0') : '00',
  )
  const [minutes, setMinutes] = React.useState<string>(
    value ? String(value.getMinutes()).padStart(2, '0') : '00',
  )

  React.useEffect(() => {
    setHours(value ? String(value.getHours()).padStart(2, '0') : '00')
    setMinutes(value ? String(value.getMinutes()).padStart(2, '0') : '00')
  }, [value])

  const applyTime = React.useCallback(
    (next: Date | undefined) => {
      if (!next) {
        onChange(undefined)
        return
      }
      const d = new Date(next)
      const h = Number.parseInt(hours, 10)
      const m = Number.parseInt(minutes, 10)
      if (!Number.isNaN(h)) d.setHours(h)
      if (!Number.isNaN(m)) d.setMinutes(m)
      onChange(d)
    },
    [hours, minutes, onChange],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {value ? format(value, 'PPP p') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={applyTime}
          autoFocus
        />
        <div className="flex items-end gap-2 border-t border-border/70 p-3">
          <div className="space-y-1">
            <label
              htmlFor={`${id ?? 'dtp'}-hours`}
              className="text-xs text-muted-foreground"
            >
              Hours
            </label>
            <Input
              id={`${id ?? 'dtp'}-hours`}
              type="number"
              min={0}
              max={23}
              value={hours}
              onChange={(e) => setHours(e.target.value.padStart(2, '0').slice(-2))}
              onBlur={() => {
                if (value) applyTime(value)
              }}
              className="w-16 tabular-nums"
            />
          </div>
          <span aria-hidden className="pb-1.5 text-muted-foreground">
            :
          </span>
          <div className="space-y-1">
            <label
              htmlFor={`${id ?? 'dtp'}-minutes`}
              className="text-xs text-muted-foreground"
            >
              Minutes
            </label>
            <Input
              id={`${id ?? 'dtp'}-minutes`}
              type="number"
              min={0}
              max={59}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value.padStart(2, '0').slice(-2))}
              onBlur={() => {
                if (value) applyTime(value)
              }}
              className="w-16 tabular-nums"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
