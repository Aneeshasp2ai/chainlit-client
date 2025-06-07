import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ForgotPassword() {
   const [identifier, setIdentifier] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState(''); // Added this line
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    const newErrors = {};
    if (!identifier.trim()) {
      newErrors.identifier = 'Email is required';
    } else if (
      !/^\S+@\S+\.\S+$/.test(identifier) && 
      !/^[0-9]{10,15}$/.test(identifier)
    ) {
      newErrors.identifier = 'Please enter a valid email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset instructions');
      }

      // Set appropriate success message based on identifier type
      const message = /^\S+@\S+\.\S+$/.test(identifier)
        ? 'Check your email for password reset instructions.'
        : 'Check your mobile for OTP to reset your password.';
      
      setSuccessMessage(message);
      setShowSuccess(true);
      setShowError(false);
      setIdentifier('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to send reset instructions. Please try again.');
      setShowError(true);
      setShowSuccess(false);
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
              <h3 className="font-medium">Reset Instructions Sent!</h3>
              <p className="text-sm text-white/80 mt-1">
                {successMessage}
              </p>
            </div>
            <button 
              onClick={() => setShowSuccess(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
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
              <h3 className="font-medium">Error Sending Reset</h3>
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

      <div className="w-full max-w-md bg-[#2A2828] p-6 sm:p-8 rounded-2xl shadow-lg">
        <div className="text-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-[#4761E2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-[24px] font-medium mt-4">Forgot Password</h2>
          <p className="text-[16px] text-white/80 mt-2">
            Enter your email  to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col">
            <input
              type="text"
              name="identifier"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) {
                  setErrors({ ...errors, identifier: '' });
                }
              }}
              placeholder="Email"
              className={`p-3 rounded bg-[#171717] border ${errors.identifier ? 'border-red-500' : 'border-white/10'} text-white placeholder-white/50 focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
            />
            {errors.identifier && (
              <span className="text-red-500 text-xs mt-1 text-left">{errors.identifier}</span>
            )}
          </div>

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
                Sending...
              </>
            ) : 'Reset'}
          </button>
        </form>

        <div className="text-center text-sm mt-6">
          Remember your password?{' '}
          <Link to="/login" className="text-[#4761E2] hover:text-white font-bold transition-colors">
            Login here
          </Link>
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