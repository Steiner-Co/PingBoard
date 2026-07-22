'use client'

import * as React from 'react'
import { format } from 'date-fns'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value?: Date
  onChange: (date: Date | undefined) => void
  placeholder?: string
  /** Disable past dates (handy for renewal/expiry fields). */
  disablePast?: boolean
  id?: string
  className?: string
  /** "start" aligns the calendar to the left edge of the trigger; default is center. */
  align?: 'start' | 'center' | 'end'
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disablePast,
  id,
  className,
  align = 'start',
}: DatePickerProps) {
  const today = React.useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

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
          {value ? format(value, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disablePast ? { before: today } : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
