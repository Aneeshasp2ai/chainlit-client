import { Link } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import authRoutes from '../../config/api'
import healthcareVideo from './Doctor.mp4' 

export default function Home() {
  const [isGuestLoginLoading, setIsGuestLoginLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
    const videoRef = useRef(null)
  const navigate = useNavigate()

  const handleGuestLogin = async () => {
    setIsGuestLoginLoading(true)
    setShowError(false)

    try {
      const response = await fetch(
        `${authRoutes.guestLogin}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Guest login failed")
      }

      // Store authentication data
      localStorage.setItem("accessToken", data.data.accessToken)
      localStorage.setItem("refreshToken", data.data.refreshToken)
      localStorage.setItem("userId", data.data.userId)
      localStorage.setItem("FullName", data.data.FullName || "Guest User")

      setShowSuccess(true)
      setTimeout(() => navigate("/thread/:threadId"), 3000)
    } catch (err) {
      setErrorMessage(err.message || "Guest login failed. Please try again.")
      setShowError(true)
    } finally {
      setIsGuestLoginLoading(false)
    }
  }

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
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      {/* Success Alert */}
      {showSuccess && (
        <div className="absolute top-4 right-4 animate-fade-in z-50">
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
              <h3 className="font-medium">Guest Login Successful!</h3>
              <div className="w-full bg-gray-700 rounded-full h-1 mt-2">
                <div 
                  className="bg-green-500 h-1 rounded-full animate-[progress_3s_linear_forwards]"
                  style={{ width: '0%' }}
                ></div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowSuccess(false)
                navigate("/thread/:threadId")
              }}
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

      {/* Main Content */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center md:items-stretch md:justify-between border-white/10 rounded-2xl overflow-hidden relative z-10">
        {/* Left Section */}
        <div className="flex-1 p-6 sm:p-8 md:p-12 text-center md:text-left">
          <h1 className="text-[32px] sm:text-[40px] md:text-[60px] font-medium leading-tight mb-6">
            Empowering <br />
            <span className="whitespace-nowrap">Healthcare with AI</span>
          </h1>
          <p className="text-[18px] sm:text-[20px] md:text-[30px] font-normal leading-snug">
            Experience the future of medical assistance with our AI-powered platform for doctors and patients.
          </p>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px bg-white/50 mx-4"></div>

        {/* Right Section */}
        <div className="flex-1 p-6 sm:p-8 md:p-12 flex flex-col justify-center items-center md:items-start text-center md:text-left">
          <p className="text-[16px] sm:text-[18px] md:text-[24px] font-normal mb-6 max-w-md">
            Login or Register to explore intelligent health tools built for both patients and medical professionals.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center md:justify-start">
            <Link to="/Login">
              <button className="w-full sm:w-auto md:w-[200px] bg-[#4761E2] hover:bg-[#171717] text-white border border-transparent hover:border-white px-6 py-3 rounded-lg transition-colors duration-300">
                Login
              </button>
            </Link>
            <Link to="/Register">
              <button className="w-full sm:w-auto md:w-[200px] bg-[#171717] border border-white text-white hover:bg-[#4761E2] px-6 py-3 rounded-lg transition-colors duration-300">
                Register
              </button>
            </Link>
          </div>
          
          {/* Guest Login Button */}
          <div className="mt-6 w-full flex justify-center">
            <button 
              onClick={handleGuestLogin}
              disabled={isGuestLoginLoading}
              className="w-full sm:w-auto md:w-[200px] bg-transparent border border-white/50 text-white hover:bg-white/10 px-6 py-3 rounded-lg transition-colors duration-300 flex items-center justify-center"
            >
              {isGuestLoginLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                "Continue as Guest"
              )}
            </button>
          </div>
          
          {/* Error Message */}
          {showError && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-500 rounded-lg text-red-300 flex items-start">
              <svg className="h-5 w-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium">Something went wrong</h4>
                <p className="text-sm mt-1">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}