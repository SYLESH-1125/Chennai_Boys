"use client"

import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  RadialLinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
} from "chart.js";
// Register Chart.js components globally (fixes 'linear' scale error)
if (typeof window !== "undefined" && !(window)._chartjsRegistered) {
  ChartJS.register(
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    RadialLinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
    Title
  );
  window._chartjsRegistered = true;
}

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BookOpen,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  TrendingUp,
  TrendingDown,
  User,
  Home,
  Brain,
  CheckCircle,
  Activity,
  Download,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  FileText,
  Upload,
  Eye,
  Edit,
  Copy,
  X,
  Flame,
  Filter,
  Clock,
  Minus,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Line, Radar, Pie } from "./_chartDynamic"
import { useAuth } from "@/contexts/auth-context"
import { generateAnalyticsExportPDF, generatePerformanceReportPDF } from "@/lib/analytics-pdf-generator"

// Navigation items
const facultyNavItems = [
  { key: "dashboard", title: "Dashboard", icon: Home, isActive: true },
  { key: "analytics", title: "Smart Analytics", icon: Brain, badge: "AI", badgeVariant: "default" as const },
  { key: "quiz-studio", title: "Quiz Studio", icon: BookOpen, badge: "3", badgeVariant: "secondary" as const },
  { key: "student-hub", title: "Student Hub", icon: Users },
  { key: "settings", title: "Settings", icon: Settings },
]

