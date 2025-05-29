import React, { useState, useEffect } from'react';
import { useSpeechRecognition } from'react-speech-recognition';

const VoiceRecognition = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // 监听识别状态变化
  useEffect(() => {
    setIsListening(listening);
    
    if (!listening && transcript) {
      setFinalTranscript(transcript);
      onTranscript(transcript);
      resetTranscript();
    }
  }, [listening, transcript, resetTranscript, onTranscript]);

  // 检查浏览器支持
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      console.error('浏览器不支持语音识别');
    }
  }, [browserSupportsSpeechRecognition]);

  const startListening = () => {
    resetTranscript();
    setFinalTranscript('');
    useSpeechRecognition.startListening({
      continuous: false,
      language: 'zh-CN'
    });
  };

  const stopListening = () => {
    useSpeechRecognition.stopListening();
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        className={`p-2 rounded-full transition-all duration-300 ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        }`}
        onClick={isListening ? stopListening : startListening}
      >
        <i className="fa fa-microphone" aria-hidden="true"></i>
      </button>
      {isListening && (
        <div className="text-sm text-gray-600">
          正在聆听... {transcript}
        </div>
      )}
    </div>
  );
};

export default VoiceRecognition;  