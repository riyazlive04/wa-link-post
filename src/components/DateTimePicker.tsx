import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateTimePickerProps {
  value?: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export const DateTimePicker = ({ value, onChange, minDate = new Date() }: DateTimePickerProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedTime, setSelectedTime] = useState(
    value ? format(value, 'HH:mm') : '09:00'
  );

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      updateDateTime(date, selectedTime);
    }
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (selectedDate) {
      updateDateTime(selectedDate, time);
    }
  };

  const updateDateTime = (date: Date, time: string) => {
    const [hours, minutes] = time.split(':');
    const newDateTime = new Date(date);
    newDateTime.setHours(parseInt(hours, 10));
    newDateTime.setMinutes(parseInt(minutes, 10));
    newDateTime.setSeconds(0);
    onChange(newDateTime);
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  return (
    <div className="space-y-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !selectedDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date < minDate}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      <Select value={selectedTime} onValueChange={handleTimeSelect}>
        <SelectTrigger className="w-full">
          <Clock className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Select time" />
        </SelectTrigger>
        <SelectContent>
          {generateTimeOptions().map((time) => (
            <SelectItem key={time} value={time}>
              {time}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};