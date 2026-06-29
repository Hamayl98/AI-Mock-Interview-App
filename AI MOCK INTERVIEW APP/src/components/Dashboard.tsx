// Dashboard.tsx
import { motion } from 'motion/react';
import { Play, History, TrendingUp, Settings, Lightbulb, LogOut, Clock, BarChart2 } from 'lucide-react';
import type { UserProfile, InterviewSession } from '../App';

interface DashboardProps {
  user: UserProfile;
  sessions: InterviewSession[];
  onStartInterview: () => void;
  onViewHistory: () => void;
  onViewAnalytics: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const tips = [
  "Practice the STAR method: Situation, Task, Action, Result",
  "Make eye contact and smile - body language matters!",
  "Research the company before your interview",
  "Prepare questions to ask the interviewer",
  "Practice speaking slowly and clearly"
];

function computeStats(sessions: InterviewSession[]) {
  const total = sessions.length;

  if (total === 0) {
    return {
      completed: 0,
      avgScore: 0,
      improvement: 0,
      hasHistory: false,
    };
  }

  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + s.score, 0) / total
  );

  const sortedAsc = [...sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const firstScore  = sortedAsc[0].score;
  const latestScore = sortedAsc[sortedAsc.length - 1].score;
  const improvement = total >= 2 ? latestScore - firstScore : 0;

  return { completed: total, avgScore, improvement, hasHistory: true };
}

