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
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Line, Radar, Pie } from "./_chartDynamic"
import { useAuth } from "@/contexts/auth-context"

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

  // Aggregate stats for dashboard, quiz studio, analytics
  const analytics = useMemo(() => {
    if (!quizResults || quizResults.length === 0) return {
      totalSubmissions: 0,
      avgScore: 0,
      completionRate: 0,
      recentActivities: [],
      quizStats: {},
    };
    const totalSubmissions = quizResults.length;
    const avgScore = Math.round(
      quizResults.reduce((sum, r) => sum + (r.score || 0), 0) / (quizResults.length || 1)
    );
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
        student: r.studentid,
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
    return { totalSubmissions, avgScore, completionRate, recentActivities, quizStats };
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
          <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm">
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
            <p className="text-sm text-gray-900 font-medium">Algorithm scores improved by 8.5%</p>
            <p className="text-xs text-gray-600">after implementing visual explanations</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-700">Engagement Alert</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">15 students need additional support</p>
            <p className="text-xs text-gray-600">in Data Structures concepts</p>
          </div>
          <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Recommendation</span>
            </div>
            <p className="text-sm text-gray-900 font-medium">Consider adaptive difficulty</p>
            <p className="text-xs text-gray-600">for next Database Systems quiz</p>
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
                <p className="text-3xl font-bold text-gray-900">342</p>
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
          <Button variant="outline" className="gap-2 bg-white/80 backdrop-blur-sm">
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

      {/* Chart Placeholder */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Section Performance Trends</CardTitle>
          <CardDescription>Performance comparison across sections over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">Chart.js Integration Placeholder</p>
              <p className="text-sm text-gray-500">Section performance trends will be displayed here</p>
            </div>
          </div>
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
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="w-4 h-4" />
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

  {/* Group Smart Analytics - Full Advanced Analytics Section */}
  <Card className="bg-gradient-to-r from-indigo-50 to-green-50 border-0 shadow-lg">
    <CardHeader>
      <CardTitle>Smart Analytics (All Students)</CardTitle>
      <CardDescription>Aggregated advanced metrics, insights, and visualizations</CardDescription>
    </CardHeader>
    <CardContent>
      {studentsLoading ? (
        <div className="text-gray-500">Loading analytics...</div>
      ) : allStudents.length === 0 ? (
        <div className="text-gray-500">No students found.</div>
      ) : (
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 rounded-lg p-6 shadow flex flex-col items-center">
              <div className="text-3xl font-bold text-blue-700">{groupStats ? groupStats.avgScore.toFixed(2) : "N/A"}</div>
              <div className="text-sm text-gray-600 mt-2">Avg Score</div>
            </div>
            <div className="bg-white/80 rounded-lg p-6 shadow flex flex-col items-center">
              <div className="text-3xl font-bold text-green-700">{groupStats ? groupStats.avgAccuracy.toFixed(2) : "N/A"}%</div>
              <div className="text-sm text-gray-600 mt-2">Avg Accuracy</div>
            </div>
            <div className="bg-white/80 rounded-lg p-6 shadow flex flex-col items-center">
              <div className="text-3xl font-bold text-indigo-700">{groupStats ? groupStats.total : "N/A"}</div>
              <div className="text-sm text-gray-600 mt-2">Total Students</div>
            </div>
          </div>
          {/* Top/Bottom Performer */}
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-white/80 rounded-lg p-6 shadow">
              <div className="font-semibold text-green-700">Top Performer</div>
              <div className="text-lg font-bold">
                {groupStats ? (groupStats.top.full_name || groupStats.top.username) : "N/A"}
              </div>
              <div className="text-sm text-gray-600">
                Score: {groupStats ? groupStats.top.avg_score : "N/A"}
              </div>
            </div>
            <div className="flex-1 bg-white/80 rounded-lg p-6 shadow">
              <div className="font-semibold text-red-700">Lowest Performer</div>
              <div className="text-lg font-bold">{groupStats ? (groupStats.bottom.full_name || groupStats.bottom.username) : "N/A"}</div>
              <div className="text-sm text-gray-600">Score: {groupStats ? groupStats.bottom.avg_score : "N/A"}</div>
            </div>
          </div>
          {/* Insights & Milestones */}
          <div className="flex flex-col gap-2">
            {/* Example: Add more advanced group insights here as needed */}
            <div className="text-indigo-700 font-semibold">Most improved section: <span className="font-bold">(Demo)</span></div>
            <div className="text-blue-700 font-semibold">Highest subject proficiency: <span className="font-bold">(Demo)</span></div>
            <div className="text-green-700 font-semibold">Milestone: <span className="font-bold">Over 90% average in 2 sections!</span></div>
          </div>
          {/* Group Score Trends (Line Chart) */}
          <div className="bg-white/80 rounded-lg p-6 shadow">
            <div className="font-semibold mb-2">Group Score Trends</div>
            {/* Chart.js Line chart for group score trends (demo data) */}
            <Line
              data={{
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                  label: "Avg Score",
                  data: [70, 72, 75, 78, 80, 82],
                  borderColor: "#6366f1",
                  backgroundColor: "rgba(99,102,241,0.2)",
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100 } },
              }}
            />
          </div>
          {/* Group Subject Proficiency (Radar Chart, demo) */}
          <div className="bg-white/80 rounded-lg p-6 shadow">
            <div className="font-semibold mb-2">Group Subject Proficiency</div>
            <Radar
              data={{
                labels: ["Math", "Physics", "Chemistry", "Biology"],
                datasets: [{
                  label: "Proficiency",
                  data: [80, 75, 85, 70],
                  backgroundColor: "rgba(16,185,129,0.2)",
                  borderColor: "#10b981",
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { r: { min: 0, max: 100 } },
              }}
            />
          </div>
          {/* Group Knowledge Retention (Pie Chart, demo) */}
          <div className="bg-white/80 rounded-lg p-6 shadow">
            <div className="font-semibold mb-2">Group Knowledge Retention</div>
            <Pie
              data={{
                labels: ["Retention", "Lost"],
                datasets: [{
                  data: [78, 22],
                  backgroundColor: ["#f59e42", "#e5e7eb"],
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: true, position: "bottom" } },
              }}
            />
          </div>
        </div>
      )}
    </CardContent>
  </Card>

      {/* All Students List */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Registered Students</CardTitle>
          <CardDescription>Click on any student to view detailed performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {studentsLoading ? (
            <div className="text-gray-500">Loading students...</div>
          ) : allStudents.length === 0 ? (
            <div className="text-gray-500">No students found.</div>
          ) : allStudents.map((student) => (
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
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{student.full_name || student.username}</h3>
                    </div>
                    <p className="text-sm text-gray-600">ID: {student.id}</p>
                    <p className="text-xs text-gray-500">Section: {student.section} | Dept: {student.department}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-gray-900">{student.avg_score ?? 'N/A'}%</p>
                      <p className="text-xs text-gray-600">Avg Score</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-gray-900">{student.accuracy_rate ?? 'N/A'}%</p>
                      <p className="text-xs text-gray-600">Accuracy</p>
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
    </div>
  )
}
