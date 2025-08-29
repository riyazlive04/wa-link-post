
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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' // Use more efficient codec
      });
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Check file size (10MB limit)
        if (blob.size > 10 * 1024 * 1024) {
          toast({
            title: "Error",
            description: "Recording is too large (max 10MB). Please record a shorter audio.",
            variant: "destructive"
          });
          return;
        }
        
        setAudioBlob(blob);
        const fileName = `recording-${Date.now()}.webm`;
        onAudioReady(blob, fileName);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Clear duration interval
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
          durationIntervalRef.current = null;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();
      setRecordingDuration(0);
      
      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setRecordingDuration(elapsed);
        
        // Auto-stop at 5 minutes to prevent too large files
        if (elapsed >= 300) {
          stopRecording();
          toast({
            title: "Recording stopped",
            description: "Maximum recording duration reached (5 minutes).",
            variant: "default"
          });
        }
      }, 1000);
      
    } catch (error) {
      console.error('Recording error:', error);
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
      
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('audio/')) {
      toast({
        title: "Error",
        description: "Please select a valid audio file.",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Audio file is too large (max 10MB). Please choose a smaller file.",
        variant: "destructive"
      });
      return;
    }
    
    setAudioBlob(file);
    onAudioReady(file, file.name);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
            Stop Recording ({formatDuration(recordingDuration)})
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
          <p className="text-sm text-muted-foreground mb-2">
            Audio ready for processing (Size: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB)
          </p>
          <audio controls className="w-full">
            <source src={URL.createObjectURL(audioBlob)} type={audioBlob.type} />
          </audio>
        </div>
      )}

      {isRecording && (
        <div className="flex items-center gap-2 text-red-600">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
          <span className="text-sm">Recording... {formatDuration(recordingDuration)} (max 5:00)</span>
        </div>
      )}
    </div>
  );
};
