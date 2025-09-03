import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, Send, Save } from 'lucide-react';

interface SchedulingOptionsProps {
  value: 'now' | 'scheduled' | 'draft';
  onChange: (value: 'now' | 'scheduled' | 'draft') => void;
}

export const SchedulingOptions = ({ value, onChange }: SchedulingOptionsProps) => {
  return (
    <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="now" id="now" />
        <Label htmlFor="now" className="flex items-center space-x-2 cursor-pointer">
          <Send className="h-4 w-4 text-primary" />
          <span>Publish Now</span>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="scheduled" id="scheduled" />
        <Label htmlFor="scheduled" className="flex items-center space-x-2 cursor-pointer">
          <Clock className="h-4 w-4 text-primary" />
          <span>Schedule for Later</span>
        </Label>
      </div>
      
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="draft" id="draft" />
        <Label htmlFor="draft" className="flex items-center space-x-2 cursor-pointer">
          <Save className="h-4 w-4 text-primary" />
          <span>Save as Draft</span>
        </Label>
      </div>
    </RadioGroup>
  );
};