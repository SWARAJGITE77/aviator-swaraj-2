import React, { useState } from 'react';
import axios from 'axios';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState(''); 
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMsg({ text: '', type: '' });
    
    try {
      const url = isLogin ? 'http://localhost:3001/api/auth/login' : 'http://localhost:3001/api/auth/register';
      
      // Agar Signup hai toh mobile bhi bhejo, warna sirf email-password
      const payload = isLogin ? { email, password } : { email, mobile, password };
      
      const res = await axios.post(url, payload);
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('userId', res.data.userId);
      
      onLogin(res.data.userId);
      
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Something went wrong", type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f1014' }}>
      <div style={{ background: '#1a1b20', padding: '40px', borderRadius: '12px', width: '350px', border: '1px solid #333', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        <h1 style={{ color: '#ff0040', fontStyle: 'italic', fontSize: '32px', marginBottom: '30px' }}>CRASH-X</h1>
        
        <h3 style={{ margin: '0 0 20px 0', color: '#fff' }}>{isLogin ? 'Login to Play' : 'Create an Account'}</h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#252830', color: '#fff', outline: 'none' }}
          />

          {/* Mobile Number Input (Sirf Signup par dikhega) */}
          {!isLogin && (
            <input 
              type="tel" 
              placeholder="Mobile Number (10 digits)" 
              value={mobile} 
              onChange={e => setMobile(e.target.value)} 
              required 
              minLength="10" 
              maxLength="10" 
              pattern="[0-9]{10}" 
              title="10 digit mobile number dalo"
              style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#252830', color: '#fff', outline: 'none' }}
            />
          )}

          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '6px', border: '1px solid #333', background: '#252830', color: '#fff', outline: 'none' }}
          />
          
          <button 
            type="submit" 
            disabled={loading} 
            style={{ padding: '12px', background: '#22c55e', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', marginTop: '10px' }}
          >
            {loading ? 'Please wait...' : (isLogin ? 'LOGIN' : 'SIGN UP')}
          </button>
        </form>

        {msg.text && <div style={{ marginTop: '15px', color: '#ef4444', fontSize: '13px' }}>{msg.text}</div>}

        <p style={{ marginTop: '20px', color: '#888', fontSize: '13px' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            onClick={() => { setIsLogin(!isLogin); setMsg({text:'', type:''}); }} 
            style={{ color: '#22c55e', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;