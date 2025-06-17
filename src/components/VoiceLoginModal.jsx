import { useState, useEffect, useRef } from 'react';

export default function VoiceLoginModal({ onClose, onSubmit }) {
  const [speakerId, setSpeakerId] = useState('');
  const [verificationData, setVerificationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [verificationStep, setVerificationStep] = useState(1);
  
  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => {
    return () => {
      // Clean up
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleGetVerificationText = async () => {
    if (!speakerId.trim()) {
      setError('Speaker ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://34.42.43.202:8000/regional-voice/verification-text/${speakerId}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'User not found');

      setVerificationData(data);

      if (data.audio_base64) {
        const byteCharacters = atob(data.audio_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        setAudioUrl(url);
        const audioObj = new Audio(url);
        audioObj.onended = () => setIsPlaying(false);
        setAudio(audioObj);

        audioObj.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.error("Error playing audio:", err);
            setError('Could not play audio automatically. Please click play manually.');
          });
      }

      setVerificationStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Standard sample rate for voice
          channelCount: 1,   // Mono audio
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      streamRef.current = stream;

      // Initialize AudioContext for WAV conversion
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });

      // Create MediaRecorder with WAV format if possible
      let options = { mimeType: 'audio/wav' };
      if (!MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/webm' }; // Fallback
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          
          // Convert to WAV format if not already
          let finalBlob = audioBlob;
          if (!mediaRecorder.mimeType.includes('wav')) {
            finalBlob = await convertToWav(audioBlob, stream);
          }

          const url = URL.createObjectURL(finalBlob);
          setRecordedBlob(finalBlob);
          setRecordedAudioUrl(url);
        } catch (err) {
          console.error('Error processing recording:', err);
          setError('Error processing recording. Please try again.');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 30) { // 30 second limit
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      setError('Could not access microphone. Please check permissions.');
      console.error('Error accessing microphone:', err);
    }
  };

  // Helper function to convert audio to WAV format
  const convertToWav = async (audioBlob, stream) => {
    if (!audioContextRef.current) {
      throw new Error('AudioContext not initialized');
    }

    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
    
    // Create WAV file from audio buffer
    const wavBlob = audioBufferToWav(audioBuffer);
    return new Blob([wavBlob], { type: 'audio/wav' });
  };

  // Convert AudioBuffer to WAV format
  const audioBufferToWav = (buffer) => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const length = buffer.length;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;

    const bufferSize = 44 + dataSize;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write PCM audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i];
        view.setInt16(offset, sample * (sample < 0 ? 0x8000 : 0x7FFF), true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const playRecordedAudio = () => {
    if (recordedAudioUrl) {
      const audio = new Audio(recordedAudioUrl);
      audio.onerror = () => setError('Failed to play recording');
      audio.play().catch(err => {
        console.error('Error playing recorded audio:', err);
        setError('Could not play recorded audio.');
      });
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

const handleVoiceVerification = async () => {
  if (!recordedBlob) {
    setError('Please record your voice first');
    return;
  }

  setIsLoading(true);
  setError(null);
  setSuccess(null); // Clear any previous success message

  try {
    const formData = new FormData();
    formData.append('audio_file', recordedBlob, 'recording.wav');
    const response = await fetch(`http://34.42.43.202:8000/regional-voice/verify/${speakerId}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.message || 'Voice Verification failed');
    
    // Check if verification was successful
    if (data.is_verified === true) {
      // Store tokens only when verification is successful
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      
      const navigateAfterAudio = () => {
        // Replace '/dashboard' with your desired route
        window.location.href = '/thread/:threadId'; 
        // Or if using React Router:
        // navigate('/dashboard');
      };
      
      // Play success audio if available in response
      if (data.audio_base64) {
        const byteCharacters = atob(data.audio_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        const successAudio = new Audio(url);
        successAudio.onended = () => {
          URL.revokeObjectURL(url); // Clean up
          setSuccess('Voice verification successful!'); // Show success message after audio
          setTimeout(navigateAfterAudio, 1500); // Navigate after showing message
        };
        
        successAudio.onerror = () => {
          // If audio fails, still show success and navigate
          setSuccess('Voice verification successful!');
          setTimeout(navigateAfterAudio, 1500);
        };
        
        successAudio.play().catch(err => {
          console.error("Error playing success audio:", err);
          setSuccess('Voice verification successful!');
          setTimeout(navigateAfterAudio, 1500);
        });
      } else {
        // If no audio, show success and navigate
        setSuccess('Voice verification successful!');
        setTimeout(navigateAfterAudio, 1500);
      }
    } else {
      // Verification failed
      setError('Voice Verification failed');
      setIsLoading(false);
    }
  } catch (err) {
    setError(err.message);
    setIsLoading(false);
  }
};

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2828] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-white">
            {verificationStep === 1 ? 'Voice Login' : 'Voice Verification'}
          </h3>
          <button 
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-[#4761E2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-white">
              {verificationStep === 1 ? 'Getting verification text...' : 'Verifying your voice...'}
            </p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-400">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && !success && verificationStep === 1 && (
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-1 text-sm text-white">User ID</label>
              <input 
                type="text" 
                value={speakerId}
                onChange={(e) => setSpeakerId(e.target.value)}
                className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
                placeholder="Enter your user ID"
              />
            </div>

            <button
              onClick={handleGetVerificationText}
              className="w-full bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Submit
            </button>
          </div>
        )}

        {!isLoading && !success && verificationStep === 2 && verificationData && (
  <div className="space-y-4">
    {/* Instructions moved to the top */}
    <div className="bg-[#171717] p-4 rounded-lg">
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <p className="text-white/60">Instructions:</p>
          <p className="text-white">{verificationData.instructions}</p>
        </div>
      </div>
    </div>

    {/* Sample Text moved below Instructions */}
    <div className="bg-[#171717] p-4 rounded-lg">
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div>
          <p className="text-white/60">Sample Text:</p>
          <p className="text-white">{verificationData.sample_text}</p>
        </div>
      </div>
    </div>

    {/* Rest of the components remain the same */}
    {audio && (
      <div className="bg-[#171717] p-4 rounded-lg">
        <h4 className="font-medium mb-2 text-white">Audio Instructions</h4>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (isPlaying) {
                audio.pause();
                audio.currentTime = 0;
                setIsPlaying(false);
              } else {
                audio.play()
                  .then(() => setIsPlaying(true))
                  .catch(err => {
                    console.error("Error playing audio:", err);
                    setError('Could not play audio. Please try again.');
                  });
              }
            }}
            className={`flex items-center gap-2 ${
              isPlaying ? 'bg-[#4761E2]/80' : 'bg-[#4761E2] hover:bg-[#4761E2]/90'
            } text-white px-4 py-2 rounded-lg transition-colors`}
          >
            {isPlaying ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play Again
              </>
            )}
          </button>
        </div>
      </div>
    )}

    {/* Recording Section */}
    <div className="bg-[#171717] p-4 rounded-lg">
      <h4 className="font-medium mb-2 text-white">Record Your Voice</h4>
      <div className="space-y-3">
        {!recordedBlob ? (
          <div className="flex items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center gap-2 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-[#4761E2] hover:bg-[#4761E2]/90'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              {isRecording ? (
                <>
                  <div className="w-3 h-3 bg-white rounded-sm"></div>
                  Stop ({formatDuration(recordingDuration)})
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Start Recording
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-green-400 text-sm">✓ Recording completed ({formatDuration(recordingDuration)})</span>
              <button
                onClick={() => {
                  setRecordedBlob(null);
                  setRecordedAudioUrl(null);
                  setRecordingDuration(0);
                }}
                className="text-white/50 hover:text-white text-sm"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={playRecordedAudio}
                className="flex items-center gap-2 bg-[#4761E2]/20 hover:bg-[#4761E2]/30 text-[#4761E2] px-3 py-1 rounded text-sm transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

    <button
      onClick={handleVoiceVerification}
      disabled={!recordedBlob}
      className={`w-full ${
        recordedBlob 
          ? 'bg-[#4761E2] hover:bg-[#4761E2]/90' 
          : 'bg-gray-600 cursor-not-allowed'
      } text-white px-6 py-3 rounded-lg transition-colors`}
    >
      Verify My Voice
    </button>
  </div>
)}
      </div>
    </div>
  );
}


