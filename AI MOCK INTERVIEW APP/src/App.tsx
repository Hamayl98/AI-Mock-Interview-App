// App.tsx
import { useEffect, useState, useRef } from "react";
import { ThemeProvider } from "./contexts/ThemeContext";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "./contexts/AuthContext";
import { db } from "./firebase/firebaseConfig";
import { collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import SplashScreen from "./components/SplashScreen";
import Onboarding from "./components/Onboarding";
import LoginRegister from "./components/LoginRegister";
import Dashboard from "./components/Dashboard";
import JobInfoInput from "./components/JobInfoInput";
import MockInterview from "./components/MockInterview";
import InterviewHistory from "./components/InterviewHistory";
import ProgressAnalytics from "./components/ProgressAnalytics";
import Settings from "./components/Settings";
import FeedbackScreen from "./components/FeedbackScreen";
import type { JobInfo } from "./services/geminiService";

export type Screen =
  | "splash" | "onboarding" | "login" | "dashboard"
  | "jobInfo" | "interview" | "history" | "analytics"
  | "settings" | "feedback";

export interface InterviewSession {
  id: string;
  date: string;
  type: string;
  score: number;
  confidence: number;
  clarity: number;
  relevance: number;
  eyeContactScore?: number;
  gestureScore?: number;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  answers: { question: string; answer: string }[];
  detailedFeedback?: {
    question: string;
    confidence: number;
    clarity: number;
    relevance: number;
    feedback: string;
  }[];
  jobTitle?: string;
}

export interface UserProfile {
  name: string;
  email: string;
  jobType: string;
  goal: string;
}

export default function App() {
  const { user: firebaseUser, loading, signIn, signUp } = useAuth();
  const auth = getAuth();
  const [screen, setScreen] = useState<Screen>("splash");
  const [jobInfo, setJobInfo] = useState<JobInfo | null>(null);
  const [interviewSessions, setInterviewSessions] = useState<InterviewSession[]>([]);
  const [currentSession, setCurrentSession] = useState<InterviewSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({ name: "", email: "", jobType: "", goal: "" });

  const isInInterviewFlowRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (firebaseUser) {
      const emailBase = firebaseUser.email
        ? firebaseUser.email.split("@")[0]
        : "User";

      const cleanedName =
        firebaseUser.displayName ||
        emailBase
          .replace(/[0-9]/g, "")
          .replace(/[^a-zA-Z. ]/g, "")
          .trim();

      const finalName =
        cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1);

      setUserProfile(prev => ({
        ...prev,
        name: finalName,
        email: firebaseUser.email || "",
      }));

      if (!isInInterviewFlowRef.current) {
        const loadSessions = async () => {
          try {
            const sessionsRef = collection(db, "users", firebaseUser.uid, "sessions");
            const q = query(sessionsRef, orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            const loaded = snapshot.docs.map(doc => {
              const data = doc.data();
              return {
                ...data,
                id: doc.id,
                // FIX: treat 0 saved from old bug as undefined so FeedbackScreen
                // shows "Camera not found" for legacy sessions where camera wasn't used.
                // If you want to keep 0 as a valid score, remove these two lines.
                eyeContactScore: data.eyeContactScore === 0 ? undefined : data.eyeContactScore,
                gestureScore: data.gestureScore === 0 ? undefined : data.gestureScore,
              } as InterviewSession;
            });
            setInterviewSessions(loaded);
          } catch (err) {
            console.error("Failed to load sessions:", err);
          }
        };

        loadSessions();
        setScreen("dashboard");
      }
    } else {
      isInInterviewFlowRef.current = false;
      setInterviewSessions([]);
      setCurrentSession(null);
      setJobInfo(null);
      setScreen("login");
    }
  }, [firebaseUser, loading]);

  const handleSignOut = async () => {
    isInInterviewFlowRef.current = false;
    await signOut(auth);
    setInterviewSessions([]);
    setJobInfo(null);
    setCurrentSession(null);
    setScreen("login");
  };

  const handleAccountDeleted = () => {
    isInInterviewFlowRef.current = false;
    setInterviewSessions([]);
    setCurrentSession(null);
    setJobInfo(null);
    setUserProfile({ name: "", email: "", jobType: "", goal: "" });
    setScreen("login");
  };

  const handleStartInterview = () => {
    isInInterviewFlowRef.current = true;
    setScreen("jobInfo");
  };

  const handleJobInfoSubmit = (info: JobInfo) => {
    setJobInfo(info);
    setScreen("interview");
  };

  const handleInterviewComplete = (session: InterviewSession) => {
    setCurrentSession(session);
    setScreen("feedback");

    if (firebaseUser) {
      const sessionsRef = collection(db, "users", firebaseUser.uid, "sessions");
      addDoc(sessionsRef, {
        date: session.date,
        type: session.type,
        score: session.score,
        confidence: session.confidence,
        clarity: session.clarity,
        relevance: session.relevance,
        // FIX: save null (not 0) when camera was never used so Firestore
        // preserves the "no camera" signal correctly
        eyeContactScore: session.eyeContactScore ?? null,
        gestureScore: session.gestureScore ?? null,
        strengths: session.strengths,
        improvements: session.improvements,
        suggestions: session.suggestions,
        answers: session.answers,
        jobTitle: jobInfo?.jobTitle || "",
        detailedFeedback: session.detailedFeedback ?? [],
      }).then(docRef => {
        const savedSession = { ...session, id: docRef.id };
        setCurrentSession(savedSession);
        setInterviewSessions(prev => [savedSession, ...prev]);
      }).catch(err => {
        console.error("Failed to save session:", err);
        setInterviewSessions(prev => [session, ...prev]);
      });
    } else {
      setInterviewSessions(prev => [session, ...prev]);
    }
  };

  const handleBackToDashboard = () => {
    isInInterviewFlowRef.current = false;
    setScreen("dashboard");
  };

  const handleViewHistory = () => setScreen("history");
  const handleViewAnalytics = () => setScreen("analytics");
  const handleOpenSettings = () => setScreen("settings");
  const handleRetryInterview = () => setScreen("jobInfo");

  const handleViewSession = (session: InterviewSession) => {
    setCurrentSession(session);
    setScreen("feedback");
  };

  const handleUpdateProfile = (profile: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...profile }));
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        {screen === "splash" && <SplashScreen />}

        {screen === "onboarding" && (
          <Onboarding onGetStarted={() => setScreen("login")} />
        )}

        {screen === "login" && (
          <LoginRegister
            onLogin={async (email, password) => {
              try { await signIn(email, password); }
              catch (error: any) { alert(error.message); }
            }}
            onRegister={async (email, password) => {
              try { await signUp(email, password); }
              catch (error: any) { alert(error.message); }
            }}
          />
        )}

        {screen === "dashboard" && firebaseUser && (
          <Dashboard
            user={userProfile}
            sessions={interviewSessions}
            onStartInterview={handleStartInterview}
            onViewHistory={handleViewHistory}
            onViewAnalytics={handleViewAnalytics}
            onOpenSettings={handleOpenSettings}
            onSignOut={handleSignOut}
          />
        )}

        {screen === "jobInfo" && firebaseUser && (
          <JobInfoInput onSubmit={handleJobInfoSubmit} onBack={handleBackToDashboard} />
        )}

        {screen === "interview" && firebaseUser && jobInfo && (
          <MockInterview jobInfo={jobInfo} onComplete={handleInterviewComplete} onBack={handleBackToDashboard} />
        )}

        {screen === "history" && firebaseUser && (
          <InterviewHistory sessions={interviewSessions} onBack={handleBackToDashboard} onViewSession={handleViewSession} />
        )}

        {screen === "analytics" && firebaseUser && (
          <ProgressAnalytics sessions={interviewSessions} onBack={handleBackToDashboard} />
        )}

        {screen === "settings" && firebaseUser && (
          <Settings
            user={userProfile}
            onBack={handleBackToDashboard}
            onUpdateProfile={handleUpdateProfile}
            onAccountDeleted={handleAccountDeleted}
          />
        )}

        {screen === "feedback" && firebaseUser && currentSession && (
          <FeedbackScreen session={currentSession} onBackToDashboard={handleBackToDashboard} onRetry={handleRetryInterview} />
        )}
      </div>
    </ThemeProvider>
  );
}