import { NODE_API, FACE_API_V1, VOICE_API_V1, CHAINLIT_AUTH } from "./baseUrl";

const authRoutes = {
  register: `${NODE_API}/api/v1/auth/register`,
  login: `${NODE_API}/api/v1/auth/login`,
  guestLogin: `${NODE_API}/api/v1/auth/guest-login`,
  verifyOtp: `${NODE_API}/api/v1/auth/verify-otp`,
  forgotPassword: `${NODE_API}/api/v1/auth/forgot-password`,
  resendOtp: `${NODE_API}/api/v1/auth/reset-password`,
  logout: `${NODE_API}/api/v1/auth/logout`,

    faceRegister: `${FACE_API_V1 }/face/enroll`,
    faceLogin: `${FACE_API_V1 }/face/verify`,
    voiceRegister: `${VOICE_API_V1 }/regional-voice/enroll`, 
    voiceLogin: `${VOICE_API_V1 }/regional-voice/verify`,
    checkUser: `${FACE_API_V1 }/check_user`,
    detectLanguage: `${VOICE_API_V1 }/regional-voice/detect-language`,

  chainlitAuth: `${CHAINLIT_AUTH}/custom-auth`,
};

export default authRoutes;
