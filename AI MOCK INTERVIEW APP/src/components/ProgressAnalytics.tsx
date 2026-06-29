// ProgressAnalytics.tsx
import { motion } from 'motion/react';
import { ArrowLeft, TrendingUp, Award, Target, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import type { InterviewSession } from '../App';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface ProgressAnalyticsProps {
  sessions: InterviewSession[];
  onBack: () => void;
}

export default function ProgressAnalytics({ sessions, onBack }: ProgressAnalyticsProps) {
  // Calculate statistics
  const averageScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length)
    : 0;

  const averageConfidence = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.confidence, 0) / sessions.length)
    : 0;

  const averageClarity = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.clarity, 0) / sessions.length)
    : 0;

  const averageRelevance = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + s.relevance, 0) / sessions.length)
    : 0;

  const totalPracticeTime = sessions.length * 15; // Assuming 15 min per session

  // Prepare chart data
  const performanceData = sessions.slice(0, 10).reverse().map((session, index) => ({
    name: `Session ${index + 1}`,
    score: session.score,
    confidence: session.confidence,
    clarity: session.clarity,
    relevance: session.relevance
  }));

  const radarData = [
    { subject: 'Confidence', value: averageConfidence, fullMark: 100 },
    { subject: 'Clarity', value: averageClarity, fullMark: 100 },
    { subject: 'Relevance', value: averageRelevance, fullMark: 100 },
  ];

  // Identify weak areas (scores below 75)
  const weakAreas = [];
  if (averageConfidence < 75) weakAreas.push('Confidence');
  if (averageClarity < 75) weakAreas.push('Clarity');
  if (averageRelevance < 75) weakAreas.push('Relevance');

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
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
            Progress & Analytics
          </h1>
          <p className="text-gray-600">
            Track your improvement and identify areas for growth
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card className="text-center p-12">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 mb-2">No Data Available Yet</h3>
              <p className="text-gray-600 mb-6">
                Complete some interviews to see your progress and analytics
              </p>
              <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700 text-white">
                Start First Interview
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Average Score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-blue-700">{averageScore}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Total Sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-purple-700">{sessions.length}</div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Practice Time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-green-700">
                      {Math.floor(totalPracticeTime / 60)}h {totalPracticeTime % 60}m
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <CardHeader className="pb-3">
                    <CardDescription className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Best Score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-orange-700">
                      {Math.max(...sessions.map(s => s.score))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Performance Over Time</CardTitle>
                  <CardDescription>Your scores across recent sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Overall Score"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="confidence" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="Confidence"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="clarity" 
                        stroke="#22c55e" 
                        strokeWidth={2}
                        name="Clarity"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="relevance" 
                        stroke="#f97316" 
                        strokeWidth={2}
                        name="Relevance"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Skills Radar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Skills Overview</CardTitle>
                    <CardDescription>Your average performance by category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar 
                          name="Skills" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          fill="#3b82f6" 
                          fillOpacity={0.6} 
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Improvement Areas */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Areas to Focus On</CardTitle>
                    <CardDescription>Suggested practice modules based on your performance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {weakAreas.length > 0 ? (
                      weakAreas.map((area, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">{area}</span>
                            <Badge variant="secondary">Needs Attention</Badge>
                          </div>
                          <Progress 
                            value={
                              area === 'Confidence' ? averageConfidence :
                              area === 'Clarity' ? averageClarity :
                              averageRelevance
                            } 
                            className="h-2" 
                          />
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Confidence</span>
                            <Badge className="bg-green-600">Strong</Badge>
                          </div>
                          <Progress value={averageConfidence} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Clarity</span>
                            <Badge className="bg-green-600">Strong</Badge>
                          </div>
                          <Progress value={averageClarity} className="h-2" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-700">Relevance</span>
                            <Badge className="bg-green-600">Strong</Badge>
                          </div>
                          <Progress value={averageRelevance} className="h-2" />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
