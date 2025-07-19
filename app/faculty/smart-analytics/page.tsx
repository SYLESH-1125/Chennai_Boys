"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

// Dynamically import chart components for better performance
const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false });
const Radar = dynamic(() => import("react-chartjs-2").then(mod => mod.Radar), { ssr: false });
const Bar = dynamic(() => import("react-chartjs-2").then(mod => mod.Bar), { ssr: false });
const Pie = dynamic(() => import("react-chartjs-2").then(mod => mod.Pie), { ssr: false });

export default function SmartAnalyticsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      setError("");
      try {
        const { supabase } = await import("@/lib/supabase");
        const { data, error } = await supabase
          .from("students")
          .select("*")
        if (error) throw error;
        setStudents(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load students");
      }
      setLoading(false);
    }
    fetchStudents();
  }, []);

  // Aggregate analytics for all students
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const avgScore = avg(students.map(s => s.avg_score || 0));
  const avgAccuracy = avg(students.map(s => s.accuracy_rate || 0));
  const avgRetention = avg(students.map(s => {
    if (Array.isArray(s.knowledge_retention)) {
      const vals = s.knowledge_retention.map((k: any) => k.score || k);
      return avg(vals);
    }
    return s.knowledge_retention || 0;
  }));
  const top = students.reduce((a, b) => (a.avg_score || 0) > (b.avg_score || 0) ? a : b, {});
  const bottom = students.reduce((a, b) => (a.avg_score || 0) < (b.avg_score || 0) ? a : b, {});

  // Demo group trends and subject proficiency
  const groupScoreTrendLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const groupScoreTrendData = [70, 72, 75, 78, 80, 82];
  const groupSubjectLabels = ["Math", "Physics", "Chemistry", "Biology"];
  const groupSubjectScores = [80, 75, 85, 70];
  const groupRetention = 78;

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <Card className="bg-gradient-to-r from-indigo-50 to-green-50 border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Smart Analytics (All Students)</CardTitle>
          <CardDescription>Aggregated advanced metrics, insights, and visualizations</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-gray-500">Loading analytics...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : students.length === 0 ? (
            <div className="text-gray-500">No students found.</div>
          ) : (
            <div className="space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/80 rounded-lg p-6 shadow flex flex-col items-center">
                  <div className="text-3xl font-bold text-blue-700">{avgScore.toFixed(2)}</div>
                  <div className="text-sm text-gray-600 mt-2">Avg Score</div>
                </div>
                <div className="bg-white/80 rounded-lg p-6 shadow flex flex-col items-center">
                  <div className="text-3xl font-bold text-green-700">{avgAccuracy.toFixed(2)}%</div>
                  <div className="text-sm text-gray-600 mt-2">Avg Accuracy</div>
                </div>
                <div className="bg-white/80 rounded-lg p-6 shadow flex flex-col items-center">
                  <div className="text-3xl font-bold text-indigo-700">{students.length}</div>
                  <div className="text-sm text-gray-600 mt-2">Total Students</div>
                </div>
              </div>
              {/* Top/Bottom Performer */}
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 bg-white/80 rounded-lg p-6 shadow">
                  <div className="font-semibold text-green-700">Top Performer</div>
                  <div className="text-lg font-bold">{top.full_name || top.username}</div>
                  <div className="text-sm text-gray-600">Score: {top.avg_score}</div>
                </div>
                <div className="flex-1 bg-white/80 rounded-lg p-6 shadow">
                  <div className="font-semibold text-red-700">Lowest Performer</div>
                  <div className="text-lg font-bold">{bottom.full_name || bottom.username}</div>
                  <div className="text-sm text-gray-600">Score: {bottom.avg_score}</div>
                </div>
              </div>
              {/* Insights & Milestones */}
              <div className="flex flex-col gap-2">
                <div className="text-indigo-700 font-semibold">Most improved section: <span className="font-bold">(Demo)</span></div>
                <div className="text-blue-700 font-semibold">Highest subject proficiency: <span className="font-bold">(Demo)</span></div>
                <div className="text-green-700 font-semibold">Milestone: <span className="font-bold">Over 90% average in 2 sections!</span></div>
              </div>
              {/* Group Score Trends (Line Chart) */}
              <div className="bg-white/80 rounded-lg p-6 shadow">
                <div className="font-semibold mb-2">Group Score Trends</div>
                <Line
                  data={{
                    labels: groupScoreTrendLabels,
                    datasets: [{
                      label: "Avg Score",
                      data: groupScoreTrendData,
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
                    labels: groupSubjectLabels,
                    datasets: [{
                      label: "Proficiency",
                      data: groupSubjectScores,
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
                      data: [groupRetention, 100 - groupRetention],
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
    </div>
  );
}
