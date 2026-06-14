import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';

export default function DateTimePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày và giờ...',
  className = '',
  minDate
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Parse the current value
  const parsedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // Calendar month view state
  const [viewDate, setViewDate] = useState(() => parsedDate || new Date());

  // Hours and minutes state
  const [hours, setHours] = useState(() => parsedDate ? parsedDate.getHours() : 12);
  const [minutes, setMinutes] = useState(() => parsedDate ? parsedDate.getMinutes() : 0);

  // Sync state with value updates (e.g. from template seeding)
  useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
      setHours(parsedDate.getHours());
      setMinutes(parsedDate.getMinutes());
    }
  }, [parsedDate]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMonthChange = (direction) => {
    setViewDate(prev => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + direction);
      return next;
    });
  };

  const handleDateSelect = (day) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, hours, minutes);
    
    // Check if the selected datetime is before minDate (if minDate is provided)
    if (minDate) {
      const min = new Date(minDate);
      if (!isNaN(min.getTime()) && newDate < min) {
        // Enforce minDate instead
        onChange(min.toISOString());
        return;
      }
    }
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (type, val) => {
    const numVal = parseInt(val, 10);
    let newHours = hours;
    let newMinutes = minutes;

    if (type === 'hours') {
      newHours = numVal;
      setHours(numVal);
    } else {
      newMinutes = numVal;
      setMinutes(numVal);
    }

    const baseDate = parsedDate || new Date();
    const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), newHours, newMinutes);
    
    if (minDate) {
      const min = new Date(minDate);
      if (!isNaN(min.getTime()) && newDate < min) {
        onChange(min.toISOString());
        return;
      }
    }
    onChange(newDate.toISOString());
  };

  // Calendar generation logic
  const calendarGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // First day of month (0 = Sunday, 1 = Monday, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevTotalDays = new Date(year, month, 0).getDate();

    const days = [];

    // Adjust firstDayIndex to make Monday the first column (0: Monday, 6: Sunday)
    // standard index: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Previous month filler days
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        day: prevTotalDays - i,
        isCurrentMonth: false,
        monthOffset: -1
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        monthOffset: 0
      });
    }

    // Next month filler days (to complete the 42 grid cells)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        monthOffset: 1
      });
    }

    return days;
  }, [viewDate]);

  // Format date for the main text input
  const displayValue = useMemo(() => {
    if (!parsedDate) return '';
    const d = parsedDate.getDate().toString().padStart(2, '0');
    const m = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
    const y = parsedDate.getFullYear();
    const hh = parsedDate.getHours().toString().padStart(2, '0');
    const mm = parsedDate.getMinutes().toString().padStart(2, '0');
    return `${d}/${m}/${y} ${hh}:${mm}`;
  }, [parsedDate]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  }, []);

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div
        className={`flex items-center justify-between cursor-pointer rounded-full border border-border bg-background px-4 py-2.5 text-sm shadow-sm transition-all hover:border-primary/50 focus-within:ring-2 focus-within:ring-ring ${className}`}
        onClick={() => setShowDropdown(prev => !prev)}
      >
        <div className="flex items-center gap-2 text-foreground font-['Roboto']">
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {displayValue ? (
            <span>{displayValue}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setHours(12);
                setMinutes(0);
              }}
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Xóa ngày đã chọn"
            >
              <X className="size-3.5" />
            </button>
          )}
          <Clock className="size-4 text-muted-foreground" />
        </div>
      </div>

      {showDropdown && (
        <div className="absolute left-0 mt-2 z-50 w-80 rounded-2xl border border-border bg-card p-4 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              className="rounded-lg p-1.5 hover:bg-muted text-foreground transition"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1 font-['Open_Sans'] font-semibold text-sm text-foreground">
              <select
                value={viewDate.getMonth()}
                onChange={e => {
                  const m = parseInt(e.target.value, 10);
                  setViewDate(new Date(viewDate.getFullYear(), m, 1));
                }}
                className="bg-transparent border-0 font-semibold p-0.5 text-sm rounded hover:bg-muted focus:ring-0 focus:outline-none cursor-pointer"
              >
                {monthNames.map((name, i) => (
                  <option key={i} value={i}>{name}</option>
                ))}
              </select>
              <select
                value={viewDate.getFullYear()}
                onChange={e => {
                  const y = parseInt(e.target.value, 10);
                  setViewDate(new Date(y, viewDate.getMonth(), 1));
                }}
                className="bg-transparent border-0 font-semibold p-0.5 text-sm rounded hover:bg-muted focus:ring-0 focus:outline-none cursor-pointer"
              >
                {yearOptions.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              className="rounded-lg p-1.5 hover:bg-muted text-foreground transition"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div className="text-destructive/80">CN</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {calendarGrid.map((item, idx) => {
              const isSelected = parsedDate &&
                parsedDate.getDate() === item.day &&
                parsedDate.getMonth() === viewDate.getMonth() + item.monthOffset &&
                parsedDate.getFullYear() === viewDate.getFullYear();

              const dayDate = new Date(
                viewDate.getFullYear(),
                viewDate.getMonth() + item.monthOffset,
                item.day
              );
              
              const isPast = minDate && dayDate < new Date(new Date(minDate).setHours(0,0,0,0));

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    if (item.monthOffset !== 0) {
                      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + item.monthOffset, 1));
                    }
                    handleDateSelect(item.day);
                  }}
                  className={`
                    h-8 w-8 rounded-full text-xs font-medium flex items-center justify-center transition
                    ${isSelected ? 'bg-primary text-primary-foreground hover:bg-primary/95 font-semibold' : ''}
                    ${!isSelected && item.isCurrentMonth ? 'text-foreground hover:bg-muted' : ''}
                    ${!isSelected && !item.isCurrentMonth ? 'text-muted-foreground/40 hover:bg-muted/30' : ''}
                    ${isPast ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer'}
                  `}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Block */}
          <div className="border-t border-border/50 pt-3 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
              <Clock className="size-3.5" />
              Chọn giờ:
            </span>
            <div className="flex items-center gap-1.5">
              <select
                value={hours}
                onChange={e => handleTimeChange('hours', e.target.value)}
                className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {h.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">:</span>
              <select
                value={minutes}
                onChange={e => handleTimeChange('minutes', e.target.value)}
                className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 60 }).map((_, m) => (
                  <option key={m} value={m}>
                    {m.toString().padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                today.setHours(hours, minutes, 0, 0);
                onChange(today.toISOString());
                setViewDate(today);
              }}
              className="flex-1 rounded-lg bg-muted text-foreground py-1 text-xs font-semibold hover:bg-muted/80 transition"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setShowDropdown(false)}
              className="flex-1 rounded-lg bg-primary text-primary-foreground py-1 text-xs font-semibold hover:bg-primary/95 transition"
            >
              Hoàn tất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
