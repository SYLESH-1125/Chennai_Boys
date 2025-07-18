"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import {
  BookOpen,
  BarChart3,
  Users,
  Trophy,
  Settings,
  Home,
  CheckCircle,
  Clock,
  Eye,
  Star,
  TrendingUp,
  TrendingDown,
  LogOut,
} from "lucide-react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js"
import { Line } from "react-chartjs-2"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase";
import jsPDF from 'jspdf';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface QuizData {
  id: number
  title: string
  subject: string
  duration: string
  date: string
  score: number | null
  status: "completed" | "available" | "upcoming"
  difficulty: "Easy" | "Medium" | "Hard"
  attempts: number
}

interface StudentData {
  name: string
  section: string
  score: number
  rank: number
  online: boolean
  isCurrentUser?: boolean
}

// Helper functions for safe name handling
const getDisplayName = (user: { name?: string; email?: string }) =>
  user.name && user.name.trim().length > 0 ? user.name : (user.email?.split("@")[0] ?? "User")

const getFirstName = (displayName: string) => displayName.split(" ")[0]

const getInitials = (displayName: string) =>
  displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

function useStudentProfile(userId: any) {
  const [student, setStudent] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchStudent = async () => {
      const { data, error } = await supabase
        .from('students')
        .select('avg_score, avg_accuracy, avg_time_spent, best_score, lowest_score, quizzes_taken, quiz_history')
        .eq('id', userId)
        .single();
      setStudent(data);
    };
    fetchStudent();
  }, [userId]);

  return student;
}

