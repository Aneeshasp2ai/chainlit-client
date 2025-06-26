
import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import VoiceLoginModal from "../../components/VoiceLoginModal";
import FaceLoginModal from "../../components/FaceLoginModal";
import healthcareVideo from './Baby-Doctor.mp4' 


export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
      const videoRef = useRef(null)

  // Add this function to handle voice login submission
  const handleVoiceLogin = (speakerId) => {
    // Here you can handle the voice login with the provided speakerId
    console.log("Voice login with speaker ID:", speakerId);
    setShowVoiceModal(false);
    // You might want to show a success message or redirect
  };

  const handleFaceLogin = (userId) => {
    console.log("Face login successful for user ID:", userId);
    // You can store the user ID or navigate to dashboard
    navigate("/thread/:threadId");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }

    // Detect if input is email or mobile
    if (name === "identifier") {
      const isEmail = /^\S+@\S+\.\S+$/.test(value);
      setIsEmailLogin(isEmail);
      if (!isEmail) {
        setErrors((prev) => ({ ...prev, password: "" }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.identifier.trim()) {
      newErrors.identifier = "Email or mobile number is required";
    } else if (isEmailLogin && !/^\S+@\S+\.\S+$/.test(formData.identifier)) {
      newErrors.identifier = "Email is invalid";
    } else if (!isEmailLogin && !/^\+[0-9]{10,15}$/.test(formData.identifier)) {
      newErrors.identifier =
        "Mobile number should include country code (e.g., +917356189747)";
    }

    if (isEmailLogin && !formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const requestData = {
        identifier: formData.identifier,
      };

      if (isEmailLogin) requestData.password = formData.password;

      const response = await fetch("http://localhost:5000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          const apiErrors = {};
          data.errors.forEach((err) => {
            apiErrors[err.path] = err.msg;
          });
          setErrors(apiErrors);
          throw new Error("Please fix the errors in the form");
        }
        throw new Error(data.message || "Login failed");
      }

      console.log("Login response:", data.data.needsOTP, isEmailLogin);
      // Handle OTP case (mobile login OR backend explicitly says OTP is needed)
      if (!isEmailLogin || data?.data?.needsOTP) {
        console.log("Attempting navigation to /otp-verify");
        navigate("/otp-verify", {
          state: {
            mobileNumber: formData.identifier,
            // Include any other data needed for OTP verification
          },
        });

        // Add this to verify navigation occurred
        setTimeout(() => {
          console.log(
            "Current path after navigation:",
            window.location.pathname
          );
        }, 100);
        return; // Exit early to avoid email login logic
      }

      // Handle email login success (only if no OTP is needed)
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);
      localStorage.setItem("userId", data.data.userId);
      localStorage.setItem("FullName", data.data.FullName);

      setShowSuccess(true);
      setTimeout(() => navigate("/thread/:threadId"), 1500);
    } catch (err) {
      setErrorMessage(err.message || "Login failed. Please try again.");
      setShowError(true);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center p-4 relative">
      
       {/* Video Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <video
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover opacity-30" // Reduced opacity for better text readability
              >
                <source src={healthcareVideo} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              {/* Dark overlay to improve text contrast */}
              <div className="absolute inset-0 bg-black/40"></div>
            </div>
      {/* Success Toast */}
      {showSuccess && (
        <div className="absolute top-4 right-4 z-50 animate-fade-in">
          <div className="bg-[#2A2828] border border-green-500/30 rounded-lg shadow-lg p-4 flex items-start gap-3 w-full max-w-md">
            <div className="bg-green-500/20 p-2 rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Login Successful!</h3>
              <p className="text-sm text-white/80 mt-1">
                {isEmailLogin
                  ? "Welcome back! Redirecting you to your dashboard..."
                  : "OTP sent to your mobile number. Please verify to continue."}
              </p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Login Failed</h3>
              <p className="text-sm text-white/80 mt-1">{errorMessage}</p>
            </div>
            <button
              onClick={() => setShowError(false)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center md:items-stretch md:justify-between border-white/10 rounded-2xl overflow-hidden">
        {/* Left Section */}
        <div className="flex-1 p-6 sm:p-8 md:p-12 text-center md:text-left flex flex-col justify-center">
          <h1 className="text-[36px] sm:text-[48px] md:text-[60px] font-medium leading-tight mb-6">
            Experience the Future of Healthcare
          </h1>
          <p className="text-[20px] sm:text-[24px] md:text-[30px] font-normal leading-snug max-w-xl mx-auto md:mx-0">
            Secure access to AI-driven medical insights and tools.
          </p>
        </div>

        {/* Right Section / Login Card */}
        <div className="flex-1 p-6 sm:p-8 md:p-12">
          <div className="bg-[#2A2828] p-6 sm:p-8 rounded-2xl shadow-lg">
            <h2 className="text-[16px] font-bold mb-6">Login</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Email/Mobile */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm">
                  {isEmailLogin ? "Email" : "Mobile Number / Email"}
                </label>
                <input
                  type={isEmailLogin ? "email" : "tel"}
                  name="identifier"
                  value={formData.identifier}
                  onChange={handleChange}
                  placeholder={
                    isEmailLogin ? "example@domain.com" : "+91XXXXXXXXXX"
                  }
                  className={`p-2 rounded bg-[#171717] border ${
                    errors.identifier ? "border-red-500" : "border-white/10"
                  } text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                />

                {errors.identifier && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.identifier ===
                    "Mobile number should include country code (e.g., +917356189747)"
                      ? "Please include country code (e.g., +91XXXXXXXXXX)"
                      : errors.identifier}
                  </span>
                )}
              </div>
              {/* Password (only shown for email login) */}
              {isEmailLogin && (
                <div className="flex flex-col">
                  <label className="mb-1 text-sm">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`p-2 rounded bg-[#171717] border ${
                      errors.password ? "border-red-500" : "border-white/10"
                    } text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                  />
                  {errors.password && (
                    <span className="text-red-500 text-xs mt-1">
                      {errors.password}
                    </span>
                  )}
                </div>
              )}
              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full ${
                  isSubmitting
                    ? "bg-[#4761E2]/80"
                    : "bg-[#171717] hover:bg-[#4761E2]"
                } text-white border border-white px-6 py-3 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2`}
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    {isEmailLogin ? "Logging in..." : "Sending OTP..."}
                  </>
                ) : isEmailLogin ? (
                  "Login"
                ) : (
                  "Send OTP"
                )}
              </button>
             

              <button
                type="button"
                onClick={() => setShowVoiceModal(true)}
                className="w-full bg-[#171717] hover:bg-[#4761E2] text-white border border-white/30 px-6 py-3 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 mt-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
                Voice Login
              </button>

              <button
                type="button"
                onClick={() => setShowFaceModal(true)}
                className="w-full bg-[#171717] hover:bg-[#4761E2] text-white border border-white/30 px-6 py-3 rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 mt-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Face Login
              </button>
              {/* Forgot Password (only shown for email login) */}
              {isEmailLogin && (
                <div className="text-right text-sm mt-2">
                  <Link
                    to="/forgot-password"
                    className="text-white/70 hover:text-white underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </form>
             {/* Already have account */}
            <div className="text-center text-sm mt-6">
              New User?{" "}
              <Link
                to="/register"
                className="text-[#4761E2] underline hover:text-white transition-colors"
              >
                Register here
              </Link>
            </div>
          </div>
        </div>

        {showVoiceModal && (
          <VoiceLoginModal
            onClose={() => setShowVoiceModal(false)}
            onSubmit={handleVoiceLogin}
          />
        )}

        {showFaceModal && (
          <FaceLoginModal
            onClose={() => setShowFaceModal(false)}
            onSubmit={handleFaceLogin}
          />
        )}
      </div>

      {/* Add these styles for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
