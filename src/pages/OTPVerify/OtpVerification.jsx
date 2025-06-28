import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authRoutes from '../../config/api';

export default function OTPVerification() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputsRef = useRef([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Get identifier from navigation state or redirect back
  useEffect(() => {
    if (!location.state?.mobileNumber) {
      navigate('/login');
    }
  }, [location.state, navigate]);

  // Handle input changes and navigation between boxes
  const handleInput = (e, index) => {
    const value = e.target.value;
    
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value.length === 1 && index < 5) {
      inputsRef.current[index + 1].focus();
    }
    
    // Auto-focus previous input on backspace
    if (value.length === 0 && index > 0 && e.inputType === 'deleteContentBackward') {
      inputsRef.current[index - 1].focus();
    }
  };

  // Handle paste event
  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{6}$/.test(pasteData)) {
      const pasteArray = pasteData.split('');
      const newOtp = [...otp];
      pasteArray.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      inputsRef.current[5].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if all OTP digits are filled
    if (otp.some(digit => digit === '')) {
      setErrorMessage('Please enter the complete 6-digit OTP');
      setShowError(true);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`${authRoutes.verifyOtp}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: location.state?.mobileNumber,
          otp: otp.join('')
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      // On success
      setShowSuccess(true);
      setShowError(false);
      
      // Store tokens if your API returns them
      if (data.data?.accessToken) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        localStorage.setItem('userId', data.data.userId);
        localStorage.setItem('FullName', data.data.FullName);
      }

      // Redirect after delay
      setTimeout(() => {
        navigate('/thread/:threadId'); // or your success route
      }, 1500);
      
    } catch (err) {
      setErrorMessage(err.message || 'Failed to verify OTP. Please try again.');
      setShowError(true);
      setShowSuccess(false);
      
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0].focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center p-4 relative">
      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#2A2828] border border-green-500/30 rounded-lg shadow-lg p-4 flex items-start gap-3 w-full max-w-md">
            <div className="bg-green-500/20 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Verification Successful!</h3>
              <p className="text-sm text-white/80 mt-1">Redirecting to your dashboard...</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {showError && (
        <div className="absolute top-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#2A2828] border border-red-500/30 rounded-lg shadow-lg p-4 flex items-start gap-3 w-full max-w-md">
            <div className="bg-red-500/20 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Verification Failed</h3>
              <p className="text-sm text-white/80 mt-1">{errorMessage}</p>
            </div>
            <button 
              onClick={() => setShowError(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-[#2A2828] p-6 sm:p-8 rounded-2xl shadow-lg text-center">
        <h2 className="text-[24px] font-medium mb-6">OTP Verification</h2>
        <p className="text-[16px] text-white/80 mb-6">
          Enter the 6-digit code sent to {location.state?.mobileNumber}
        </p>

        {/* OTP Input Boxes */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex justify-center gap-3 mb-8">
            {[...Array(6)].map((_, index) => (
              <input
                key={index}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={otp[index]}
                ref={(el) => (inputsRef.current[index] = el)}
                onChange={(e) => handleInput(e, index)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-xl font-semibold bg-[#171717] border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-[#4761E2] text-white"
                disabled={isSubmitting}
              />
            ))}
          </div>

          {/* Verify Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full ${isSubmitting ? 'bg-[#4761E2]/80' : 'bg-[#171717] hover:bg-[#4761E2]'} text-white border border-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </>
            ) : 'Verify OTP'}
          </button>
        </form>

        <div className="text-sm text-white/70">
          Didn't receive code?{' '}
          <button 
            className="text-[#4761E2] hover:underline"
            onClick={() => {
              // Add resend OTP logic here
              setOtp(['', '', '', '', '', '']);
              inputsRef.current[0].focus();
            }}
          >
            Resend OTP
          </button>
        </div>
      </div>

      {/* Add these styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}