import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Briefcase } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import type { JobInfo } from '../services/geminiService';

interface JobInfoInputProps {
  onSubmit: (jobInfo: JobInfo) => void;
  onBack: () => void;
}

export default function JobInfoInput({ onSubmit, onBack }: JobInfoInputProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');

  const handleStartInterview = () => {
    if (jobTitle && jobDescription && yearsOfExperience) {
      onSubmit({ jobTitle, jobDescription, yearsOfExperience });
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4"
          >
            <Briefcase className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-gray-900 dark:text-gray-100 mb-2">
            Tell Us About Your Role
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Our AI will generate personalized interview questions tailored to your experience and skills
          </p>
        </div>

        <Card className="p-8 dark:bg-gray-800 dark:border-gray-700">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Label htmlFor="jobTitle" className="text-gray-700 dark:text-gray-200 mb-2 block">
                Job Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Senior Software Developer, Product Manager, Data Scientist"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Label htmlFor="jobDescription" className="text-gray-700 dark:text-gray-200 mb-2 block">
                Skills & Expertise <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="jobDescription"
                placeholder="e.g., React, JavaScript, Node.js, Python, TypeScript, REST APIs, Database Design, Agile Methodologies, Team Leadership, Project Management"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="min-h-[140px] resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
              />
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                List your key skills, technologies, and areas of expertise. The more details you provide, the better our AI can tailor questions to your profile.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Label htmlFor="experience" className="text-gray-700 dark:text-gray-200 mb-2 block">
                Years of Experience <span className="text-red-500">*</span>
              </Label>
              <Input
                id="experience"
                type="number"
                placeholder="e.g., 3"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                className="w-full dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400"
                min="0"
                max="50"
              />
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                This helps us adjust the difficulty and depth of questions
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="pt-6 border-t dark:border-gray-700"
            >
              <Button
                onClick={handleStartInterview}
                disabled={!jobTitle || !jobDescription || !yearsOfExperience}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                size="lg"
              >
                Start AI-Powered Interview
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </div>
        </Card>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            💡 <span className="font-medium">Tip:</span> Be specific about your skills to get the most relevant practice questions
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
