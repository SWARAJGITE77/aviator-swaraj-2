import React, { useState, useEffect } from 'react';
import { io } from "socket.io-client";
import axios from 'axios';
import WalletModal from './WalletModal';
import AuthPage from './AuthPage'; // Auth Page import kiya
import './App.css';

const socket = io("https://aviator-backend-zrmq.onrender.com");

function App() {
  // Local storage se user check karo
  const [userId, setUserId] = useState(localStorage.getItem('userId') || null);
  const [balance, setBalance] = useState(0);
  const [showWallet, setShowWallet] = useState(false);
  
  const [wagerInfo, setWagerInfo] = useState({ remainingWager: 0 });
  const [toastMsg, setToastMsg] = useState('');

  const [gameState, setGameState] = useState({ phase: 'waiting', multiplier: 1.0, crashAt: 0, countdown: 5.0 });
  const [history, setHistory] = useState([6.35, 1.07, 7.39, 1.81, 1.16, 8.22, 1618.63, 2.89, 9.03]);
  const [crashFlash, setCrashFlash] = useState(false);

  const [amounts, setAmounts] = useState([10, 10]);
  const [bets, setBets] = useState([null, null]);
  const [activeTabs, setActiveTabs] = useState([0, 0]);
  const [autoCashouts, setAutoCashouts] = useState([false, false]);
  const [autoCashoutValues, setAutoCashoutValues] = useState([0, 0]);
  const [livePlayers, setLivePlayers] = useState([]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get(`https://aviator-backend-zrmq.onrender.com/api/user/balance/${userId}`);
      setBalance(res.data.balance);
      setWagerInfo({ remainingWager: res.data.remainingWager });
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    if (!userId) return; // Agar login nahi hai toh kuch mat karo
    
    fetchUserData();

    socket.on("gameState", (data) => {
      setGameState(data);
      if (data.phase === 'crashed') {
        setCrashFlash(true);
        setTimeout(() => setCrashFlash(false), 600);
        setHistory(old => [data.crashAt, ...old].slice(0, 23));
        setLivePlayers(old => old.map(p => p.cashedOut ? p : { ...p, lost: true }));
      }
    });

    socket.on("roundReset", () => {
      setBets([null, null]);
      setLivePlayers([]);
    });

    socket.on("balanceUpdated", (data) => {
      if (data.userId === userId) setBalance(data.newBalance);
    });

    socket.on("wagerUpdated", (data) => {
      if (data.userId === userId) setWagerInfo({ remainingWager: data.remainingWager });
    });

    return () => { 
      socket.off("gameState"); 
      socket.off("roundReset"); 
      socket.off("balanceUpdated"); 
      socket.off("wagerUpdated"); 
    };
  }, [userId]);

  // Auto Cashout Logic
  useEffect(() => {
    if (gameState.phase !== 'flying' || !userId) return;
    [0, 1].forEach(async (i) => {
      const bet = bets[i];
      if (bet && !bet.cashedOut && autoCashouts[i] && autoCashoutValues[i] > 0 && gameState.multiplier >= autoCashoutValues[i]) {
        const win = +(bet.amount * autoCashoutValues[i]).toFixed(2);
        
        setBets(old => old.map((bt, idx) => idx === i ? null : bt));
        
        try {
          await axios.post('https://aviator-backend-zrmq.onrender.com/api/user/cashout', { userId, winAmount: win });
        } catch (err) { console.log(err); }
      }
    });
  }, [gameState.multiplier, gameState.phase, bets, autoCashouts, autoCashoutValues, userId]);

  // Live players simulation
  useEffect(() => {
    if (gameState.phase !== 'flying') return;
    const timer = setInterval(() => {
      setLivePlayers(old => {
        let updated = [...old];
        updated = updated.map(p => {
          if (!p.cashedOut && !p.lost && gameState.multiplier >= p.targetOut) {
            return { ...p, cashedOut: true, win: +(p.bet * p.targetOut).toFixed(2), outAt: p.targetOut };
          }
          return p;
        });
        if (Math.random() < 0.3 && updated.length < 25) {
          updated.unshift({
            id: Date.now() + Math.random(), name: `d***${Math.floor(Math.random()*9)}`,
            bet: +(10 + Math.random() * 200).toFixed(2), targetOut: +(1.2 + Math.random() * 5).toFixed(2),
            cashedOut: false, lost: false, win: 0,
          });
        }
        return updated.slice(0, 25);
      });
    }, 400);
    return () => clearInterval(timer);
  }, [gameState.phase]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2000); 
  };

  const changeAmount = (index, value) => {
    if (bets[index] || gameState.phase !== 'waiting') return;
    if (value < 10) { showToast("Minimum bet amount is ₹10"); return; }
    if (value > 8000) { showToast("Maximum bet amount reached (₹8,000)"); return; }
    setAmounts(old => old.map((a, i) => i === index ? value : a));
  };

  const placeBet = async (index) => {
    if (!userId) return;
    const amount = amounts[index];
    if (gameState.phase !== 'waiting' || bets[index] || amount > balance) return;
    
    setBets(old => old.map((b, i) => i === index ? { amount, cashedOut: false, win: 0 } : b));
    
    try {
      await axios.post('https://aviator-backend-zrmq.onrender.com/api/user/track-bet', { userId, amount });
    } catch (err) {
      console.log("Error tracking bet", err);
      fetchUserData(); 
    }
  };

  const cashOut = async (index) => {
    if (!userId) return;
    const bet = bets[index];
    if (gameState.phase !== 'flying' || !bet || bet.cashedOut) return;
    
    const winnings = +(bet.amount * gameState.multiplier).toFixed(2);
    
    setBets(old => old.map((b, i) => i === index ? null : b));

    try {
      await axios.post('https://aviator-backend-zrmq.onrender.com/api/user/cashout', { userId, winAmount: winnings });
    } catch (err) {
      console.log("Error cashing out", err);
      fetchUserData(); 
    }
  };

  // AGAR USER LOGIN NAHI HAI TOH AUTHPAGE DIKHAO
  if (!userId) {
    return <AuthPage onLogin={(id) => setUserId(id)} />;
  }

  const { phase, multiplier, crashAt, countdown } = gameState;
  const progress = phase === 'waiting' || crashAt <= 1 ? 0 : Math.max(0, Math.min(1, (multiplier - 1) / (crashAt - 1)));
  
  const planeX = 5 + progress * 88;
  const heightMultiplier = Math.max(1, Math.log(crashAt) / Math.log(2.5)); 
  const maxPlaneHeight = Math.min(82, 82 * heightMultiplier);
  const planeY = 95 - Math.pow(progress, 1.6) * maxPlaneHeight;

  const cp1x = 5 + progress * 20;
  const cp1y = 95 - progress * (95 - planeY) * 0.2; 
  const cp2x = 5 + progress * 60;
  const cp2y = 95 - progress * (95 - planeY) * 0.8; 

  const curvePath = `M 5 95 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${planeX} ${planeY}`;
  const fillPath = `${curvePath} L ${planeX} 100 L 5 100 Z`;
  
  const dx = planeX - cp2x;
  const dy = cp2y - planeY;
  const planeAngle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div className="aviator-app">
      {toastMsg && <div className="toast-popup">⚠️ {toastMsg}</div>}

      <header className="header">
        <div className="logo">CRASH-X</div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          <button onClick={() => setShowWallet(true)} style={{ background: '#22c55e', border: 'none', color: '#000', padding: '6px 15px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Wallet
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span className="balance" style={{ fontSize: '16px' }}>₹{balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            
            {wagerInfo.remainingWager > 0 && (
              <span style={{ fontSize: '10px', color: '#facc15', fontWeight: 'bold', marginTop: '-2px' }}>
                Wager Remaining: ₹{wagerInfo.remainingWager.toFixed(2)}
              </span>
            )}
          </div>

          <span className="menu-icon" style={{ cursor: 'pointer' }} onClick={() => {
            localStorage.removeItem('userId');
            localStorage.removeItem('token');
            setUserId(null);
          }}>Logout</span>
        </div>
      </header>

      {showWallet && (
        <WalletModal 
          userId={userId} 
          currentBalance={balance} 
          wagerInfo={wagerInfo} 
          onClose={() => { setShowWallet(false); fetchUserData(); }} 
        />
      )}

      <div className="history-bar">
        {history.map((value, i) => (
          <span key={i} className={`history-item ${value < 2 ? 'blue' : value < 10 ? 'violet' : 'darkpink'}`}>{value.toFixed(2)}x</span>
        ))}
      </div>

      <div className="main-content">
        <aside className="sidebar">
          <div className="sidebar-tabs"><button className="active">All Bets</button><button>Previous</button><button>Top</button></div>
          <div className="table-header"><span>Player</span><span>Bet ₹</span><span>X</span><span>Win ₹</span></div>
          <div className="players-list">
            {livePlayers.map(p => (
              <div className={`player-row ${p.cashedOut ? 'winner' : p.lost ? 'loser' : ''}`} key={p.id}>
                <span className="player-name"><span className="avatar-sm">👤</span> {p.name}</span>
                <span>{p.bet.toFixed(2)}</span>
                <span className="multiplier-col">{p.cashedOut ? `${p.outAt.toFixed(2)}x` : ''}</span>
                <span className="win-col">{p.cashedOut ? p.win.toFixed(2) : ''}</span>
              </div>
            ))}
          </div>
        </aside>

        <main className="game-area">
          <div className="game-canvas">
            <div className="bg-rays"></div>
            {crashFlash && <div className="crash-flash"></div>}
            <div className="graph-container">
              <svg className="graph-svg" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs><linearGradient id="redGradient" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#e50019" stopOpacity="0.8" /><stop offset="100%" stopColor="#5c000c" stopOpacity="0.9" /></linearGradient></defs>
                {progress > 0 && (
                  <><path d={fillPath} fill="url(#redGradient)" /><path d={curvePath} fill="none" stroke="#ff003c" strokeWidth="1.5" strokeLinecap="round" /></>
                )}
              </svg>

              {phase === 'flying' && (
                <div className="airplane" style={{ left: `${planeX}%`, top: `${planeY}%`, transform: `translate(-50%, -100%) rotate(${planeAngle}deg)`, transformOrigin: 'bottom center' }}>
                   <svg className="plane-svg" viewBox="0 0 120 80" width="90" height="60">
                    <path d="M 5 60 L 15 65 L 40 65 L 50 50 L 70 55 L 95 55 L 110 45 L 105 30 L 85 30 L 65 20 L 45 30 L 20 35 L 10 40 Z" fill="#e50019" />
                    <path d="M 15 40 L 30 40 L 35 25 L 20 25 Z" fill="#e50019" />
                    <path d="M 85 38 L 95 45 M 95 38 L 85 45" stroke="#000" strokeWidth="3" strokeLinecap="round" />
                    <path d="M 65 30 L 75 30 L 70 20 Z" fill="#000" />
                    <circle cx="112" cy="38" r="3" fill="#e50019" />
                    <g className="plane-propeller"><path d="M 112 38 C 108 15, 115 10, 118 5 C 115 20, 114 30, 112 38 Z" fill="#e50019" /><path d="M 112 38 C 108 61, 115 66, 118 71 C 115 56, 114 46, 112 38 Z" fill="#e50019" /></g>
                  </svg>
                </div>
              )}

              <h1 className="multiplier-text">
                {phase === 'waiting' && <span style={{ fontSize: '45px', color: '#facc15', fontWeight: 'bold' }}>Starts in {countdown !== undefined ? countdown.toFixed(1) : '5.0'}s</span>}
                {phase === 'flying' && <>{multiplier.toFixed(2)}x</>}
                {phase === 'crashed' && <span className="crashed-text">FLEW AWAY! {multiplier.toFixed(2)}x</span>}
              </h1>
            </div>
          </div>

          <div className="control-panel">
            {[0, 1].map(index => {
              const bet = bets[index];
              const canCashOut = phase === 'flying' && bet && !bet.cashedOut;
              return (
                <div className="bet-controls" key={index}>
                  <div className="tabs">
                    <button className={activeTabs[index] === 0 ? 'active' : ''} onClick={() => setActiveTabs(old => old.map((v, i) => i === index ? 0 : v))}>Bet</button>
                    <button className={activeTabs[index] === 1 ? 'active' : ''} onClick={() => setActiveTabs(old => old.map((v, i) => i === index ? 1 : v))}>Auto</button>
                  </div>
                  <div className="bet-input-area">
                    <div className="input-row">
                      <button className="circle-btn" onClick={() => changeAmount(index, amounts[index] - 10)} disabled={!!bet || phase !== 'waiting'}>-</button>
                      <span className="amount-display">{amounts[index].toFixed(2)}</span>
                      <button className="circle-btn" onClick={() => changeAmount(index, amounts[index] + 10)} disabled={!!bet || phase !== 'waiting'}>+</button>
                    </div>
                    <div className="quick-bets">
                      {[10, 100, 500, 1000, 8000].map(value => (
                        <button key={value} onClick={() => changeAmount(index, value)} disabled={!!bet || phase !== 'waiting'}>{value}</button>
                      ))}
                    </div>
                    {activeTabs[index] === 1 && (
                      <div className="auto-cashout-row" style={{ width: '100%', marginTop: '8px' }}>
                        <div className="auto-cashout-input">
                          <label>Auto Cash Out</label>
                          <input 
                            type="text" 
                            placeholder="2.0"
                            value={autoCashoutValues[index] === 0 ? '' : autoCashoutValues[index]} 
                            onChange={e => {
                              const val = e.target.value;
                              const numVal = val === '' ? 0 : parseFloat(val);
                              setAutoCashoutValues(old => old.map((v, i) => i === index ? numVal : v));
                              setAutoCashouts(old => old.map((v, i) => i === index ? true : v));
                            }} 
                            onBlur={() => {
                              if (autoCashoutValues[index] === 0 || isNaN(autoCashoutValues[index])) {
                                setAutoCashoutValues(old => old.map((v, i) => i === index ? 2.00 : v));
                              }
                            }}
                          />
                          <span>x</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {canCashOut ? (
                    <button className="bet-btn cashout-btn" onClick={() => cashOut(index)}>CASH OUT<br /><span>₹{(bet.amount * multiplier).toFixed(2)}</span></button>
                  ) : (
                    <button className="bet-btn" onClick={() => placeBet(index)} disabled={phase !== 'waiting' || !!bet}>
                      {bet ? 'BET PLACED' : phase === 'waiting' ? 'BET' : 'WAIT'}
                      <br /><span>₹{amounts[index].toFixed(2)}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
export default App;