export default function StudentDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState("dashboard");
  const [sortLevel, setSortLevel] = useState("College Level");
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [classmates, setClassmates] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState({ averageScore: 0, totalQuizzes: 0, completed: 0 });
  // Leaderboard state and fetch
  const [activeLeaderboard, setActiveLeaderboard] = useState("College Level");
  const [collegeStudents, setCollegeStudents] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [sectionStudents, setSectionStudents] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Fetch student analytics fields from students table
  useEffect(() => {
    const fetchStudentAnalytics = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('students')
        .select('avg_score, avg_accuracy, avg_time_spent, best_score, lowest_score, quizzes_taken')
        .eq('id', user.id)
        .single();
      if (data) setStudentProfile((prev: any) => ({ ...prev, ...data }));
    };
    if (user) fetchStudentAnalytics();
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single();
      setStudentProfile(data);
    };
    if (user) fetchProfile();
  }, [user]);


  useEffect(() => {
    const fetchQuizResults = async () => {
      setLoadingData(true);
      if (!user) return;
      const { data, error } = await supabase
        .from('quiz_results')
        .select('*, quizzes(*)')
        .eq('student_id', user.id)
        .order('taken_at', { ascending: false });
      setQuizResults(data || []);
      setLoadingData(false);
    };
    if (user) fetchQuizResults();

    // Real-time subscription for quiz_results
    let subscription: any = null;
    // Helper functions to refetch all student views
    const refetchAllStudentViews = async () => {
      await fetchQuizResults();
      // Refetch analytics
      if (user) {
        const { data } = await supabase
          .from('quiz_results')
          .select('*')
          .eq('student_id', user.id);
        if (data) {
          const completed = data.filter(q => q.status === 'completed').length;
          const averageScore = data.length > 0
            ? Math.round(data.filter(q => q.score !== null).reduce((sum, q) => sum + (q.score || 0), 0) / data.filter(q => q.score !== null).length)
            : 0;
          setAnalytics({ averageScore, totalQuizzes: data.length, completed });
        }
      }
      // Refetch classmates and leaderboard
      if (studentProfile) {
        const { data: classmatesData } = await supabase
          .from('students')
          .select('*')
          .eq('department', studentProfile.department)
          .eq('section', studentProfile.section);
        setClassmates(classmatesData || []);
        const { data: leaderboardData } = await supabase
          .from('students')
          .select('*')
          .eq('department', studentProfile.department)
          .eq('section', studentProfile.section)
          .order('score', { ascending: false });
        setLeaderboard(leaderboardData || []);
      }
    };

    if (user) {
      subscription = supabase
        .channel('student-quiz-results')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'quiz_results',
            filter: `student_id=eq.${user.id}`,
          },
          (payload) => {
            // Refetch all student views on any insert/update/delete for this student
            refetchAllStudentViews();
          }
        )
        .subscribe();
    }
    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [user, studentProfile]);

  useEffect(() => {
    const fetchClassmatesAndLeaderboard = async () => {
      if (!studentProfile) return;
      // Fetch classmates (same department and section)
      const { data: classmatesData } = await supabase
        .from('students')
        .select('*')
        .eq('department', studentProfile.department)
        .eq('section', studentProfile.section);
      console.log('Fetched classmates:', classmatesData, 'For department:', studentProfile.department, 'section:', studentProfile.section);
      setClassmates(classmatesData || []);
      // Fetch leaderboard (same department and section, sorted by score desc)
      const { data: leaderboardData } = await supabase
        .from('students')
        .select('*')
        .eq('department', studentProfile.department)
        .eq('section', studentProfile.section)
        .order('score', { ascending: false });
      setLeaderboard(leaderboardData || []);
    };
    if (studentProfile) fetchClassmatesAndLeaderboard();
  }, [studentProfile]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('quiz_results')
        .select('*')
        .eq('student_id', user.id);
      if (data) {
        const completed = data.filter(q => q.status === 'completed').length;
        const averageScore = data.length > 0
          ? Math.round(data.filter(q => q.score !== null).reduce((sum, q) => sum + (q.score || 0), 0) / data.filter(q => q.score !== null).length)
          : 0;
        setAnalytics({ averageScore, totalQuizzes: data.length, completed });
      }
    };
    if (user) fetchAnalytics();
  }, [user]);

  useEffect(() => {
    const fetchLeaderboards = async () => {
      // College Level: all students, sorted by avg_score descending
      const { data: college, error: collegeError } = await supabase
        .from('students')
        .select('id, name, department, section, avg_score, quizzes_taken')
        .order('avg_score', { ascending: false });
      console.log('College students:', college, 'Error:', collegeError);
      setCollegeStudents(college || []);
      // Department Level: students in same department, sorted by avg_score descending
      if (studentProfile) {
        const { data: dept, error: deptError } = await supabase
          .from('students')
          .select('id, name, department, section, avg_score, quizzes_taken')
          .eq('department', studentProfile.department)
          .order('avg_score', { ascending: false });
        console.log('Department students:', dept, 'Error:', deptError);
        setClassStudents(dept || []);
      }
      // Section Level: students in same department and section, sorted by avg_score descending
      if (studentProfile) {
        const { data: sect, error: sectError } = await supabase
          .from('students')
          .select('id, name, department, section, avg_score, quizzes_taken')
          .eq('department', studentProfile.department)
          .eq('section', studentProfile.section)
          .order('avg_score', { ascending: false });
        console.log('Section students:', sect, 'Error:', sectError);
        setSectionStudents(sect || []);
      }
    };
    if (studentProfile) fetchLeaderboards();
  }, [studentProfile]);

  useEffect(() => {
    if (!studentProfile) return;
    // Subscribe to all changes in the students table
    const studentsChannel = supabase
      .channel('students-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          // Refetch all leaderboard levels on any change
          // fetchLeaderboards is defined in the same scope
          fetchLeaderboards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
    };
  }, [studentProfile]);

  const student = useStudentProfile(user?.id);
  const quizHistory = student?.quiz_history || [];

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Calculate stats from quizResults
  const stats = {
    totalQuizzes: analytics.totalQuizzes,
    completed: analytics.completed,
    averageScore: analytics.averageScore,
    classRank: leaderboard.findIndex(l => l.id === user.id) + 1 || 1
  };

  // Use quizResults for recent quizzes
  const recentQuizzes = quizResults.slice(0, 3);

  // Enhanced analytics from quiz_results for the current student
  const completedQuizzes = quizResults.filter(q => q.status === 'completed');
  const avgScore = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, q) => sum + (q.score || 0), 0) / completedQuizzes.length)
    : 0;
  const avgAccuracy = completedQuizzes.length
    ? Math.round(
        completedQuizzes.reduce((sum, q) => sum + ((q.correct_answers || 0) / (q.total_questions || 1)), 0) / completedQuizzes.length * 100
      )
    : 0;
  const avgTimeSpent = completedQuizzes.length
    ? Math.round(completedQuizzes.reduce((sum, q) => sum + (q.time_spent || 0), 0) / completedQuizzes.length)
    : 0;
  const bestScore = completedQuizzes.length
    ? Math.max(...completedQuizzes.map(q => q.score || 0))
    : 0;
  const worstScore = completedQuizzes.length
    ? Math.min(...completedQuizzes.map(q => q.score || 0))
    : 0;
  const recentQuizzesHistory = completedQuizzes.slice(0, 5);

  // Find most commonly missed question (by question id)
  const missedCounts: Record<string, number> = {};
  completedQuizzes.forEach(q => {
    if (q.answers && typeof q.answers === 'object') {
      Object.entries(q.answers).forEach(([qid, answer]) => {
        // If answer is wrong, increment missed count
        // (Assume you have access to quiz.questions to check correct answer, or store correct/incorrect in answers)
        // For now, just count all answers (customize as needed)
        // missedCounts[qid] = (missedCounts[qid] || 0) + 1;
      });
    }
  });
  // For demo, leave mostMissedQuestion blank (requires more data structure)
  const mostMissedQuestion = Object.entries(missedCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Chart data: Use real quiz results for performance trend
  const performanceTrend = quizResults
    .filter(q => q.score !== null && q.taken_at)
    .sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
  const chartData = {
    labels: performanceTrend.map(q => {
      const d = new Date(q.taken_at);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    datasets: [
      {
        label: "Performance Trend",
        data: performanceTrend.map(q => q.score),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Performance Over Time",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  }

  // Subject performance: Calculate average score per subject
  const subjectScores: Record<string, { total: number; count: number }> = {};
  quizResults.forEach(q => {
    const subject = q.quizzes?.subject || "Unknown";
    if (!subjectScores[subject]) subjectScores[subject] = { total: 0, count: 0 };
    if (q.score !== null) {
      subjectScores[subject].total += q.score;
      subjectScores[subject].count += 1;
    }
  });
  const subjectPerformance = Object.entries(subjectScores).map(([subject, { total, count }]) => ({
    subject,
    avg: count > 0 ? Math.round(total / count) : 0,
  }));

  const displayName = getDisplayName({ name: user.user_metadata?.full_name || user.user_metadata?.name, email: user.email })
  const firstName = getFirstName(displayName)
  const initials = getInitials(displayName)

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", icon: Home },
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "quizzes", label: "Quizzes", icon: BookOpen },
    { key: "classmates", label: "Classmates", icon: Users },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
    { key: "settings", label: "Settings", icon: Settings },
  ]

  const renderDashboard = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back to your learning hub</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-2xl font-bold">{stats.totalQuizzes}</p>
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +5.4%
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <div className="flex items-center text-sm text-green-600">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +8.0%
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">{stats.averageScore}%</p>
                <div className="flex items-center text-sm text-red-600">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  -4.5%
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Class Rank</p>
                <p className="text-2xl font-bold">#{stats.classRank}</p>
                <div className="flex items-center text-sm text-red-600">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  -6.5%
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAnalytics = () => {
    // Prepare data for performance trend graph
    const quizHistorySorted = [...quizHistory].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime());
    const chartData = {
      labels: quizHistorySorted.map(q => q.taken_at ? new Date(q.taken_at).toLocaleDateString() : ""),
      datasets: [
        {
          label: "Score",
          data: quizHistorySorted.map(q => q.score),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          tension: 0.4,
        },
      ],
    };
    const chartOptions = {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Performance Over Time" },
      },
      scales: { y: { beginAtZero: true, max: 100 } },
    };
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Detailed performance insights</p>
        </div>
        {/* Analytics from students table */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-1">Average Score</div>
              <div className="text-3xl font-bold">{student?.avg_score ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-1">Average Accuracy</div>
              <div className="text-3xl font-bold">{student?.avg_accuracy ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-1">Average Time Spent</div>
              <div className="text-3xl font-bold">{Math.floor((student?.avg_time_spent ?? 0) / 60)}m {(student?.avg_time_spent ?? 0) % 60}s</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-1">Best Score</div>
              <div className="text-3xl font-bold">{student?.best_score ?? 0}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-gray-600 mb-1">Lowest Score</div>
              <div className="text-3xl font-bold">{student?.lowest_score ?? 0}%</div>
            </CardContent>
          </Card>
        </div>
        <div className="mt-4 text-lg font-medium">Quizzes Taken: {student?.quizzes_taken ?? 0}</div>
        {/* Performance Trend Graph */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>Your quiz performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            {quizHistory.length === 0 ? (
              <div className="text-gray-500">No quiz data available.</div>
            ) : (
              <div className="h-96 min-h-[350px] w-full flex items-center justify-center bg-white rounded-lg border p-4">
                <Line
                  data={chartData}
                  options={{
                    ...chartOptions,
                    maintainAspectRatio: false,
                    scales: {
                      ...chartOptions.scales,
                      y: {
                        ...chartOptions.scales.y,
                        max: 20,
                        min: 0,
                        ticks: { stepSize: 1 }
                      }
                    }
                  }}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Real-time quizzes attended by the user (most recent first)
  const attendedQuizzes = quizResults
    .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime());

  const renderQuizzes = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Quizzes</h1>
        <p className="text-gray-600">All your quiz activities (real-time)</p>
        <Button
          variant="primary"
          size="lg"
          className="mt-6 mb-6 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg rounded-lg flex items-center gap-2 animate-pulse"
          onClick={() => router.push('/quiz/join')}
        >
          <BookOpen className="w-5 h-5 mr-2" />
          Attend Quiz
        </Button>
      </div>

      {/* Table of All Attended Quizzes (Full History) */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Quiz</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Accuracy</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Time Spent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {quizHistory.length > 0 ? (
                  quizHistory.map((quiz, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{quiz.title || quiz.quiz_id}</td>
                      <td className="py-3 px-4">{quiz.score}%</td>
                      <td className="py-3 px-4">{Math.round((quiz.correct_answers / quiz.total_questions) * 100)}%</td>
                      <td className="py-3 px-4">{Math.floor(quiz.time_spent / 60)}m {quiz.time_spent % 60}s</td>
                      <td className="py-3 px-4">{quiz.taken_at ? new Date(quiz.taken_at).toLocaleString() : ''}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-gray-400">No quizzes taken yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  // Replace renderClassmates with renderDownloadQuestions
  const renderDownloadQuestions = (downloading, setDownloading) => {
    console.log('Full quizHistory:', quizHistory);
    const handleDownload = async (quiz) => {
      const quizId = quiz.quiz_id || quiz.id;
      console.log('Attempting to fetch quiz with id:', quizId, 'from quiz object:', quiz);
      if (!quizId) {
        alert('Quiz ID is missing for this quiz history entry. Quiz object: ' + JSON.stringify(quiz));
        return;
      }
      setDownloading(quizId);
      try {
        // Fetch quiz questions from quizzes table using quiz_id
        const { data: quizData, error } = await supabase
          .from('quizzes')
          .select('questions, title')
          .eq('id', quizId)
          .single();
        console.log('Fetched quizData:', quizData, 'Error:', error);
        if (error || !quizData || !quizData.questions) {
          alert('Could not fetch questions for this quiz. Used quizId: ' + quizId + '\nQuiz object: ' + JSON.stringify(quiz) + '\nSupabase error: ' + (error ? JSON.stringify(error) : 'No error object') + '\nQuizData: ' + JSON.stringify(quizData));
          setDownloading(null);
          return;
        }
        const questions = quizData.questions;
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(quiz.title || quizData.title || quizId || 'Quiz', 10, 15);
        doc.setFontSize(12);
        let y = 30;
        questions.forEach((q, idx) => {
          doc.text(`${idx + 1}. ${q.question}`, 10, y);
          y += 8;
          // Get student's answer
          let studentAnswer = quiz.answers ? quiz.answers[q.id] : undefined;
          let studentAnswerText = 'N/A';
          if (q.type === 'multiple-choice' && Array.isArray(q.options) && typeof studentAnswer === 'number') {
            studentAnswerText = q.options[studentAnswer] ?? 'N/A';
          } else if (q.type === 'true-false' && Array.isArray(q.options)) {
            if (typeof studentAnswer === 'string') {
              studentAnswerText = studentAnswer.charAt(0).toUpperCase() + studentAnswer.slice(1);
            } else if (typeof studentAnswer === 'number') {
              studentAnswerText = q.options[studentAnswer] ?? 'N/A';
            }
          } else if (typeof studentAnswer === 'string') {
            studentAnswerText = studentAnswer;
          }
          doc.text(`Your answer: ${studentAnswerText}`, 14, y);
          y += 8;
          // Handle correct answer for different question types
          let correctAnswerText = 'N/A';
          if (q.type === 'multiple-choice' && Array.isArray(q.options) && typeof q.correctAnswer === 'number') {
            correctAnswerText = q.options[q.correctAnswer] ?? 'N/A';
          } else if (q.type === 'true-false' && Array.isArray(q.options)) {
            if (typeof q.correctAnswer === 'string') {
              correctAnswerText = q.correctAnswer.charAt(0).toUpperCase() + q.correctAnswer.slice(1);
            } else if (typeof q.correctAnswer === 'number') {
              correctAnswerText = q.options[q.correctAnswer] ?? 'N/A';
            }
          } else if (typeof q.correctAnswer === 'string') {
            correctAnswerText = q.correctAnswer;
          }
          doc.text(`Correct answer: ${correctAnswerText}`, 14, y);
          y += 8;
          if (q.description) {
            doc.text(`Explanation: ${q.description}`, 14, y);
            y += 10;
          } else {
            y += 2;
          }
          y += 2;
          if (y > 270) { doc.addPage(); y = 20; }
        });
        doc.save(`${quiz.title || quizData.title || quizId || 'quiz'}.pdf`);
      } catch (e) {
        alert('An error occurred while generating the PDF.');
      }
      setDownloading(null);
    };

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Download Questions</h1>
          <p className="text-gray-600">Download your quiz questions and answers as PDF</p>
        </div>
        <div className="space-y-4">
          {quizHistory.length === 0 ? (
            <div className="text-gray-500">No quiz history available.</div>
          ) : (
            quizHistory.map((quiz, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white rounded shadow">
                <div className="font-medium">{quiz.title || quiz.quiz_id}</div>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold shadow disabled:opacity-60"
                  onClick={() => handleDownload(quiz)}
                  disabled={downloading === (quiz.quiz_id || quiz.id)}
                >
                  {downloading === (quiz.quiz_id || quiz.id) ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    let leaderboardData = [];
    if (activeLeaderboard === "College Level") leaderboardData = collegeStudents;
    else if (activeLeaderboard === "Department Level") leaderboardData = classStudents;
    else leaderboardData = sectionStudents;
    console.log('Rendering leaderboardData:', leaderboardData);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            <p className="text-gray-600">See how you rank against peers</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Live • Updates every 30 seconds
          </div>
        </div>
        {/* Tabs for leaderboard level */}
        <div className="flex gap-2 mb-4">
          {["College Level", "Department Level", "Section Level"].map((level) => (
            <Button
              key={level}
              variant={activeLeaderboard === level ? "default" : "outline"}
              onClick={() => setActiveLeaderboard(level)}
              className={activeLeaderboard === level ? "bg-blue-600" : ""}
            >
              {level}
            </Button>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
            <CardDescription>Current standings based on quiz performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboardData.map((studentRow, index) => (
                <div
                  key={studentRow.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    studentRow.id === student?.id ? "bg-blue-50 border-l-4 border-blue-500" : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index < 3 ? "bg-yellow-500 text-white" : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {index < 3 ? <Trophy className="w-4 h-4" /> : index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{studentRow.name}</span>
                        {index < 3 && <Star className="w-4 h-4 text-yellow-500" />}
                      </div>
                      <div className="text-sm text-gray-600">
                        {studentRow.department} • {studentRow.section}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{studentRow.avg_score ?? 0}%</div>
                    <div className="text-sm text-gray-600">
                      {studentRow.quizzes_taken} quizzes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{displayName}</h3>
              <p className="text-gray-600">{user.email}</p>
              <Badge variant="secondary">Student</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={displayName} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={user.email} className="mt-1" />
            </div>
          </div>

          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="quiz-reminders" />
            <label htmlFor="quiz-reminders" className="text-sm font-medium">
              Quiz reminders
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="score-updates" />
            <label htmlFor="score-updates" className="text-sm font-medium">
              Score updates
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="leaderboard-changes" />
            <label htmlFor="leaderboard-changes" className="text-sm font-medium">
              Leaderboard changes
            </label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeView) {
      case "analytics":
        return renderAnalytics()
      case "quizzes":
        return renderQuizzes()
      case "classmates":
        return renderDownloadQuestions(downloading, setDownloading);
      case "leaderboard":
        return renderLeaderboard()
      case "settings":
        return renderSettings()
      default:
        return renderDashboard()
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Quiz Portal</h2>
              <p className="text-sm text-gray-600">Student Panel</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeView === item.key ? "bg-gray-100 text-blue-600" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-blue-100 text-blue-600">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{displayName}</p>
              <p className="text-sm text-gray-600">student</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={async () => { await signOut(); router.push("/login"); }} className="w-full justify-start bg-transparent">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{renderContent()}</div>
      </div>
    </div>
  )
}
