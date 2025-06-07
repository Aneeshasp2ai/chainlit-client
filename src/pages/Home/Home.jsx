import {Link} from 'react-router-dom'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#171717] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col md:flex-row items-center md:items-stretch md:justify-between border-white/10 rounded-2xl overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}
