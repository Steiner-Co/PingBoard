import * as React from 'react'
import { DayPicker, type DayPickerProps } from 'react-day-picker'
import AltArrowLeft from '@solar-icons/react/csr/arrows/AltArrowLeft'
import AltArrowRight from '@solar-icons/react/csr/arrows/AltArrowRight'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'

// shadCN-style Calendar: react-day-picker v10 styled to match the rest of
// the design system. Calendar chevrons use Solar's AltArrow icons to stay
// consistent with the rest of the icon system (no lucide-react).
export type CalendarProps = DayPickerProps

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row gap-2',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'flex items-center gap-1 absolute top-3 inset-x-3 justify-between',
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'size-7 bg-transparent p-0 opacity-50 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem] flex justify-center items-center',
        week: 'flex w-full mt-2',
        day:
          'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent',
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-8 p-0 font-normal aria-selected:opacity-100',
        ),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-accent text-accent-foreground',
        outside:
          'text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground',
        disabled: 'text-muted-foreground opacity-50',
        range_start: 'rounded-l-md',
        range_end: 'rounded-r-md',
        range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ..._chevronProps }) =>
          orientation === 'left' ? (
            <Icon icon={AltArrowLeft} className="size-4" />
          ) : (
            <Icon icon={AltArrowRight} className="size-4" />
          ),
      }}
      {...props}
    />
  )
}

export { Calendar }
