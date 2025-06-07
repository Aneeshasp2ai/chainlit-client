import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid or missing reset token');
      setShowError(true);
      // Optionally redirect after showing error
      setTimeout(() => navigate('/forgot-password'), 3000);
    }
  }, [token, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
          confirmPassword: formData.confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }

      // On success
      setShowSuccess(true);
      setShowError(false);
      
      // Redirect to login after delay
      setTimeout(() => navigate('/login'), 2000);
      
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. Please try again.');
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
              <h3 className="font-medium">Password Reset Successful!</h3>
              <p className="text-sm text-white/80 mt-1">Redirecting to login page...</p>
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
              <h3 className="font-medium">Reset Failed</h3>
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
          <h2 className="text-[24px] font-medium mt-4">Reset Password</h2>
          <p className="text-[16px] text-white/80 mt-2">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
          {/* New Password */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className={`p-3 rounded bg-[#171717] border ${
                errors.newPassword ? 'border-red-500' : 'border-white/10'
              } text-white placeholder-white/50 focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
              placeholder="Enter new password"
            />
            {errors.newPassword && (
              <span className="text-red-500 text-xs mt-1">{errors.newPassword}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`p-3 rounded bg-[#171717] border ${
                errors.confirmPassword ? 'border-red-500' : 'border-white/10'
              } text-white placeholder-white/50 focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
              placeholder="Re-enter new password"
            />
            {errors.confirmPassword && (
              <span className="text-red-500 text-xs mt-1">{errors.confirmPassword}</span>
            )}
          </div>

          {/* Reset Button */}
          <button
            type="submit"
            disabled={isSubmitting || !token}
            className={`mt-4 ${
              isSubmitting ? 'bg-[#4761E2]/80' : 'bg-[#171717] hover:bg-[#4761E2]'
            } text-white border border-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
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