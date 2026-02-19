"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  className?: string
  disabled?: (date: Date) => boolean
  [key: string]: any
}

function Calendar({
  selected,
  onSelect,
  className,
  disabled,
}: CalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = React.useState(selected?.getFullYear() ?? today.getFullYear())
  const [viewMonth, setViewMonth] = React.useState(selected?.getMonth() ?? today.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth)
  const monthName = new Date(viewYear, viewMonth).toLocaleString("default", { month: "long" })

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  const isSelected = (day: number) => {
    if (!selected) return false
    return (
      selected.getDate() === day &&
      selected.getMonth() === viewMonth &&
      selected.getFullYear() === viewYear
    )
  }

  const isToday = (day: number) => {
    return (
      today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear
    )
  }

  const handleSelect = (day: number) => {
    const date = new Date(viewYear, viewMonth, day)
    if (disabled?.(date)) return
    onSelect?.(date)
  }

  const weeks: (number | null)[][] = []
  let currentWeek: (number | null)[] = []

  for (let i = 0; i < firstDay; i++) {
    currentWeek.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)
    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  return (
    <div data-slot="calendar" className={cn("w-full p-2", className)}>
      <div className="flex items-center justify-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={prevMonth}
          data-testid="button-calendar-prev"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold min-w-[140px] text-center" data-testid="text-calendar-month">
          {monthName} {viewYear}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={nextMonth}
          data-testid="button-calendar-next"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </Button>
      </div>

      <table className="w-full table-fixed">
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th
                key={day}
                className="pb-3 text-center text-xs font-medium text-muted-foreground"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => {
                const date = day ? new Date(viewYear, viewMonth, day) : null
                const isDisabled = date ? disabled?.(date) : false

                return (
                  <td key={dayIndex} className="text-center p-0.5">
                    {day !== null ? (
                      <button
                        type="button"
                        onClick={() => handleSelect(day)}
                        disabled={!!isDisabled}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md text-sm w-9 h-9 transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          isSelected(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                          isToday(day) && !isSelected(day) && "bg-accent text-accent-foreground",
                          isDisabled && "opacity-50 pointer-events-none"
                        )}
                        data-testid={`button-day-${day}`}
                      >
                        {day}
                      </button>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { Calendar }
