import { useState, useRef } from "react";
import Webcam from "react-webcam";
import authRoutes from "../config/api";

export default function FaceLoginModal({ onClose, onSubmit }) {
  const webcamRef = useRef(null);
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState("");
  const [alert, setAlert] = useState(null);
  const [step, setStep] = useState(1); // 1: Enter User ID, 2: Face Verification

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImage(imageSrc);
    setAlert(null);
  };

  const retake = () => {
    setImage(null);
    setAlert(null);
  };

  const handleUserIdSubmit = (e) => {
    e.preventDefault();
    if (!userId) {
      setAlert({
        type: "error",
        message: "Please enter your User ID"
      });
      return;
    }
    setStep(2); // Move to face verification step
  };



  const handleSubmit = async () => {
    if (!image) {
      setAlert({
        type: "error",
        message: "Please capture your face"
      });
      return;
    }
    
    setIsSubmitting(true);
    setAlert(null);
    
    try {
      const blob = await fetch(image).then(res => res.blob());
      const formData = new FormData();
      formData.append('image', blob, 'face.jpg');
      formData.append('user_id', userId);
      localStorage.setItem("userId", userId); // Store user ID for later use
      
      const response = await fetch(`${authRoutes.faceLogin}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      localStorage.setItem("accessToken", data.access_token);
      localStorage.setItem("refreshToken", data.refresh_token);
      
      if (!response.ok) {
        if (data.message === "Spoof detected") {
          setAlert({
            type: "error",
            message: "Spoof attempt detected. Please use a genuine face image."
          });
          throw new Error("Spoof detected");
        }
        throw new Error( 'Face verification failed');
      }

      if (!data.verification) {
        setAlert({
          type: "error",
          message: "Face verification failed. Please try again."
        });
        throw new Error("Face verification failed");
      }
      
      setAlert({
        type: "success",
        message: "Face verification successful!"
      });
      setSuccess(true);
      
      setTimeout(() => {
        onSubmit(data.user_id);
        onClose();
      }, 1500);
    } catch (err) {
      if (err.message !== "Spoof detected") {
        setAlert({
          type: "error",
          message: err.message || "An error occurred during verification"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#2A2828] rounded-lg p-6 w-full max-w-md relative">
        <h2 className="text-xl font-bold mb-4">Face Login</h2>
        
        {/* Alert Notification */}
        {alert && (
          <div className={`mb-4 p-3 rounded-lg border ${
            alert.type === "success" 
              ? "bg-green-900/30 border-green-500/30 text-green-400" 
              : "bg-red-900/30 border-red-500/30 text-red-400"
          } flex items-start gap-3`}>
            <div className={`p-1 rounded-full ${
              alert.type === "success" ? "bg-green-500/20" : "bg-red-500/20"
            }`}>
              {alert.type === "success" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm">{alert.message}</p>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg">Welcome back!</p>
            <p className="text-sm text-white/80 mt-2">Redirecting you to your dashboard...</p>
          </div>
        ) : step === 1 ? (
          <form onSubmit={handleUserIdSubmit}>
            <div className="mb-6">
              <label className="block text-sm mb-2">User ID (from registration)</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full p-3 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2]"
                placeholder="Enter your User ID"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[#4761E2] text-white px-4 py-3 rounded hover:bg-[#3a50c5] transition-colors"
            >
              Continue to Face Verification
            </button>
          </form>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-white/70 mb-1">Verifying User ID: <span className="font-medium text-white">{userId}</span></p>
            </div>
            
            <div className="mb-4 rounded-lg overflow-hidden relative">
              {image ? (
                <img src={image} alt="Captured" className="w-full h-auto" />
              ) : (
                <>
                  <Webcam
                    audio={false}
                    ref={webcamRef}
                    screenshotFormat="image/jpeg"
                    videoConstraints={{ facingMode: "user" }}
                    className="w-full h-auto"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-white/50 rounded-full w-48 h-48"></div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex justify-between gap-4">
              {image ? (
                <>
                  <button
                    onClick={retake}
                    className="flex-1 bg-[#171717] text-white px-4 py-2 rounded hover:bg-[#333] transition-colors"
                    disabled={isSubmitting}
                  >
                    Retake
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      "Verify"
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={capture}
                  className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors"
                >
                  Capture Photo
                </button>
              )}
            </div>
            
            <button
              onClick={() => setStep(1)}
              className="mt-4 text-white/50 hover:text-white text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to User ID
            </button>
          </>
        )}
        
        <button
          onClick={onClose}
          className="mt-4 text-white/50 hover:text-white transition-colors absolute top-4 right-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}



// import { useState, useRef } from "react";
// import Webcam from "react-webcam";

// export default function FaceLoginModal({ onClose, onSubmit }) {
//   const webcamRef = useRef(null);
//   const [image, setImage] = useState(null);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState(null);
//   const [success, setSuccess] = useState(false);
//   const [userId, setUserId] = useState("");
//   const [alert, setAlert] = useState(null);

//   const capture = () => {
//     const imageSrc = webcamRef.current.getScreenshot();
//     setImage(imageSrc);
//     setAlert(null); // Clear any previous alerts when capturing new image
//   };

//   const retake = () => {
//     setImage(null);
//     setAlert(null);
//   };

//   const handleSubmit = async () => {
//     if (!image || !userId) {
//       setAlert({
//         type: "error",
//         message: "Please capture your face and enter your User ID"
//       });
//       return;
//     }
    
//     setIsSubmitting(true);
//     setAlert(null);
    
//     try {
//       // Convert base64 image to blob
//       const blob = await fetch(image).then(res => res.blob());
      
//       // Create form data
//       const formData = new FormData();
//       formData.append('image', blob, 'face.jpg');
//       formData.append('user_id', userId);
      
//       // Call the face verify API
//       const response = await fetch('http://34.42.43.202:8009/face/verify', {
//         method: 'POST',
//         body: formData
//       });
      
//       const data = await response.json();
//       localStorage.setItem("accessToken", data.access_token);
//       localStorage.setItem("refreshToken", data.refresh_token);
      
//       if (!response.ok) {
//         // Handle spoof detection case
//         if (data.message === "Spoof detected") {
//           setAlert({
//             type: "error",
//             message: "Spoof Detected! Please use a real face image"
//           });
//           throw new Error("Spoof detected");
//         }
//         throw new Error(data.message || 'Face verification failed');
//       }

//       if (!data.verification) {
//         setAlert({
//           type: "error",
//           message: "Face verification failed. Please try again."
//         });
//         throw new Error("Face verification failed");
//       }
      
//       setAlert({
//         type: "success",
//         message: "Face verification successful!"
//       });
//       setSuccess(true);
      
//       setTimeout(() => {
//         onSubmit(data.user_id);
//         onClose();
//       }, 1500);
//     } catch (err) {
//       if (err.message !== "Spoof detected") {
//         setAlert({
//           type: "error",
//           message: err.message || "An error occurred during verification"
//         });
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
//       <div className="bg-[#2A2828] rounded-lg p-6 w-full max-w-md relative">
//         <h2 className="text-xl font-bold mb-4">Face Login</h2>
        
//         {/* Alert Notification */}
//         {alert && (
//           <div className={`mb-4 p-3 rounded-lg border ${
//             alert.type === "success" 
//               ? "bg-green-900/30 border-green-500/30 text-green-400" 
//               : "bg-red-900/30 border-red-500/30 text-red-400"
//           } flex items-start gap-3`}>
//             <div className={`p-1 rounded-full ${
//               alert.type === "success" ? "bg-green-500/20" : "bg-red-500/20"
//             }`}>
//               {alert.type === "success" ? (
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//                 </svg>
//               ) : (
//                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
//                 </svg>
//               )}
//             </div>
//             <div className="flex-1">
//               <p className="text-sm">{alert.message}</p>
//             </div>
//             <button
//               onClick={() => setAlert(null)}
//               className="text-white/50 hover:text-white transition-colors"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//               </svg>
//             </button>
//           </div>
//         )}

//         {success ? (
//           <div className="text-center py-8">
//             <div className="text-green-500 mb-4">
//               <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
//               </svg>
//             </div>
//             <p className="text-lg">Welcome back!</p>
//             <p className="text-sm text-white/80 mt-2">Redirecting you to your dashboard...</p>
//           </div>
//         ) : (
//           <>
//             <div className="mb-4">
//               <label className="block text-sm mb-2">User ID (from registration)</label>
//               <input
//                 type="text"
//                 value={userId}
//                 onChange={(e) => setUserId(e.target.value)}
//                 className="w-full p-2 rounded bg-[#171717] border border-white/10 text-white focus:border-[#4761E2] focus:ring-1 focus:ring-[#4761E2]"
//                 placeholder="Enter your User ID"
//               />
//             </div>
            
//             <div className="mb-4 rounded-lg overflow-hidden relative">
//               {image ? (
//                 <img src={image} alt="Captured" className="w-full h-auto" />
//               ) : (
//                 <>
//                   <Webcam
//                     audio={false}
//                     ref={webcamRef}
//                     screenshotFormat="image/jpeg"
//                     videoConstraints={{ facingMode: "user" }}
//                     className="w-full h-auto"
//                   />
//                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                     <div className="border-2 border-white/50 rounded-full w-48 h-48"></div>
//                   </div>
//                 </>
//               )}
//             </div>
            
//             <div className="flex justify-between gap-4">
//               {image ? (
//                 <>
//                   <button
//                     onClick={retake}
//                     className="flex-1 bg-[#171717] text-white px-4 py-2 rounded hover:bg-[#333] transition-colors"
//                     disabled={isSubmitting}
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
//                         Verifying...
//                       </>
//                     ) : (
//                       "Verify"
//                     )}
//                   </button>
//                 </>
//               ) : (
//                 <button
//                   onClick={capture}
//                   className="flex-1 bg-[#4761E2] text-white px-4 py-2 rounded hover:bg-[#3a50c5] transition-colors"
//                 >
//                   Capture Photo
//                 </button>
//               )}
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