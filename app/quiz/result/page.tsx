"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Trophy, Clock, CheckCircle, XCircle, BarChart3, Share2, Download, Home } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"

interface QuizResult {
  id: string
  studentId: string
  studentName: string
  studentEmail: string
  quizTitle: string
  quizCode: string
  score: number
  timeSpent: number
  submittedAt: string
  status: string
  answers: { [key: number]: number }
  correctAnswers: number
  totalQuestions: number
}

export default function QuizResultPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [result, setResult] = useState<QuizResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const resultId = searchParams.get("id")

  useEffect(() => {
    if (status === "loading") return
    if (!session) {
      router.push("/login")
      return
    }
    if (resultId) {
      loadResult()
    }
  }, [session, status, resultId])

  const loadResult = () => {
    const savedResults = localStorage.getItem("quiz_results")
    if (savedResults) {
      const results = JSON.parse(savedResults)
      const foundResult = results.find((r: QuizResult) => r.id === resultId)
      if (foundResult) {
        setResult(foundResult)
      }
    }
    setIsLoading(false)
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 80) return "text-blue-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { variant: "default" as const, label: "Excellent" }
    if (score >= 80) return { variant: "secondary" as const, label: "Good" }
    if (score >= 70) return { variant: "outline" as const, label: "Fair" }
    return { variant: "destructive" as const, label: "Needs Improvement" }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-900">Result Not Found</CardTitle>
            <CardDescription>The quiz result you're looking for doesn't exist.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/student/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scoreBadge = getScoreBadge(result.score)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h1>
          <p className="text-gray-600">Here are your results for {result.quizTitle}</p>
        </div>

        {/* Score Card */}
        <Card className="mb-8 border-0 shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-4 mb-4">
              <div className={`text-6xl font-bold ${getScoreColor(result.score)}`}>{result.score}%</div>
              <div className="text-left">
                <Badge variant={scoreBadge.variant} className="mb-2">
                  {scoreBadge.label}
                </Badge>
                <p className="text-sm text-gray-600">
                  {result.correctAnswers} out of {result.totalQuestions} correct
                </p>
              </div>
            </div>
            <Progress value={result.score} className="h-3" />
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Quiz Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Quiz Code:</span>
                <Badge variant="outline">{result.quizCode}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time Spent:</span>
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-gray-400" />
                  {formatTime(result.timeSpent)}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Submitted:</span>
                <span>{new Date(result.submittedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <Badge variant="default">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Trophy className="mr-2 h-5 w-5" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Correct Answers:</span>
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  <span className="font-semibold text-green-600">{result.correctAnswers}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Incorrect Answers:</span>
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 mr-1 text-red-500" />
                  <span className="font-semibold text-red-600">{result.totalQuestions - result.correctAnswers}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Accuracy Rate:</span>
                <span className={`font-bold ${getScoreColor(result.score)}`}>
                  {Math.round((result.correctAnswers / result.totalQuestions) * 100)}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => router.push("/student/dashboard")}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Home className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share Result
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download Certificate
          </Button>
        </div>

        {/* Motivational Message */}
        <Card className="mt-8 border-0 shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2">
              {result.score >= 90
                ? "Outstanding Performance! 🎉"
                : result.score >= 80
                  ? "Great Job! 👏"
                  : result.score >= 70
                    ? "Good Effort! 👍"
                    : "Keep Practicing! 💪"}
            </h3>
            <p className="text-blue-100">
              {result.score >= 90
                ? "You've mastered this topic! Keep up the excellent work."
                : result.score >= 80
                  ? "You're doing well! A little more practice and you'll be perfect."
                  : result.score >= 70
                    ? "You're on the right track. Review the material and try again."
                    : "Don't give up! Every expert was once a beginner. Keep learning!"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
