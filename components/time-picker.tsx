"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimePickerProps {
  value: string // HH:MM format
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: "06", minute: "00", period: "AM" }
    
    const [hourStr, minuteStr] = timeStr.split(":")
    let hour = parseInt(hourStr || "6")
    const minute = minuteStr || "00"
    
    const period = hour >= 12 ? "PM" : "AM"
    if (hour === 0) hour = 12
    else if (hour > 12) hour = hour - 12
    
    return {
      hour: hour.toString().padStart(2, "0"),
      minute,
      period,
    }
  }

  const formatTo24Hour = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour)
    if (period === "PM" && hour24 !== 12) hour24 += 12
    if (period === "AM" && hour24 === 12) hour24 = 0
    return `${hour24.toString().padStart(2, "0")}:${minute}`
  }

  const { hour, minute, period } = parseTime(value)

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, "0"))
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"))

  return (
    <div className={`flex gap-2 ${className}`}>
      <Select
        value={hour}
        onValueChange={(h) => onChange(formatTo24Hour(h, minute, period))}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <span className="flex items-center text-xl font-bold">:</span>
      
      <Select
        value={minute}
        onValueChange={(m) => onChange(formatTo24Hour(hour, m, period))}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={period}
        onValueChange={(p) => onChange(formatTo24Hour(hour, minute, p))}
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
