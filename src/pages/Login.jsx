import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Login = () => {
  const navigate = useNavigate();
  const {
    currentUser,
    isAuthLoading,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    registerName,
    setRegisterName,
    registerEmail,
    setRegisterEmail,
    registerPhone,
    setRegisterPhone,
    registerPassword,
    setRegisterPassword,
    registerAvatar,
    setRegisterAvatar,
    fileInputRefRegister,
    handleImageUpload,
    handleLogin,
    handleRegister
  } = useApp();

  const [isLogin, setIsLogin] = React.useState(true);

  // Redirect to home if already logged in
  React.useEffect(() => {
    if (currentUser && !isAuthLoading) {
      navigate('/home');
    }
  }, [currentUser, isAuthLoading, navigate]);

  const onLogin = async () => {
    const success = await handleLogin();
    if (success) {
      navigate('/home');
    }
  };

  const onRegister = async () => {
    const success = await handleRegister();
    if (success) {
      navigate('/home');
    }
  };

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white opacity-20"
              style={{
                width: Math.random() * 4 + 1 + 'px',
                height: Math.random() * 4 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%'
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
            <div className="flex items-center justify-center mb-8">
              <div className="bg-orange-500 p-4 rounded-2xl mr-4">
                <div className="w-12 h-12 border-4 border-white rounded-lg" />
              </div>
              <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">CUBERS</h1>
            </div>

            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 rounded-xl font-semibold ${
                  isLogin 
                    ? 'bg-slate-200 text-slate-900 hover:bg-white' 
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                Log In
              </button>
              <button 
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 rounded-xl font-semibold ${
                  !isLogin 
                    ? 'bg-slate-200 text-slate-900 hover:bg-white' 
                    : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                Register
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden">
                  {registerAvatar ? (
                    <img src={registerAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-slate-400" />
                  )}
                </div>
                <button 
                  onClick={() => fileInputRefRegister.current?.click()}
                  className="px-6 py-2 rounded-xl bg-slate-600 text-slate-200 hover:bg-slate-500"
                >
                  Upload
                </button>
                <input
                  ref={fileInputRefRegister}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e.target.files?.[0], true)}
                  className="hidden"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-2">Name :</label>
                <input
                  type="text"
                  placeholder="Eg : Kishnan"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-600/50 text-slate-200 placeholder-slate-400 border border-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-2">Email :</label>
                <input
                  type="email"
                  placeholder="Eg : example@gmail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-600/50 text-slate-200 placeholder-slate-400 border border-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-slate-200 mb-2">Phone number :</label>
                <input
                  type="tel"
                  placeholder="+91"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-600/50 text-slate-200 placeholder-slate-400 border border-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>
              
              <div>
                <label className="block text-slate-200 mb-2">Password :</label>
                <input
                  type="password"
                  placeholder="Eg : Krish@123"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-600/50 text-slate-200 placeholder-slate-400 border border-slate-500 focus:outline-none focus:border-blue-400"
                />
              </div>

              <button 
                onClick={onRegister}
                className="w-full py-3 rounded-xl bg-slate-200 text-slate-900 font-semibold hover:bg-white transition"
              >
                Register
              </button>

              <p className="text-center text-slate-300">
                All Ready have an account ? <button onClick={() => setIsLogin(true)} className="text-white font-semibold">Log in</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white opacity-20"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animation: `twinkle ${Math.random() * 5 + 3}s infinite`
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-orange-500 p-4 rounded-2xl mr-4">
              <div className="w-12 h-12 border-4 border-white rounded-lg" />
            </div>
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">CUBERS</h1>
          </div>

          <div className="flex gap-4 mb-6">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-xl font-semibold ${
                isLogin 
                  ? 'bg-slate-200 text-slate-900 hover:bg-white' 
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              Log In
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-xl font-semibold ${
                !isLogin 
                  ? 'bg-slate-200 text-slate-900 hover:bg-white' 
                  : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              Register
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-slate-200 mb-2">Email :</label>
              <input
                type="email"
                placeholder="Eg : example@gmail.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-600/50 text-slate-200 placeholder-slate-400 border border-slate-500 focus:outline-none focus:border-blue-400"
              />
            </div>
            
            <div>
              <label className="block text-slate-200 mb-2">Password :</label>
              <input
                type="password"
                placeholder="Eg : Krish@123"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-600/50 text-slate-200 placeholder-slate-400 border border-slate-500 focus:outline-none focus:border-blue-400"
              />
            </div>

            <button 
              onClick={onLogin}
              className="w-full py-3 rounded-xl bg-slate-200 text-slate-900 font-semibold hover:bg-white transition"
            >
              Log In
            </button>

            <p className="text-center text-slate-300">
              Create a new account ? <button onClick={() => setIsLogin(false)} className="text-white font-semibold">Register</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
