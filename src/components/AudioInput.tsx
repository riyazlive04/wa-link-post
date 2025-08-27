
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioInputProps {
  onAudioReady: (audioBlob: Blob, fileName: string) => void;
  disabled?: boolean;
}

export const AudioInput = ({ onAudioReady, disabled }: AudioInputProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        const fileName = `recording-${Date.now()}.wav`;
        onAudioReady(blob, fileName);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioBlob(file);
      onAudioReady(file, file.name);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid audio file.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        {!isRecording ? (
          <Button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Mic className="h-4 w-4" />
            Start Recording
          </Button>
        ) : (
          <Button
            onClick={stopRecording}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Recording
          </Button>
        )}

        <span className="text-muted-foreground">or</span>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          disabled={disabled || isRecording}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload Audio
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {audioBlob && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">Audio ready for processing</p>
          <audio controls className="w-full">
            <source src={URL.createObjectURL(audioBlob)} type="audio/wav" />
          </audio>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm">Recording...</span>
        </div>
      )}
    </div>
  );
};
