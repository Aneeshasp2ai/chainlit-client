import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import VoiceRegistrationModal from "../../components/VoiceRegistrationModal";
import FaceRegistrationModal from "../../components/FaceRegistrationModal";
import DoctorImg from "./Doctor-Img-Photoroom.png";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    address: "",
    medicalConditions: "",
    currentMedications: "",
    allergies: "",
    password: "",
    consent: false,
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);

  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    if (!formData.phoneNumber.trim())
      newErrors.phoneNumber = "Phone number is required";
    if (!formData.dateOfBirth)
      newErrors.dateOfBirth = "Date of birth is required";
    if (!formData.gender) newErrors.gender = "Gender is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (!formData.consent) newErrors.consent = "You must give consent";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // First check if email exists
      const checkResponse = await fetch("http://34.42.43.202:8009/check_user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, mode: "form" }),
      });

      const checkData = await checkResponse.json();


      if (!checkResponse.ok) {
        throw new Error(checkData.message || "Failed to check email");
        
      }
     

      // If email exists, throw error
      if (checkData.exists) {
        throw new Error("This email is already registered");
      }

      // If email doesn't exist, proceed with registration
      const response = await fetch(
        "http://localhost:5000/api/v1/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle API validation errors
        if (data.errors) {
          const apiErrors = {};
          data.errors.forEach((err) => {
            apiErrors[err.path] = err.msg;
          });
          setErrors(apiErrors);
          throw new Error("Please fix the errors in the form");
        }
        throw new Error(data.message || "Registration failed");
      }

      // On success
      setShowSuccess(true);
      setShowError(false);
      // Reset form
      setFormData({
        fullName: "",
        email: "",
        phoneNumber: "",
        dateOfBirth: "",
        gender: "",
        address: "",
        medicalConditions: "",
        currentMedications: "",
        allergies: "",
        password: "",
        consent: false,
      });
    } catch (err) {
      // On error
      setErrorMessage(err.message || "Registration failed. Please try again.");
      setShowError(true);
      setShowSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceRegistration = (email) => {
    // Here you can handle the voice registration with the provided email
    console.log("Voice registration with email:", email);
    setShowVoiceModal(false);
    // You might want to show a success message or redirect
  };

  const handleFaceRegistration = (userId) => {
    console.log("Face registration successful with user ID:", userId);
    // You might want to store the user ID or navigate to login
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center p-4 relative">
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
              <h3 className="font-medium">Registration Successful!</h3>
              <p className="text-sm text-white/80 mt-1">
                Your account has been created successfully. You can now login.
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
              <h3 className="font-medium">Registration Failed</h3>
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
          {/* Healthcare AI Icon/Image */}
          <div className="mb-8 flex justify-center md:justify-start">
            <img
              src={DoctorImg}
              alt="Healthcare AI"
              className="w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 lg:w-96 lg:h-96  object-cover transition-all duration-300 hover:scale-105"
            />
          </div>

          <h1 className="text-[36px] sm:text-[48px] md:text-[60px] font-medium leading-tight mb-6">
            Your Health, Enhanced by AI
          </h1>
          <p className="text-[20px] sm:text-[24px] md:text-[30px] font-normal leading-snug max-w-xl mx-auto md:mx-0">
            Secure, smart, and simple. Begin your journey with cutting-edge
            medical insights at your fingertips.
          </p>
        </div>

        {/* Right Section / Form Card */}
        <div className="flex-1 p-6 sm:p-8 md:p-12">
          <div className="bg-[#2A2828] p-6 sm:p-8 rounded-2xl shadow-lg">
            <h2 className="text-[16px] font-bold mb-6">Register</h2>
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {/* Left Column */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={`p-2 rounded bg-[#171717] border ${
                    errors.fullName ? "border-red-500" : "border-white/10"
                  } text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                />
                {errors.fullName && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.fullName}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`p-2 rounded bg-[#171717] border ${
                    errors.email ? "border-red-500" : "border-white/10"
                  } text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                />
                {errors.email && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.email}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <label className="mb-1 text-sm">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className={`p-2 rounded bg-[#171717] border ${
                    errors.phoneNumber ? "border-red-500" : "border-white/10"
                  } text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                />
                {errors.phoneNumber && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.phoneNumber}
                  </span>
                )}
              </div>

              {/* Password Field */}
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

              {/* Enhanced Date Picker */}
              <div className="flex flex-col relative">
                <label className="mb-1 text-sm">Date of Birth</label>
                <div className="relative">
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    className={`p-2 rounded bg-[#171717] border ${
                      errors.dateOfBirth ? "border-red-500" : "border-white/10"
                    } text-white w-full appearance-none focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </span>
                </div>
                {errors.dateOfBirth && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.dateOfBirth}
                  </span>
                )}
              </div>

              {/* Enhanced Gender Selector */}
              <div className="flex flex-col">
                <label className="mb-1 text-sm">Gender</label>
                <div className="relative">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className={`p-2 rounded bg-[#171717] border ${
                      errors.gender ? "border-red-500" : "border-white/10"
                    } text-white w-full appearance-none focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors`}
                  >
                    <option value="" disabled>
                      Select Gender
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-white/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                {errors.gender && (
                  <span className="text-red-500 text-xs mt-1">
                    {errors.gender}
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:col-span-2">
                <label className="mb-1 text-sm">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="mb-1 text-sm">Medical Conditions</label>
                <input
                  type="text"
                  name="medicalConditions"
                  value={formData.medicalConditions}
                  onChange={handleChange}
                  className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="mb-1 text-sm">Current Medications</label>
                <input
                  type="text"
                  name="currentMedications"
                  value={formData.currentMedications}
                  onChange={handleChange}
                  className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <label className="mb-1 text-sm">Allergies</label>
                <input
                  type="text"
                  name="allergies"
                  value={formData.allergies}
                  onChange={handleChange}
                  className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
                />
              </div>
              {/* Consent Checkbox */}
              <div className="flex items-start gap-2 sm:col-span-2 mt-2">
                <input
                  type="checkbox"
                  id="consent-checkbox"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  className={`mt-1 h-4 w-4 text-[#4761E2] bg-[#171717] ${
                    errors.consent ? "border-red-500" : "border-white/10"
                  } rounded focus:ring-[#4761E2] focus:ring-offset-[#171717]`}
                />
                <label
                  htmlFor="consent-checkbox"
                  className="text-sm cursor-pointer"
                >
                  I consent to the processing of my personal data
                </label>
              </div>
              {errors.consent && (
                <span className="text-red-500 text-xs -mt-2 sm:col-span-2">
                  {errors.consent}
                </span>
              )}

              {/* Register Button */}
              <div className="sm:col-span-2 mt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full ${
                    isSubmitting
                      ? "bg-[#4761E2]/80"
                      : "bg-[#171717] hover:bg-[#4761E2]"
                  } text-white border border-white px-6 py-3 rounded-lg transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#4761E2] focus:ring-offset-2 focus:ring-offset-[#2A2828] flex items-center justify-center gap-2`}
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
                      Processing...
                    </>
                  ) : (
                    "Register"
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
                  Voice Registration
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
                  Face Registration
                </button>
              </div>
            </form>
            {/* Already have account */}
            <div className="text-center text-sm mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-[#4761E2] underline hover:text-white transition-colors"
              >
                Login here
              </Link>
            </div>
          </div>
        </div>
        {showVoiceModal && (
          <VoiceRegistrationModal
            onClose={() => setShowVoiceModal(false)}
            onSubmit={handleVoiceRegistration}
          />
        )}
        {showFaceModal && (
          <FaceRegistrationModal
            onClose={() => setShowFaceModal(false)}
            onSubmit={handleFaceRegistration}
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
