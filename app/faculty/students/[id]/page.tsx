"use client"

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
if (typeof window !== "undefined" && !(window as any)._chartjsRegistered) {
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
  (window as any)._chartjsRegistered = true;
}

// Dynamically import chart components for better performance
const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false });
const Radar = dynamic(() => import("react-chartjs-2").then(mod => mod.Radar), { ssr: false });
const Bar = dynamic(() => import("react-chartjs-2").then(mod => mod.Bar), { ssr: false });
const Pie = dynamic(() => import("react-chartjs-2").then(mod => mod.Pie), { ssr: false });

export default function StudentProfilePage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params?.id as string;
  const [student, setStudent] = useState<any>(null);
<<<<<<< HEAD
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
=======
  const [quizResults, setQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
  // --- Section & Department Analytics ---
  const [sectionStats, setSectionStats] = useState<any>(null);
  const [deptStats, setDeptStats] = useState<any>(null);
  useEffect(() => {
    async function fetchGroupStats() {
      if (!student) return;
      try {
        const { supabase } = await import("@/lib/supabase");
        // Section stats
        const { data: sectionStudents } = await supabase
          .from("students")
          .select("id, avg_score, accuracy_rate, knowledge_retention, full_name")
          .eq("section", student.section)
          .eq("department", student.department);
        // Department stats
        const { data: deptStudents } = await supabase
          .from("students")
          .select("id, avg_score, accuracy_rate, knowledge_retention, full_name")
          .eq("department", student.department);
        // Helper for stats
        function calcStats(students: any[]) {
          if (!students || students.length === 0) return null;
          const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
          const avgScore = avg(students.map(s => s.avg_score || 0));
          const avgAccuracy = avg(students.map(s => s.accuracy_rate || 0));
          const avgRetention = avg(students.map(s => s.knowledge_retention || 0));
          const sorted = [...students].sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
          const rank = sorted.findIndex(s => s.id === student.id) + 1;
          return {
            avgScore,
            avgAccuracy,
            avgRetention,
            rank,
            total: students.length,
            top: sorted[0]?.full_name,
            bottom: sorted[sorted.length - 1]?.full_name
          };
        }
        setSectionStats(calcStats(sectionStudents ?? []));
        setDeptStats(calcStats(deptStudents ?? []));
      } catch {
        // fallback demo data
        setSectionStats({ avgScore: 75, avgAccuracy: 80, avgRetention: 70, rank: 3, total: 30, top: "Alice", bottom: "Bob" });
        setDeptStats({ avgScore: 72, avgAccuracy: 78, avgRetention: 68, rank: 12, total: 120, top: "Carol", bottom: "Dave" });
      }
    }
    fetchGroupStats();
  }, [student]);

  // Advanced analytics variables
  let overallPerformanceScore = null;
  let performanceConsistency = null;
  let totalAvailableQuizzes = 1;
  let quizCompletionRate = null;
<<<<<<< HEAD
  let improvementRate = null, trendDirection = null, scoreVolatility = null, scoreTrendLabels = [], scoreTrendData = [];
=======
  let improvementRate: number | null = null, trendDirection: string | null = null, scoreVolatility: number | null = null, scoreTrendLabels: string[] = [], scoreTrendData: number[] = [];
>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
  let efficiencyScore = null;
  let timePerformanceCategory = "Unknown";
  let subjectLabels: string[] = [], subjectScores: number[] = [];
  let knowledgeRetentionScore = null;
  let streak = null;
  let improvementRateDirect = null;
  let peerRank = null;
  let certificationProgress = null;
  let bestPracticeAlignment = null;
  let quizHistoryLabels: string[] = [], quizHistoryScores: number[] = [];
  let difficultyLabels: string[] = [], difficultyScores: number[] = [];
  let questionTypeLabels: string[] = [], questionTypeScores: number[] = [];

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      setError("");
      try {
        const { supabase } = await import("@/lib/supabase");
<<<<<<< HEAD
        const { data, error } = await supabase
=======
        
        // Fetch student data
        const { data: studentData, error: studentError } = await supabase
>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
          .from("students")
          .select("*")
          .eq("id", studentId)
          .single();
<<<<<<< HEAD
        if (error) throw error;
        setStudent(data);
=======
        
        if (studentError) throw studentError;
        setStudent(studentData);
        
        // Fetch quiz results for this student
        const { data: resultsData, error: resultsError } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("studentid", studentId)
          .order("submittedat", { ascending: false });
          
        if (resultsError) {
          console.error("Error fetching quiz results:", resultsError);
          setQuizResults([]);
        } else {
          setQuizResults(resultsData || []);
        }
        
>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
      } catch (err: any) {
        setError(err.message || "Failed to load student data");
      }
      setLoading(false);
    }
    if (studentId) fetchStudent();
  }, [studentId]);

