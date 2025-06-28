import { useState, useRef } from "react";
import Webcam from "react-webcam";
import authRoutes from '../config/api';

export default function FaceRegistrationModal({ onClose, onSubmit }) {
  const webcamRef = useRef(null);
  const [step, setStep] = useState(1); // 1: email, 2: capture, 3: review, 4: success
  const [email, setEmail] = useState("");
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
    setStep(3); // Move to review step
  };

  const retake = () => {
    setImage(null);
    setStep(2); // Back to capture step
  };

  const checkEmailExists = async (email) => {
    try {
      setIsCheckingEmail(true);
      setError(null);
      
      const response = await fetch(`${authRoutes.checkUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mode: 'face' }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error checking email');
      }

      // If email exists, show the user exists screen
      if (data.exists) {
        setEmailExists(true);
        return false;
      }

      return true; // Email doesn't exist
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email");
      return;
    }
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    const emailAvailable = await checkEmailExists(email);
    if (emailAvailable) {
      setError(null);
      setEmailExists(false);
      setStep(2); // Move to capture step
    }
  };

  const handleBackToEmailCheck = () => {
    setEmailExists(false);
    setError(null);
    setEmail('');
  };

  const handleSubmit = async () => {
    if (!image) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Convert base64 image to blob
      const blob = await fetch(image).then(res => res.blob());
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      formData.append('email_id', email);
      
      // Call the face enrollment API
      const response = await fetch(`${authRoutes.faceRegister}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.status) {
        throw new Error(data.message || 'Face enrollment failed');
      }
      
      setSuccess(true);
      setStep(4); // Move to success step
      setTimeout(() => {
        onSubmit(data.user_id);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
      setStep(3); // Stay on review step if error
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#2A2828] rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">
            {emailExists ? 'User Exists' : 'Face Registration'}
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

        {isCheckingEmail && (
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="animate-spin h-8 w-8 text-[#4761E2]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4">Checking email...</p>
          </div>
        )}

        {error && !emailExists && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Email Exists Message - Same design as voice registration */}
        {emailExists && !isCheckingEmail && (
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

        {/* Email Input Form */}
        {step === 1 && !emailExists && !isCheckingEmail && (
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className="mb-1 text-sm">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2] transition-colors"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleEmailSubmit(e);
                  }
                }}
              />
            </div>

            <button
              onClick={handleEmailSubmit}
              disabled={isCheckingEmail}
              className="w-full bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Face Capture
            </button>
          </div>
        )}

        {/* Success Screen */}
        {step === 4 && (
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg">Face enrollment successful!</p>
            <p className="text-sm text-white/80 mt-2">You will be redirected shortly.</p>
          </div>
        )}

        {/* Webcam Capture */}
        {step === 2 && !emailExists && (
          <>
            <div className="mb-4 rounded-lg overflow-hidden">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="w-full h-auto"
              />
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={capture}
                className="bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Capture Photo
              </button>
            </div>
          </>
        )}
        
        {/* Review Captured Image */}
        {step === 3 && !emailExists && (
          <>
            <div className="mb-4 rounded-lg overflow-hidden">
              <img src={image} alt="Captured" className="w-full h-auto" />
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}
            
            <div className="flex justify-between gap-4">
              <button
                onClick={retake}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retake
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-[#4761E2] hover:bg-[#4761E2]/90 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Register with Face'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


//Version 2

// import { useState, useRef } from "react";
// import Webcam from "react-webcam";

// export default function FaceRegistrationModal({ onClose, onSubmit }) {
//   const webcamRef = useRef(null);
//   const [step, setStep] = useState(1); // 1: email, 2: capture, 3: review, 4: success
//   const [email, setEmail] = useState("");
//   const [image, setImage] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isCheckingEmail, setIsCheckingEmail] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(false);

//   const capture = () => {
//     const imageSrc = webcamRef.current.getScreenshot();
//     setImage(imageSrc);
//     setStep(3); // Move to review step
//   };

//   const retake = () => {
//     setImage(null);
//     setStep(2); // Back to capture step
//   };

//   const checkEmailExists = async (email) => {
//     try {
//       setIsCheckingEmail(true);
//       setError(null);
      
//       const response = await fetch('http://34.42.43.202:8009/check_user', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({ email, mode: 'face' }),
//       });

//       const data = await response.json();
      
//       if (!response.ok) {
//         throw new Error(data.message || 'Error checking email');
//       }

//       // Assuming API returns { exists: true/false }
//       if (data.exists) {
//         throw new Error('This email is already registered');
//       }

//       return true; // Email doesn't exist
//     } catch (err) {
//       setError(err.message);
//       return false;
//     } finally {
//       setIsCheckingEmail(false);
//     }
//   };

//   const handleEmailSubmit = async (e) => {
//     e.preventDefault();
//     if (!email) {
//       setError("Please enter your email");
//       return;
//     }
//     // Simple email validation
//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       setError("Please enter a valid email address");
//       return;
//     }

//     const emailAvailable = await checkEmailExists(email);
//     if (emailAvailable) {
//       setError(null);
//       setStep(2); // Move to capture step
//     }
//   };

//   const handleSubmit = async () => {
//     if (!image) return;
    
//     setIsSubmitting(true);
//     setError(null);
    
//     try {
//       // Convert base64 image to blob
//       const blob = await fetch(image).then(res => res.blob());
      
//       // Create form data
//       const formData = new FormData();
//       formData.append('image', blob, 'face.jpg');
//       formData.append('email_id', email);
      
//       // Call the face enrollment API
//       const response = await fetch('http://34.42.43.202:8009/face/enroll', {
//         method: 'POST',
//         body: formData
//       });
      
//       const data = await response.json();
      
//       if (!response.ok || !data.status) {
//         throw new Error(data.message || 'Face enrollment failed');
//       }
      
//       setSuccess(true);
//       setStep(4); // Move to success step
//       setTimeout(() => {
//         onSubmit(data.user_id);
//         onClose();
//       }, 1500);
//     } catch (err) {
//       setError(err.message);
//       setStep(3); // Stay on review step if error
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//       <div className="bg-[#2A2828] rounded-lg p-6 w-full max-w-md relative">
//         {/* Close button positioned at top-right corner of modal */}
//         <button
//           onClick={onClose}
//           className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         </button>

//         <h2 className="text-xl font-bold mb-4 pr-8">Face Registration</h2>
        
//         {step === 4 ? (
//           <div className="text-center py-8">
//             <div className="text-green-500 mb-4">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//             <p className="text-lg">Face enrollment successful!</p>
//             <p className="text-sm text-white/80 mt-2">You will be redirected shortly.</p>
//           </div>
//         ) : step === 1 ? (
//           <form onSubmit={handleEmailSubmit}>
//             <div className="mb-4">
//               <label htmlFor="email" className="block text-sm font-medium mb-2">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 id="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 className="w-full bg-[#171717] border border-[#333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#4761E2]"
//                 placeholder="Enter your email"
//               />
//               {error && (
//                 <div className="text-red-500 text-sm mt-2">{error}</div>
//               )}
//             </div>
//             <button
//               type="submit"
//               disabled={isCheckingEmail}
//               className="w-full bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors flex items-center justify-center gap-2"
//             >
//               {isCheckingEmail ? (
//                 <>
//                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                   </svg>
//                   Checking...
//                 </>
//               ) : (
//                 "Continue to Face Capture"
//               )}
//             </button>
//           </form>
//         ) : (
//           <>
//             {step === 2 && (
//               <div className="mb-4 rounded-lg overflow-hidden">
//                 <Webcam
//                   audio={false}
//                   ref={webcamRef}
//                   screenshotFormat="image/jpeg"
//                   videoConstraints={{ facingMode: "user" }}
//                   className="w-full h-auto"
//                 />
//               </div>
//             )}
            
//             {step === 3 && (
//               <>
//                 <div className="mb-4 rounded-lg overflow-hidden">
//                   <img src={image} alt="Captured" className="w-full h-auto" />
//                 </div>
//                 {error && (
//                   <div className="text-red-500 text-sm mb-4">{error}</div>
//                 )}
//               </>
//             )}
            
//             <div className="flex justify-between gap-4">
//               {step === 3 ? (
//                 <>
//                   <button
//                     onClick={retake}
//                     className="flex-1 bg-[#171717] text-white px-4 py-2 rounded hover:bg-[#333] transition-colors"
//                   >
//                     Retake
//                   </button>
//                   <button
//                     onClick={handleSubmit}
//                     disabled={isSubmitting}
//                     className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors flex items-center justify-center gap-2"
//                   >
//                     {isSubmitting ? (
//                       <>
//                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                         </svg>
//                         Processing...
//                       </>
//                     ) : (
//                       "Submit"
//                     )}
//                   </button>
//                 </>
//               ) : step === 2 ? (
//                 <button
//                   onClick={capture}
//                   className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors"
//                 >
//                   Capture Photo
//                 </button>
//               ) : null}
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }


//Version 1

// import { useState, useRef } from "react";
// import Webcam from "react-webcam";

// export default function FaceRegistrationModal({ onClose, onSubmit }) {
//   const webcamRef = useRef(null);
//   const [step, setStep] = useState(1); // 1: email, 2: capture, 3: success
//   const [email, setEmail] = useState("");
//   const [image, setImage] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(false);

//   const capture = () => {
//     const imageSrc = webcamRef.current.getScreenshot();
//     setImage(imageSrc);
//     setStep(3); // Move to review step
//   };

//   const retake = () => {
//     setImage(null);
//     setStep(2); // Back to capture step
//   };

//   const handleEmailSubmit = (e) => {
//     e.preventDefault();
//     if (!email) {
//       setError("Please enter your email");
//       return;
//     }
//     // Simple email validation
//     if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       setError("Please enter a valid email address");
//       return;
//     }
//     setError(null);
//     setStep(2); // Move to capture step
//   };

//   const handleSubmit = async () => {
//     if (!image) return;
    
//     setIsSubmitting(true);
//     setError(null);
    
//     try {
//       // Convert base64 image to blob
//       const blob = await fetch(image).then(res => res.blob());
      
//       // Create form data
//       const formData = new FormData();
//       formData.append('image', blob, 'face.jpg');
//       formData.append('email_id', email);
      
//       // Call the face enrollment API
//       const response = await fetch('http://34.42.43.202:8009/face/enroll', {
//         method: 'POST',
//         body: formData
//       });
      
//       const data = await response.json();
      
//       if (!response.ok || !data.status) {
//         throw new Error(data.message || 'Face enrollment failed');
//       }
      
//       setSuccess(true);
//       setStep(4); // Move to success step
//       setTimeout(() => {
//         onSubmit(data.user_id);
//         onClose();
//       }, 1500);
//     } catch (err) {
//       setError(err.message);
//       setStep(3); // Stay on review step if error
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//       <div className="bg-[#2A2828] rounded-lg p-6 w-full max-w-md">
//         <h2 className="text-xl font-bold mb-4">Face Registration</h2>
        
//         {step === 4 ? (
//           <div className="text-center py-8">
//             <div className="text-green-500 mb-4">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//             <p className="text-lg">Face enrollment successful!</p>
//             <p className="text-sm text-white/80 mt-2">You will be redirected shortly.</p>
//           </div>
//         ) : step === 1 ? (
//           <form onSubmit={handleEmailSubmit}>
//             <div className="mb-4">
//               <label htmlFor="email" className="block text-sm font-medium mb-2">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 id="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value)}
//                 className="w-full bg-[#171717] border border-[#333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#4761E2]"
//                 placeholder="Enter your email"
//               />
//               {error && (
//                 <div className="text-red-500 text-sm mt-2">{error}</div>
//               )}
//             </div>
//             <button
//               type="submit"
//               className="w-full bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors"
//             >
//               Continue to Face Capture
//             </button>
//           </form>
//         ) : (
//           <>
//             {step === 2 && (
//               <div className="mb-4 rounded-lg overflow-hidden">
//                 <Webcam
//                   audio={false}
//                   ref={webcamRef}
//                   screenshotFormat="image/jpeg"
//                   videoConstraints={{ facingMode: "user" }}
//                   className="w-full h-auto"
//                 />
//               </div>
//             )}
            
//             {step === 3 && (
//               <>
//                 <div className="mb-4 rounded-lg overflow-hidden">
//                   <img src={image} alt="Captured" className="w-full h-auto" />
//                 </div>
//                 {error && (
//                   <div className="text-red-500 text-sm mb-4">{error}</div>
//                 )}
//               </>
//             )}
            
//             <div className="flex justify-between gap-4">
//               {step === 3 ? (
//                 <>
//                   <button
//                     onClick={retake}
//                     className="flex-1 bg-[#171717] text-white px-4 py-2 rounded hover:bg-[#333] transition-colors"
//                   >
//                     Retake
//                   </button>
//                   <button
//                     onClick={handleSubmit}
//                     disabled={isSubmitting}
//                     className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors flex items-center justify-center gap-2"
//                   >
//                     {isSubmitting ? (
//                       <>
//                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
//                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
//                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
//                         </svg>
//                         Processing...
//                       </>
//                     ) : (
//                       "Submit"
//                     )}
//                   </button>
//                 </>
//               ) : step === 2 ? (
//                 <button
//                   onClick={capture}
//                   className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors"
//                 >
//                   Capture Photo
//                 </button>
//               ) : null}
//             </div>
//           </>
//         )}
        
//         <button
//           onClick={onClose}
//           className="mt-4 text-white/50 hover:text-white transition-colors absolute top-4 right-4"
//         >
//           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//           </svg>
//         </button>
//       </div>
//     </div>
//   );
// }