import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const socket = io("http://localhost:3001");
const API = "http://localhost:3001/api/admin";

const AdminPanel = () => {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [activeTab, setActiveTab] = useState('game');
  const [crashPoint, setCrashPoint] = useState('');
  const [alertMsg, setAlertMsg] = useState('');
  const [isFlying, setIsFlying] = useState(false);
  
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);

  // API call ke liye headers config
  const authHeaders = { headers: { Authorization: token } };

  const fetchDeposits = async () => { 
    try {
      const res = await axios.get(`${API}/deposits`, authHeaders); 
      setDeposits(res.data); 
    } catch (err) { if(err.response?.status === 403) handleLogout(); }
  };
  
  const fetchWithdrawals = async () => { 
    try {
      const res = await axios.get(`${API}/withdrawals`, authHeaders); 
      setWithdrawals(res.data); 
    } catch (err) { if(err.response?.status === 403) handleLogout(); }
  };

  useEffect(() => {
    if (!token) return; // Agar login nahi hai toh kuch mat karo
    
    fetchDeposits(); 
    fetchWithdrawals();
    
    socket.on('gameState', (data) => setIsFlying(data.phase === 'flying'));
    socket.on('new-deposit', fetchDeposits);
    socket.on('new-withdraw', fetchWithdrawals);
    
    return () => { 
      socket.off('gameState'); socket.off('new-deposit'); socket.off('new-withdraw'); 
    };
  }, [token]);

  // Login Handler
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/login`, { username, password });
      localStorage.setItem('adminToken', res.data.token);
      setToken(res.data.token);
      setLoginError('');
    } catch (err) {
      setLoginError("Wrong Username or Password!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken(null);
  };

  // Action Handlers
  const handleSetCrash = async () => {
    if (!crashPoint) return;
    try {
      await axios.post(`${API}/set-crash`, { crashPoint }, authHeaders);
      setAlertMsg(`Next round will crash at ${crashPoint}x`);
      setCrashPoint('');
      setTimeout(() => setAlertMsg(''), 3000);
    } catch (err) { alert("Session expired, login again."); handleLogout(); }
  };

  const handleManualCrash = async () => {
    try {
      await axios.post(`${API}/manual-crash`, {}, authHeaders);
      setAlertMsg("Manual crash triggered!");
      setTimeout(() => setAlertMsg(''), 3000);
    } catch (err) { alert("Failed. Game might not be flying."); }
  };

  const handleDepositAction = async (id, action) => {
    await axios.post(`${API}/deposit-action`, { depositId: id, action }, authHeaders);
    fetchDeposits();
  };

  const handleWithdrawAction = async (id, action) => {
    if(action === 'approve' && !window.confirm("Have you sent the money?")) return;
    await axios.post(`${API}/withdraw-action`, { withdrawId: id, action }, authHeaders);
    fetchWithdrawals();
  };

  // ================= LOGIN SCREEN =================
  if (!token) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f1014', color: '#fff' }}>
        <form onSubmit={handleLogin} style={{ background: '#1a1b20', padding: '40px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '15px', width: '300px', border: '1px solid #333' }}>
          <h2 style={{ textAlign: 'center', color: '#ff0040', fontStyle: 'italic' }}>Admin Login</h2>
          
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: 'none' }} required />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '10px', borderRadius: '5px', border: 'none' }} required />
          
          {loginError && <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', margin: 0 }}>{loginError}</p>}
          
          <button type="submit" style={{ padding: '10px', background: '#22c55e', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>LOGIN</button>
        </form>
      </div>
    );
  }

  // ================= MAIN ADMIN PANEL =================
  const styles = {
    container: { display: 'flex', height: '100vh', background: '#0f1014', color: '#fff', fontFamily: 'Arial' },
    sidebar: { width: '250px', background: '#1a1b20', padding: '20px', borderRight: '1px solid #333' },
    tab: { padding: '15px', cursor: 'pointer', borderRadius: '8px', marginBottom: '10px', background: '#252830' },
    activeTab: { background: '#ff0040', fontWeight: 'bold' },
    content: { flex: 1, padding: '30px', overflowY: 'auto' },
    card: { background: '#1a1b20', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #333' },
    input: { padding: '10px', fontSize: '16px', borderRadius: '5px', border: 'none', marginRight: '10px', outline: 'none' },
    btnGreen: { padding: '10px 20px', background: '#22c55e', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    btnRed: { padding: '10px 20px', background: '#ef4444', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
    th: { textAlign: 'left', padding: '10px', borderBottom: '1px solid #444', color: '#888' },
    td: { padding: '10px', borderBottom: '1px solid #222' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={{ color: '#ff0040', marginBottom: '30px', fontStyle: 'italic' }}>CRASH-X Admin</h2>
        <div style={{ ...styles.tab, ...(activeTab === 'game' ? styles.activeTab : {}) }} onClick={() => setActiveTab('game')}>🎮 Game Control</div>
        <div style={{ ...styles.tab, ...(activeTab === 'deposits' ? styles.activeTab : {}) }} onClick={() => setActiveTab('deposits')}>💰 Deposits ({deposits.length})</div>
        <div style={{ ...styles.tab, ...(activeTab === 'withdrawals' ? styles.activeTab : {}) }} onClick={() => setActiveTab('withdrawals')}>🏦 Withdrawals ({withdrawals.length})</div>
        
        <button onClick={handleLogout} style={{ ...styles.btnRed, width: '100%', marginTop: '30px' }}>Logout</button>
      </div>

      <div style={styles.content}>
        {activeTab === 'game' && (
          <div>
            <h1>Game Control</h1>
            <div style={styles.card}>
              <h3>Force Next Crash</h3>
              <input type="number" step="0.1" placeholder="e.g. 2.5" value={crashPoint} onChange={(e) => setCrashPoint(e.target.value)} style={{ ...styles.input, width: '150px' }} />
              <button style={styles.btnGreen} onClick={handleSetCrash}>SET CRASH</button>
            </div>
            <div style={{ ...styles.card, border: '1px solid #ef4444' }}>
              <h3 style={{ color: '#ef4444' }}>Emergency Manual Crash</h3>
              <button style={{ ...styles.btnRed, fontSize: '18px', padding: '15px 40px', width: '100%', opacity: isFlying ? 1 : 0.5 }} onClick={handleManualCrash} disabled={!isFlying}>🚨 CRASH NOW</button>
            </div>
            {alertMsg && <div style={{ color: '#22c55e', marginTop: '15px', fontWeight: 'bold' }}>{alertMsg}</div>}
          </div>
        )}

        {activeTab === 'deposits' && (
          <div>
            <h1>Pending Deposits</h1>
            <div style={styles.card}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>User</th><th style={styles.th}>Amount</th><th style={styles.th}>UTR</th><th style={styles.th}>Action</th></tr></thead>
                <tbody>
                  {deposits.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#555' }}>No pending deposits</td></tr>}
                  {deposits.map(d => (
                    <tr key={d.id}>
                      <td style={styles.td}>{d.userId}</td>
                      <td style={{ ...styles.td, color: '#22c55e', fontWeight: 'bold' }}>₹{d.amount}</td>
                      <td style={styles.td}><span style={{ background: '#333', padding: '4px 8px', borderRadius: '4px' }}>{d.utr}</span></td>
                      <td style={styles.td}>
                        <button style={{ ...styles.btnGreen, padding: '6px 12px', marginRight: '10px' }} onClick={() => handleDepositAction(d.id, 'approve')}>Approve</button>
                        <button style={{ ...styles.btnRed, padding: '6px 12px' }} onClick={() => handleDepositAction(d.id, 'reject')}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div>
            <h1>Pending Withdrawals</h1>
            <div style={styles.card}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>User</th><th style={styles.th}>Amount</th><th style={styles.th}>UPI ID</th><th style={styles.th}>Action</th></tr></thead>
                <tbody>
                  {withdrawals.length === 0 && <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#555' }}>No pending withdrawals</td></tr>}
                  {withdrawals.map(w => (
                    <tr key={w.id}>
                      <td style={styles.td}>{w.userId}</td>
                      <td style={{ ...styles.td, color: '#ef4444', fontWeight: 'bold' }}>₹{w.amount}</td>
                      <td style={styles.td}><span style={{ background: '#333', padding: '4px 8px', borderRadius: '4px' }}>{w.upiId}</span></td>
                      <td style={styles.td}>
                        <button style={{ ...styles.btnGreen, padding: '6px 12px', marginRight: '10px' }} onClick={() => handleWithdrawAction(w.id, 'approve')}>Paid & Approve</button>
                        <button style={{ ...styles.btnRed, padding: '6px 12px' }} onClick={() => handleWithdrawAction(w.id, 'reject')}>Reject (Refund)</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;