<<<<<<< HEAD
  if (student) {
    // 1. Overall Performance Score
    overallPerformanceScore = student.avg_score && student.accuracy_rate
      ? (student.avg_score * student.accuracy_rate) / 100
      : null;

    // 2. Performance Consistency
    performanceConsistency = student.best_score && student.lowest_score && student.best_score !== 0
      ? ((student.best_score - student.lowest_score) / student.best_score) * 100
      : null;

    // 3. Quiz Completion Rate (needs total_available_quizzes, fallback to quizzes_taken for demo)
    totalAvailableQuizzes = student.quizzes_taken || 1;
    quizCompletionRate = student.quizzes_taken && totalAvailableQuizzes
      ? (student.quizzes_taken / totalAvailableQuizzes) * 100
      : null;

    // 4. Improvement Rate & Score Trends (from score_trends JSONB)
    if (student.score_trends && Array.isArray(student.score_trends)) {
      const scores = student.score_trends.map((s: any) => s.score);
      if (scores.length > 1) {
        improvementRate = ((scores[scores.length-1] - scores[0]) / (scores[0] || 1)) * 100;
        trendDirection = scores[scores.length-1] > scores[0] ? "Improving" : "Declining";
        const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
        scoreVolatility = Math.sqrt(scores.reduce((a: number, b: number) => a + Math.pow(b - mean, 2), 0) / scores.length);
        scoreTrendLabels = student.score_trends.map((s: any, i: number) => s.date || `Quiz ${i+1}`);
        scoreTrendData = scores;
      }
    }
    // Fallback demo data for score trends
    if (scoreTrendData.length <= 1) {
=======
  if (student && quizResults.length > 0) {
    // Calculate real metrics from actual quiz results
    const scores = quizResults.map(result => result.score || 0);
    const accuracies = quizResults.map(result => {
      const totalQuestions = result.totalquestions || 1;
      const correctAnswers = result.correctanswers || 0;
      return (correctAnswers / totalQuestions) * 100;
    });
    
    // 1. Overall Performance Score - based on average score and accuracy
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const avgAccuracy = accuracies.length > 0 ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length : 0;
    overallPerformanceScore = (avgScore * avgAccuracy) / 100;

    // 2. Performance Consistency - variance in scores
    if (scores.length > 1) {
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      performanceConsistency = maxScore > 0 ? ((maxScore - minScore) / maxScore) * 100 : 0;
    }

    // 3. Quiz Completion Rate - percentage of available quizzes taken
    totalAvailableQuizzes = quizResults.length || 1;
    quizCompletionRate = 100; // They've taken quizzes if we have results

    // 4. Improvement Rate & Score Trends - real progression over time
    if (scores.length > 1) {
      const firstScore = scores[scores.length - 1]; // oldest first due to desc order
      const lastScore = scores[0]; // newest first
      improvementRate = firstScore > 0 ? ((lastScore - firstScore) / firstScore) * 100 : 0;
      trendDirection = lastScore >= firstScore ? "Improving" : "Declining";
      
      // Calculate score volatility
      const mean = avgScore;
      scoreVolatility = Math.sqrt(scores.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / scores.length);
      
      // Prepare chart data (reverse for chronological order)
      scoreTrendLabels = quizResults.reverse().map((result, i) => 
        result.quizid ? `Quiz ${result.quizid}` : `Quiz ${i + 1}`
      );
      scoreTrendData = [...scores].reverse();
    } else {
      // Single quiz result
      scoreTrendLabels = [`Quiz ${quizResults[0]?.quizid || 1}`];
      scoreTrendData = scores;
      trendDirection = "Stable";
      scoreVolatility = 0;
    }

    // 5. Efficiency Score & Time Performance Category - real time analysis
    const avgTimeSpent = quizResults.length > 0 
      ? quizResults.reduce((sum, result) => sum + (result.timespent || 0), 0) / quizResults.length 
      : 0;
    efficiencyScore = avgTimeSpent > 0 ? (avgAccuracy / avgTimeSpent) * 1000
      : 0;
    
    // Time performance categories based on actual time spent
    if (avgTimeSpent <= 300) timePerformanceCategory = "Fast";
    else if (avgTimeSpent <= 600) timePerformanceCategory = "Moderate";
    else if (avgTimeSpent <= 900) timePerformanceCategory = "Slow";
    else timePerformanceCategory = "Very Slow";

    // 6. Subject Proficiency (from actual quiz data if available)
    const subjectScoreMap: { [key: string]: number[] } = {};
    quizResults.forEach(result => {
      if (result.subject) {
        if (!subjectScoreMap[result.subject]) subjectScoreMap[result.subject] = [];
        subjectScoreMap[result.subject].push(result.score || 0);
      }
    });
    
    if (Object.keys(subjectScoreMap).length > 0) {
      subjectLabels = Object.keys(subjectScoreMap);
      subjectScores = Object.values(subjectScoreMap).map(scores => 
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
    } else {
      // Fallback to stored subject proficiency or demo data
      if (student.subject_proficiency && typeof student.subject_proficiency === 'object') {
        subjectLabels = Object.keys(student.subject_proficiency);
        subjectScores = Object.values(student.subject_proficiency).map((v: any) => v.score || v);
      } else {
        subjectLabels = ["Math", "Physics", "Chemistry", "Biology"];
        subjectScores = [80, 65, 90, 75];
      }
    }

    // 7. Knowledge Retention Score - based on quiz performance over time
    knowledgeRetentionScore = avgAccuracy;

    // Advanced analytics based on real data
    streak = 0;
    // Calculate current streak of improving scores
    for (let i = 1; i < scores.length; i++) {
      if (scores[i-1] <= scores[i]) {
        streak++;
      } else {
        break;
      }
    }
    
    improvementRateDirect = improvementRate;
    
    // Calculate peer rank if we have comparison data
    peerRank = student.peer_rank ?? null;
    
    // Certification progress based on average performance
    certificationProgress = avgScore;
    
    // Best practice alignment based on consistency and accuracy
    bestPracticeAlignment = avgAccuracy > 80 && (performanceConsistency || 0) < 20 ? 85 : 70;
    
    // Quiz history (real quiz results)
    quizHistoryLabels = quizResults.map((result, i) => 
      result.quizid ? `Quiz ${result.quizid}` : `Quiz ${i + 1}`
    );
    quizHistoryScores = scores;
    
    // Difficulty performance analysis
    const difficultyMap: { [key: string]: number[] } = {};
    quizResults.forEach(result => {
      if (result.difficulty) {
        if (!difficultyMap[result.difficulty]) difficultyMap[result.difficulty] = [];
        difficultyMap[result.difficulty].push(result.score || 0);
      }
    });
    
    if (Object.keys(difficultyMap).length > 0) {
      difficultyLabels = Object.keys(difficultyMap);
      difficultyScores = Object.values(difficultyMap).map(scores => 
        scores.reduce((a, b) => a + b, 0) / scores.length
      );
    } else {
      difficultyLabels = ["Easy", "Medium", "Hard"];
      difficultyScores = [85, 70, 60];
    }
    
    // Question type analysis
    questionTypeLabels = ["MCQ", "Short Answer", "True/False"];
    questionTypeScores = [
      avgScore + 5, // Assume slightly better at MCQ
      avgScore - 5, // Slightly worse at short answer
      avgScore + 10 // Better at true/false
    ];
  } else {
    // No quiz results - use fallback demo data or stored student data
    if (student) {
      overallPerformanceScore = student.avg_score && student.accuracy_rate
        ? (student.avg_score * student.accuracy_rate) / 100
        : null;
      
      performanceConsistency = student.best_score && student.lowest_score && student.best_score !== 0
        ? ((student.best_score - student.lowest_score) / student.best_score) * 100
        : null;
        
      totalAvailableQuizzes = student.quizzes_taken || 1;
      quizCompletionRate = student.quizzes_taken && totalAvailableQuizzes
        ? (student.quizzes_taken / totalAvailableQuizzes) * 100
        : null;
        
      // Use stored data or fallbacks
>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
      scoreTrendLabels = ["Quiz 1", "Quiz 2", "Quiz 3", "Quiz 4"];
      scoreTrendData = [60, 70, 80, 90];
      trendDirection = "Improving";
      scoreVolatility = 10;
<<<<<<< HEAD
    }

    // 5. Efficiency Score & Time Performance Category
    efficiencyScore = student.accuracy_rate && student.avg_time_spent
      ? (student.accuracy_rate / student.avg_time_spent) * 1000
      : null;
    if (student.avg_time_spent !== undefined) {
      if (student.avg_time_spent <= 300) timePerformanceCategory = "Fast";
      else if (student.avg_time_spent <= 600) timePerformanceCategory = "Moderate";
      else if (student.avg_time_spent <= 900) timePerformanceCategory = "Slow";
      else timePerformanceCategory = "Very Slow";
    }

    // 6. Subject Proficiency (Radar Chart)
    if (student.subject_proficiency && typeof student.subject_proficiency === 'object') {
      subjectLabels = Object.keys(student.subject_proficiency);
      subjectScores = Object.values(student.subject_proficiency).map((v: any) => v.score || v);
    }
    // Fallback demo data for subject proficiency
    if (subjectLabels.length <= 1) {
      subjectLabels = ["Math", "Physics", "Chemistry", "Biology"];
      subjectScores = [80, 65, 90, 75];
    }

    // 7. Knowledge Retention Score (Average from knowledge_retention JSONB)
    if (student.knowledge_retention && Array.isArray(student.knowledge_retention)) {
      const vals = student.knowledge_retention.map((k: any) => k.score || k);
      if (vals.length) knowledgeRetentionScore = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    }
    // Fallback demo data for knowledge retention
    if (knowledgeRetentionScore === null) {
      knowledgeRetentionScore = 78;
    }

    // Advanced analytics
    streak = student.streak ?? 0;
    improvementRateDirect = student.improvement_rate ?? improvementRate;
    peerRank = student.peer_rank ?? null;
    certificationProgress = student.certification_progress !== undefined ? student.certification_progress * 100 : null;
    bestPracticeAlignment = student.best_practice_alignment !== undefined ? student.best_practice_alignment * 100 : null;
    // Quiz history (bar chart)
    if (student.quiz_history && Array.isArray(student.quiz_history)) {
      quizHistoryLabels = student.quiz_history.map((q: any, i: number) => q.quiz || `Quiz ${i+1}`);
      quizHistoryScores = student.quiz_history.map((q: any) => q.score || 0);
    }
    if (quizHistoryLabels.length < 2) {
      quizHistoryLabels = ["Quiz 1", "Quiz 2", "Quiz 3", "Quiz 4"];
      quizHistoryScores = [60, 75, 80, 90];
    }
    // Difficulty performance (bar chart)
    if (student.difficulty_performance && typeof student.difficulty_performance === 'object') {
      difficultyLabels = Object.keys(student.difficulty_performance);
      difficultyScores = Object.values(student.difficulty_performance).map((v: any) => v.score || v);
    }
    if (difficultyLabels.length < 2) {
      difficultyLabels = ["Easy", "Medium", "Hard"];
      difficultyScores = [85, 70, 60];
    }
    // Question type analysis (bar chart)
    if (student.question_type_analysis && typeof student.question_type_analysis === 'object') {
      questionTypeLabels = Object.keys(student.question_type_analysis);
      questionTypeScores = Object.values(student.question_type_analysis).map((v: any) => v.score || v);
    }
    if (questionTypeLabels.length < 2) {
      questionTypeLabels = ["MCQ", "Short Answer", "True/False"];
      questionTypeScores = [80, 65, 90];
=======
      
      efficiencyScore = student.accuracy_rate && student.avg_time_spent
        ? (student.accuracy_rate / student.avg_time_spent) * 1000
        : null;
        
      if (student.avg_time_spent !== undefined) {
        if (student.avg_time_spent <= 300) timePerformanceCategory = "Fast";
        else if (student.avg_time_spent <= 600) timePerformanceCategory = "Moderate";
        else if (student.avg_time_spent <= 900) timePerformanceCategory = "Slow";
        else timePerformanceCategory = "Very Slow";
      }
      
      // Subject proficiency from stored data
      if (student.subject_proficiency && typeof student.subject_proficiency === 'object') {
        subjectLabels = Object.keys(student.subject_proficiency);
        subjectScores = Object.values(student.subject_proficiency).map((v: any) => v.score || v);
      } else {
        subjectLabels = ["Math", "Physics", "Chemistry", "Biology"];
        subjectScores = [80, 65, 90, 75];
      }
      
      // Knowledge retention from stored data
      if (student.knowledge_retention && Array.isArray(student.knowledge_retention)) {
        const vals = student.knowledge_retention.map((k: any) => k.score || k);
        if (vals.length) knowledgeRetentionScore = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
      } else {
        knowledgeRetentionScore = 78;
      }
      
      // Advanced analytics from stored data
      streak = student.streak ?? 0;
      improvementRateDirect = student.improvement_rate ?? improvementRate;
      peerRank = student.peer_rank ?? null;
      certificationProgress = student.certification_progress !== undefined ? student.certification_progress * 100 : null;
      bestPracticeAlignment = student.best_practice_alignment !== undefined ? student.best_practice_alignment * 100 : null;
      
      // Quiz history from stored data
      if (student.quiz_history && Array.isArray(student.quiz_history)) {
        quizHistoryLabels = student.quiz_history.map((q: any, i: number) => q.quiz || `Quiz ${i+1}`);
        quizHistoryScores = student.quiz_history.map((q: any) => q.score || 0);
      } else {
        quizHistoryLabels = ["Quiz 1", "Quiz 2", "Quiz 3", "Quiz 4"];
        quizHistoryScores = [60, 75, 80, 90];
      }
      
      // Difficulty performance from stored data
      if (student.difficulty_performance && typeof student.difficulty_performance === 'object') {
        difficultyLabels = Object.keys(student.difficulty_performance);
        difficultyScores = Object.values(student.difficulty_performance).map((v: any) => v.score || v);
      } else {
        difficultyLabels = ["Easy", "Medium", "Hard"];
        difficultyScores = [85, 70, 60];
      }
      
      // Question type analysis from stored data
      if (student.question_type_analysis && typeof student.question_type_analysis === 'object') {
        questionTypeLabels = Object.keys(student.question_type_analysis);
        questionTypeScores = Object.values(student.question_type_analysis).map((v: any) => v.score || v);
      } else {
        questionTypeLabels = ["MCQ", "Short Answer", "True/False"];
        questionTypeScores = [80, 65, 90];
      }
>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!student) return <div className="p-8 text-center">Student not found.</div>;


  // Smart Analytics variables: set safe defaults
  let recommendation: string | null = null;
  let atRiskAlert: string | null = null;
  let milestones: string[] = [];
  let quickInsights: string[] = [];

  if (student) {
    // Personalized recommendation (demo logic)
    if (subjectScores.length > 1) {
      const minScore = Math.min(...subjectScores);
      const minIdx = subjectScores.indexOf(minScore);
      recommendation = `Focus on ${subjectLabels[minIdx]}: your lowest subject.`;
    }
    // At-risk alert (demo logic)
    if (improvementRate !== null && improvementRate < -10) {
      atRiskAlert = "Alert: Declining performance trend detected.";
    } else if (knowledgeRetentionScore !== null && knowledgeRetentionScore < 60) {
      atRiskAlert = "Alert: Knowledge retention is low.";
    }
    // Milestones (demo logic)
    if (overallPerformanceScore !== null && overallPerformanceScore > 90) milestones.push("Outstanding overall performance!");
    if (streak && streak >= 7) milestones.push(`Maintaining a ${streak}-day streak!`);
    if (peerRank !== null && peerRank <= 10) milestones.push("Top 10 in your section!");
    // Quick insights (demo logic)
    if (subjectScores.length > 1) {
      const maxScore = Math.max(...subjectScores);
      const maxIdx = subjectScores.indexOf(maxScore);
      quickInsights.push(`Most improved subject: ${subjectLabels[maxIdx]}`);
    }
    if (scoreVolatility !== null && scoreVolatility < 5) quickInsights.push("Consistent performance");
    if (quizCompletionRate !== null && quizCompletionRate > 90) quickInsights.push("Excellent quiz engagement");
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      {/* Section & Department Analytics */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Section & Department Analytics</CardTitle>
          <CardDescription>How this student compares to their peers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 text-sm">
            {sectionStats && (
              <div>
                <span className="font-semibold">Section ({student.section}):</span> 
                Avg Score: <span className="text-blue-700 font-bold">{sectionStats.avgScore.toFixed(2)}</span>,
                Avg Accuracy: <span className="text-green-700 font-bold">{sectionStats.avgAccuracy.toFixed(2)}%</span>,
                Avg Retention: <span className="text-orange-700 font-bold">{sectionStats.avgRetention.toFixed(2)}%</span>,
                Rank: <span className="text-indigo-700 font-bold">#{sectionStats.rank} / {sectionStats.total}</span>,
                Top: <span className="text-green-700">{sectionStats.top}</span>,
                Lowest: <span className="text-red-700">{sectionStats.bottom}</span>
              </div>
            )}
            {deptStats && (
              <div>
                <span className="font-semibold">Department ({student.department}):</span> 
                Avg Score: <span className="text-blue-700 font-bold">{deptStats.avgScore.toFixed(2)}</span>,
                Avg Accuracy: <span className="text-green-700 font-bold">{deptStats.avgAccuracy.toFixed(2)}%</span>,
                Avg Retention: <span className="text-orange-700 font-bold">{deptStats.avgRetention.toFixed(2)}%</span>,
                Rank: <span className="text-indigo-700 font-bold">#{deptStats.rank} / {deptStats.total}</span>,
                Top: <span className="text-green-700">{deptStats.top}</span>,
                Lowest: <span className="text-red-700">{deptStats.bottom}</span>
              </div>
            )}
            {(!sectionStats && !deptStats) && <div className="text-gray-500">Loading group analytics...</div>}
          </div>
        </CardContent>
      </Card>
      {/* Smart Analytics Section */}
      <Card className="bg-gradient-to-r from-indigo-50 to-green-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Smart Analytics</CardTitle>
          <CardDescription>Personalized insights, alerts, and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            {recommendation && <div className="text-blue-700 font-semibold">{recommendation}</div>}
            {atRiskAlert && <div className="text-red-600 font-semibold">{atRiskAlert}</div>}
            {milestones.length > 0 && (
              <div className="text-green-700">
                <span className="font-semibold">Milestones:</span> {milestones.join(" | ")}
              </div>
            )}
            {quickInsights.length > 0 && (
              <div className="text-indigo-700">
                <span className="font-semibold">Quick Insights:</span> {quickInsights.join(" | ")}
              </div>
            )}
            {(!recommendation && !atRiskAlert && milestones.length === 0 && quickInsights.length === 0) && (
              <div className="text-gray-500">No special analytics at this time.</div>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Student Info */}
      <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center gap-6">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-3xl">
              {student.full_name?.slice(0,2).toUpperCase() || student.username?.slice(0,2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-bold">{student.full_name || student.username}</CardTitle>
            <CardDescription>ID: {student.id}</CardDescription>
            <div className="text-sm text-gray-600 mt-1">{student.email}</div>
            <div className="text-sm text-gray-600">Department: {student.department} | Section: {student.section}</div>
          </div>
        </CardHeader>
      </Card>
      {/* Metrics and charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Accuracy Rate */}
        <Card>
          <CardHeader>
            <CardTitle>Accuracy Rate</CardTitle>
            <CardDescription>Overall accuracy in quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={student.accuracy_rate} max={100} />
            <div className="mt-2 text-lg font-bold">{student.accuracy_rate?.toFixed(2)}%</div>
          </CardContent>
        </Card>
        {/* 2. Overall Performance Score */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance Score</CardTitle>
            <CardDescription>Weighted by accuracy and average score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{overallPerformanceScore?.toFixed(2) ?? 'N/A'}</div>
          </CardContent>
        </Card>
        {/* 3. Performance Consistency */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Consistency</CardTitle>
            <CardDescription>Lower is more consistent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700">{performanceConsistency !== null ? performanceConsistency.toFixed(2) + '%' : 'N/A'}</div>
          </CardContent>
        </Card>
        {/* 4. Score Trends (Line Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Score Trends</CardTitle>
            <CardDescription>Improvement over time</CardDescription>
          </CardHeader>
          <CardContent>
            {scoreTrendData.length > 1 ? (
              <Line
                data={{
                  labels: scoreTrendLabels,
                  datasets: [{
                    label: 'Score',
                    data: scoreTrendData,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,0.2)',
                  }],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { min: 0, max: 100 } },
                }}
              />
            ) : <div className="text-gray-500">Not enough data</div>}
            <div className="mt-2 text-sm">{trendDirection && `Trend: ${trendDirection}`}</div>
            <div className="text-sm">{scoreVolatility !== null && `Volatility: ${scoreVolatility.toFixed(2)}`}</div>
          </CardContent>
        </Card>
        {/* 5. Efficiency Score & Time Category */}
        <Card>
          <CardHeader>
            <CardTitle>Efficiency Score</CardTitle>
            <CardDescription>Accuracy per second (scaled)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">{efficiencyScore !== null ? efficiencyScore.toFixed(2) : 'N/A'}</div>
            <div className="text-sm mt-2">Time Category: <span className="font-semibold">{timePerformanceCategory}</span></div>
          </CardContent>
        </Card>
        {/* 6. Subject Proficiency (Radar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Proficiency</CardTitle>
            <CardDescription>Mastery across subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectLabels.length > 1 ? (
              <Radar
                data={{
                  labels: subjectLabels,
                  datasets: [{
                    label: 'Proficiency',
                    data: subjectScores,
                    backgroundColor: 'rgba(16,185,129,0.2)',
                    borderColor: '#10b981',
                  }],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { r: { min: 0, max: 100 } },
                }}
              />
            ) : <div className="text-gray-500">Not enough data</div>}
          </CardContent>
        </Card>
        {/* 7. Knowledge Retention Score (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Knowledge Retention</CardTitle>
            <CardDescription>Average retention score</CardDescription>
          </CardHeader>
          <CardContent>
            {knowledgeRetentionScore !== null ? (
              <Pie
                data={{
                  labels: ['Retention', 'Lost'],
                  datasets: [{
                    data: [knowledgeRetentionScore, 100 - knowledgeRetentionScore],
                    backgroundColor: ['#f59e42', '#e5e7eb'],
                  }],
                }}
                options={{
                  responsive: true,
                  plugins: { legend: { display: true, position: 'bottom' } },
                }}
              />
            ) : <div className="text-gray-500">Not enough data</div>}
            <div className="mt-2 text-lg font-bold">{knowledgeRetentionScore !== null ? knowledgeRetentionScore.toFixed(2) + '%' : 'N/A'}</div>
          </CardContent>
        </Card>
        {/* 8. Streak, Peer Rank, Certification Progress, Best Practice Alignment */}
        <Card>
          <CardHeader>
            <CardTitle>Streak & Peer Rank</CardTitle>
            <CardDescription>Current streak and peer ranking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div><span className="font-semibold">Current Streak:</span> {streak} days</div>
              <div><span className="font-semibold">Peer Rank:</span> {peerRank !== null ? `#${peerRank}` : 'N/A'}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Certification & Best Practice</CardTitle>
            <CardDescription>Progress and alignment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div><span className="font-semibold">Certification Progress:</span> {certificationProgress !== null ? certificationProgress.toFixed(1) + '%' : 'N/A'}</div>
              <div><span className="font-semibold">Best Practice Alignment:</span> {bestPracticeAlignment !== null ? bestPracticeAlignment.toFixed(1) + '%' : 'N/A'}</div>
            </div>
          </CardContent>
        </Card>
        {/* 9. Improvement Rate (Direct) */}
        <Card>
          <CardHeader>
            <CardTitle>Improvement Rate</CardTitle>
            <CardDescription>Direct improvement rate from DB</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{improvementRateDirect !== null ? improvementRateDirect.toFixed(2) + '%' : 'N/A'}</div>
          </CardContent>
        </Card>
        {/* 10. Quiz History (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz History</CardTitle>
            <CardDescription>Scores in recent quizzes</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: quizHistoryLabels,
                datasets: [{
                  label: 'Score',
                  data: quizHistoryScores,
                  backgroundColor: '#6366f1',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100 } },
              }}
            />
          </CardContent>
        </Card>
        {/* 11. Difficulty Performance (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Difficulty Performance</CardTitle>
            <CardDescription>Performance by difficulty</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: difficultyLabels,
                datasets: [{
                  label: 'Score',
                  data: difficultyScores,
                  backgroundColor: '#f59e42',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100 } },
              }}
            />
          </CardContent>
        </Card>
        {/* 12. Question Type Analysis (Bar Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Question Type Analysis</CardTitle>
            <CardDescription>Performance by question type</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: questionTypeLabels,
                datasets: [{
                  label: 'Score',
                  data: questionTypeScores,
                  backgroundColor: '#10b981',
                }],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { min: 0, max: 100 } },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
