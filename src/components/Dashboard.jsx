import React from 'react';

export default function Dashboard({ userPhoto, userName, setView, koalaImg }) {
  return (
    <div className="modern-dashboard locked-dashboard">
      <header className="modern-header">
        <img src={userPhoto} alt="User Profile" className="modern-avatar" />
        <h1>Hi {userName}</h1>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-title">Weekly goal</span>
          <div className="stat-value">
            <strong>78</strong> <span className="stat-sub">/120 min</span>
          </div>
          <div className="progress-ring"></div>
        </div>

        <div className="stat-card">
          <span className="stat-title">Days until TCF</span>
          <div className="stat-value">
            <strong>24</strong> <span className="stat-sub">(10.3.2026)</span>
          </div>
        </div>
      </div>

      <div className="calendar-strip">
        {[
          { day: 'MON', num: '6' }, { day: 'TUE', num: '7' },
          { day: 'WED', num: '8', dot: true }, { day: 'THU', num: '9', active: true },
          { day: 'FRI', num: '10' }, { day: 'SAT', num: '11' }, { day: 'SUN', num: '12' }
        ].map((d, i) => (
          <div key={i} className={`cal-item ${d.active ? 'active' : ''}`}>
            <span className="cal-day">{d.day}</span>
            <strong className="cal-num">{d.num}</strong>
            {d.dot && <div className="cal-dot"></div>}
          </div>
        ))}
      </div>

      <div className="hero-section">
        <img src={koalaImg} alt="Mascot" className="hero-mascot" />
        <h2>READY TO LEARN?</h2>
        <button className="start-now-btn" onClick={() => setView('vocabulary')}>
          START NOW
        </button>
      </div>
    </div>
  );
}