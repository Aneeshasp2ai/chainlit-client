import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { sessionState, useChatSession } from "@chainlit/react-client";
import { useRecoilValue } from "recoil";
import { ChainlitUI } from "./components/ChainlitUI";
import Home from "./pages/Home/Home";
import Register from "./pages/Register/Register";
import Login from "./pages/Login/Login";
import ForgotPassword from "./pages/ForgotPassword/ForgotPassword";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import OTPVerification from "./pages/OTPVerify/OtpVerification";

const userEnv = {};

function App() {
  // const { connect } = useChatSession();
  // const session = useRecoilValue(sessionState);
  
  // useEffect(() => {
  //   if (session?.socket.connected) {
  //     return;
  //   }
    
  //   fetch("http://localhost:80/custom-auth", {
  //     credentials: "include"
  //   })
  //   .then(() => {
  //     connect({
  //       userEnv
  //     });
  //   });
  // }, [connect]);

  return (
    <Router>
      <Routes>
        <Route path="/thread/:threadId" element={<ChainlitUI />} />
        <Route path="/" element={<Home />} />
        <Route path="/Register" element={<Register />} />
        <Route path="/Login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/otp-verify" element={<OTPVerification />} />
      </Routes>
    </Router>
  );
}

export default App;