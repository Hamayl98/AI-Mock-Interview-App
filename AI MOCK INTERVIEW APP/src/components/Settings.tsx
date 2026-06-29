//Settings.tsx
import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, User, Briefcase, Target, Moon, Sun, Save, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { useTheme } from '../contexts/ThemeContext';
import type { UserProfile } from '../App';
import { getAuth, deleteUser } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

interface SettingsProps {
  user: UserProfile;
  onBack: () => void;
  onUpdateProfile: (profile: Partial<UserProfile>) => void;
  onAccountDeleted: () => void;
}

export default function Settings({ user, onBack, onUpdateProfile, onAccountDeleted }: SettingsProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [jobType, setJobType] = useState(user.jobType);
  const [goal, setGoal] = useState(user.goal);
  const [saved, setSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSave = () => {
    onUpdateProfile({ name, email, jobType, goal });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    setDeleting(true);
    try {
      // Delete all Firestore sessions for this user
      const sessionsRef = collection(db, 'users', currentUser.uid, 'sessions');
      const snapshot = await getDocs(sessionsRef);
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'users', currentUser.uid, 'sessions', d.id)));
      await Promise.all(deletePromises);

      // Delete the user document itself if it exists
      await deleteDoc(doc(db, 'users', currentUser.uid)).catch(() => {}); // ignore if doesn't exist

      // Delete Firebase Auth user
      await deleteUser(currentUser);

      // Notify App to reset state and go to login
      onAccountDeleted();
    } catch (err: any) {
      setDeleting(false);
      setShowDeleteConfirm(false);
      // If recent login required (Google users), show message
      if (err.code === 'auth/requires-recent-login') {
        alert('For security, please sign out and sign in again before deleting your account.');
      } else {
        alert('Failed to delete account. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-green-600 dark:text-green-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Settings saved!
            </motion.div>
          )}
        </div>

        <div className="mb-8">
          <h1 className="text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account and preferences</p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription className="dark:text-gray-400">Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-gray-200">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="dark:text-gray-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* Career Settings */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Briefcase className="w-5 h-5" />
                Career Information
              </CardTitle>
              <CardDescription className="dark:text-gray-400">Tell us about your career goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobType" className="dark:text-gray-200">Current Job Type</Label>
                <Input
                  id="jobType"
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value)}
                  placeholder="e.g., Software Developer, Designer"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal" className="dark:text-gray-200">Career Goal</Label>
                <Input
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., Land a senior developer role"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
                />
              </div>
            </CardContent>
          </Card>

          {/* App Preferences */}
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <Target className="w-5 h-5" />
                App Preferences
              </CardTitle>
              <CardDescription className="dark:text-gray-400">Customize your experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="darkMode" className="flex items-center gap-2 dark:text-gray-200">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    Dark Mode
                  </Label>
                  <p className="text-gray-500 dark:text-gray-400">Toggle dark theme</p>
                </div>
                <Switch
                  id="darkMode"
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onBack} className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-900/20 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-400">Danger Zone</CardTitle>
              <CardDescription className="dark:text-gray-400">Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent>
              {!showDeleteConfirm ? (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Account
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-300 text-sm">
                        Are you sure you want to delete your account?
                      </p>
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                        This will permanently delete all your interview history and data. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteAccount}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}