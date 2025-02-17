import { useState, useEffect } from 'react';

interface UseSpeechRecognition {
  stop(): void;
  start(): void;
  results: string[];
  isListening: boolean;
  englishScore: number;
  startListening: () => void;
  stopListening: () => void;
}

const useSpeechRecognition = (): UseSpeechRecognition => {
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [englishScore, setEnglishScore] = useState(0);
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        const confidence = event.results[event.results.length - 1][0].confidence;

        // Update results
        setResults((prevResults) => [...prevResults, transcript]);

        // Update English score based on confidence
        if (confidence > 0.8) {
          setEnglishScore((prev) => prev + 1);
        }
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const startListening = () => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  // Return the required properties and methods
  return {
    isListening,
    englishScore,
    startListening,
    stopListening,
    stop: stopListening,
    start: startListening,
    results
  };
};

export default useSpeechRecognition;



