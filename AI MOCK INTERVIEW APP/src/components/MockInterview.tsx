// MockInterview.tsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Send,
  Mic,
  Clock,
  Sparkles,
  Video,
  VideoOff,
  Eye,
  Hand,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import type { InterviewSession } from '../App';
import { fetchRagQuestions, evaluateInterview } from '../services/ragApi';

import type { RagQuestion } from '../services/ragApi';

import { FaceMesh } from '@mediapipe/face_mesh';
import { Hands } from '@mediapipe/hands';

interface MockInterviewProps {
  jobInfo: JobInfo;
  onComplete: (session: InterviewSession) => void;
  onBack: () => void;
}

export default function MockInterview({
  jobInfo,
  onComplete,
  onBack
}: MockInterviewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [answers, setAnswers] = useState<
    {
      question: string;
      userAnswer: string;
      expectedAnswer: string;
    }[]
  >([]);

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeExceeded, setTimeExceeded] = useState(false);

  const [questions, setQuestions] = useState<RagQuestion[]>([]);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [eyeContactScore, setEyeContactScore] = useState(100);
  const [eyeContactPercentage, setEyeContactPercentage] = useState(100);
  const [showEyeContact, setShowEyeContact] = useState(false);

  // ── TTS STATE ──────────────────────────────────────────────────────────────
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ── GESTURE STATE ──────────────────────────────────────────────────────────
  const [gestureScore, setGestureScore] = useState(100);
  const [gestureLabel, setGestureLabel] = useState<string>('');
  const [showGesture, setShowGesture] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const lastEyeContactTime = useRef<number>(Date.now());
  const lookingAwayStartTime = useRef<number | null>(null);
  const animationFrameRef = useRef<number>();

  // ── FIX 1: eyeContactScoreRef must start at 100 to match state ────────────
  const eyeContactScoreRef = useRef<number>(100);

  // ── FIX 2: track whether camera was ever actually opened ──────────────────
  const cameraWasUsedRef = useRef<boolean>(false);

  // ── GESTURE TRACKING REFS ─────────────────────────────────────────────────
  const prevHandPositions = useRef<{ x: number; y: number }[]>([]);
  const handMissingFrames = useRef<number>(0);
  const handsMissingStartTime = useRef<number | null>(null);
  
  const lastHandsVisibleTime = useRef<number>(Date.now());
   
  const gestureScoreRef = useRef<number>(100);
  const illustratorHistoryRef = useRef<number[]>([]);
  const erraticHistoryRef = useRef<number[]>([]);
  const lastScoreDecayTime = useRef<number>(Date.now());

  // ── Enumeration tracking ──────────────────────────────────────────────────
  const prevExtendedCountRef = useRef<number>(0);
  const enumerationHoldRef = useRef<number>(0);

  // ── STABLE CALLBACK REFS (prevents stale closures in MediaPipe) ───────────
  const analyseGesturesRef = useRef<(landmarks: any[][]) => void>(() => {});
  const processEyeResultsRef = useRef<(landmarks: any[]) => void>(() => {});

  /* ═══════════════════════════════════════════════════════════════════════════
     TTS — READ QUESTION ALOUD
  ═══════════════════════════════════════════════════════════════════════════ */

  const handleReadQuestion = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const questionText = questions[currentQuestionIndex]?.question;
    if (!questionText) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(questionText);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const preferredVoice =
    voices.find(v => v.name.includes('Google US English')) ||
    voices.find(v => v.name.includes('Microsoft Zira')) ||
    voices.find(v => v.name.includes('Samantha')) ||
    voices.find(v => v.lang === 'en-US');
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
  const loadVoices = () => {
    window.speechSynthesis.getVoices();
  };
  window.speechSynthesis.onvoiceschanged = loadVoices;
  loadVoices();
}, []);

  /* ═══════════════════════════════════════════════════════════════════════════
     EYE CONTACT
  ═══════════════════════════════════════════════════════════════════════════ */

  const calculateGazeDirection = (eyeLandmarks: any[], iris: any, eyeCorner1: any, eyeCorner2: any) => {
    if (!iris || !eyeCorner1 || !eyeCorner2) return 1;
    const eyeWidth = Math.abs(eyeCorner2.x - eyeCorner1.x);
    const irisPosition = (iris.x - eyeCorner1.x) / eyeWidth;
    const deviation = Math.abs(irisPosition - 0.5);
    const maxDeviation = 0.15;
    return Math.max(0, 1 - (deviation / maxDeviation));
  };

  const calculateEyeOpenness = (eyeLandmarks: number[][]) => {
    const v1 = Math.hypot(eyeLandmarks[1][0] - eyeLandmarks[5][0], eyeLandmarks[1][1] - eyeLandmarks[5][1]);
    const v2 = Math.hypot(eyeLandmarks[2][0] - eyeLandmarks[4][0], eyeLandmarks[2][1] - eyeLandmarks[4][1]);
    const h = Math.hypot(eyeLandmarks[0][0] - eyeLandmarks[3][0], eyeLandmarks[0][1] - eyeLandmarks[3][1]);
    return (v1 + v2) / (2 * h);
  };

  const checkEyeContact = (landmarks: any[]) => {
    if (!landmarks || landmarks.length === 0) return 0;
    const leftEyeIndices = [33, 160, 158, 133, 153, 144];
    const rightEyeIndices = [362, 385, 387, 263, 373, 380];
    const leftEyeOuterCorner = 33;
    const leftEyeInnerCorner = 133;
    const rightEyeOuterCorner = 362;
    const rightEyeInnerCorner = 263;
    const leftIris = landmarks[468];
    const rightIris = landmarks[473];
    const leftEye = leftEyeIndices.map(idx => [landmarks[idx]?.x || 0, landmarks[idx]?.y || 0]);
    const rightEye = rightEyeIndices.map(idx => [landmarks[idx]?.x || 0, landmarks[idx]?.y || 0]);
    const avgEyeOpenness = (calculateEyeOpenness(leftEye) + calculateEyeOpenness(rightEye)) / 2;
    if (avgEyeOpenness <= 0.18) return 0;
    const leftGazeScore = calculateGazeDirection(leftEye, leftIris, landmarks[leftEyeOuterCorner], landmarks[leftEyeInnerCorner]);
    const rightGazeScore = calculateGazeDirection(rightEye, rightIris, landmarks[rightEyeOuterCorner], landmarks[rightEyeInnerCorner]);
    const avgGazeScore = (leftGazeScore + rightGazeScore) / 2;
    const leftEyeCenter = { x: (landmarks[leftEyeOuterCorner]?.x + landmarks[leftEyeInnerCorner]?.x) / 2, y: (landmarks[leftEyeOuterCorner]?.y + landmarks[leftEyeInnerCorner]?.y) / 2 };
    const rightEyeCenter = { x: (landmarks[rightEyeOuterCorner]?.x + landmarks[rightEyeInnerCorner]?.x) / 2, y: (landmarks[rightEyeOuterCorner]?.y + landmarks[rightEyeInnerCorner]?.y) / 2 };
    if (leftIris && rightIris) {
      const leftVerticalDeviation = Math.abs(leftIris.y - leftEyeCenter.y);
      const rightVerticalDeviation = Math.abs(rightIris.y - rightEyeCenter.y);
      const verticalThreshold = 0.02;
      const leftVerticalScore = Math.max(0, 1 - (leftVerticalDeviation / verticalThreshold));
      const rightVerticalScore = Math.max(0, 1 - (rightVerticalDeviation / verticalThreshold));
      const verticalScore = (leftVerticalScore + rightVerticalScore) / 2;
      return Math.min(100, Math.max(0, Math.min(avgGazeScore, verticalScore) * 100));
    }
    return avgGazeScore * 100;
  };

  const updateEyeContactScore = (currentScore: number) => {
  const now = Date.now();
  const decayRate = 15;
  const recoveryRate = 25;
  const isMakingGoodContact = currentScore >= 70;

  // FIX: compute next value first, then set both ref and state together
  // Previously the ref was set inside the setState closure, causing it to lag
  let next: number;
  if (isMakingGoodContact) {
    lookingAwayStartTime.current = null;
    const inc = ((now - lastEyeContactTime.current) / 1000) * recoveryRate;
    next = Math.min(100, eyeContactScoreRef.current + inc);
  } else {
    if (!lookingAwayStartTime.current) lookingAwayStartTime.current = now;
    const awayDuration = (now - lookingAwayStartTime.current) / 1000;
    const severityFactor = 1 + ((100 - currentScore) / 100);
    next = Math.max(0, eyeContactScoreRef.current - awayDuration * decayRate * severityFactor);
  }

  eyeContactScoreRef.current = next;  // ref updated immediately, in sync
  setEyeContactScore(next);           // state updated for UI display

  lastEyeContactTime.current = now;
};

  
  const THUMB_TIP  = 4;
  const INDEX_TIP  = 8;
  const MIDDLE_TIP = 12;
  const RING_TIP   = 16;
  const PINKY_TIP  = 20;
  const INDEX_MCP  = 5;
  const MIDDLE_MCP = 9;
  const RING_MCP   = 13;
  const PINKY_MCP  = 17;
  const INDEX_PIP  = 6;
  const MIDDLE_PIP = 10;
  const RING_PIP   = 14;
  const PINKY_PIP  = 18;
  const WRIST      = 0;

  const landmarkDist = (a: any, b: any): number =>
    Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

  const getHandScale = (lm: any[]): number =>
    Math.hypot(lm[MIDDLE_MCP].x - lm[WRIST].x, lm[MIDDLE_MCP].y - lm[WRIST].y) || 0.01;

  const fingerExtension = (lm: any[], tip: number, pip: number, mcp: number): number => {
    const scale = getHandScale(lm);
    const tipDist = landmarkDist(lm[tip], lm[WRIST]) / scale;
    const pipDist = landmarkDist(lm[pip], lm[WRIST]) / scale;
    const mcpDist = landmarkDist(lm[mcp], lm[WRIST]) / scale;
    const extended = Math.max(0, tipDist - mcpDist) / (pipDist || 0.01);
    return Math.min(1, extended);
  };

  const countExtendedFingers = (lm: any[], threshold = 0.6): number => {
    const fingers = [
      fingerExtension(lm, INDEX_TIP,  INDEX_PIP,  INDEX_MCP),
      fingerExtension(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
      fingerExtension(lm, RING_TIP,   RING_PIP,   RING_MCP),
      fingerExtension(lm, PINKY_TIP,  PINKY_PIP,  PINKY_MCP),
    ];
    return fingers.filter(e => e > threshold).length;
  };

  const detectOpenPalm = (lm: any[]): number => {
    const indexExt  = fingerExtension(lm, INDEX_TIP,  INDEX_PIP,  INDEX_MCP);
    const middleExt = fingerExtension(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    const ringExt   = fingerExtension(lm, RING_TIP,   RING_PIP,   RING_MCP);
    const pinkyExt  = fingerExtension(lm, PINKY_TIP,  PINKY_PIP,  PINKY_MCP);

    const allExtended = indexExt > 0.75 && middleExt > 0.75 && ringExt > 0.75 && pinkyExt > 0.75;
    if (!allExtended) return 0;

    const scale = getHandScale(lm);
    const spread = landmarkDist(lm[INDEX_TIP], lm[PINKY_TIP]) / scale;
    const palmFacingUp = lm[INDEX_TIP].y < lm[WRIST].y;

    if (spread > 1.2) return palmFacingUp ? 1.0 : 0.7;
    return 0.3;
  };

  const detectSteeple = (allLandmarks: any[][]): number => {
    if (allLandmarks.length < 2) return 0;
    const lm1 = allLandmarks[0];
    const lm2 = allLandmarks[1];

    const tipPairs: [number, number][] = [
      [INDEX_TIP,  INDEX_TIP],
      [MIDDLE_TIP, MIDDLE_TIP],
      [RING_TIP,   RING_TIP],
      [PINKY_TIP,  PINKY_TIP],
    ];

    const avgTipDist =
      tipPairs.reduce((sum, [a, b]) => sum + landmarkDist(lm1[a], lm2[b]), 0) /
      tipPairs.length;

    const scale = (getHandScale(lm1) + getHandScale(lm2)) / 2;
    return avgTipDist < scale * 0.25 ? 1 : 0;
  };

  const detectPrecisionPinch = (lm: any[]): number => {
    const scale = getHandScale(lm);
    const pinchDist = landmarkDist(lm[THUMB_TIP], lm[INDEX_TIP]) / scale;

    if (pinchDist > 0.35) return 0;

    const middleExt = fingerExtension(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    const ringExt   = fingerExtension(lm, RING_TIP,   RING_PIP,   RING_MCP);

    const othersOpen = middleExt > 0.5 && ringExt > 0.5;
    if (!othersOpen) return 0;

    return Math.max(0, 1 - pinchDist / 0.35);
  };

  const detectControlledIllustrator = (lm: any[]): number => {
    const wrist = lm[WRIST];
    const prev  = prevHandPositions.current[0];
    if (!prev) return 0;

    const velocity = Math.hypot(wrist.x - prev.x, wrist.y - prev.y);
    illustratorHistoryRef.current = [...illustratorHistoryRef.current.slice(-9), velocity];
    if (illustratorHistoryRef.current.length < 5) return 0;

    const avgVel =
      illustratorHistoryRef.current.reduce((a, b) => a + b, 0) /
      illustratorHistoryRef.current.length;

    const variance =
      illustratorHistoryRef.current.reduce(
        (sum, v) => sum + Math.pow(v - avgVel, 2),
        0
      ) / illustratorHistoryRef.current.length;

    const isSmooth    = variance < 0.0003;
    const isIdealSpeed = avgVel >= 0.010 && avgVel <= 0.040;

    return isSmooth && isIdealSpeed ? 0.5 : 0;
  };

  const detectEnumeration = (lm: any[]): number => {
    const currentCount = countExtendedFingers(lm);

    if (currentCount === 0) {
      prevExtendedCountRef.current = 0;
      enumerationHoldRef.current   = 0;
      return 0;
    }

    if (currentCount === prevExtendedCountRef.current) {
      enumerationHoldRef.current += 1;
      return enumerationHoldRef.current >= 10 ? 1 : 0;
    } else {
      prevExtendedCountRef.current = currentCount;
      enumerationHoldRef.current   = 0;
      return 0;
    }
  };

  const detectSelfTouch = (lm: any[]): number => {
    const wrist    = lm[WRIST];
    const indexExt = fingerExtension(lm, INDEX_TIP, INDEX_PIP, INDEX_MCP);
    const middleExt = fingerExtension(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    const avgExt   = (indexExt + middleExt) / 2;

    const isNearFace = wrist.y < 0.35;
    const isNotOpen  = avgExt < 0.5;

    if (isNearFace && isNotOpen) {
      const proximity = Math.max(0, (0.35 - wrist.y) / 0.35);
      return proximity * 2;
    }
    return 0;
  };

  const detectPointing = (lm: any[]): number => {
    const indexExt  = fingerExtension(lm, INDEX_TIP,  INDEX_PIP,  INDEX_MCP);
    const middleExt = fingerExtension(lm, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP);
    const ringExt   = fingerExtension(lm, RING_TIP,   RING_PIP,   RING_MCP);
    const pinkyExt  = fingerExtension(lm, PINKY_TIP,  PINKY_PIP,  PINKY_MCP);

    const isPointing =
      indexExt > 0.75 &&
      middleExt < 0.30 &&
      ringExt   < 0.30 &&
      pinkyExt  < 0.30;

    return isPointing ? 1 : 0;
  };

  const detectErraticMovement = (lm: any[]): number => {
    const wrist = lm[WRIST];
    const prev  = prevHandPositions.current[0];
    if (!prev) return 0;

    const velocity = Math.hypot(wrist.x - prev.x, wrist.y - prev.y);
    erraticHistoryRef.current = [...erraticHistoryRef.current.slice(-9), velocity];
    if (erraticHistoryRef.current.length < 5) return 0;

    const avgVel =
      erraticHistoryRef.current.reduce((a, b) => a + b, 0) /
      erraticHistoryRef.current.length;

    const variance =
      erraticHistoryRef.current.reduce(
        (sum, v) => sum + Math.pow(v - avgVel, 2),
        0
      ) / erraticHistoryRef.current.length;

    const isErratic = variance > 0.0008 || avgVel > 0.055;
    return isErratic
      ? Math.min(1, variance * 1000 + Math.max(0, avgVel - 0.055) * 10)
      : 0;
  };

//   const detectHiddenHands = (handsVisible: boolean): number => {
//   const now = Date.now();

//   if (handsVisible) {
//     handMissingFrames.current = 0;
//     lastHandsVisibleTime.current = now;
//     return 0;
//   }

//   const timeWithoutHands =
//     (now - lastHandsVisibleTime.current) / 1000;

//   // Keep previous score unchanged for first 5 seconds
//   if (timeWithoutHands < 5) {
//     return 0;
//   }

//   // Start penalty AFTER grace period
//   const penaltySeconds = timeWithoutHands - 5;

//   return Math.min(1, penaltySeconds / 3);
// };
//   const applyNaturalDecay = () => {
//     const now = Date.now();
//     const timeSinceLastDecay = (now - lastScoreDecayTime.current) / 1000;

//     if (timeSinceLastDecay > 1) {
//       const decayAmount = 0.3;
//       gestureScoreRef.current = Math.max(0, gestureScoreRef.current - decayAmount);
//       lastScoreDecayTime.current = now;
//     }
//   };

const analyseGestures = (multiHandLandmarks: any[][]) => {
  const handsVisible = multiHandLandmarks.length > 0;
  const now = Date.now();

  // -------------------------------
  // HANDS NOT VISIBLE
  // -------------------------------
  if (!handsVisible) {

    if (!handsMissingStartTime.current) {
      handsMissingStartTime.current = now;
    }

    const hiddenDuration =
      (now - handsMissingStartTime.current) / 1000;

    // Hold previous score for 3 seconds
    if (hiddenDuration <= 3) {
      setGestureScore(Math.round(gestureScoreRef.current));
      setGestureLabel("Complete interview button click detected...");
      return;
    }

    // After 3 sec start decreasing gradually
    gestureScoreRef.current = Math.max(
      0,
      gestureScoreRef.current - 1
    );

    setGestureScore(Math.round(gestureScoreRef.current));
    setGestureLabel(
      "Keep your hands visible"
    );

    return;
  }

  // Reset timer when hands appear again
  handsMissingStartTime.current = null;

  const lm = multiHandLandmarks[0];

  const openPalmScore = detectOpenPalm(lm);
  const steepleScore = detectSteeple(multiHandLandmarks);
  const precisionPinch = detectPrecisionPinch(lm);
  const illustratorScore = detectControlledIllustrator(lm);
  const enumerationScore = detectEnumeration(lm);

  const selfTouchPenalty = detectSelfTouch(lm);
  const pointingPenalty = detectPointing(lm);
  const erraticPenalty = detectErraticMovement(lm);

  const positiveSignal =
    steepleScore * 2 +
    openPalmScore * 1.5 +
    precisionPinch * 1 +
    illustratorScore * 1 +
    enumerationScore * 1;

  const negativeSignal =
    selfTouchPenalty * 6 +
    pointingPenalty * 7 +
    erraticPenalty * 5;

  if (negativeSignal > 0.5) {
    // Immediately reduce if bad gesture detected
    gestureScoreRef.current = Math.max(
      0,
      gestureScoreRef.current - negativeSignal
    );
  }
  else if (positiveSignal > 0.3) {
    // Increase when good gestures happen
    gestureScoreRef.current = Math.min(
      100,
      gestureScoreRef.current + positiveSignal
    );
  }
  else {
    // No movement → slight decrease
    gestureScoreRef.current = Math.max(
      0,
      gestureScoreRef.current - 0.3
    );
  }

  setGestureScore(Math.round(gestureScoreRef.current));

  prevHandPositions.current = [
    {
      x: lm[WRIST].x,
      y: lm[WRIST].y
    }
  ];

  // Feedback labels
  if (pointingPenalty > 0.5) {
    setGestureLabel("Avoid pointing");
  }
  else if (selfTouchPenalty > 0.3) {
    setGestureLabel("Avoid touching your face");
  }
  else if (erraticPenalty > 0.5) {
    setGestureLabel("Slow down hand movement");
  }
  else if (openPalmScore > 0.5) {
    setGestureLabel("Good open hand gestures");
  }
  else if (steepleScore > 0.5) {
    setGestureLabel("Confident hand posture");
  }
  else {
    setGestureLabel("Use natural hand gestures");
  }
};

  /* ═══════════════════════════════════════════════════════════════════════════
     CALLBACK REFS UPDATE
  ═══════════════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    analyseGesturesRef.current = analyseGestures;
    processEyeResultsRef.current = (landmarks: any[]) => {
      const rawScore = checkEyeContact(landmarks);
      updateEyeContactScore(rawScore);
      setEyeContactPercentage(Math.round(rawScore));
    };
  });

  /* ═══════════════════════════════════════════════════════════════════════════
     MEDIAPIPE INIT
  ═══════════════════════════════════════════════════════════════════════════ */

  const initMediaPipe = async () => {
    if (!videoRef.current) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    faceMesh.onResults((results) => {
      if (results.multiFaceLandmarks?.length > 0) {
        processEyeResultsRef.current(results.multiFaceLandmarks[0]);
      } else {
        updateEyeContactScore(0);
        setEyeContactPercentage(0);
      }
    });

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6
    });
    hands.onResults((results) => {
      analyseGesturesRef.current(results.multiHandLandmarks ?? []);
    });

    await faceMesh.initialize();
    await hands.initialize();

    faceMeshRef.current = faceMesh;
    handsRef.current    = hands;

    const processFrame = async () => {
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }
      try {
        if (faceMeshRef.current) await faceMeshRef.current.send({ image: video });
        if (handsRef.current)    await handsRef.current.send({ image: video });
      } catch {
        return;
      }
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     CAMERA
  ═══════════════════════════════════════════════════════════════════════════ */

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    faceMeshRef.current = null;
    handsRef.current    = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsVideoEnabled(false);
    setShowEyeContact(false);
    setShowGesture(false);
  };

  const startCamera = async () => {
    try {
      stopCamera();
      await new Promise(resolve => setTimeout(resolve, 300));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true
      });

      streamRef.current = stream;

      await new Promise<void>((resolve, reject) => {
        if (!videoRef.current) return reject('no video element');
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play().then(resolve).catch(reject);
        };
      });

      await new Promise(resolve => setTimeout(resolve, 400));

      // Reset all tracking state — FIX: both ref and state start at 100
      setEyeContactScore(0);
      eyeContactScoreRef.current = 0;
      setEyeContactPercentage(0);
      lastEyeContactTime.current    = Date.now();
      lookingAwayStartTime.current  = null;

      setGestureScore(0);
      gestureScoreRef.current       = 0;
      setGestureLabel('');
      prevHandPositions.current     = [];
      handMissingFrames.current     = 0;
      illustratorHistoryRef.current = [];
      erraticHistoryRef.current     = [];
      lastScoreDecayTime.current    = Date.now();
      prevExtendedCountRef.current  = 0;
      enumerationHoldRef.current    = 0;

      // FIX 2: mark that camera was actually used
      cameraWasUsedRef.current = true;

      setIsVideoEnabled(true);
      setShowEyeContact(true);
      setShowGesture(true);

      await initMediaPipe();

    } catch (err) {
      console.error('Camera error:', err);
      stopCamera();
      alert('Unable to access camera. Please check permissions and try again.');
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     LOAD QUESTIONS
  ═══════════════════════════════════════════════════════════════════════════ */

  useEffect(() => {
  const load = async () => {
    if (!jobInfo?.jobTitle) {
      console.error("No job title provided");
      return;
    }

    try {
      setIsLoadingQuestions(true);

      const role = jobInfo.jobTitle.trim();

      // fetch immediately once role is available
      const data = await fetchRagQuestions(role);

      if (data && data.length > 0) {
        setQuestions(data);
      }

    } catch (error) {
      console.error("Question fetch failed:", error);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  load();
}, [jobInfo.jobTitle]);

  /* ═══════════════════════════════════════════════════════════════════════════
     TIMER
  ═══════════════════════════════════════════════════════════════════════════ */

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => {
        if (prev + 1 >= 300) {
          setTimeExceeded(true);
          handleAutoComplete();
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => { return () => stopCamera(); }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     VOICE INPUT
  ═══════════════════════════════════════════════════════════════════════════ */

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    const finalTranscriptRef = { current: answer };
    
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += event.results[i][0].transcript + ' ';
        } else {
          interim = event.results[i][0].transcript;
        }
      }
      setAnswer(finalTranscriptRef.current + interim);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
    setIsListening(true);
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     QUESTION FLOW
  ═══════════════════════════════════════════════════════════════════════════ */

  const handleNextQuestion = async () => {
    if (!answer.trim()) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const currentQ = questions[currentQuestionIndex];

    const updated = [
      ...answers,
      {
        question: currentQ.question,
        userAnswer: answer.trim(),
        expectedAnswer: currentQ.referenceAnswer,
      }
    ];

    setAnswers(updated);
    setAnswer('');

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      try {
        const result = await evaluateInterview(updated);

        // FIX 3: pass null when camera was never used, not a fallback number
        const finalEyeContact = cameraWasUsedRef.current
        ? Math.round(eyeContactPercentage)
        : null;
        const finalGesture = cameraWasUsedRef.current
          ? Math.round(gestureScoreRef.current)
          : null;

        const session: InterviewSession = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'mixed',

          score: Math.round(
            result.confidence * 0.25 +
            result.clarity    * 0.25 +
            result.relevance  * 0.30 +
            (finalGesture ?? 0)      * 0.10 +
            (finalEyeContact ?? 0)   * 0.10
          ),

          confidence: result.confidence,
          clarity: result.clarity,
          relevance: result.relevance,

          eyeContactScore: finalEyeContact ?? undefined,
          gestureScore: finalGesture ?? undefined,

          strengths: [],
          improvements: [],
          suggestions: result.overallFeedback ? [result.overallFeedback] : [],

          answers: updated.map(a => ({
            question: a.question,
            answer: a.userAnswer
          })),

          detailedFeedback: result.details ?? [],
        };

        stopCamera();
        onComplete(session);

      } catch (error) {
        console.error("Evaluation failed:", error);


        const finalEyeContact = cameraWasUsedRef.current
        ? Math.round(eyeContactPercentage)
        : null;
        const finalGesture = cameraWasUsedRef.current
          ? Math.round(gestureScoreRef.current)
          : null;

        const fallbackSession: InterviewSession = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          type: 'mixed',
          score: 70,
          relevance: 70,
          eyeContactScore: finalEyeContact ?? undefined,
          gestureScore: finalGesture ?? undefined,
          strengths: [],
          improvements: [],
          suggestions: [],
          answers: updated.map(a => ({
            question: a.question,
            answer: a.userAnswer
          })),
          jobTitle: jobInfo.jobTitle
        };

        stopCamera();
        onComplete(fallbackSession);
      }
    }
  };

  const handleAutoComplete = () => { stopCamera(); };

  /* ═══════════════════════════════════════════════════════════════════════════
     GESTURE COLOUR HELPERS
  ═══════════════════════════════════════════════════════════════════════════ */

  const gestureBadgeClass = gestureScore > 70
    ? 'bg-green-100 text-green-800'
    : gestureScore > 40
    ? 'bg-yellow-100 text-yellow-800'
    : 'bg-red-100 text-red-800';

  const gestureIndicatorClass = gestureScore > 70
    ? 'bg-green-500 text-white'
    : gestureScore > 40
    ? 'bg-yellow-500 text-white'
    : 'bg-red-500 text-white';

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Exit Interview
          </Button>

          <div className="flex gap-3">
            {showEyeContact && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Eye className="w-4 h-4 mr-1" />
                Eye Contact: {Math.round(eyeContactPercentage)}%
              </Badge>
            )}

            {showGesture && (
              <Badge variant="outline" className={`border-current ${gestureBadgeClass}`}>
                <Hand className="w-4 h-4 mr-1" />
                Gestures: {gestureScore}%
              </Badge>
            )}

            <Badge>
              <Clock className="w-4 h-4 mr-1" />
              {formatTime(timeElapsed)} / 10:00
            </Badge>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          {/* LEFT */}
          <div>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </div>

            <Card className="p-6 mb-3">
              <h2 className="font-medium">
                {isLoadingQuestions ? 'Loading questions...' : questions[currentQuestionIndex]?.question}
              </h2>
            </Card>

            <div className="flex justify-end mb-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleReadQuestion}
                disabled={isLoadingQuestions || !questions[currentQuestionIndex]?.question}
                title={isSpeaking ? 'Stop reading' : 'Read question aloud'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Read Question
                  </>
                )}
              </Button>
            </div>

            <Card className="p-6">
              <div className="flex justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Your Answer</label>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleVoiceInput}
                >
                  <Mic className="w-4 h-4" />
                  {isListening ? 'Stop' : 'Voice Input'}
                </Button>
              </div>
              <Textarea
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                className="min-h-[120px]"
                disabled={timeExceeded}
                placeholder="Type your answer here..."
              />
              <div className="flex justify-end mt-4">
                <Button onClick={handleNextQuestion}>
                  {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Complete Interview'}
                  <Send className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div>
            <Card className="p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Live Video Analysis</h3>
                <div className="flex gap-2">
                  {showEyeContact && (
                    <Badge className={`${eyeContactPercentage > 70 ? 'bg-green-100 text-green-800' : eyeContactPercentage > 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      Eye: {Math.round(eyeContactPercentage)}%
                    </Badge>
                  )}
                  {showGesture && (
                    <Badge className={gestureBadgeClass}>
                      <Hand className="w-3 h-3 mr-1" />
                      Gestures: {gestureScore}%
                    </Badge>
                  )}
                </div>
              </div>

              <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-4">
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-400">
                    <VideoOff className="w-12 h-12" />
                  </div>
                )}

                {isVideoEnabled && (
                  <>
                    <div className="absolute bottom-2 right-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${eyeContactPercentage > 70 ? 'bg-green-500 text-white' : eyeContactPercentage > 40 ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'}`}>
                        {Math.round(eyeContactPercentage)}% Eye
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${gestureIndicatorClass}`}>
                        {gestureScore}% Gesture
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                {!isVideoEnabled ? (
                  <Button onClick={startCamera} className="flex-1 bg-green-600 text-white hover:bg-green-700">
                    <Video className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button onClick={stopCamera} variant="outline" className="flex-1">
                    <VideoOff className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                )}
              </div>

              {isVideoEnabled && (
                <div className="mt-3 space-y-1">
                  {eyeContactPercentage > 70 ? (
                    <p className="text-xs text-green-600">✓ Great eye contact! Keep looking at the camera.</p>
                  ) : eyeContactPercentage > 40 ? (
                    <p className="text-xs text-yellow-600">⚠ Try to maintain eye contact with the camera</p>
                  ) : (
                    <p className="text-xs text-red-600">✗ You're looking away from the camera</p>
                  )}

                  {gestureScore > 70 ? (
                    <p className="text-xs text-green-600">
                      ✓ {gestureLabel || 'Excellent professional gestures!'}
                    </p>
                  ) : gestureScore > 40 ? (
                    <p className="text-xs text-yellow-600">
                      ⚠ {gestureLabel || 'Keep working on your hand gestures'}
                    </p>
                  ) : (
                    <p className="text-xs text-red-600">
                      ✗ {gestureLabel || 'Focus on professional hand positioning'}
                    </p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}