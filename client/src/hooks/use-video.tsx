import { useEffect, useRef, useState } from "react";
import { useToast } from "./use-toast";

export function useVideo() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const { toast } = useToast();
  
  useEffect(() => {
    async function setupStream() {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setStream(newStream);
      } catch (error) {
        toast({
          title: "Camera/Microphone Error",
          description: "Failed to access media devices",
          variant: "destructive"
        });
      }
    }
    
    setupStream();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);
  
  useEffect(() => {
    if (!stream) return;
    stream.getVideoTracks().forEach(track => {
      track.enabled = isVideoEnabled;
    });
  }, [stream, isVideoEnabled]);
  
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach(track => {
      track.enabled = isAudioEnabled;
    });
  }, [stream, isAudioEnabled]);
  
  return {
    stream,
    isVideoEnabled,
    isAudioEnabled,
    toggleVideo: () => setIsVideoEnabled(prev => !prev),
    toggleAudio: () => setIsAudioEnabled(prev => !prev)
  };
}
