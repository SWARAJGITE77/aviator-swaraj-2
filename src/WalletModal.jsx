import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WalletModal = ({ userId, currentBalance, onClose }) => {
  const [activeTab, setActiveTab] = useState('deposit');
  
  const [depAmount, setDepAmount] = useState('');
  const [utr, setUtr] = useState('');
  
  const [withdrawMode, setWithdrawMode] = useState('UPI');
  const [withAmount, setWithAmount] = useState('');
  const [upiId, setUpiId] = useState(''); 
  const [bankDetails, setBankDetails] = useState({ accountNo: '', ifsc: '', name: '' });
  
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // WAGER INFO
  const [wagerInfo, setWagerInfo] = useState({ totalDeposited: 0, totalWagered: 0, remainingWager: 0 });

  const adminUpiAccounts = [
    { id: 1, name: "Scanner 1 (Primary)", upi: "swaraj.196@fam" }, 
    { id: 2, name: "Scanner 2 (Alternate)", upi: "8459840496@ptsbi" }
  ];

  const [selectedUpi, setSelectedUpi] = useState(adminUpiAccounts[0]);
  const [dynamicQr, setDynamicQr] = useState('');

  useEffect(() => {
    axios.get(`https://aviator-swaraj1.onrender.com/api/user/balance/${userId}`)
      .then(res => {
        setWagerInfo({
          totalDeposited: res.data.totalDeposited || 0,
          totalWagered: res.data.totalWagered || 0,
          remainingWager: res.data.remainingWager || 0
        });
      })
      .catch(err => console.log(err));
  }, [userId]);

  useEffect(() => {
    if (depAmount && depAmount >= 100 && depAmount <= 50000) {
      const upiString = `upi://pay?pa=${selectedUpi.upi}&pn=Admin&am=${depAmount}&cu=INR`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}`;
      setDynamicQr(qrUrl);
    } else {
      setDynamicQr(''); 
    }
  }, [depAmount, selectedUpi]);

  const handleDeposit = async (e) => {
    e.preventDefault(); 
    if (depAmount < 100) return setMsg({ text: "Minimum deposit is ₹100", type: 'error' });
    if (depAmount > 50000) return setMsg({ text: "Maximum deposit is ₹50,000", type: 'error' });
    if (!dynamicQr) return setMsg({ text: "Please enter valid amount", type: 'error' });
    
    setLoading(true); setMsg({ text: '', type: '' });
    try {
      const res = await axios.post('https://aviator-swaraj1.onrender.com/api/user/deposit', { 
        userId, amount: depAmount, utr, upiUsed: selectedUpi.upi 
      });
      setMsg({ text: res.data.msg, type: 'success' });
      setDepAmount(''); setUtr('');
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Error", type: 'error' });
    }
    setLoading(false);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault(); 
    setLoading(true); setMsg({ text: '', type: '' });

    if (withdrawMode === 'UPI' && withAmount < 200) {
      setMsg({ text: "Minimum UPI withdrawal is ₹200", type: 'error' }); setLoading(false); return;
    }
    if (withdrawMode === 'BANK' && withAmount < 100) {
      setMsg({ text: "Minimum Bank withdrawal is ₹100", type: 'error' }); setLoading(false); return;
    }
    if (withdrawMode === 'BANK' && (!bankDetails.accountNo || !bankDetails.ifsc || !bankDetails.name)) {
      setMsg({ text: "Please fill all bank details", type: 'error' }); setLoading(false); return;
    }
    if (withdrawMode === 'UPI' && !upiId) {
      setMsg({ text: "Please enter your UPI ID", type: 'error' }); setLoading(false); return;
    }

    try {
      const res = await axios.post('https://aviator-swaraj1.onrender.com/api/user/withdraw', { 
        userId, amount: withAmount, withdrawMode, 
        upiId: withdrawMode === 'UPI' ? upiId : null,
        bankDetails: withdrawMode === 'BANK' ? bankDetails : null
      });
      setMsg({ text: res.data.msg, type: 'success' });
      setWithAmount(''); setUpiId(''); setBankDetails({ accountNo: '', ifsc: '', name: '' });
      
      const info = await axios.get(`https://aviator-swaraj1.onrender.com/api/user/balance/${userId}`);
      setWagerInfo({
        totalDeposited: info.data.totalDeposited || 0,
        totalWagered: info.data.totalWagered || 0,
        remainingWager: info.data.remainingWager || 0
      });
      
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Error", type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#1a1b20', padding: 25, borderRadius: 12, width: 340, color: '#fff', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Wallet (₹{currentBalance})</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✖</button>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setActiveTab('deposit')} style={{ flex: 1, padding: 10, background: activeTab === 'deposit' ? '#22c55e' : '#2a2b30', color: activeTab === 'deposit' ? '#000' : '#aaa', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Deposit</button>
          <button onClick={() => setActiveTab('withdraw')} style={{ flex: 1, padding: 10, background: activeTab === 'withdraw' ? '#ef4444' : '#2a2b30', color: activeTab === 'withdraw' ? '#fff' : '#aaa', border: 'none', borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>Withdraw</button>
        </div>

        {activeTab === 'deposit' ? (
          <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* ... deposit wala form same rahega ... */}
            <select onChange={(e) => setSelectedUpi(adminUpiAccounts.find(a => a.id === +e.target.value))} style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff', cursor: 'pointer' }}>
              {adminUpiAccounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
            </select>

            <input type="number" placeholder="Enter Amount (₹100 - ₹50,000)" value={depAmount} onChange={e => setDepAmount(e.target.value)} min="100" max="50000" required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />

            <div style={{ textAlign: 'center', background: '#fff', padding: 15, borderRadius: 8, minHeight: '190px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              {dynamicQr ? (
                <>
                  <img src={dynamicQr} alt="QR" style={{ width: 160, height: 160, objectFit: 'contain' }} />
                  <p style={{ color: '#000', margin: '10px 0 0 0', fontSize: 13, fontWeight: 'bold' }}>Scan to Pay ₹{depAmount}</p>
                </>
              ) : (<p style={{ color: '#888', fontSize: 13, margin: 0 }}>Enter amount to generate QR Scanner</p>)}
            </div>

            <input type="text" placeholder="12-Digit UTR / Ref No." value={utr} onChange={e => setUtr(e.target.value)} required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />
            
            <button type="submit" disabled={loading || !dynamicQr} style={{ padding: 12, background: dynamicQr ? '#22c55e' : '#2a2b30', color: dynamicQr ? '#000' : '#666', fontWeight: 'bold', border: 'none', borderRadius: 6, cursor: dynamicQr ? 'pointer' : 'not-allowed' }}>Submit Deposit</button>
          </form>
        ) : (
          <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
             
             {/* UPDATED WAGERING INFO DISPLAY */}
             <div style={{ background: 'rgba(255,170,0,0.1)', border: '1px solid rgba(255,170,0,0.3)', padding: 10, borderRadius: 6, marginBottom: 5 }}>
               <p style={{ margin: 0, fontSize: 12, color: '#ffaa00', fontWeight: 'bold' }}>Wagering Requirement</p>
               
               {wagerInfo.totalDeposited === 0 ? (
                 <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#ccc' }}>
                   You need to deposit first. Then bet 80% of your deposit to unlock withdrawals.
                 </p>
               ) : wagerInfo.remainingWager > 0 ? (
                 <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#ccc' }}>
                   You need to place bets of <b style={{color: '#fff'}}>₹{wagerInfo.remainingWager.toFixed(2)}</b> more to unlock withdrawal.
                 </p>
               ) : (
                 <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#4ade80', fontWeight: 'bold' }}>
                   ✅ Wagering Complete! You can withdraw now.
                 </p>
               )}
             </div>

             <p style={{ margin: '0 0 5px 0', fontSize: 14, color: '#aaa' }}>Balance: <b style={{color: '#22c55e'}}>₹{currentBalance}</b></p>
             
             <select value={withdrawMode} onChange={e => setWithdrawMode(e.target.value)} style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff', cursor: 'pointer' }}>
               <option value="UPI">Withdraw via UPI</option>
               <option value="BANK">Withdraw via Bank Account</option>
             </select>

             <input type="number" placeholder={`Amount (Min ₹${withdrawMode === 'UPI' ? '200' : '100'})`} value={withAmount} onChange={e => setWithAmount(e.target.value)} min={withdrawMode === 'UPI' ? 200 : 100} required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />
             
             {withdrawMode === 'UPI' ? (
                <input type="text" placeholder="Enter Your UPI ID" value={upiId} onChange={e => setUpiId(e.target.value)} required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />
             ) : (
                <>
                  <input type="text" placeholder="Account Holder Name" value={bankDetails.name} onChange={e => setBankDetails({...bankDetails, name: e.target.value})} required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />
                  <input type="text" placeholder="Account Number" value={bankDetails.accountNo} onChange={e => setBankDetails({...bankDetails, accountNo: e.target.value})} required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />
                  <input type="text" placeholder="IFSC Code" value={bankDetails.ifsc} onChange={e => setBankDetails({...bankDetails, ifsc: e.target.value})} required style={{ padding: 12, borderRadius: 6, border: '1px solid #333', background: '#252830', color: '#fff' }} />
                </>
             )}
             
             <p style={{ margin: '5px 0 0 0', fontSize: 11, color: '#ffaa00', textAlign: 'center' }}>Daily Withdrawal Limit: ₹30,000</p>

             <button type="submit" disabled={loading} style={{ padding: 12, background: '#ef4444', color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: '5px' }}>Request Withdraw</button>
          </form>
        )}

        {msg.text && <div style={{ marginTop: 15, padding: 12, borderRadius: 6, textAlign: 'center', background: msg.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: msg.type === 'success' ? '#4ade80' : '#ef4444', fontSize: 13 }}>{msg.text}</div>}
      </div>
    </div>
  );
};

export default WalletModal;