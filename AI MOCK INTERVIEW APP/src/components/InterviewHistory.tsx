//InterviewHistory.tsx
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, TrendingUp, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { InterviewSession } from '../App';

interface InterviewHistoryProps {
  sessions: InterviewSession[];
  onBack: () => void;
  onViewSession: (session: InterviewSession) => void;
}

const typeLabels = {
  hr: 'HR Round',
  technical: 'Technical',
  behavioral: 'Behavioral',
  custom: 'Custom'
};

const typeColors = {
  hr: 'bg-blue-100 text-blue-700',
  technical: 'bg-purple-100 text-purple-700',
  behavioral: 'bg-green-100 text-green-700',
  custom: 'bg-orange-100 text-orange-700'
};

export default function InterviewHistory({ sessions, onBack, onViewSession }: InterviewHistoryProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button variant="ghost" onClick={onBack} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-gray-900 mb-2">
            Interview History
          </h1>
          <p className="text-gray-600">
            Review your past interview sessions and track your progress
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center p-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">No Interview History Yet</h3>
              <p className="text-gray-600 mb-6">
                Start your first mock interview to see your history here
              </p>
              <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
                Start First Interview
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-all cursor-pointer" onClick={() => onViewSession(session)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={typeColors[session.type]}>
                            {typeLabels[session.type]}
                          </Badge>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(session.date)}</span>
                          </div>
                        </div>
                        <CardTitle>Mock Interview Session</CardTitle>
                        <CardDescription>
                          {session.jobTitle && (
                            <span className="font-medium text-gray-700">Role: {session.jobTitle} &nbsp;·&nbsp; </span>
                            )}
                            {session.answers.length} questions answered
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Overall Score</span>
                        </div>
                        <div className={`${getScoreColor(session.score)}`}>
                          {session.score}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-gray-600 mb-1">Confidence</div>
                        <div className={`${getScoreColor(session.confidence)}`}>
                          {session.confidence}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">Clarity</div>
                        <div className={`${getScoreColor(session.clarity)}`}>
                          {session.clarity}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 mb-1">Relevance</div>
                        <div className={`${getScoreColor(session.relevance)}`}>
                          {session.relevance}%
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full group">
                      <Eye className="w-4 h-4 mr-2" />
                      View Detailed Feedback
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
