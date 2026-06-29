import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, TrendingUp, Award, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';

interface OnboardingProps {
  onGetStarted: () => void;
}

const slides = [
  {
    icon: Brain,
    title: 'AI-Powered Practice',
    description: 'Practice with our advanced AI that simulates real interview scenarios tailored to your career goals.'
  },
  {
    icon: TrendingUp,
    title: 'Track Your Progress',
    description: 'Monitor your improvement over time with detailed analytics and personalized insights.'
  },
  {
    icon: Award,
    title: 'Build Confidence',
    description: 'Get instant feedback on your answers and learn what makes a great interview response.'
  }
];

export default function Onboarding({ onGetStarted }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onGetStarted();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-8 max-w-md mx-auto">
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center text-center"
          >
            <div className="mb-8 p-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
              {(() => {
                const Icon = slides[currentSlide].icon;
                return <Icon className="w-16 h-16 text-white" strokeWidth={1.5} />;
              })()}
            </div>
            
            <h2 className="mb-4 text-gray-900">
              {slides[currentSlide].title}
            </h2>
            
            <p className="text-gray-600 max-w-sm">
              {slides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full space-y-6">
        <div className="flex justify-center gap-2">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'w-8 bg-blue-600' 
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            className={`bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ${
              currentSlide === 0 ? 'flex-1' : 'flex-1'
            }`}
          >
            {currentSlide === slides.length - 1 ? 'Get Started' : 'Next'}
            {currentSlide !== slides.length - 1 && (
              <ChevronRight className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}