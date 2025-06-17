import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function VoiceRegistrationModal({ onClose, onSubmit }) {
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [languageData, setLanguageData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState('');
  const [audio, setAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(null);
  const [successAudio, setSuccessAudio] = useState(null);
  const recordingTimerRef = useRef(null);

  useEffect(() => {
    // Clean up audio when component unmounts
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (recordedAudio) {
        URL.revokeObjectURL(recordedAudio);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (successAudio) {
        successAudio.pause();
        successAudio.src = '';
      }
    };
  }, [audio, audioUrl, recordedAudio, successAudio]);

  const checkEmailExists = async () => {
    if (!email) {
      setError('Please enter email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://34.42.43.202:8009/check_user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check email');
      }

      setEmailExists(data.exists);
      setEmailChecked(true);

      // If email doesn't exist, get location and proceed with registration
      if (!data.exists) {
        getLocation();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: 10.850516,
            longitude: 76.271080
          });
        },
        (err) => {
          console.error("Error getting location:", err);
          setError('Could not get your location. Using default location.');
          // Use default location if geolocation fails
          setLocation({
             latitude: 10.850516, 
             longitude: 76.271080
          });
        }
      );
    } else {
      setError('Geolocation is not supported by your browser. Using default location.');
      // Use default location if geolocation is not supported
      setLocation({
        latitude: 10.850516,
        longitude: 76.271080
      });
    }
  };

  useEffect(() => {
    if (location && !emailExists) {
      detectLanguage();
    }
  }, [location, emailExists]);

  const detectLanguage = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://34.42.43.202:8000/regional-voice/detect-language', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to detect language');
      }

      setLanguageData(data);
      setSessionId(data.session_id); 
      
      if (data.audio_instructions) {
        const byteCharacters = atob(data.audio_instructions);
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
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
        audio.currentTime = 0;
      }
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.error("Error playing audio:", err);
          setError('Could not play audio. Please try again.');
        });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/webm';
      }
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        
        try {
          const wavBlob = await convertToWav(blob, stream);
          const url = URL.createObjectURL(wavBlob);
          setRecordedAudio(url);
        } catch (conversionError) {
          console.warn("WAV conversion failed, using original format:", conversionError);
          const url = URL.createObjectURL(blob);
          setRecordedAudio(url);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError('Could not access microphone. Please allow microphone permission.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const convertToWav = async (audioBlob, stream) => {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const fileReader = new FileReader();
        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const wavBuffer = audioBufferToWav(audioBuffer);
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
            resolve(wavBlob);
          } catch (error) {
            reject(error);
          }
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(audioBlob);
      } catch (error) {
        reject(error);
      }
    });
  };

  const audioBufferToWav = (audioBuffer) => {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const buffer = audioBuffer.getChannelData(0);
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    let offset = 0;
    writeString(offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + length * 2, true); offset += 4;
    writeString(offset, 'WAVE'); offset += 4;
    writeString(offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, format, true); offset += 2;
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * blockAlign, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, bitDepth, true); offset += 2;
    writeString(offset, 'data'); offset += 4;
    view.setUint32(offset, length * 2, true); offset += 4;
    
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
    
    return arrayBuffer;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnrollment = async () => {
    if (!recordedAudio || !email) {
      setError('Please record audio and enter email address.');
      return;
    }

    setIsEnrolling(true);
    setError(null);

    try {
      const response = await fetch(recordedAudio);
      const audioBlob = await response.blob();
      
      const formData = new FormData();
      let fileName = 'recording.wav';
      if (audioBlob.type.includes('webm')) {
        fileName = 'recording.webm';
      } else if (audioBlob.type.includes('mp4')) {
        fileName = 'recording.mp4';
      }
      
      formData.append('audio_file', audioBlob, fileName);
      formData.append('email_id', email);

      const enrollResponse = await fetch(
        `http://34.42.43.202:8000/regional-voice/enroll?session_id=${sessionId}&email_id=${encodeURIComponent(email)}`,
        {
          method: 'POST',
          body: formData
        }
      );

      const enrollData = await enrollResponse.json();

      if (!enrollResponse.ok) {
        throw new Error(enrollData.detail || enrollData.message || 'Failed to enroll voice');
      }

      setEnrollmentSuccess(enrollData);
      
      if (enrollData.audio_base64) {
        try {
          const byteCharacters = atob(enrollData.audio_base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          
          const audioObj = new Audio(url);
          audioObj.onended = () => {
            setTimeout(() => {
              onSubmit(email, enrollData);
              navigate('/Login'); 
            }, 1000);
          };
          
          setSuccessAudio(audioObj);
          audioObj.play().catch(err => {
            console.warn("Auto-play failed:", err);
          });
        } catch (audioError) {
          console.error("Error processing success audio:", audioError);
        }
      } else {
        setTimeout(() => {
          onSubmit(email, enrollData);
        }, 3000);
      }

    } catch (err) {
      console.error("Enrollment error:", err);
      setError(err.message || 'Failed to enroll voice. Please try again.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleBackToEmailCheck = () => {
    setEmailChecked(false);
    setEmailExists(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2828] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {emailChecked && emailExists ? 'User Exists' : 
             emailChecked ? 'Voice Registration' : 'Check Email'}
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
            <p className="mt-4">
              {emailChecked ? 'Processing your request...' : 'Checking email...'}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {enrollmentSuccess && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h4 className="text-green-400 font-medium mb-2">Registration Successful!</h4>
                <p className="text-green-300 mb-3">{enrollmentSuccess.message}</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-green-400/70">Duration:</p>
                    <p className="text-green-300">{enrollmentSuccess.audio_duration?.toFixed(1)}s</p>
                  </div>
                  <div>
                    <p className="text-green-400/70">Quality Score:</p>
                    <p className="text-green-300">{(enrollmentSuccess.quality_score * 100)?.toFixed(1)}%</p>
                  </div>
                </div>
                {successAudio && (
                  <div className="mt-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-6a3 3 0 10-6 0v6z" />
                    </svg>
                    <span className="text-green-300 text-sm">Success message playing...</span>
                    <button
                      onClick={() => successAudio.play().catch(console.warn)}
                      className="text-green-400 hover:text-green-300 transition-colors text-sm underline"
                    >
                      Replay
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email Check Form */}
        {!emailChecked && !isLoading && (
          <form onSubmit={(e) => {
            e.preventDefault();
            checkEmailExists();
          }} className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-1 text-sm">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
                className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Check Email
            </button>
          </form>
        )}

        {/* Email Exists Message */}
        {emailChecked && emailExists && !isLoading && !enrollmentSuccess && (
          <div className="space-y-4">
            <div className="bg-[#171717] p-4 rounded-lg">
              <p className="text-center">A user with this email already exists.</p>
            </div>
            <button
              onClick={handleBackToEmailCheck}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Try Different Email
            </button>
          </div>
        )}

        {/* Registration Form */}
        {emailChecked && !emailExists && languageData && !isLoading && !enrollmentSuccess && (
          <>
            <div className="space-y-4 mb-6">
              <div className="bg-[#171717] p-4 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <p className="text-white/60 mb-1">Instructions:</p>
                    <p className="text-sm">{languageData.instructions}</p>
                  </div>
                  <div>
                    <p className="text-white/60 mb-1">Sample Text:</p>
                    <p className="text-sm">{languageData.sample_text}</p>
                  </div>
                </div>
              </div>

              {audio && (
                <div className="bg-[#171717] p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Audio Instructions</h4>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handlePlayAudio}
                      disabled={isPlaying}
                      className={`flex items-center gap-2 ${isPlaying ? 'bg-[#4761E2]/80' : 'bg-[#4761E2] hover:bg-[#4761E2]/90'} text-white px-4 py-2 rounded-lg transition-colors`}
                    >
                      {isPlaying ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Playing...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Play Instructions
                        </>
                      )}
                    </button>
                    {isPlaying && (
                      <button
                        onClick={() => {
                          audio.pause();
                          setIsPlaying(false);
                        }}
                        className="text-white/70 hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-[#171717] p-4 rounded-lg">
                <h4 className="font-medium mb-2">Record Your Voice</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        disabled={isEnrolling}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        Stop Recording ({formatTime(recordingDuration)})
                      </button>
                    )}
                  </div>
                  
                  {recordedAudio && (
                    <div className="flex items-center gap-4">
                      <audio controls src={recordedAudio} className="flex-1">
                        Your browser does not support the audio element.
                      </audio>
                      <button
                        onClick={() => {
                          URL.revokeObjectURL(recordedAudio);
                          setRecordedAudio(null);
                        }}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete recording"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnrollment}
              disabled={!recordedAudio || isEnrolling}
              className="w-full bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isEnrolling ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Enrolling Voice...
                </>
              ) : (
                'Register with Voice'
              )}
            </button>
          </>
        )}

        {enrollmentSuccess && (
          <div className="text-center pt-4">
            <p className="text-white/70 text-sm">
              This window will close automatically in a few seconds...
            </p>
            <button
              onClick={() => onSubmit(email, enrollmentSuccess)}
              className="mt-3 text-[#4761E2] hover:text-[#4761E2]/80 transition-colors text-sm underline"
            >
              Close Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// import { use } from 'react';
// import { useState, useEffect, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';

// export default function VoiceRegistrationModal({ onClose, onSubmit }) {
//   const navigate = useNavigate();
//   const [location, setLocation] = useState(null);
//   const [languageData, setLanguageData] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [email, setEmail] = useState('');
//   const [audio, setAudio] = useState(null);
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [audioUrl, setAudioUrl] = useState(null);
//   const [sessionId, setSessionId] = useState(null);
  
//   // Audio recording states
//   const [isRecording, setIsRecording] = useState(false);
//   const [recordedAudio, setRecordedAudio] = useState(null);
//   const [mediaRecorder, setMediaRecorder] = useState(null);
//   const [isEnrolling, setIsEnrolling] = useState(false);
//   const [recordingDuration, setRecordingDuration] = useState(0);
//   const [enrollmentSuccess, setEnrollmentSuccess] = useState(null);
//   const [successAudio, setSuccessAudio] = useState(null);
//   const recordingTimerRef = useRef(null);

//   useEffect(() => {
//     // Get user's location when component mounts
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           setLocation({
//             latitude: position.coords.latitude,
//             longitude: position.coords.longitude
//           });
//         },
//         (err) => {
//           console.error("Error getting location:", err);
//           setError('Could not get your location. Please enable location services.');
//         }
//       );
//     } else {
//       setError('Geolocation is not supported by your browser.');
//     }

//     return () => {
//       // Clean up audio when component unmounts
//       if (audio) {
//         audio.pause();
//         audio.src = '';
//       }
//       // Revoke the object URL to prevent memory leaks
//       if (audioUrl) {
//         URL.revokeObjectURL(audioUrl);
//       }
//       if (recordedAudio) {
//         URL.revokeObjectURL(recordedAudio);
//       }
//       if (recordingTimerRef.current) {
//         clearInterval(recordingTimerRef.current);
//       }
//       // Clean up success audio
//       if (successAudio) {
//         successAudio.pause();
//         successAudio.src = '';
//       }
//     };
//   }, []);

//   useEffect(() => {
//     if (location) {
//       detectLanguage();
//     }
//   }, [location]);

//   const detectLanguage = async () => {
//     setIsLoading(true);
//     setError(null);
    
//     try {
//       const response = await fetch('http://34.42.43.202:8000/regional-voice/detect-language', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           // latitude: location.latitude,
//           // longitude: location.longitude
//           latitude: 10.784703, // Default to Bangalore for testing
//           longitude: 76.653145 // Default to Bangalore for testing
//         })
//       });

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(data.message || 'Failed to detect language');
//       }

//       setLanguageData(data);
//       setSessionId(data.session_id); 
      
//       // Handle audio instructions if available
//       if (data.audio_instructions) {
//         // Assuming audio_instructions is base64 encoded audio data
//         // Create a blob URL from the audio data
//         const byteCharacters = atob(data.audio_instructions);
//         const byteNumbers = new Array(byteCharacters.length);
//         for (let i = 0; i < byteCharacters.length; i++) {
//           byteNumbers[i] = byteCharacters.charCodeAt(i);
//         }
//         const byteArray = new Uint8Array(byteNumbers);
//         const blob = new Blob([byteArray], { type: 'audio/mpeg' });
//         const url = URL.createObjectURL(blob);
        
//         setAudioUrl(url);
//         const audioObj = new Audio(url);
//         audioObj.onended = () => setIsPlaying(false);
//         setAudio(audioObj);
//       }
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handlePlayAudio = () => {
//     if (audio) {
//       // Reset audio to start if it's already playing
//       if (isPlaying) {
//         audio.pause();
//         audio.currentTime = 0;
//       }
//       audio.play()
//         .then(() => setIsPlaying(true))
//         .catch(err => {
//           console.error("Error playing audio:", err);
//           setError('Could not play audio. Please try again.');
//         });
//     }
//   };

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
//       // Use specific options for better compatibility
//       const options = {
//         mimeType: 'audio/webm;codecs=opus'
//       };
      
//       // Fallback to basic webm if opus is not supported
//       if (!MediaRecorder.isTypeSupported(options.mimeType)) {
//         options.mimeType = 'audio/webm';
//       }
      
//       // Further fallback for Safari/iOS
//       if (!MediaRecorder.isTypeSupported(options.mimeType)) {
//         options.mimeType = 'audio/mp4';
//       }

//       const recorder = new MediaRecorder(stream, options);
//       const chunks = [];

//       recorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           chunks.push(event.data);
//         }
//       };

//       recorder.onstop = async () => {
//         const blob = new Blob(chunks, { type: recorder.mimeType });
        
//         // Convert to WAV format for better server compatibility
//         try {
//           const wavBlob = await convertToWav(blob, stream);
//           const url = URL.createObjectURL(wavBlob);
//           setRecordedAudio(url);
//         } catch (conversionError) {
//           console.warn("WAV conversion failed, using original format:", conversionError);
//           const url = URL.createObjectURL(blob);
//           setRecordedAudio(url);
//         }
        
//         // Stop all tracks to release microphone
//         stream.getTracks().forEach(track => track.stop());
//       };

//       setMediaRecorder(recorder);
//       recorder.start();
//       setIsRecording(true);
//       setRecordingDuration(0);
      
//       // Start timer
//       recordingTimerRef.current = setInterval(() => {
//         setRecordingDuration(prev => prev + 1);
//       }, 1000);

//     } catch (err) {
//       console.error("Error accessing microphone:", err);
//       setError('Could not access microphone. Please allow microphone permission.');
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorder && mediaRecorder.state === 'recording') {
//       mediaRecorder.stop();
//       setIsRecording(false);
//       if (recordingTimerRef.current) {
//         clearInterval(recordingTimerRef.current);
//       }
//     }
//   };

//   // Audio conversion function to WAV format
//   const convertToWav = async (audioBlob, stream) => {
//     return new Promise((resolve, reject) => {
//       try {
//         // Create audio context
//         const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
//         // Read the audio blob
//         const fileReader = new FileReader();
//         fileReader.onload = async (e) => {
//           try {
//             const arrayBuffer = e.target.result;
//             const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
//             // Convert to WAV
//             const wavBuffer = audioBufferToWav(audioBuffer);
//             const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
//             resolve(wavBlob);
//           } catch (error) {
//             reject(error);
//           }
//         };
//         fileReader.onerror = reject;
//         fileReader.readAsArrayBuffer(audioBlob);
//       } catch (error) {
//         reject(error);
//       }
//     });
//   };

//   // Convert AudioBuffer to WAV format
//   const audioBufferToWav = (audioBuffer) => {
//     const numChannels = audioBuffer.numberOfChannels;
//     const sampleRate = audioBuffer.sampleRate;
//     const format = 1; // PCM
//     const bitDepth = 16;
    
//     const bytesPerSample = bitDepth / 8;
//     const blockAlign = numChannels * bytesPerSample;
    
//     const buffer = audioBuffer.getChannelData(0);
//     const length = buffer.length;
//     const arrayBuffer = new ArrayBuffer(44 + length * 2);
//     const view = new DataView(arrayBuffer);
    
//     // WAV header
//     const writeString = (offset, string) => {
//       for (let i = 0; i < string.length; i++) {
//         view.setUint8(offset + i, string.charCodeAt(i));
//       }
//     };
    
//     let offset = 0;
//     writeString(offset, 'RIFF'); offset += 4;
//     view.setUint32(offset, 36 + length * 2, true); offset += 4;
//     writeString(offset, 'WAVE'); offset += 4;
//     writeString(offset, 'fmt '); offset += 4;
//     view.setUint32(offset, 16, true); offset += 4;
//     view.setUint16(offset, format, true); offset += 2;
//     view.setUint16(offset, numChannels, true); offset += 2;
//     view.setUint32(offset, sampleRate, true); offset += 4;
//     view.setUint32(offset, sampleRate * blockAlign, true); offset += 4;
//     view.setUint16(offset, blockAlign, true); offset += 2;
//     view.setUint16(offset, bitDepth, true); offset += 2;
//     writeString(offset, 'data'); offset += 4;
//     view.setUint32(offset, length * 2, true); offset += 4;
    
//     // Convert float samples to 16-bit PCM
//     for (let i = 0; i < length; i++) {
//       const sample = Math.max(-1, Math.min(1, buffer[i]));
//       view.setInt16(offset, sample * 0x7FFF, true);
//       offset += 2;
//     }
    
//     return arrayBuffer;
//   };

//   const formatTime = (seconds) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const handleEnrollment = async () => {
//     if (!recordedAudio || !email) {
//       setError('Please record audio and enter email address.');
//       return;
//     }

//     setIsEnrolling(true);
//     setError(null);

//     try {
//       // Convert the recorded audio URL back to a blob
//       const response = await fetch(recordedAudio);
//       const audioBlob = await response.blob();
      
//       // Create FormData for the API call
//       const formData = new FormData();
      
//       // Determine file extension based on blob type
//       let fileName = 'recording.wav';
//       if (audioBlob.type.includes('webm')) {
//         fileName = 'recording.webm';
//       } else if (audioBlob.type.includes('mp4')) {
//         fileName = 'recording.mp4';
//       }
      
//       formData.append('audio_file', audioBlob, fileName);
//       formData.append('email_id', email);

    

//       console.log('Sending enrollment request with:', {
//         sessionId,
//         email,
//         audioType: audioBlob.type,
//         audioSize: audioBlob.size,
//         fileName
//       });

//       const enrollResponse = await fetch(
//         `http://34.42.43.202:8000/regional-voice/enroll?session_id=${sessionId}&email_id=${encodeURIComponent(email)}`,
//         {
//           method: 'POST',
//           body: formData
//         }
//       );

//       const enrollData = await enrollResponse.json();

//       if (!enrollResponse.ok) {
//         throw new Error(enrollData.detail || enrollData.message || 'Failed to enroll voice');
//       }

//       // Success - handle the response
//       setEnrollmentSuccess(enrollData);
      
//       // Handle success audio if available
//       if (enrollData.audio_base64) {
//         try {
//           // Convert base64 to audio blob
//           const byteCharacters = atob(enrollData.audio_base64);
//           const byteNumbers = new Array(byteCharacters.length);
//           for (let i = 0; i < byteCharacters.length; i++) {
//             byteNumbers[i] = byteCharacters.charCodeAt(i);
//           }
//           const byteArray = new Uint8Array(byteNumbers);
//           const blob = new Blob([byteArray], { type: 'audio/mpeg' });
//           const url = URL.createObjectURL(blob);
          
//           const audioObj = new Audio(url);
//           audioObj.onended = () => {
//             // Auto-close modal after audio finishes (optional)
//             setTimeout(() => {
//               onSubmit(email, enrollData);
//               navigate('/Login'); 
//             }, 1000);
//           };
          
//           setSuccessAudio(audioObj);
          
//           // Auto-play the success audio
//           audioObj.play().catch(err => {
//             console.warn("Auto-play failed:", err);
//             // Fallback: user can manually play
//           });
//         } catch (audioError) {
//           console.error("Error processing success audio:", audioError);
//         }
//       } else {
//         // If no audio, close after a delay
//         setTimeout(() => {
//           onSubmit(email, enrollData);
//         }, 3000);
//       }

//     } catch (err) {
//       console.error("Enrollment error:", err);
//       setError(err.message || 'Failed to enroll voice. Please try again.');
//     } finally {
//       setIsEnrolling(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
//       <div className="bg-[#2A2828] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="text-lg font-medium">Voice Registration</h3>
//           <button 
//             onClick={onClose}
//             className="text-white/50 hover:text-white transition-colors"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//             </svg>
//           </button>
//         </div>

//         {isLoading && (
//           <div className="flex flex-col items-center justify-center py-8">
//             <svg className="animate-spin h-8 w-8 text-[#4761E2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//             </svg>
//             <p className="mt-4">Detecting your regional language...</p>
//           </div>
//         )}

//         {error && (
//           <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
//             <p className="text-red-400">{error}</p>
//           </div>
//         )}

//         {enrollmentSuccess && (
//           <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-4">
//             <div className="flex items-start gap-3">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//               <div className="flex-1">
//                 <h4 className="text-green-400 font-medium mb-2">Registration Successful!</h4>
//                 <p className="text-green-300 mb-3">{enrollmentSuccess.message}</p>
//                 <div className="grid grid-cols-2 gap-4 text-sm">
//                   <div>
//                     <p className="text-green-400/70">Duration:</p>
//                     <p className="text-green-300">{enrollmentSuccess.audio_duration?.toFixed(1)}s</p>
//                   </div>
//                   <div>
//                     <p className="text-green-400/70">Quality Score:</p>
//                     <p className="text-green-300">{(enrollmentSuccess.quality_score * 100)?.toFixed(1)}%</p>
//                   </div>
//                 </div>
//                 {successAudio && (
//                   <div className="mt-3 flex items-center gap-2">
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 106 0v-6a3 3 0 10-6 0v6z" />
//                     </svg>
//                     <span className="text-green-300 text-sm">Success message playing...</span>
//                     <button
//                       onClick={() => successAudio.play().catch(console.warn)}
//                       className="text-green-400 hover:text-green-300 transition-colors text-sm underline"
//                     >
//                       Replay
//                     </button>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         )}

//         {languageData && !isLoading && !enrollmentSuccess && (
//           <>
//             <div className="space-y-4 mb-6">
//               <div className="bg-[#171717] p-4 rounded-lg">
//                 <h4 className="font-medium mb-2">Detected Language Information</h4>
//                 <div className="grid grid-cols-2 gap-2 text-sm">
//                   <div>
//                     <p className="text-white/60">Sample Text:</p>
//                     <p>{languageData.sample_text}</p>
//                   </div>
//                   <div className="col-span-2">
//                     <p className="text-white/60">Instructions:</p>
//                     <p>{languageData.instructions}</p>
//                   </div>
//                 </div>
//               </div>

//               {audio && (
//                 <div className="bg-[#171717] p-4 rounded-lg">
//                   <h4 className="font-medium mb-2">Audio Instructions</h4>
//                   <div className="flex items-center gap-4">
//                     <button
//                       onClick={handlePlayAudio}
//                       disabled={isPlaying}
//                       className={`flex items-center gap-2 ${isPlaying ? 'bg-[#4761E2]/80' : 'bg-[#4761E2] hover:bg-[#4761E2]/90'} text-white px-4 py-2 rounded-lg transition-colors`}
//                     >
//                       {isPlaying ? (
//                         <>
//                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
//                           </svg>
//                           Playing...
//                         </>
//                       ) : (
//                         <>
//                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
//                             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
//                           </svg>
//                           Play Instructions
//                         </>
//                       )}
//                     </button>
//                     {isPlaying && (
//                       <button
//                         onClick={() => {
//                           audio.pause();
//                           setIsPlaying(false);
//                         }}
//                         className="text-white/70 hover:text-white transition-colors"
//                       >
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
//                         </svg>
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               )}

//               {/* Audio Recording Section */}
//               <div className="bg-[#171717] p-4 rounded-lg">
//                 <h4 className="font-medium mb-2">Record Your Voice</h4>
//                 <div className="space-y-3">
//                   <div className="flex items-center gap-4">
//                     {!isRecording ? (
//                       <button
//                         onClick={startRecording}
//                         disabled={isEnrolling}
//                         className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
//                       >
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//                         </svg>
//                         Start Recording
//                       </button>
//                     ) : (
//                       <button
//                         onClick={stopRecording}
//                         className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
//                       >
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
//                         </svg>
//                         Stop Recording ({formatTime(recordingDuration)})
//                       </button>
//                     )}
//                   </div>
                  
//                   {recordedAudio && (
//                     <div className="flex items-center gap-4">
//                       <audio controls src={recordedAudio} className="flex-1">
//                         Your browser does not support the audio element.
//                       </audio>
//                       <button
//                         onClick={() => {
//                           URL.revokeObjectURL(recordedAudio);
//                           setRecordedAudio(null);
//                         }}
//                         className="text-red-400 hover:text-red-300 transition-colors"
//                         title="Delete recording"
//                       >
//                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
//                         </svg>
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
//               <div className="flex flex-col">
//                 <label className="mb-1 text-sm">Email Address</label>
//                 <input 
//                   type="email" 
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                   disabled={isEnrolling}
//                   className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors disabled:opacity-50"
//                 />
//               </div>

//               <button
//                 type="button"
//                 onClick={handleEnrollment}
//                 disabled={!recordedAudio || !email || isEnrolling}
//                 className="w-full bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//               >
//                 {isEnrolling ? (
//                   <>
//                     <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                     </svg>
//                     Enrolling Voice...
//                   </>
//                 ) : (
//                   'Register with Voice'
//                 )}
//               </button>
//             </form>
//           </>
//         )}

//         {enrollmentSuccess && (
//           <div className="text-center pt-4">
//             <p className="text-white/70 text-sm">
//               This window will close automatically in a few seconds...
//             </p>
//             <button
//               onClick={() => onSubmit(email, enrollmentSuccess)}
//               className="mt-3 text-[#4761E2] hover:text-[#4761E2]/80 transition-colors text-sm underline"
//             >
//               Close Now
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


