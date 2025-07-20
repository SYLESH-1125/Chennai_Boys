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
  const [quizData, setQuizData] = useState<any>(null) // Store full quiz data for download

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

  // Download quiz with answers and explanations
  const downloadQuizPDF = async () => {
    if (!result || !quizData) return;
    
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Title page
      doc.setFontSize(24);
      doc.setTextColor(40, 40, 40);
      doc.text(`${result.quizTitle}`, 20, 30);
      
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 100);
      doc.text(`Quiz Code: ${result.quizCode}`, 20, 45);
      doc.text(`Student: ${result.studentName}`, 20, 55);
      doc.text(`Score: ${result.score}% (${result.correctAnswers}/${result.totalQuestions})`, 20, 65);
      doc.text(`Date: ${new Date(result.submittedAt).toLocaleDateString()}`, 20, 75);
      
      let yPosition = 95;
      
      // Performance Summary
      doc.setFontSize(18);
      doc.setTextColor(40, 40, 40);
      doc.text('Performance Summary', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60);
      doc.text(`Time Spent: ${Math.floor(result.timeSpent / 60)}:${(result.timeSpent % 60).toString().padStart(2, '0')}`, 25, yPosition);
      yPosition += 8;
      doc.text(`Accuracy: ${Math.round((result.correctAnswers / result.totalQuestions) * 100)}%`, 25, yPosition);
      yPosition += 8;
      
      const performance = result.score >= 90 ? 'Excellent' : 
                         result.score >= 80 ? 'Very Good' : 
                         result.score >= 70 ? 'Good' : 
                         result.score >= 60 ? 'Average' : 'Needs Improvement';
      doc.text(`Performance Level: ${performance}`, 25, yPosition);
      yPosition += 20;
      
      // Questions and Answers
      doc.setFontSize(16);
      doc.text('Quiz Questions and Answers', 20, yPosition);
      yPosition += 15;
      
      const questions = quizData.questions || [];
      
      questions.forEach((question: any, index: number) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
        
        // Question
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        const questionText = `${index + 1}. ${question.question}`;
        const questionLines = doc.splitTextToSize(questionText, 170);
        doc.text(questionLines, 20, yPosition);
        yPosition += questionLines.length * 7 + 5;
        
        // Options for multiple choice questions
        if (question.type === 'multiple-choice' && question.options) {
          doc.setFontSize(12);
          question.options.forEach((option: string, optIndex: number) => {
            const optionPrefix = String.fromCharCode(65 + optIndex); // A, B, C, D
            const isCorrect = question.correctAnswer === optIndex;
            const isUserAnswer = result.answers[index] === optIndex;
            
            doc.setTextColor(60, 60, 60);
            if (isCorrect) {
              doc.setTextColor(0, 128, 0); // Green for correct answer
            } else if (isUserAnswer) {
              doc.setTextColor(255, 0, 0); // Red for wrong user answer
            }
            
            const optionText = `${optionPrefix}. ${option} ${isCorrect ? '✓ (Correct)' : ''} ${isUserAnswer && !isCorrect ? '✗ (Your Answer)' : ''}`;
            const optionLines = doc.splitTextToSize(optionText, 160);
            doc.text(optionLines, 30, yPosition);
            yPosition += optionLines.length * 6 + 3;
          });
        } else {
          // For other question types, show correct answer
          doc.setFontSize(12);
          doc.setTextColor(0, 128, 0);
          doc.text(`Correct Answer: ${question.correctAnswer}`, 30, yPosition);
          yPosition += 10;
          
          if (result.answers[index] !== undefined) {
            const isUserAnswerCorrect = result.answers[index] === question.correctAnswer;
            doc.setTextColor(isUserAnswerCorrect ? 0 : 255, isUserAnswerCorrect ? 128 : 0, 0);
            doc.text(`Your Answer: ${result.answers[index]}`, 30, yPosition);
            yPosition += 10;
          }
        }
        
        // Explanation
        if (question.explanation) {
          doc.setFontSize(11);
          doc.setTextColor(80, 80, 80);
          doc.text('Explanation:', 30, yPosition);
          yPosition += 7;
          
          const explanationLines = doc.splitTextToSize(question.explanation, 160);
          doc.text(explanationLines, 30, yPosition);
          yPosition += explanationLines.length * 6 + 10;
        }
        
        yPosition += 5; // Extra space between questions
      });
      
      // Study recommendations (if score < 80%)
      if (result.score < 80) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = 30;
        }
        
        doc.setFontSize(16);
        doc.setTextColor(40, 40, 40);
        doc.text('Study Recommendations', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        
        const recommendations = [
          'Review the questions you answered incorrectly',
          'Focus on the explanations provided for each question',
          'Practice similar topics to improve understanding',
          'Consider discussing difficult concepts with your instructor',
          'Take practice quizzes to reinforce learning'
        ];
        
        recommendations.forEach((rec, index) => {
          doc.text(`• ${rec}`, 25, yPosition);
          yPosition += 10;
        });
      }
      
      // Save the PDF
      doc.save(`${result.quizTitle}_${result.studentName}_Result.pdf`);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const loadResult = async () => {
    const savedResults = localStorage.getItem("quiz_results")
    if (savedResults) {
      const results = JSON.parse(savedResults)
      const foundResult = results.find((r: QuizResult) => r.id === resultId)
      if (foundResult) {
        setResult(foundResult)
        
        // Also fetch the quiz data for PDF generation
        try {
          const { supabase } = await import("@/lib/supabase");
          const { data: quiz, error } = await supabase
            .from('quizzes')
            .select('*')
            .eq('code', foundResult.quizCode)
            .single();
            
          if (quiz && !error) {
            setQuizData(quiz);
          }
        } catch (error) {
          console.error('Error fetching quiz data:', error);
        }
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
          <Button variant="outline" onClick={downloadQuizPDF}>
            <Download className="mr-2 h-4 w-4" />
            Download Quiz Report
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