export default function FacultyDashboard() {
  const { user, loading, signOut } = useAuth();
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState("Section Level");
  const router = useRouter();
  // Quizzes state (fetched from Supabase)
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  
  // Modal states for quiz actions
  const [viewQuizModal, setViewQuizModal] = useState<{ isOpen: boolean; quiz: any }>({ isOpen: false, quiz: null });
  const [analyticsModal, setAnalyticsModal] = useState<{ isOpen: boolean; quiz: any }>({ isOpen: false, quiz: null });
  const [copyingQuiz, setCopyingQuiz] = useState<string | null>(null);
  
  // Student names mapping (studentid -> student name)
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});

  // Fetch quizzes from Supabase when user is loaded
  useEffect(() => {
    async function fetchQuizzes() {
      if (!user) return;
      setQuizzesLoading(true);
      try {
        // Import Supabase client
        const { supabase } = await import("@/lib/supabase");
        // Filter by createdby (faculty user id)
        const { data, error } = await supabase
          .from("quizzes")
          .select("*")
          .eq("createdby", user.id);
        if (error) {
          setQuizzes([]);
        } else {
          setQuizzes(data || []);
        }
      } catch (err) {
        setQuizzes([]);
      }
      setQuizzesLoading(false);
    }
    if (user) fetchQuizzes();
  }, [user]);

  // Fetch quiz results for quizzes created by this faculty
  useEffect(() => {
    let channel: any = null;
    async function fetchResultsAndSubscribe() {
      if (!user) return;
      setResultsLoading(true);
      const { supabase } = await import("@/lib/supabase");
      // Get all quiz codes created by this user
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("code")
        .eq("createdby", user.id);
      const quizCodes = (quizData || []).map((q: any) => q.code);
      if (quizCodes.length === 0) {
        setQuizResults([]);
        setResultsLoading(false);
        return;
      }
      // Fetch all results for these quizzes
      const { data: resultsData } = await supabase
        .from("quiz_results")
        .select("*")
        .in("quizcode", quizCodes);
      setQuizResults(resultsData || []);
      setResultsLoading(false);

      // Real-time subscription for quiz_results
      channel = supabase.channel('faculty-quiz-results')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'quiz_results',
        }, (payload: any) => {
          // Only update if the quizcode matches one of this faculty's quizzes
          if (quizCodes.includes(payload.new.quizcode)) {
            setQuizResults(prev => [...prev, payload.new]);
          }
        })
        .subscribe();
    }
    fetchResultsAndSubscribe();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [user]);

  // Fetch student names for quiz results
  useEffect(() => {
    const fetchStudentNames = async () => {
      if (!quizResults || quizResults.length === 0) return;
      
      // Get unique student IDs
      const studentIds = [...new Set(quizResults.map(r => r.studentid))];
      
      try {
        const { supabase } = await import("@/lib/supabase");
        
        // Try to fetch from students table first
        const { data: studentsData } = await supabase
          .from("students")
          .select("id, name")
          .in("id", studentIds);

        // Create name mapping from students table
        const namesFromStudents: Record<string, string> = {};
        if (studentsData) {
          studentsData.forEach(student => {
            namesFromStudents[student.id] = student.name;
          });
        }

        // For any missing names, try to get from auth.users
        const missingIds = studentIds.filter(id => !namesFromStudents[id]);
        if (missingIds.length > 0) {
          // Note: Direct auth.users query might not work due to RLS, 
          // so we'll use a fallback format
          missingIds.forEach(id => {
            if (!namesFromStudents[id]) {
              // Create a readable name from student ID
              namesFromStudents[id] = `Student ${id.substring(0, 8)}`;
            }
          });
        }

        setStudentNames(namesFromStudents);
      } catch (error) {
        console.error('Error fetching student names:', error);
        // Fallback: create readable names from student IDs
        const fallbackNames: Record<string, string> = {};
        studentIds.forEach(id => {
          fallbackNames[id] = `Student ${id.substring(0, 8)}`;
        });
        setStudentNames(fallbackNames);
      }
    };

    fetchStudentNames();
  }, [quizResults]);

  // Aggregate stats for dashboard, quiz studio, analytics
  const analytics = useMemo(() => {
    if (!quizResults || quizResults.length === 0) return {
      totalQuizzes: quizzes?.length || 0,
      totalSubmissions: 0,
      avgScore: 0,
      completionRate: 0,
      activeStudents: 0,
      recentActivities: [],
      quizStats: {},
    };
    const totalSubmissions = quizResults.length;
    const avgScore = Math.round(
      quizResults.reduce((sum, r) => sum + (r.score || 0), 0) / (quizResults.length || 1)
    );
    // Calculate active students (unique students who have submitted quizzes)
    const activeStudents = new Set(quizResults.map(r => r.studentid)).size;
    // Completion rate: percent of quizzes with at least one submission
    const quizCodes = Array.from(new Set(quizResults.map(r => r.quizcode)));
    const completionRate = Math.round(
      (quizCodes.length / (quizzes.length || 1)) * 100
    );
    // Recent activities: last 10 submissions
    const recentActivities = quizResults
      .sort((a, b) => new Date(b.submittedat).getTime() - new Date(a.submittedat).getTime())
      .slice(0, 10)
      .map(r => ({
        type: "submission",
        student: studentNames[r.studentid] || `Student ${r.studentid.substring(0, 8)}`,
        quiz: r.quizcode,
        score: r.score,
        time: new Date(r.submittedat).toLocaleString(),
        achievement: r.achievement || "", // Add achievement property (empty string if not present)
        question: r.question || "", // Add question property (empty string if not present)
      }));
    // Quiz stats for quiz studio
    const quizStats: Record<string, { submissions: number; avgScore: number; strongAreas: string[]; weakAreas: string[] }> = {};
    quizCodes.forEach(code => {
      const results = quizResults.filter(r => r.quizcode === code);
      // Dummy strong/weak areas for demonstration; replace with real logic if available
      const strongAreas: string[] = []; // e.g., results.filter(...).map(...)
      const weakAreas: string[] = [];
      quizStats[code] = {
        submissions: results.length,
        avgScore: Math.round(results.reduce((sum, r) => sum + (r.score || 0), 0) / (results.length || 1)),
        strongAreas,
        weakAreas,
      };
    });
    return { 
      totalQuizzes: quizzes.length,
      totalSubmissions, 
      avgScore, 
      completionRate, 
      activeStudents, 
      recentActivities, 
      quizStats 
    };
  }, [quizResults, quizzes, studentNames]);

  // Generate AI Teaching Assistant Insights
  const aiInsights = useMemo(() => {
    if (!quizResults || !quizzes || quizResults.length === 0) {
      return {
        performanceTrend: { text: "Collecting data...", subtitle: "Please wait for analysis" },
        engagementAlert: { text: "Initializing insights...", subtitle: "Loading student data" },
        recommendation: { text: "Preparing recommendations...", subtitle: "Based on current data" }
      };
    }

    // Calculate performance trends
    const recentResults = quizResults.filter(result => {
      const submissionDate = new Date(result.submittedat);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return submissionDate >= thirtyDaysAgo;
    });

    // Performance trend analysis
    const totalQuizzes = quizzes.length;
    const averageScore = recentResults.length > 0 
      ? (recentResults.reduce((sum, result) => sum + (result.score || 0), 0) / recentResults.length).toFixed(1)
      : 0;

    let performanceTrend;
    const avgScoreNum = Number(averageScore);
    if (avgScoreNum >= 80) {
      performanceTrend = {
        text: `Excellent performance with ${averageScore}% average`,
        subtitle: "Students are excelling across subjects"
      };
    } else if (avgScoreNum >= 65) {
      performanceTrend = {
        text: `Good progress with ${averageScore}% average`,
        subtitle: "Steady improvement in quiz scores"
      };
    } else if (avgScoreNum >= 50) {
      performanceTrend = {
        text: `Average performance at ${averageScore}%`,
        subtitle: "Room for improvement identified"
      };
    } else {
      performanceTrend = {
        text: `Performance needs attention (${averageScore}%)`,
        subtitle: "Consider additional support strategies"
      };
    }

    // Engagement alert analysis
    const lowPerformingCount = recentResults.filter(result => (result.score || 0) < 60).length;
    const uniqueStudents = new Set(recentResults.map(r => r.studentid)).size;
    const totalUniqueStudents = new Set(quizResults.map(r => r.studentid)).size;
    const participationRate = totalUniqueStudents > 0 ? ((uniqueStudents / totalUniqueStudents) * 100) : 0;

    let engagementAlert;
    if (lowPerformingCount > uniqueStudents * 0.3) {
      engagementAlert = {
        text: `${lowPerformingCount} students need support`,
        subtitle: "in foundational concepts"
      };
    } else if (participationRate < 70) {
      engagementAlert = {
        text: `${(100 - participationRate).toFixed(0)}% students less active`,
        subtitle: "Consider engagement strategies"
      };
    } else {
      engagementAlert = {
        text: `High engagement: ${participationRate.toFixed(0)}% active`,
        subtitle: "Students are well-engaged"
      };
    }

    // Recommendation based on data patterns
    const subjects = [...new Set(quizzes.map(q => q.subject))];
    const subjectPerformance = subjects.map(subject => {
      const subjectQuizzes = quizzes.filter(q => q.subject === subject);
      const subjectResults = recentResults.filter(result => 
        subjectQuizzes.some(quiz => quiz.id === result.quizid)
      );
      const avgScore = subjectResults.length > 0 
        ? subjectResults.reduce((sum, result) => sum + (result.score || 0), 0) / subjectResults.length
        : 0;
      return { subject, avgScore };
    }).sort((a, b) => a.avgScore - b.avgScore);

    let recommendation;
    if (subjectPerformance.length > 0) {
      const weakestSubject = subjectPerformance[0];
      if (weakestSubject.avgScore < 60) {
        recommendation = {
          text: `Focus on ${weakestSubject.subject} concepts`,
          subtitle: `Average score: ${weakestSubject.avgScore.toFixed(1)}%`
        };
      } else if (totalQuizzes < 5) {
        recommendation = {
          text: "Create more practice quizzes",
          subtitle: "to build comprehensive assessment"
        };
      } else {
        recommendation = {
          text: "Consider advanced problem sets",
          subtitle: "for high-performing students"
        };
      }
    } else {
      recommendation = {
        text: "Start with diagnostic quizzes",
        subtitle: "to assess baseline knowledge"
      };
    }

    return { performanceTrend, engagementAlert, recommendation };
  }, [quizResults, quizzes]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  // PDF Export Handlers
  const handleExportAnalytics = () => {
    try {
      generateAnalyticsExportPDF(analytics, sectionAnalytics, studentsWithPerformance, quizResults);
    } catch (error) {
      console.error('Error generating analytics export:', error);
      alert('Failed to generate analytics export. Please try again.');
    }
  };

  const handleDownloadReport = () => {
    try {
      generatePerformanceReportPDF(analytics, sectionAnalytics, studentsWithPerformance, quizResults, quizzes);
    } catch (error) {
      console.error('Error generating performance report:', error);
      alert('Failed to generate performance report. Please try again.');
    }
  };

  // Quiz Action Handlers
  const handleCopyQuiz = async (quiz: any) => {
    if (copyingQuiz) return;
    setCopyingQuiz(quiz.code);
    
    try {
      const { supabase } = await import("@/lib/supabase");
      
      // Generate new quiz code
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Create copy of the quiz
      const newQuiz = {
        ...quiz,
        id: undefined, // Let database generate new ID
        code: newCode,
        title: `${quiz.title} (Copy)`,
        createdAt: new Date().toISOString(),
        status: 'draft', // New copy starts as draft
      };
      
      const { data, error } = await supabase
        .from("quizzes")
        .insert([newQuiz])
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      // Add the new quiz to the local state
      setQuizzes(prev => [data, ...prev]);
      alert(`Quiz copied successfully! New quiz code: ${newCode}`);
      
    } catch (error) {
      console.error('Error copying quiz:', error);
      alert('Failed to copy quiz. Please try again.');
    } finally {
      setCopyingQuiz(null);
    }
  };

  // Dashboard Content
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Good morning, Dr. Khanna</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-600">System</span>
              <span className="text-sm font-medium text-green-600">Optimal</span>
            </div>
            <span className="text-gray-600">
              You have{" "}
              <span className="text-blue-600 font-medium">{analytics.totalSubmissions} submissions</span> pending review and{" "}
              <span className="text-green-600 font-medium">3 students</span> achieved perfect scores today.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm" onClick={handleExportAnalytics}>
            <Download className="w-4 h-4" />
            Export Analytics
          </Button>
          <Button
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            onClick={() => router.push("/faculty/quiz/create")}
          >
            <Sparkles className="w-4 h-4" />
            Create AI Quiz
          </Button>
        </div>
      </div>

      {/* AI Teaching Assistant Insights */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-blue-900">AI Teaching Assistant Insights</CardTitle>
              <CardDescription className="text-blue-700">Powered by advanced analytics</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Performance Trend</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">{aiInsights.performanceTrend.text}</p>
            <p className="text-xs text-gray-600">{aiInsights.performanceTrend.subtitle}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Engagement Alert</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">{aiInsights.engagementAlert.text}</p>
            <p className="text-xs text-gray-600">{aiInsights.engagementAlert.subtitle}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Recommendation</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">{aiInsights.recommendation.text}</p>
            <p className="text-xs text-gray-600">{aiInsights.recommendation.subtitle}</p>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
                <p className="text-3xl font-bold text-gray-900">{quizzes.length}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">+15.2%</span>
                </div>
                <p className="text-xs text-gray-500">This semester</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.activeStudents || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">+8.4%</span>
                </div>
                <p className="text-xs text-gray-500">This month</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-3xl font-bold text-gray-900">83.7%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">-2.1%</span>
                </div>
                <p className="text-xs text-gray-500">Last 30 days</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="text-3xl font-bold text-gray-900">94.2%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">+5.7%</span>
                </div>
                <p className="text-xs text-gray-500">This week</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 bg-purple-50 border-purple-200 hover:bg-purple-100"
              onClick={() => router.push("/faculty/quiz/create")}
            >
              <Sparkles className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium">Create AI Quiz</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 bg-blue-50 border-blue-200 hover:bg-blue-100"
              onClick={() => router.push("/faculty/analytics")}
            >
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">Smart Analytics</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2 bg-green-50 border-green-200 hover:bg-green-100"
              onClick={() => router.push("/faculty/students")}
            >
              <Users className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Student Hub</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Quizzes and Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Recent Quizzes</CardTitle>
              <CardDescription>Your latest quiz activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quizzesLoading ? (
                <div className="text-gray-500">Loading quizzes...</div>
              ) : quizzes.length === 0 ? (
                <div className="text-gray-500">No quizzes found.</div>
              ) : (
                quizzes.map((quiz) => (
                  <div key={quiz.id || quiz.code} className="p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                        <Badge variant="outline">{quiz.subject}</Badge>
                        <Badge variant={quiz.status === "active" ? "default" : "secondary"}>{quiz.status}</Badge>
                        <Badge variant="secondary">Code: {quiz.code}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Questions:</span>
                        <span className="font-medium ml-1">{quiz.questions?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Time Limit:</span>
                        <span className="font-medium ml-1">{quiz.timeLimit} min</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Points:</span>
                        <span className="font-medium ml-1">{quiz.totalPoints}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium ml-1">{new Date(quiz.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Live Activity
              </CardTitle>
              <CardDescription>Real-time student activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50/50">
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === "submission"
                        ? "bg-blue-500"
                        : activity.type === "achievement"
                          ? "bg-green-500"
                          : "bg-orange-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.student}</p>
                    <p className="text-xs text-gray-600">
                      {activity.type === "submission" && `Submitted ${activity.quiz} - ${activity.score}%`}
                      {activity.type === "achievement" && `Earned ${activity.achievement}`}
                      {activity.type === "question" && `Asked: ${activity.question}`}
                    </p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )

  // Smart Analytics Content
  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Analytics</h1>
          <p className="text-gray-600">Section-level performance insights</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={analyticsFilter === "Section Level" ? "default" : "outline"}
              onClick={() => setAnalyticsFilter("Section Level")}
              className={analyticsFilter === "Section Level" ? "bg-gradient-to-r from-blue-600 to-indigo-600" : ""}
            >
              Section Level
            </Button>
            <Button
              variant={analyticsFilter === "Department Level" ? "default" : "outline"}
              onClick={() => setAnalyticsFilter("Department Level")}
              className={analyticsFilter === "Department Level" ? "bg-gradient-to-r from-blue-600 to-indigo-600" : ""}
            >
              Department Level
            </Button>
          </div>
          <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm" onClick={handleDownloadReport}>
            <Download className="w-4 h-4" />
            Download Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.keys(analytics.quizStats).map((code) => {
          const stat = analytics.quizStats[code];
          return (
            <Card key={code} className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{code}</CardTitle>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {stat.submissions} submissions
                  </Badge>
                </div>
                <CardDescription>Avg Score: {stat.avgScore}%</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Completion</p>
                    <p className="text-xl font-bold text-blue-600">{Math.round((stat.submissions / (quizzes.length || 1)) * 100)}%</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-600">Engagement</p>
                    <p className="text-xl font-bold text-green-600">{Math.round((stat.submissions / (analytics.totalSubmissions || 1)) * 100)}%</p>
                  </div>
                </div>

                {stat.strongAreas && stat.strongAreas.length > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Strong Areas</span>
                      <span>{stat.strongAreas.length} topics</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stat.strongAreas.map((area) => (
                        <Badge key={area} variant="default" className="bg-green-100 text-green-800 text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {stat.weakAreas && stat.weakAreas.length > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Weak Areas</span>
                      <span>{stat.weakAreas.length} topics</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {stat.weakAreas.map((area) => (
                        <Badge key={area} variant="outline" className="border-red-200 text-red-700 text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Enhanced Section Performance Analytics */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Section Performance Trends
          </CardTitle>
          <CardDescription>Comprehensive performance analysis across sections</CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsFilter === "Section Level" && (
            <div className="space-y-6">
              {/* Section Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Real section data calculated from student and quiz results */}
                {sectionAnalytics.sections.length > 0 ? sectionAnalytics.sections.map((sectionData) => (
                  <div key={sectionData.section} className={`p-4 rounded-lg border-l-4 ${
                    sectionData.color === 'green' ? 'border-green-500 bg-green-50' :
                    sectionData.color === 'blue' ? 'border-blue-500 bg-blue-50' :
                    sectionData.color === 'yellow' ? 'border-yellow-500 bg-yellow-50' :
                    sectionData.color === 'purple' ? 'border-purple-500 bg-purple-50' :
                    sectionData.color === 'indigo' ? 'border-indigo-500 bg-indigo-50' :
                    sectionData.color === 'red' ? 'border-red-500 bg-red-50' :
                    'border-orange-500 bg-orange-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{sectionData.section}</h4>
                      <div className={`flex items-center gap-1 ${
                        sectionData.trend === 'up' ? 'text-green-600' :
                        sectionData.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {sectionData.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                        {sectionData.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                        {sectionData.trend === 'stable' && <Minus className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Score</span>
                        <span className="font-medium">{sectionData.avgScore}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Students</span>
                        <span className="font-medium">{sectionData.students}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Participation</span>
                        <span className="font-medium">{sectionData.participation}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            sectionData.avgScore >= 75 ? 'bg-green-500' :
                            sectionData.avgScore >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${sectionData.avgScore}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-8">
                    <div className="text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg font-medium">No section data available</p>
                      <p className="text-sm">Add students and quiz submissions to see section performance analytics</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subject-wise Performance */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Subject-wise Performance Trends
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {sectionAnalytics.subjectTrends.length > 0 ? sectionAnalytics.subjectTrends.map((subject) => (
                    <div key={subject.subject} className="bg-white p-4 rounded-lg shadow-sm">
                      <h4 className="font-medium text-gray-900 mb-2">{subject.subject}</h4>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-gray-900">{subject.score}%</span>
                        <span className={`text-sm font-medium ${
                          subject.trend.startsWith('+') ? 'text-green-600' : 
                          subject.trend.startsWith('-') ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {subject.trend}
                        </span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full ${
                            subject.color === 'blue' ? 'bg-blue-500' :
                            subject.color === 'purple' ? 'bg-purple-500' :
                            subject.color === 'green' ? 'bg-green-500' : 
                            subject.color === 'red' ? 'bg-red-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${subject.score}%` }}
                        ></div>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-6 text-gray-500">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No subject performance data available</p>
                      <p className="text-sm">Create quizzes with different subjects to see trends</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Engagement Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Student Engagement Levels
                  </h3>
                  {sectionAnalytics.sections.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        const highEngagement = sectionAnalytics.sections.filter(s => s.participation >= 80).length;
                        const mediumEngagement = sectionAnalytics.sections.filter(s => s.participation >= 60 && s.participation < 80).length;
                        const lowEngagement = sectionAnalytics.sections.filter(s => s.participation < 60).length;
                        const total = sectionAnalytics.sections.length;
                        
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span className="text-sm">High Engagement (80%+)</span>
                              </div>
                              <span className="font-semibold">{Math.round((highEngagement / total) * 100)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm">Medium Engagement (60-79%)</span>
                              </div>
                              <span className="font-semibold">{Math.round((mediumEngagement / total) * 100)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span className="text-sm">Low Engagement (&lt;60%)</span>
                              </div>
                              <span className="font-semibold">{Math.round((lowEngagement / total) * 100)}%</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No engagement data available</p>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Activity Patterns
                  </h3>
                  {quizResults.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        // Calculate activity patterns from real quiz results
                        const completedQuizzes = quizResults.filter(r => r.score !== null);
                        const avgSessionTime = completedQuizzes.length > 0 
                          ? Math.round(completedQuizzes.reduce((sum, r) => sum + (r.time_spent || 0), 0) / completedQuizzes.length)
                          : 0;
                        
                        const completionRate = quizResults.length > 0 
                          ? Math.round((completedQuizzes.length / quizResults.length) * 100)
                          : 0;
                        
                        // Group by hour for peak activity
                        const hourCounts: Record<number, number> = {};
                        quizResults.forEach(r => {
                          if (r.submittedat) {
                            const hour = new Date(r.submittedat).getHours();
                            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                          }
                        });
                        
                        const peakHour = Object.entries(hourCounts)
                          .sort((a, b) => b[1] - a[1])[0]?.[0];
                        const peakHourDisplay = peakHour 
                          ? `${peakHour}:00 - ${parseInt(peakHour) + 1}:00`
                          : 'N/A';
                        
                        // Group by day for most active day
                        const dayCounts: Record<string, number> = {};
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                        quizResults.forEach(r => {
                          if (r.submittedat) {
                            const dayName = dayNames[new Date(r.submittedat).getDay()];
                            dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
                          }
                        });
                        
                        const mostActiveDay = Object.entries(dayCounts)
                          .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
                        
                        return (
                          <>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Peak Quiz Hours</span>
                              <span className="font-medium">{peakHourDisplay}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Most Active Day</span>
                              <span className="font-medium">{mostActiveDay}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Average Session Time</span>
                              <span className="font-medium">{Math.floor(avgSessionTime / 60)}m {avgSessionTime % 60}s</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Completion Rate</span>
                              <span className={`font-medium ${completionRate >= 80 ? 'text-green-600' : completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {completionRate}%
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No activity data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Performance Insights */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI-Powered Insights & Recommendations
                </h3>
                {sectionAnalytics.sections.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Top Performing Sections
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {sectionAnalytics.sections
                          .sort((a, b) => b.avgScore - a.avgScore)
                          .slice(0, 3)
                          .map((section, index) => (
                            <li key={section.section}>
                              • {section.section}: {section.avgScore}% avg ({section.trend === 'up' ? '↑' : section.trend === 'down' ? '↓' : '→'} {section.participation}% participation)
                            </li>
                          ))}
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Needs Attention
                      </h4>
                      <ul className="space-y-1 text-sm">
                        {(() => {
                          const needsAttention: string[] = [];
                          
                          // Low participation sections
                          const lowParticipation = sectionAnalytics.sections.filter(s => s.participation < 70);
                          lowParticipation.forEach(s => 
                            needsAttention.push(`• ${s.section}: Low participation (${s.participation}%)`)
                          );
                          
                          // Declining scores
                          const declining = sectionAnalytics.sections.filter(s => s.trend === 'down');
                          declining.forEach(s => 
                            needsAttention.push(`• ${s.section}: Declining trend (${s.avgScore}% avg)`)
                          );
                          
                          // Low average scores
                          const lowScore = sectionAnalytics.sections.filter(s => s.avgScore < 65);
                          lowScore.forEach(s => 
                            needsAttention.push(`• ${s.section}: Needs score improvement (${s.avgScore}%)`)
                          );
                          
                          return needsAttention.length > 0 
                            ? needsAttention.slice(0, 3).map((item, index) => <li key={index}>{item}</li>)
                            : [<li key="none">• All sections performing well!</li>];
                        })()}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No insights available yet</p>
                    <p className="text-sm">Add students and quiz results to generate AI-powered recommendations</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {analyticsFilter === "Department Level" && (
            <div className="space-y-6">
              {/* Department Comparison Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {departmentAnalytics.departments.length > 0 ? departmentAnalytics.departments.map((dept) => (
                  <div key={dept.department} className={`p-4 rounded-lg ${
                    dept.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
                    dept.color === 'purple' ? 'bg-purple-50 border border-purple-200' :
                    dept.color === 'green' ? 'bg-green-50 border border-green-200' :
                    'bg-orange-50 border border-orange-200'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{dept.department}</h4>
                      <div className={`flex items-center gap-1 ${
                        dept.trend === 'up' ? 'text-green-600' :
                        dept.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {dept.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                        {dept.trend === 'down' && <TrendingDown className="w-4 h-4" />}
                        {dept.trend === 'stable' && <Minus className="w-4 h-4" />}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Average Score</span>
                        <span className="font-medium">{dept.avgScore}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total Students</span>
                        <span className="font-medium">{dept.students}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Participation</span>
                        <span className="font-medium">{dept.participation}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Growth</span>
                        <span className={`font-medium ${dept.growth.startsWith('+') ? 'text-green-600' : dept.growth.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                          {dept.growth}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full text-center text-gray-500 py-8">
                    <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                    <p>No department data available</p>
                    <p className="text-sm">Students need to be enrolled and take quizzes for department analytics</p>
                  </div>
                )}
              </div>
              
              {/* Department Performance Overview */}
              {departmentAnalytics.departments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Department Performance Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Top Performing Departments</h4>
                        <div className="space-y-2">
                          {departmentAnalytics.departments
                            .slice(0, 3)
                            .map((dept, index) => (
                              <div key={dept.department} className="flex items-center justify-between p-2 rounded bg-gray-50">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-500 text-white' :
                                    index === 1 ? 'bg-gray-400 text-white' :
                                    'bg-orange-600 text-white'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <span className="font-medium">{dept.department}</span>
                                </div>
                                <span className="text-sm text-gray-600">{dept.avgScore}%</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3">Participation Leaders</h4>
                        <div className="space-y-2">
                          {departmentAnalytics.departments
                            .sort((a, b) => b.participation - a.participation)
                            .slice(0, 3)
                            .map((dept) => (
                              <div key={dept.department} className="flex justify-between p-2 rounded bg-gray-50">
                                <span className="font-medium">{dept.department}</span>
                                <span className="text-sm text-gray-600">{dept.participation}%</span>
                              </div>
                            ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold mb-3">Growth Trends</h4>
                        <div className="space-y-2">
                          {departmentAnalytics.departments
                            .filter(d => d.trend !== 'stable')
                            .sort((a, b) => (b.growth.startsWith('+') ? 1 : -1) - (a.growth.startsWith('+') ? 1 : -1))
                            .slice(0, 3)
                            .map((dept) => (
                              <div key={dept.department} className="flex justify-between p-2 rounded bg-gray-50">
                                <span className="font-medium">{dept.department}</span>
                                <span className={`text-sm font-medium ${
                                  dept.growth.startsWith('+') ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {dept.growth}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Quiz Studio Content
  const renderQuizStudio = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Studio</h1>
          <p className="text-gray-600">Create and manage your quizzes</p>
        </div>
        <Button
          className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          onClick={() => router.push("/faculty/quiz/create")}
        >
          <Sparkles className="w-4 h-4" />
          Create New Quiz
        </Button>
      </div>

      {/* Creation Methods */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card
          className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/faculty/quiz/create")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">AI-Powered Quiz</h3>
            <p className="text-sm text-blue-700">Let AI create questions based on your topics</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/faculty/quiz/create")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Manual Creation</h3>
            <p className="text-sm text-green-700">Create questions manually with advanced editor</p>
          </CardContent>
        </Card>

        <Card
          className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push("/faculty/quiz/create")}
        >
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Import Questions</h3>
            <p className="text-sm text-purple-700">Upload from Excel, CSV, or other platforms</p>
          </CardContent>
        </Card>
      </div>

      {/* Existing Quizzes */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Your Quizzes</CardTitle>
          <CardDescription>Manage your existing quizzes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quizzesLoading ? (
            <div className="text-gray-500">Loading quizzes...</div>
          ) : quizzes.length === 0 ? (
            <div className="text-gray-500">No quizzes found.</div>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id || quiz.code} className="p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    <Badge variant="outline">{quiz.subject}</Badge>
                    <Badge variant={quiz.status === "active" ? "default" : "secondary"}>{quiz.status}</Badge>
                    <Badge variant="secondary">Code: {quiz.code}</Badge>
                    <Badge variant="outline">{quiz.category}</Badge>
                    <Badge
                      variant={
                        quiz.difficulty === "Easy"
                          ? "secondary"
                          : quiz.difficulty === "Medium"
                            ? "default"
                            : "destructive"
                      }
                    >
                      {quiz.difficulty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setViewQuizModal({ isOpen: true, quiz })}
                      title="View Quiz"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => router.push(`/faculty/quiz/create?edit=${quiz.code}`)}
                      title="Edit Quiz"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setAnalyticsModal({ isOpen: true, quiz })}
                      title="Quiz Analytics"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleCopyQuiz(quiz)}
                      disabled={copyingQuiz === quiz.code}
                      title="Copy Quiz"
                    >
                      {copyingQuiz === quiz.code ? (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <span className="text-gray-600">Students:</span>
                    <span className="font-medium ml-1">{quiz.studentsEnrolled}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submissions:</span>
                    <span className="font-medium ml-1">{quiz.submissions}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Avg Score:</span>
                    <span className="font-medium ml-1">{quiz.avgScore}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Questions:</span>
                    <span className="font-medium ml-1">{quiz.questions?.length || 0}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created: {new Date(quiz.createdAt).toLocaleDateString()}</span>
                  <span>Last Activity: {quiz.lastActivity}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )

  // Student Hub Content (fetch all students from students table)
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  // Calculate real-time student performance based on quiz results
  const studentsWithPerformance = useMemo(() => {
    if (!allStudents || !quizResults) return [];
    
    return allStudents.map((student) => {
      // Get quiz results for this student from faculty's quizzes
      const studentResults = quizResults.filter(result => result.studentid === student.id);
      
      if (studentResults.length === 0) {
        return {
          ...student,
          calculatedAvgScore: 0,
          calculatedAccuracy: 0,
          totalQuizzesTaken: 0,
          hasQuizData: false
        };
      }

      // Calculate average score
      const avgScore = Math.round(
        studentResults.reduce((sum, result) => sum + (result.score || 0), 0) / studentResults.length
      );

      // Calculate accuracy percentage
      // Accuracy = (Correct answers / Total questions attempted) * 100
      // For now, we'll use score as a proxy for accuracy since we don't have detailed question-level data
      // In a real scenario, you'd have correct_answers and total_questions fields
      const accuracy = Math.round(
        studentResults.reduce((sum, result) => {
          // Assuming score represents percentage of correct answers
          return sum + (result.score || 0);
        }, 0) / studentResults.length
      );

      return {
        ...student,
        calculatedAvgScore: avgScore,
        calculatedAccuracy: accuracy,
        totalQuizzesTaken: studentResults.length,
        hasQuizData: true,
        latestQuizDate: studentResults.length > 0 
          ? new Date(Math.max(...studentResults.map(r => new Date(r.submittedat).getTime())))
          : null
      };
    }).filter(student => student.hasQuizData); // Only show students who have taken quizzes
  }, [allStudents, quizResults]);

  useEffect(() => {
    async function fetchAllStudents() {
      setStudentsLoading(true);
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("students")
          .select("id, full_name, username, avg_score, accuracy_rate, section, department");
        setAllStudents(data || []);
      } catch {
        setAllStudents([]);
      }
      setStudentsLoading(false);
    }
    fetchAllStudents();
  }, []);

  // Group smart analytics for all students
  const groupStats = (() => {
    if (!allStudents || allStudents.length === 0) return null;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const avgScore = avg(allStudents.map(s => s.avg_score || 0));
    const avgAccuracy = avg(allStudents.map(s => s.accuracy_rate || 0));
    const top = allStudents.reduce((a, b) => (a.avg_score || 0) > (b.avg_score || 0) ? a : b, {});
    const bottom = allStudents.reduce((a, b) => (a.avg_score || 0) < (b.avg_score || 0) ? a : b, {});
    return {
      avgScore,
      avgAccuracy,
      total: allStudents.length,
      top,
      bottom
    };
  })();

  // Section Performance Analytics (using real data from quizResults and studentsWithPerformance)
  const sectionAnalytics = useMemo(() => {
    if (!studentsWithPerformance || studentsWithPerformance.length === 0 || !quizResults || quizResults.length === 0) {
      return {
        sections: [],
        subjectTrends: [],
        insights: ["No data available for section analytics"],
        totalSections: 0,
        avgParticipation: 0,
        topPerformer: null
      };
    }

    // Group students by section and department to create section identifiers
    const sectionGroups = studentsWithPerformance.reduce((acc: Record<string, any[]>, student: any) => {
      const sectionKey = `${student.department}-${student.section}`;
      if (!acc[sectionKey]) {
        acc[sectionKey] = [];
      }
      acc[sectionKey].push(student);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate section performance data
    const sectionData = Object.entries(sectionGroups)
      .map(([sectionKey, students]: [string, any[]]) => {
        const avgScore = students.reduce((sum: number, s: any) => sum + (s.calculatedAvgScore || 0), 0) / students.length;
        const avgAccuracy = students.reduce((sum: number, s: any) => sum + (s.calculatedAccuracy || 0), 0) / students.length;
        
        // Calculate participation from quiz results
        const sectionStudentIds = students.map((s: any) => s.id);
        const sectionQuizResults = quizResults.filter((r: any) => sectionStudentIds.includes(r.studentid));
        const participatingStudents = new Set(sectionQuizResults.map((r: any) => r.studentid)).size;
        const participation = Math.round((participatingStudents / students.length) * 100);
        
        // Determine trend based on recent quiz results
        const recentResults = sectionQuizResults
          .sort((a: any, b: any) => new Date(b.submittedat).getTime() - new Date(a.submittedat).getTime())
          .slice(0, 10);
        
        let trend = "stable";
        let color = "blue";
        
        if (recentResults.length >= 2) {
          const firstHalf = recentResults.slice(0, Math.floor(recentResults.length / 2));
          const secondHalf = recentResults.slice(Math.floor(recentResults.length / 2));
          
          const firstAvg = firstHalf.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / secondHalf.length;
          
          if (firstAvg > secondAvg + 5) {
            trend = "up";
            color = "green";
          } else if (secondAvg > firstAvg + 5) {
            trend = "down";
            color = "red";
          }
        }

        // Assign colors based on performance
        if (avgScore >= 80) color = "green";
        else if (avgScore >= 70) color = "blue";
        else if (avgScore >= 60) color = "yellow";
        else color = "red";

        return {
          section: sectionKey,
          avgScore: Math.round(avgScore),
          students: students.length,
          participation,
          trend,
          color,
          avgAccuracy: Math.round(avgAccuracy)
        };
      })
      .filter(section => section.students > 0)
      .sort((a, b) => b.avgScore - a.avgScore);

    // Calculate subject trends from quiz data
    const subjectQuizzes = quizzes.reduce((acc: Record<string, any[]>, quiz: any) => {
      if (!acc[quiz.subject]) {
        acc[quiz.subject] = [];
      }
      acc[quiz.subject].push(quiz);
      return acc;
    }, {} as Record<string, any[]>);

    const subjectTrends = Object.entries(subjectQuizzes)
      .map(([subject, subjectQuizList]: [string, any[]]) => {
        const subjectQuizCodes = subjectQuizList.map((q: any) => q.code);
        const subjectResults = quizResults.filter((r: any) => subjectQuizCodes.includes(r.quizcode));
        
        if (subjectResults.length === 0) return null;
        
        const avgScore = Math.round(subjectResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / subjectResults.length);
        
        // Calculate trend by comparing first half vs second half of results
        const sortedResults = subjectResults.sort((a: any, b: any) => new Date(a.submittedat).getTime() - new Date(b.submittedat).getTime());
        let trendPercent = "+0%";
        let color = "blue";
        
        if (sortedResults.length >= 4) {
          const firstHalf = sortedResults.slice(0, Math.floor(sortedResults.length / 2));
          const secondHalf = sortedResults.slice(Math.floor(sortedResults.length / 2));
          
          const firstAvg = firstHalf.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / secondHalf.length;
          
          const trendValue = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);
          trendPercent = `${trendValue > 0 ? '+' : ''}${trendValue}%`;
          
          if (trendValue > 0) color = "green";
          else if (trendValue < -5) color = "red";
          else color = "blue";
        }

        return {
          subject,
          score: avgScore,
          trend: trendPercent,
          color
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .slice(0, 5); // Limit to 5 subjects

    return {
      sections: sectionData,
      subjectTrends,
      insights: [],
      totalSections: sectionData.length,
      avgParticipation: sectionData.length > 0 ? Math.round(sectionData.reduce((sum: number, s: any) => sum + s.participation, 0) / sectionData.length) : 0,
      topPerformer: sectionData.length > 0 ? sectionData[0] : null
    };
  }, [studentsWithPerformance, quizResults, quizzes]);

  // Department Performance Analytics (using real data from quizResults and studentsWithPerformance)
  const departmentAnalytics = useMemo(() => {
    if (!studentsWithPerformance || studentsWithPerformance.length === 0 || !quizResults || quizResults.length === 0) {
      return {
        departments: [],
        insights: ["No data available for department analytics"],
        totalDepartments: 0,
        avgParticipation: 0,
        topPerformer: null
      };
    }

    // Group students by department
    const departmentGroups = studentsWithPerformance.reduce((acc: Record<string, any[]>, student: any) => {
      const department = student.department || 'Unknown';
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(student);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate department performance data
    const departmentData = Object.entries(departmentGroups)
      .map(([department, students]: [string, any[]]) => {
        if (students.length === 0) return null;

        const avgScore = students.reduce((sum: number, s: any) => sum + (s.calculatedAvgScore || 0), 0) / students.length;
        const avgAccuracy = students.reduce((sum: number, s: any) => sum + (s.calculatedAccuracy || 0), 0) / students.length;
        
        // Calculate participation from quiz results
        const departmentStudentIds = students.map((s: any) => s.id);
        const departmentQuizResults = quizResults.filter((r: any) => departmentStudentIds.includes(r.studentid));
        const participatingStudents = new Set(departmentQuizResults.map((r: any) => r.studentid)).size;
        const participation = Math.round((participatingStudents / students.length) * 100);
        
        // Determine trend based on recent quiz results
        const recentResults = departmentQuizResults
          .sort((a: any, b: any) => new Date(b.submittedat).getTime() - new Date(a.submittedat).getTime())
          .slice(0, 20); // Get more results for department level
        
        let trend = "stable";
        let growth = "0%";
        
        if (recentResults.length >= 4) {
          const firstHalf = recentResults.slice(0, Math.floor(recentResults.length / 2));
          const secondHalf = recentResults.slice(Math.floor(recentResults.length / 2));
          
          const firstAvg = firstHalf.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / secondHalf.length;
          
          const growthPercent = Math.round(((firstAvg - secondAvg) / secondAvg) * 100);
          
          if (firstAvg > secondAvg + 3) {
            trend = "up";
            growth = `+${growthPercent}%`;
          } else if (secondAvg > firstAvg + 3) {
            trend = "down"; 
            growth = `-${Math.abs(growthPercent)}%`;
          } else {
            growth = `${growthPercent >= 0 ? '+' : ''}${growthPercent}%`;
          }
        }

        // Assign colors based on performance
        let color = "blue";
        if (avgScore >= 80) color = "green";
        else if (avgScore >= 70) color = "blue";
        else if (avgScore >= 60) color = "purple";
        else color = "orange";

        return {
          department,
          avgScore: Math.round(avgScore),
          students: students.length,
          participation,
          trend,
          growth,
          color,
          avgAccuracy: Math.round(avgAccuracy)
        };
      })
      .filter((dept): dept is NonNullable<typeof dept> => dept !== null && dept.students > 0)
      .sort((a, b) => b.avgScore - a.avgScore);

    return {
      departments: departmentData,
      insights: [],
      totalDepartments: departmentData.length,
      avgParticipation: departmentData.length > 0 ? Math.round(departmentData.reduce((sum: number, d: any) => sum + d.participation, 0) / departmentData.length) : 0,
      topPerformer: departmentData.length > 0 ? departmentData[0] : null
    };
  }, [studentsWithPerformance, quizResults]);

  const renderStudentHub = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Hub</h1>
          <p className="text-gray-600">Monitor and support your students</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* All Students List */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Students Who Attended Your Quizzes</CardTitle>
          <CardDescription>Students with real-time performance data from your quiz results</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {studentsLoading ? (
            <div className="text-gray-500">Loading students...</div>
          ) : studentsWithPerformance.length === 0 ? (
            <div className="text-gray-500">No students have taken your quizzes yet.</div>
          ) : studentsWithPerformance.map((student) => (
            <div
              key={student.id}
              className="p-4 bg-gray-50/50 rounded-lg hover:bg-gray-100/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/faculty/students/${student.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                        {(student.full_name || student.username || '').slice(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Active indicator for students with recent activity */}
                    {student.latestQuizDate && new Date().getTime() - student.latestQuizDate.getTime() < 7 * 24 * 60 * 60 * 1000 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{student.full_name || student.username}</h3>
                      <Badge variant="outline" className="text-xs">
                        {student.totalQuizzesTaken} quiz{student.totalQuizzesTaken !== 1 ? 'es' : ''}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">ID: {student.id}</p>
                    <p className="text-xs text-gray-500">Section: {student.section} | Dept: {student.department}</p>
                    {student.latestQuizDate && (
                      <p className="text-xs text-blue-600">
                        Last activity: {student.latestQuizDate.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{student.calculatedAvgScore}%</p>
                      <p className="text-xs text-gray-600">Avg Score</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{student.calculatedAccuracy}%</p>
                      <p className="text-xs text-gray-600">Accuracy</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        student.calculatedAvgScore >= 80 ? 'bg-green-500' :
                        student.calculatedAvgScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></div>
                      <p className="text-xs text-gray-500 mt-1">
                        {student.calculatedAvgScore >= 80 ? 'Excellent' :
                         student.calculatedAvgScore >= 60 ? 'Good' : 'Needs Help'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )

  // Student Detail Modal
  const renderStudentModal = () => {
    if (!selectedStudent) return null

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xl">
                    {selectedStudent.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                  <p className="text-gray-600">
                    {selectedStudent.section} • {selectedStudent.department} • {selectedStudent.year}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {selectedStudent.badges.map((badge: string) => (
                      <Badge key={badge} variant="secondary">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Performance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{selectedStudent.avgScore}%</div>
                  <div className="text-sm text-gray-600">Average Score</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{selectedStudent.completedQuizzes}</div>
                  <div className="text-sm text-gray-600">Completed Quizzes</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Flame className="w-5 h-5 text-orange-500" />
                    <div className="text-2xl font-bold text-orange-600">{selectedStudent.streak}</div>
                  </div>
                  <div className="text-sm text-gray-600">Day Streak</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <div className="text-2xl font-bold text-green-600">{selectedStudent.improvement}</div>
                  </div>
                  <div className="text-sm text-gray-600">Improvement</div>
                </CardContent>
              </Card>
            </div>

            {/* Unit Performance */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Unit Performance</h3>
              <div className="space-y-4">
                {selectedStudent.unitPerformance.map((unit: { unit: string; score: number; completed: number; total: number }) => (
                  <div key={unit.unit} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{unit.unit}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {unit.completed}/{unit.total} completed
                        </span>
                        <span className="font-bold text-gray-900">{unit.score}%</span>
                      </div>
                    </div>
                    <Progress value={unit.score} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {selectedStudent.recentActivity.map((activity: { quiz: string; date: string; score: number; time: string }, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{activity.quiz}</p>
                      <p className="text-sm text-gray-600">
                        {activity.date} • Completed in {activity.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={activity.score >= 90 ? "default" : activity.score >= 80 ? "secondary" : "destructive"}
                      >
                        {activity.score}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Settings Content
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-2xl">
                DR
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-xl font-semibold">Dr. Rajesh Khanna</h3>
              <p className="text-gray-600">Computer Science Department</p>
              <Badge variant="secondary">Faculty</Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="Dr. Rajesh Khanna" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" defaultValue="rajesh.khanna@university.edu" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input id="department" defaultValue="Computer Science" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" defaultValue="+91 98765 43210" className="mt-1" />
            </div>
          </div>

          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Choose what notifications you want to receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="quiz-submissions" />
            <Label htmlFor="quiz-submissions">Quiz submissions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="student-questions" />
            <Label htmlFor="student-questions">Student questions</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="performance-alerts" />
            <Label htmlFor="performance-alerts">Performance alerts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="system-updates" />
            <Label htmlFor="system-updates">System updates</Label>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeView) {
      case "analytics":
        return renderAnalytics()
      case "quiz-studio":
        return renderQuizStudio()
      case "student-hub":
        return renderStudentHub()
      case "settings":
        return renderSettings()
      default:
        return renderDashboard()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-md border-r border-white/20 flex flex-col shadow-xl">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">EduPro Portal</h2>
              <p className="text-sm text-gray-600">Faculty Dashboard</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-4 border-b border-gray-200/50">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50/50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-blue-600">{quizzes.length}</div>
              <div className="text-xs text-gray-600">Active Quizzes</div>
            </div>
            <div className="bg-green-50/50 p-3 rounded-lg text-center">
              <div className="text-xl font-bold text-green-600">342</div>
              <div className="text-xs text-gray-600">Students</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {facultyNavItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                  activeView === item.key
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                    : "text-gray-700 hover:bg-white/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </div>
                {item.badge && (
                  <Badge
                    variant={item.badgeVariant}
                    className={`text-xs ${activeView === item.key ? "bg-white/20 text-white" : ""}`}
                  >
                    {item.badge}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/50 transition-colors">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    DR
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">Dr. Rajesh Khanna</p>
                  <p className="text-sm text-gray-600">Computer Science Dept.</p>
                </div>
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Dr. Rajesh Khanna</p>
                  <p className="text-xs leading-none text-muted-foreground">rajesh.khanna@university.edu</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900 capitalize">{activeView.replace("-", " ")}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">3</span>
              </div>
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
      </div>

      {/* Student Detail Modal */}
      {renderStudentModal()}

      {/* View Quiz Modal */}
      <Dialog open={viewQuizModal.isOpen} onOpenChange={(open) => setViewQuizModal({ isOpen: open, quiz: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {viewQuizModal.quiz?.title}
            </DialogTitle>
            <DialogDescription>
              Code: {viewQuizModal.quiz?.code} • {viewQuizModal.quiz?.questions?.length || 0} Questions • {viewQuizModal.quiz?.difficulty} Difficulty
            </DialogDescription>
          </DialogHeader>
          {viewQuizModal.quiz && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <p className="text-sm text-gray-600">{viewQuizModal.quiz.subject}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p className="text-sm text-gray-600">{viewQuizModal.quiz.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Time Limit</Label>
                  <p className="text-sm text-gray-600">{viewQuizModal.quiz.timeLimit} minutes</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge variant={viewQuizModal.quiz.status === "active" ? "default" : "secondary"}>
                    {viewQuizModal.quiz.status}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-600 mt-1">{viewQuizModal.quiz.description || "No description provided"}</p>
              </div>

              <div>
                <Label className="text-lg font-semibold">Questions Preview</Label>
                <div className="space-y-4 mt-3">
                  {viewQuizModal.quiz.questions?.slice(0, 5).map((question: any, index: number) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">Question {index + 1}</h4>
                        <Badge variant="outline">{question.type}</Badge>
                      </div>
                      <p className="text-sm mb-3">{question.question}</p>
                      {question.type === "multiple-choice" && (
                        <div className="space-y-1">
                          {question.options?.map((option: string, optIndex: number) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${optIndex === Number(question.correctAnswer) ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className="text-sm">{option}</span>
                              {optIndex === Number(question.correctAnswer) && (
                                <Badge variant="secondary" className="text-xs">Correct</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {(question.type === "true-false" || question.type === "short-answer") && (
                        <div className="text-sm">
                          <span className="font-medium">Correct Answer:</span> {question.correctAnswer}
                        </div>
                      )}
                    </div>
                  ))}
                  {viewQuizModal.quiz.questions?.length > 5 && (
                    <p className="text-sm text-gray-500 text-center">
                      ... and {viewQuizModal.quiz.questions.length - 5} more questions
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Quiz Analytics Modal */}
      <Dialog open={analyticsModal.isOpen} onOpenChange={(open) => setAnalyticsModal({ isOpen: open, quiz: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Analytics: {analyticsModal.quiz?.title}
            </DialogTitle>
            <DialogDescription>
              Detailed performance analytics for this quiz
            </DialogDescription>
          </DialogHeader>
          {analyticsModal.quiz && (
            <div className="space-y-6">
              {(() => {
                const quizSubmissions = quizResults.filter(r => r.quizcode === analyticsModal.quiz.code);
                const totalSubmissions = quizSubmissions.length;
                const avgScore = totalSubmissions > 0 
                  ? Math.round(quizSubmissions.reduce((sum, r) => sum + (r.score || 0), 0) / totalSubmissions)
                  : 0;
                const highestScore = totalSubmissions > 0 
                  ? Math.max(...quizSubmissions.map(r => r.score || 0))
                  : 0;
                const lowestScore = totalSubmissions > 0 
                  ? Math.min(...quizSubmissions.map(r => r.score || 0))
                  : 0;
                
                return (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{totalSubmissions}</div>
                          <p className="text-sm text-gray-600">Total Submissions</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-blue-600">{avgScore}%</div>
                          <p className="text-sm text-gray-600">Average Score</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-green-600">{highestScore}%</div>
                          <p className="text-sm text-gray-600">Highest Score</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold text-red-600">{lowestScore}%</div>
                          <p className="text-sm text-gray-600">Lowest Score</p>
                        </CardContent>
                      </Card>
                    </div>

                    {totalSubmissions > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Recent Submissions</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {quizSubmissions
                            .sort((a, b) => new Date(b.submittedat).getTime() - new Date(a.submittedat).getTime())
                            .slice(0, 10)
                            .map((result, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-8 h-8">
                                    <AvatarFallback>
                                      {result.studentid.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium text-sm">Student {result.studentid.substring(0, 8)}</p>
                                    <p className="text-xs text-gray-500">
                                      {new Date(result.submittedat).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={result.score >= 80 ? "default" : result.score >= 60 ? "secondary" : "destructive"}>
                                    {result.score}%
                                  </Badge>
                                  <div className="text-xs text-gray-500">
                                    {result.correct_answers}/{result.total_questions}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {totalSubmissions === 0 && (
                      <div className="text-center py-8">
                        <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No submissions yet for this quiz</p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