export default function Dashboard({
  user,
  sessions,
  onStartInterview,
  onViewHistory,
  onViewAnalytics,
  onOpenSettings,
  onSignOut,
}: DashboardProps) {
  const todayTip = tips[Math.floor(Math.random() * tips.length)];
  const { completed, avgScore, improvement, hasHistory } = computeStats(sessions);

  const completedSub =
    completed === 0 ? 'Start your first!' :
    completed < 3   ? 'Keep going!' :
    completed < 8   ? 'Great streak!' : 'Interview pro!';

  const scoreSub =
    avgScore === 0  ? 'No data yet'      :
    avgScore >= 85  ? 'Excellent!'        :
    avgScore >= 70  ? 'Great progress!'   :
    avgScore >= 55  ? 'Keep practising!'  : 'Needs work';

  const stats = [
    {
      icon: Clock,
      label: 'Interviews Completed',
      value: String(completed),
      sub: completedSub,
      color: '#6C7FF2',
      bg: '#EEF0FD',
    },
    {
      icon: BarChart2,
      label: 'Average Score',
      value: avgScore === 0 ? '—' : `${avgScore}%`,
      sub: scoreSub,
      color: '#4CAF82',
      bg: '#E8F7EF',
    },
  ];

  const sortedDesc = hasHistory
    ? [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const latestSession = sortedDesc[0] ?? null;

  const achievementMsg =
    !latestSession
      ? 'Complete your first mock interview to start tracking progress!'
      : sessions.length === 1
      ? `You scored ${latestSession.score}% in your first session — great start! Keep going!`
      : improvement > 0
      ? `You scored ${latestSession.score}% in your latest session. You've improved ${improvement}% since your very first session! 🚀`
      : improvement < 0
      ? `You scored ${latestSession.score}% in your latest session. You're ${Math.abs(improvement)}% below your first session — keep practising!`
      : `You scored ${latestSession.score}% in your latest session. Matching your starting score — let's push higher!`;

  const improvementLabel =
    !hasHistory         ? '—'              :
    sessions.length < 2 ? 'First!'         :
    improvement > 0     ? `+${improvement}%` :
    improvement < 0     ? `${improvement}%`  : '0%';

  const improvementColor =
    improvement > 0 ? '#8B5CF6' :
    improvement < 0 ? '#EF4444' : '#9CA3AF';

  const trendLine =
    improvement > 0
      ? <><polyline points="4,28 20,22 36,18 52,12 68,5 76,2" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="76" cy="2" r="3.5" fill="#EC4899"/></>
      : improvement < 0
      ? <><polyline points="4,4 20,10 36,16 52,22 68,28 76,32" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="76" cy="32" r="3.5" fill="#EF4444"/></>
      : <><polyline points="4,18 20,18 36,18 52,18 68,18 76,18" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="76" cy="18" r="3.5" fill="#9CA3AF"/></>;

  return (
    <div style={{ minHeight: '100vh', background: '#F4F5FB', fontFamily: "'Nunito', 'Segoe UI', sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{
        background: 'linear-gradient(135deg, #5B5BD6 0%, #8B5CF6 50%, #EC4899 100%)',
        padding: '0 32px',
        height: 112,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {[{ top: 18, left: 145, size: 6 }, { top: 60, left: 480, size: 5 }, { top: 24, left: 520, size: 4 }].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', top: s.top, left: s.left,
            width: s.size, height: s.size, borderRadius: '50%',
            background: 'rgba(255,255,255,0.7)',
            boxShadow: '0 0 6px 2px rgba(255,255,255,0.5)',
          }} />
        ))}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 1 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #fff2 0%, #fff1 100%)',
            border: '2.5px solid rgba(255,255,255,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <svg viewBox="0 0 64 64" width="52" height="52" fill="none">
              <circle cx="32" cy="32" r="30" fill="url(#rg)" opacity="0.9"/>
              <rect x="20" y="22" width="24" height="20" rx="6" fill="white" opacity="0.9"/>
              <circle cx="26" cy="30" r="3" fill="#8B5CF6"/>
              <circle cx="38" cy="30" r="3" fill="#EC4899"/>
              <rect x="28" y="36" width="8" height="2.5" rx="1.25" fill="#5B5BD6" opacity="0.7"/>
              <rect x="30" y="17" width="4" height="6" rx="2" fill="white" opacity="0.8"/>
              <circle cx="32" cy="15" r="2" fill="white"/>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C3AED"/>
                  <stop offset="1" stopColor="#EC4899"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.1 }}>
              PrepPro
            </div>
            <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 400, marginTop: 2 }}>
              Practice Smarter, Not Harder
            </div>
          </div>
        </div>

        <button
          onClick={onSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#EF4444', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', zIndex: 1,
            boxShadow: '0 2px 12px rgba(239,68,68,0.4)',
          }}
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </header>

      {/* ── BODY ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px 40px' }}>

        {/* Welcome card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '28px 36px',
            marginBottom: 20,
            boxShadow: '0 1px 8px rgba(91,91,214,0.07)',
            border: '1px solid #EBEBF5',
          }}
        >
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1A1A2E' }}>
            Welcome back, {user.name}! 👋
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6B7280' }}>
            Ready to practice and improve your interview skills?
          </p>
        </motion.div>

        {/* Tip of the Day */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          style={{
            background: 'linear-gradient(90deg, #F0EEFE 0%, #FAF0FD 100%)',
            borderRadius: 16,
            padding: '18px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            border: '1px solid #E5DFFE',
            position: 'relative',
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lightbulb size={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#1A1A2E', marginBottom: 3 }}>Tip of the Day</div>
            <div style={{ fontSize: 13.5, color: '#5B5BD6', fontWeight: 500 }}>{todayTip}</div>
          </div>
          <div style={{
            fontSize: 64, color: '#E0D9FB', fontFamily: 'Georgia, serif',
            lineHeight: 1, position: 'absolute', right: 24, top: 8, userSelect: 'none',
          }}>"</div>
        </motion.div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                boxShadow: '0 1px 6px rgba(91,91,214,0.06)',
                border: '1px solid #EBEBF5',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <s.icon size={22} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A2E', lineHeight: 1.1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{s.sub}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── BOTTOM ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Start Mock Interview hero */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartInterview}
            style={{
              background: 'linear-gradient(135deg, #5B5BD6 0%, #7C3AED 50%, #EC4899 100%)',
              borderRadius: 20,
              padding: '32px 32px 28px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              minHeight: 230,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {[{ top: 18, right: 190, size: 5 }, { top: 52, right: 110, size: 4 }].map((d, i) => (
              <div key={i} style={{
                position: 'absolute', top: d.top, right: d.right,
                width: d.size, height: d.size, borderRadius: '50%',
                background: 'rgba(255,255,255,0.6)',
              }} />
            ))}
            <div style={{ position: 'absolute', right: 24, bottom: 0, opacity: 0.9 }}>
              <svg viewBox="0 0 120 160" width="120" height="160" fill="none">
                <ellipse cx="60" cy="50" rx="28" ry="38" fill="url(#mg)" opacity="0.95"/>
                <ellipse cx="60" cy="50" rx="20" ry="30" fill="rgba(255,255,255,0.15)"/>
                {[38, 44, 50, 56, 62].map((y, j) => (
                  <line key={j} x1="38" y1={y} x2="82" y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
                ))}
                <path d="M35 88 Q35 108 60 108 Q85 108 85 88" stroke="rgba(255,255,255,0.8)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
                <line x1="60" y1="108" x2="60" y2="130" stroke="rgba(255,255,255,0.8)" strokeWidth="3.5" strokeLinecap="round"/>
                <line x1="42" y1="130" x2="78" y2="130" stroke="rgba(255,255,255,0.8)" strokeWidth="3.5" strokeLinecap="round"/>
                <path d="M92 30 Q102 50 92 70" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                <path d="M100 22 Q115 50 100 78" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="mg" x1="60" y1="12" x2="60" y2="88" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#C084FC"/>
                    <stop offset="1" stopColor="#EC4899"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div style={{ zIndex: 1 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                <Play size={22} color="#fff" fill="#fff" />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>Start Mock Interview</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', maxWidth: 200 }}>
                Begin a new AI-powered practice session
              </div>
            </div>

            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#fff', color: '#5B5BD6',
              border: 'none', borderRadius: 10,
              padding: '11px 22px', fontSize: 14, fontWeight: 800,
              cursor: 'pointer', width: 'fit-content', marginTop: 20, zIndex: 1,
            }}>
              Start Now →
            </button>
          </motion.div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Interview History */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38 }}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={onViewHistory}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                border: '1px solid #EBEBF5',
                boxShadow: '0 1px 6px rgba(91,91,214,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F0EEFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={22} color="#8B5CF6" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#1A1A2E' }}>Interview History</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                    {completed === 0
                      ? 'No sessions yet'
                      : `${completed} session${completed > 1 ? 's' : ''} — review your performance`}
                  </div>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onViewHistory(); }}
                style={{
                  background: 'transparent', border: '1.5px solid #8B5CF6',
                  color: '#8B5CF6', borderRadius: 8, padding: '7px 14px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                View History →
              </button>
            </motion.div>

            {/* Progress & Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42 }}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={onViewAnalytics}
                style={{
                  background: '#fff', borderRadius: 16, padding: '20px 20px',
                  cursor: 'pointer', border: '1px solid #EBEBF5',
                  boxShadow: '0 1px 6px rgba(91,91,214,0.06)',
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#E8F7EF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <TrendingUp size={22} color="#4CAF82" />
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>Progress & Analytics</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.4 }}>
                  Track your improvement over time with detailed insights
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onViewAnalytics(); }}
                  style={{
                    background: 'transparent', border: '1.5px solid #4CAF82',
                    color: '#4CAF82', borderRadius: 8, padding: '6px 12px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  View Analytics →
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                whileHover={{ scale: 1.03, y: -3 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenSettings}
                style={{
                  background: '#fff', borderRadius: 16, padding: '20px 20px',
                  cursor: 'pointer', border: '1px solid #EBEBF5',
                  boxShadow: '0 1px 6px rgba(91,91,214,0.06)',
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#FEF3E2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <Settings size={22} color="#F5A623" />
                </div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1A2E', marginBottom: 4 }}>Settings</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 14, lineHeight: 1.4 }}>
                  Customize your goals, profiles, and app preferences
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onOpenSettings(); }}
                  style={{
                    background: 'transparent', border: '1.5px solid #F5A623',
                    color: '#F5A623', borderRadius: 8, padding: '6px 12px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  Open Settings →
                </button>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── RECENT ACHIEVEMENT BAR ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '18px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid #EBEBF5',
            boxShadow: '0 1px 6px rgba(91,91,214,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1A2E' }}>Overall Progress</div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{achievementMsg}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: improvementColor }}>
                {improvementLabel}
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>
                {sessions.length < 2 ? 'first session' : 'first → latest'}
              </div>
            </div>
            <svg viewBox="0 0 80 36" width="80" height="36" fill="none">
              {trendLine}
            </svg>
          </div>
        </motion.div>

      </div>
    </div>
  );
}