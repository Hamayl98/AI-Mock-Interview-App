// FeedbackScreen.tsx
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2, AlertCircle, Lightbulb, TrendingUp,
  ArrowLeft, RefreshCw, Save, Eye, Hand, MessageSquare,
  Tag, XCircle, PlusCircle, BarChart2, VideoOff
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import type { InterviewSession } from '../App';

interface KeywordAnalysis {
  matched: string[];
  missing: string[];
  extra: string[];
  coveragePercent: number;
}

interface DetailedFeedbackItem {
  question: string;
  confidence: number;
  clarity: number;
  relevance: number;
  feedback: string;
  keywordAnalysis?: KeywordAnalysis;
}

interface FeedbackScreenProps {
  session: InterviewSession;
  onBackToDashboard: () => void;
  onRetry: () => void;
}

// ── Keyword Coverage Badge ────────────────────────────────────────────────────
function KeywordCoverageBadge({ percent }: { percent: number }) {
  const color =
    percent >= 70 ? 'bg-green-100 text-green-700 border-green-200' :
    percent >= 45 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
      <BarChart2 className="w-3 h-3" />
      {percent}% keyword coverage
    </span>
  );
}

// ── Keyword Chip ──────────────────────────────────────────────────────────────
function KeywordChip({
  word, variant
}: {
  word: string;
  variant: 'matched' | 'missing' | 'extra';
}) {
  const styles = {
    matched: 'bg-green-50 text-green-700 border border-green-200',
    missing: 'bg-red-50  text-red-700  border border-red-200',
    extra:   'bg-blue-50 text-blue-700 border border-blue-200',
  };
  const icons = {
    matched: <CheckCircle2 className="w-3 h-3" />,
    missing: <XCircle      className="w-3 h-3" />,
    extra:   <PlusCircle   className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant]}`}>
      {icons[variant]}
      {word}
    </span>
  );
}

// ── Keyword Analysis Panel ────────────────────────────────────────────────────
function KeywordAnalysisPanel({ analysis }: { analysis: KeywordAnalysis }) {
  const hasMatched = analysis.matched.length > 0;
  const hasMissing = analysis.missing.length > 0;
  const hasExtra   = analysis.extra.length > 0;

  return (
    <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2.5">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <Tag className="w-3.5 h-3.5" />
          Keyword Analysis
        </span>
        <KeywordCoverageBadge percent={analysis.coveragePercent} />
      </div>

      {/* Coverage bar */}
      <Progress value={analysis.coveragePercent} className="h-1.5" />

      {/* Matched keywords */}
      {hasMatched && (
        <div>
          <p className="text-xs font-medium text-green-700 mb-1">
            ✓ Keywords you covered ({analysis.matched.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.matched.map(kw => (
              <KeywordChip key={kw} word={kw} variant="matched" />
            ))}
          </div>
        </div>
      )}

      {/* Missing keywords */}
      {hasMissing && (
        <div>
          <p className="text-xs font-medium text-red-700 mb-1">
            ✗ Keywords you missed ({analysis.missing.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.missing.map(kw => (
              <KeywordChip key={kw} word={kw} variant="missing" />
            ))}
          </div>
        </div>
      )}

      {/* Extra keywords (bonus) */}
      {hasExtra && (
        <div>
          <p className="text-xs font-medium text-blue-700 mb-1">
            + Extra context you added ({analysis.extra.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {analysis.extra.slice(0, 6).map(kw => (
              <KeywordChip key={kw} word={kw} variant="extra" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Camera Not Found Card ─────────────────────────────────────────────────────
function CameraNotFoundCard({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}{label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <VideoOff className="w-4 h-4 shrink-0" />
          <span>Camera not found.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FeedbackScreen({ session, onBackToDashboard, onRetry }: FeedbackScreenProps) {

  const handleSaveReport = () => {
    const report = JSON.stringify(session, null, 2);
    const blob   = new Blob([report], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    a.href       = url;
    a.download   = `interview-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getScoreColor = (score: number) =>
    score >= 85 ? 'text-green-600' :
    score >= 70 ? 'text-blue-600'  :
    score >= 60 ? 'text-yellow-600' : 'text-red-600';

  const getScoreBg = (score: number) =>
    score >= 85 ? 'bg-green-50 border-green-200' :
    score >= 70 ? 'bg-blue-50 border-blue-200'   :
    score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  const getScoreLabel = (score: number) =>
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good'      :
    score >= 60 ? 'Fair'      : 'Needs Improvement';

  // ── KEY FIX: only treat score as valid if it's a number (not null/undefined) ──
  const eyeContactScore = session.eyeContactScore;
  const gestureScore    = session.gestureScore;
  const cameraWasUsed   = eyeContactScore != null && gestureScore != null;

  const metrics = [
  {
    label: 'Confidence',
    value: session.confidence,
    icon: <TrendingUp className="w-5 h-5 text-green-600" />,
    color: 'text-green-600',
    alwaysShow: true,
  },
  {
    label: 'Clarity',
    value: session.clarity,
    icon: <MessageSquare className="w-5 h-5 text-blue-600" />,
    color: 'text-blue-600',
    alwaysShow: true,
  },
  {
    label: 'Relevance',
    value: session.relevance,
    icon: <Lightbulb className="w-5 h-5 text-purple-600" />,
    color: 'text-purple-600',
    alwaysShow: true,
  },
  {
    label: 'Eye Contact',
    value: eyeContactScore,
    icon: <Eye className="w-5 h-5 text-cyan-600" />,
    color: 'text-cyan-600',
    alwaysShow: false,
  },
  {
    label: 'Gestures',
    value: gestureScore,
    icon: <Hand className="w-5 h-5 text-orange-600" />,
    color: 'text-orange-600',
    alwaysShow: false,
  },
];

  const detailedFeedback: DetailedFeedbackItem[] =
    (session as any).detailedFeedback ?? [];

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBackToDashboard}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard
          </Button>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-2" />Try Again
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveReport}>
              <Save className="w-4 h-4 mr-2" />Save Report
            </Button>
          </div>
        </div>

        {/* ── Overall Score ── */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`mb-8 border-2 ${getScoreBg(session.score)}`}>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl">Interview Completed! 🎉</CardTitle>
              <CardDescription>Here's your full performance breakdown</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: 'spring' }}
              >
                <div className={`text-7xl font-bold mb-2 ${getScoreColor(session.score)}`}>
                  {session.score}
                </div>
                <Badge variant="secondary" className="mb-4 text-base px-4 py-1">
                  {getScoreLabel(session.score)}
                </Badge>
                {session.suggestions?.[0] && (
                  <p className="text-gray-600 text-sm max-w-xl mx-auto mt-3 leading-relaxed">
                    {session.suggestions[0]}
                  </p>
                )}
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Metric Cards ── */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {metrics.map(({ label, value, icon, color, alwaysShow }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
            >
              {/* Show "Camera not found" for eye contact / gesture when camera wasn't used */}
              {!alwaysShow && !cameraWasUsed ? (
                <CameraNotFoundCard label={label} icon={icon} />
              ) : (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      {icon}{label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm">Score</span>
                        <span className={`font-semibold ${color}`}>{value as number}%</span>
                      </div>
                      <Progress value={value as number} className="h-2" />
                      <p className="text-xs text-gray-400">{getScoreLabel(value as number)}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>

        {/* ── Per-Question Feedback ── */}
        {detailedFeedback.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Per-Question Feedback
            </h2>

            <div className="space-y-5 mb-8">
              {detailedFeedback.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + i * 0.08 }}
                >
                  <Card className="border-l-4 border-l-blue-400">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <CardTitle className="text-sm font-medium text-gray-700 leading-snug">
                          Q{i + 1}: {item.question}
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap shrink-0">
                          <Badge className="bg-purple-50 text-purple-700 text-xs">
                            Relevance {item.relevance}%
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {item.feedback}
                      </p>
                      {item.keywordAnalysis && (
                        <KeywordAnalysisPanel analysis={item.keywordAnalysis} />
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Answer Summary ── */}
        {session.answers && session.answers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <h2 className="text-lg font-semibold mb-4">Your Answers</h2>
            <div className="space-y-3">
              {session.answers.map((item, i) => (
                <Card key={i} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
                      Q{i + 1}: {item.question}
                    </p>
                    <p className="text-sm text-gray-700">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}