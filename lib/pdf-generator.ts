import jsPDF from 'jspdf';

export interface QuizResult {
  id: string;
  student_id: string;
  student_name?: string;
  quizcode: string;
  score: number;
  total_questions: number;
  submitted_at: string;
  answers: any[];
  quiz_title?: string;
  questions?: any[]; // Full questions with explanations
}

export interface AnalyticsData {
  totalSubmissions: number;
  avgScore: number;
  completionRate: number;
  activeStudents: number;
  responseRate: number;
  recentActivities: any[];
  quizStats: Record<string, any>;
  // Enhanced metrics
  performanceTrend?: number[];
  subjectWisePerformance?: Record<string, number>;
  difficultyLevelStats?: Record<string, { count: number; avgScore: number }>;
  timeBasedStats?: Record<string, number>;
  // New section analytics
  sectionAnalytics?: {
    sectionComparison: Record<string, { avgScore: number; totalStudents: number; participation: number }>;
    topPerformingSections: Array<{ section: string; avgScore: number; improvement: number }>;
    weakPerformingSections: Array<{ section: string; avgScore: number; needsAttention: string }>;
    subjectTrends: Record<string, { trend: number[]; improvement: number }>;
    engagementMetrics: { 
      highEngagement: number; 
      mediumEngagement: number; 
      lowEngagement: number;
      peakHours: string[];
      mostActiveDay: string;
    };
  };
}

// Helper function to draw simple bar chart
function drawMiniBarChart(doc: jsPDF, x: number, y: number, width: number, height: number, data: number[], labels: string[], title: string) {
  // Validate inputs
  if (width <= 0 || height <= 0 || data.length === 0) return;
  
  doc.setFontSize(8);
  doc.text(title, x, y - 5);
  
  // Draw chart border
  doc.rect(x, y, width, height);
  
  const maxValue = Math.max(...data, 1);
  const barWidth = width / data.length;
  
  data.forEach((value, index) => {
    const barHeight = Math.max(0, (value / maxValue) * height);
    const barX = x + (index * barWidth);
    const barY = y + height - barHeight;
    
    // Only draw if dimensions are valid
    if (barWidth > 2 && barHeight > 0) {
      // Draw bar
      doc.setFillColor(59, 130, 246); // Blue color
      doc.rect(barX + 1, barY, barWidth - 2, barHeight, 'F');
    }
    
    // Add value label
    if (barHeight > 10) {
      doc.setTextColor(255, 255, 255);
      doc.text(value.toString(), barX + barWidth/2 - 3, barY + barHeight/2 + 1);
    }
    
    // Add x-axis label
    doc.setTextColor(0, 0, 0);
    if (labels[index] && labels[index].length <= 3) {
      doc.text(labels[index], barX + barWidth/2 - 3, y + height + 8);
    }
  });
}

// Helper function to draw pie chart
function drawMiniPieChart(doc: jsPDF, centerX: number, centerY: number, radius: number, data: number[], labels: string[], colors: string[], title: string) {
  // Validate inputs
  if (radius <= 0 || data.length === 0 || data.every(val => val === 0)) return;
  
  doc.setFontSize(8);
  doc.text(title, centerX - 20, centerY - radius - 10);
  
  const total = data.reduce((sum, val) => sum + val, 0);
  if (total === 0) return;
  
  let currentAngle = 0;
  
  data.forEach((value, index) => {
    if (value <= 0) return; // Skip empty slices
    
    const sliceAngle = (value / total) * 2 * Math.PI;
    const endAngle = currentAngle + sliceAngle;
    
    // Set color
    const color = colors[index % colors.length];
    const colorParts = color.split(',');
    if (colorParts.length === 3) {
      const [r, g, b] = colorParts.map(Number);
      doc.setFillColor(r, g, b);
      
      // Draw pie slice (simplified as rectangles for basic representation)
      const x = centerX + Math.cos(currentAngle + sliceAngle/2) * (radius * 0.7);
      const y = centerY + Math.sin(currentAngle + sliceAngle/2) * (radius * 0.7);
      
      // Only draw if position is valid
      if (x > 0 && y > 0 && x < 200 && y < 280) {
        doc.rect(x - 3, y - 3, 6, 6, 'F');
        
        // Add percentage
        const percentage = Math.round((value / total) * 100);
        if (percentage > 5) {
          doc.setTextColor(0, 0, 0);
          doc.text(`${percentage}%`, x - 3, y + 1);
        }
      }
    }
    
    currentAngle = endAngle;
  });
  
  // Add legend
  let legendY = centerY + radius + 5;
  data.forEach((value, index) => {
    if (legendY > centerY + radius + 25 || value <= 0) return; // Limit legend items and skip empty
    
    const color = colors[index % colors.length];
    const colorParts = color.split(',');
    if (colorParts.length === 3) {
      const [r, g, b] = colorParts.map(Number);
      doc.setFillColor(r, g, b);
      doc.rect(centerX - 25, legendY - 2, 4, 4, 'F');
      
      doc.setTextColor(0, 0, 0);
      doc.text(`${labels[index]}: ${value}`, centerX - 18, legendY + 1);
      legendY += 6;
    }
  });
}

// Helper function to draw progress bar
function drawProgressBar(doc: jsPDF, x: number, y: number, width: number, height: number, percentage: number, label: string) {
  // Validate inputs
  if (width <= 0 || height <= 0 || percentage < 0) return;
  
  // Draw background
  doc.setFillColor(230, 230, 230);
  doc.rect(x, y, width, height, 'F');
  
  // Draw progress
  const progressWidth = Math.max(0, Math.min(width, (percentage / 100) * width));
  if (progressWidth > 0) {
    const color = percentage >= 80 ? [34, 197, 94] : percentage >= 60 ? [251, 191, 36] : [239, 68, 68];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(x, y, progressWidth, height, 'F');
  }
  
  // Add percentage text
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);
  doc.text(`${percentage}%`, x + width + 5, y + height - 1);
  
  // Add label
  doc.text(label, x, y - 3);
}

export function generateQuizResultPDF(result: QuizResult): void {
  const doc = new jsPDF();
  
  // Header with styling
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('📊 QUIZ RESULT REPORT', 20, 16);
  
  doc.setTextColor(0, 0, 0);
  
  // Student Info Section
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 35, 190, 40, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('Student Information', 15, 45);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`👤 Student: ${result.student_name || result.student_id}`, 15, 55);
  doc.text(`🔢 Quiz Code: ${result.quizcode}`, 15, 62);
  doc.text(`📅 Submitted: ${new Date(result.submitted_at).toLocaleString()}`, 15, 69);
  
  // Performance Summary with visual elements
  const percentage = Math.round((result.score / result.total_questions) * 100);
  
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 85, 190, 50, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('Performance Summary', 15, 95);
  
  // Large score display
  doc.setFontSize(24);
  doc.setTextColor(percentage >= 80 ? 34 : percentage >= 60 ? 251 : 239, 
                   percentage >= 80 ? 197 : percentage >= 60 ? 191 : 68, 
                   percentage >= 80 ? 94 : percentage >= 60 ? 36 : 68);
  doc.text(`${percentage}%`, 15, 115);
  
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(`Score: ${result.score} out of ${result.total_questions}`, 15, 125);
  
  // Performance indicator
  const performanceText = percentage >= 90 ? '🏆 Excellent' : 
                         percentage >= 80 ? '⭐ Very Good' : 
                         percentage >= 70 ? '👍 Good' : 
                         percentage >= 60 ? '📈 Average' : '📉 Needs Improvement';
  doc.text(performanceText, 80, 115);
  
  // Add progress bar
  drawProgressBar(doc, 80, 120, 100, 6, percentage, 'Overall Performance');
  
  // Footer with motivational message
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 270, 210, 27, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text('💡 Keep practicing and improving! Every quiz is a step forward.', 20, 285);
  
  // Download the PDF
  doc.save(`quiz-result-${result.quizcode}-${result.student_id}.pdf`);
}

export function generateStudentQuizDetailedPDF(
  quiz: any, 
  questions: any[], 
  studentAnswers: any, 
  studentInfo: { id: string; name?: string }
): void {
  const doc = new jsPDF();
  
  // Header with gradient effect
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 0, 210, 28, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('🎓 DETAILED QUIZ ANALYSIS', 20, 18);
  
  // Quiz Info Section with improved spacing
  doc.setTextColor(0, 0, 0);
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 35, 190, 40, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(34, 197, 94);
  doc.text('Quiz Information', 15, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  // Improved text wrapping for long titles
  const titleText = `📚 Title: ${quiz.title || quiz.quiz_id || 'Quiz'}`;
  const titleLines = doc.splitTextToSize(titleText, 90);
  titleLines.forEach((line: string, index: number) => {
    doc.text(line, 15, 55 + (index * 5));
  });
  
  const studentText = `👤 Student: ${studentInfo.name || studentInfo.id}`;
  const studentLines = doc.splitTextToSize(studentText, 90);
  studentLines.forEach((line: string, index: number) => {
    doc.text(line, 15, 65 + (index * 5));
  });
  
  doc.text(`📅 Date: ${new Date().toLocaleDateString()}`, 110, 55);
  doc.text(`🔢 Questions: ${questions.length}`, 110, 62);
  doc.text(`⏰ Generated: ${new Date().toLocaleTimeString()}`, 110, 69);
  
  let yPos = 85;
  let correctCount = 0;
  
  // Process each question with better page management
  questions.forEach((question: any, index: number) => {
    // Check if we need a new page (with more conservative spacing)
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }
    
    // Question Header with improved design and proper spacing
    doc.setFillColor(59, 130, 246);
    doc.rect(10, yPos, 190, 12, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text(`Question ${index + 1} of ${questions.length}`, 15, yPos + 8);
    
    // Question type indicator with better positioning
    const typeText = question.type === 'multiple-choice' ? '📝 Multiple Choice' : 
                    question.type === 'true-false' ? '✓❌ True/False' :
                    question.type === 'fill-in-the-blanks' ? '📝 Fill in Blanks' : '📖 Short Answer';
    doc.text(typeText, 140, yPos + 8);
    
    yPos += 18;
    
    // Question Text with better formatting and page breaks
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('📖 Question:', 15, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const questionLines = doc.splitTextToSize(`${question.question}`, 175);
    questionLines.forEach((line: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 15, yPos);
      yPos += 6;
    });
    
    yPos += 5;
    
    // Display options for multiple choice questions with proper spacing
    if (question.type === 'multiple-choice' && Array.isArray(question.options)) {
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      question.options.forEach((option: string, optIndex: number) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const optionLetter = String.fromCharCode(65 + optIndex);
        const optionText = `${optionLetter}. ${option}`;
        const optionLines = doc.splitTextToSize(optionText, 170);
        optionLines.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += 5;
        });
      });
      yPos += 3;
    }
    
    // Student's Answer Analysis with improved visibility
    const studentAnswer = studentAnswers ? studentAnswers[question.id] : undefined;
    let studentAnswerText = 'No Answer Provided';
    let isCorrect = false;
    
    if (question.type === 'multiple-choice' && Array.isArray(question.options)) {
      if (typeof studentAnswer === 'number' && studentAnswer < question.options.length) {
        studentAnswerText = `${String.fromCharCode(65 + studentAnswer)}. ${question.options[studentAnswer]}`;
        isCorrect = studentAnswer === question.correctAnswer;
      }
    } else if (question.type === 'true-false') {
      if (typeof studentAnswer === 'string') {
        studentAnswerText = studentAnswer.charAt(0).toUpperCase() + studentAnswer.slice(1);
        isCorrect = studentAnswer.toLowerCase() === (question.correctAnswer || '').toLowerCase();
      }
    } else if (question.type === 'fill-in-the-blanks') {
      if (typeof studentAnswer === 'string') {
        studentAnswerText = studentAnswer;
        isCorrect = studentAnswer.toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
      }
    } else if (question.type === 'short-answer') {
      if (typeof studentAnswer === 'string') {
        studentAnswerText = studentAnswer;
        isCorrect = studentAnswer.toLowerCase().trim() === (question.correctAnswer || '').toLowerCase().trim();
      }
    }
    
    if (isCorrect) correctCount++;
    
    // Check for page break before answer boxes
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    // Your Answer Box with enhanced styling and better text wrapping
    const boxHeight = 18;
    doc.setFillColor(isCorrect ? 220 : 254, isCorrect ? 252 : 226, isCorrect ? 231 : 226);
    doc.rect(15, yPos, 180, boxHeight, 'F');
    doc.setDrawColor(isCorrect ? 34 : 239, isCorrect ? 197 : 68, isCorrect ? 94 : 68);
    doc.rect(15, yPos, 180, boxHeight);
    
    doc.setTextColor(isCorrect ? 21 : 153, isCorrect ? 128 : 27, isCorrect ? 61 : 23);
    doc.setFontSize(10);
    doc.text(`${isCorrect ? '✅' : '❌'} YOUR ANSWER`, 20, yPos + 8);
    
    // Wrap student answer text properly
    doc.setFontSize(9);
    const answerLines = doc.splitTextToSize(studentAnswerText, 170);
    answerLines.forEach((line: string, lineIndex: number) => {
      if (lineIndex < 2) { // Limit to 2 lines to prevent overflow
        doc.text(line, 20, yPos + 14 + (lineIndex * 4));
      }
    });
    
    yPos += boxHeight + 5;
    
    // Correct Answer Box with better visibility
    let correctAnswerText = 'N/A';
    if (question.type === 'multiple-choice' && Array.isArray(question.options) && typeof question.correctAnswer === 'number') {
      correctAnswerText = `${String.fromCharCode(65 + question.correctAnswer)}. ${question.options[question.correctAnswer]}`;
    } else if (question.type === 'true-false') {
      correctAnswerText = typeof question.correctAnswer === 'string' ? 
        question.correctAnswer.charAt(0).toUpperCase() + question.correctAnswer.slice(1) : 'N/A';
    } else if (question.type === 'fill-in-the-blanks') {
      correctAnswerText = question.correctAnswer || 'N/A';
    } else if (question.type === 'short-answer') {
      correctAnswerText = question.correctAnswer || 'N/A';
    }
    
    // Check for page break before correct answer box
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    const correctBoxHeight = 18;
    doc.setFillColor(220, 252, 231);
    doc.rect(15, yPos, 180, correctBoxHeight, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.rect(15, yPos, 180, correctBoxHeight);
    
    doc.setTextColor(21, 128, 61);
    doc.setFontSize(10);
    doc.text('✅ CORRECT ANSWER', 20, yPos + 8);
    
    // Wrap correct answer text properly
    doc.setFontSize(9);
    const correctLines = doc.splitTextToSize(correctAnswerText, 170);
    correctLines.forEach((line: string, lineIndex: number) => {
      if (lineIndex < 2) { // Limit to 2 lines to prevent overflow
        doc.text(line, 20, yPos + 14 + (lineIndex * 4));
      }
    });
    
    yPos += correctBoxHeight + 5;
    
    // AI Explanation Section with enhanced styling and better page management
    if (question.explanation && question.explanation.trim()) {
      // Check if we have enough space for explanation
      const explanationLines = doc.splitTextToSize(question.explanation, 170);
      const estimatedHeight = 20 + (explanationLines.length * 5);
      
      if (yPos + estimatedHeight > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(255, 251, 235);
      doc.rect(15, yPos, 180, 3, 'F');
      yPos += 8;
      
      doc.setTextColor(146, 64, 14);
      doc.setFontSize(10);
      doc.text('🧠 AI EXPLANATION & LEARNING INSIGHTS', 20, yPos);
      yPos += 10;
      
      doc.setTextColor(120, 53, 15);
      doc.setFontSize(9);
      explanationLines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 5;
      });
      
      yPos += 8;
    } else {
      // Show placeholder if no explanation
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, 180, 12, 'F');
      
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.text('💡 No AI explanation available for this question', 20, yPos + 8);
      
      yPos += 15;
    }
    
    // Result indicator with better positioning
    doc.setFillColor(isCorrect ? 34 : 239, isCorrect ? 197 : 68, isCorrect ? 94 : 68);
    doc.rect(185, yPos - 60, 15, 60, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(isCorrect ? '✓' : '✗', 190, yPos - 30);
    
    yPos += 15; // Increased space between questions
  });
  
  // Summary Page
  if (yPos > 180) {
    doc.addPage();
    yPos = 20;
  }
  
  // Final Score Summary with enhanced design
  const percentage = Math.round((correctCount / questions.length) * 100);
  
  doc.setFillColor(59, 130, 246);
  doc.rect(10, yPos, 190, 15, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('� PERFORMANCE SUMMARY', 15, yPos + 10);
  
  yPos += 25;
  
  // Large score display
  doc.setFillColor(248, 250, 252);
  doc.rect(15, yPos, 180, 40, 'F');
  
  doc.setFontSize(32);
  doc.setTextColor(percentage >= 80 ? 34 : percentage >= 60 ? 251 : 239, 
                   percentage >= 80 ? 197 : percentage >= 60 ? 191 : 68, 
                   percentage >= 80 ? 94 : percentage >= 60 ? 36 : 68);
  doc.text(`${percentage}%`, 20, yPos + 25);
  
  // Performance text
  const performanceText = percentage >= 90 ? '🏆 Outstanding Performance!' : 
                         percentage >= 80 ? '⭐ Excellent Work!' : 
                         percentage >= 70 ? '👍 Good Job!' : 
                         percentage >= 60 ? '📈 Keep Improving!' : '📚 More Practice Needed';
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(performanceText, 90, yPos + 20);
  
  doc.setFontSize(12);
  doc.text(`${correctCount} out of ${questions.length} questions correct`, 90, yPos + 30);
  
  yPos += 50;
  
  // Score breakdown cards
  const metrics = [
    { label: 'Total Questions', value: questions.length, icon: '📝', color: [59, 130, 246] },
    { label: 'Correct Answers', value: correctCount, icon: '✅', color: [34, 197, 94] },
    { label: 'Wrong Answers', value: questions.length - correctCount, icon: '❌', color: [239, 68, 68] },
    { label: 'Success Rate', value: `${percentage}%`, icon: '🎯', color: [168, 85, 247] }
  ];
  
  metrics.forEach((metric, index) => {
    const cardX = 15 + (index % 2) * 90;
    const cardY = yPos + Math.floor(index / 2) * 30;
    
    // Card with colored header
    doc.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.rect(cardX, cardY, 85, 8, 'F');
    
    doc.setFillColor(255, 255, 255);
    doc.rect(cardX, cardY + 8, 85, 17, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.rect(cardX, cardY, 85, 25);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text(`${metric.icon} ${metric.label}`, cardX + 3, cardY + 6);
    
    doc.setFontSize(16);
    doc.setTextColor(metric.color[0], metric.color[1], metric.color[2]);
    doc.text(metric.value.toString(), cardX + 3, cardY + 20);
  });
  
  yPos += 70;
  
  // Performance Message
  const messages = {
    90: '🏆 Outstanding! You have mastered this topic completely. Your understanding is exceptional.',
    80: '⭐ Excellent work! You have a strong grasp of the material. Keep up the great work!',
    70: '👍 Good job! You understand most concepts. Review the explanations for missed questions.',
    60: '📈 You\'re on the right track! Focus on the areas where you made mistakes and study more.',
    0: '📚 Don\'t worry! Learning takes time. Review all explanations carefully and practice more.'
  };
  
  const messageKey = percentage >= 90 ? 90 : percentage >= 80 ? 80 : percentage >= 70 ? 70 : percentage >= 60 ? 60 : 0;
  const performanceMessage = messages[messageKey as keyof typeof messages];
  
  if (yPos < 240) {
    doc.setFillColor(248, 250, 252);
    doc.rect(15, yPos, 180, 30, 'F');
    doc.setDrawColor(59, 130, 246);
    doc.rect(15, yPos, 180, 30);
    
    doc.setTextColor(59, 130, 246);
    doc.setFontSize(11);
    doc.text('🎓 Personalized Feedback', 20, yPos + 10);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    const messageLines = doc.splitTextToSize(performanceMessage, 170);
    messageLines.forEach((line: string, index: number) => {
      doc.text(line, 20, yPos + 18 + (index * 5));
    });
  }
  
  // Footer with enhanced branding
  doc.setFillColor(34, 197, 94);
  doc.rect(0, 285, 210, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`🎓 Generated by EduPro AI Learning Platform • ${new Date().toLocaleDateString()} • Keep Learning & Growing!`, 15, 292);
  
  // Download the PDF with descriptive filename
  const safeTitle = quiz.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'quiz';
  const safeName = studentInfo.name?.replace(/[^a-zA-Z0-9]/g, '-') || studentInfo.id;
  const filename = `detailed-quiz-analysis-${safeTitle}-${safeName}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function generateAnalyticsReportPDF(analyticsData: AnalyticsData, facultyName: string): void {
  const doc = new jsPDF();
  
  // Header with gradient effect (simulated)
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('📈 FACULTY ANALYTICS DASHBOARD', 20, 20);
  
  doc.setTextColor(0, 0, 0);
  
  // Faculty Info Section
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 35, 190, 25, 'F');
  
  doc.setFontSize(12);
  doc.text(`👨‍🏫 Faculty: ${facultyName}`, 15, 48);
  doc.text(`📅 Generated: ${new Date().toLocaleString()}`, 15, 55);
  
  let yPos = 70;
  
  // Key Metrics Section with cards
  doc.setFontSize(14);
  doc.setTextColor(59, 130, 246);
  doc.text('📊 Key Performance Metrics', 15, yPos);
  yPos += 10;
  
  // Metric cards in a grid
  const metrics = [
    { label: 'Total Submissions', value: analyticsData.totalSubmissions, icon: '📝' },
    { label: 'Average Score', value: `${analyticsData.avgScore}%`, icon: '⭐' },
    { label: 'Active Students', value: analyticsData.activeStudents, icon: '👥' },
    { label: 'Response Rate', value: `${analyticsData.responseRate}%`, icon: '📈' }
  ];
  
  metrics.forEach((metric, index) => {
    const cardX = 15 + (index % 2) * 90;
    const cardY = yPos + Math.floor(index / 2) * 25;
    
    // Card background
    doc.setFillColor(255, 255, 255);
    doc.rect(cardX, cardY, 85, 20, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.rect(cardX, cardY, 85, 20);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`${metric.icon} ${metric.label}`, cardX + 3, cardY + 8);
    
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246);
    doc.text(metric.value.toString(), cardX + 3, cardY + 16);
  });
  
  yPos += 60;
  
  // Performance Distribution Chart
  if (Object.keys(analyticsData.quizStats).length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text('📊 Quiz Performance Distribution', 15, yPos);
    yPos += 10;
    
    const quizCodes = Object.keys(analyticsData.quizStats).slice(0, 6); // Limit to 6 quizzes
    const scores = quizCodes.map(code => analyticsData.quizStats[code]?.avgScore || 0);
    
    drawMiniBarChart(doc, 15, yPos, 80, 30, scores, quizCodes.map(code => code.substring(0, 3)), 'Average Scores by Quiz');
    
    // Add quiz statistics table
    doc.setFontSize(8);
    doc.text('Quiz Code', 105, yPos + 5);
    doc.text('Submissions', 135, yPos + 5);
    doc.text('Avg Score', 165, yPos + 5);
    
    quizCodes.forEach((code, index) => {
      const stats = analyticsData.quizStats[code];
      const rowY = yPos + 12 + (index * 6);
      
      if (rowY > 200) return; // Prevent overflow
      
      doc.text(code.substring(0, 10), 105, rowY);
      doc.text((stats?.submissions || 0).toString(), 135, rowY);
      doc.text(`${stats?.avgScore || 0}%`, 165, rowY);
    });
    
    yPos += 50;
  }
  
  // Student Engagement Pie Chart
  if (yPos < 180) {
    const engagementData = [
      analyticsData.activeStudents,
      Math.max(0, analyticsData.totalSubmissions - analyticsData.activeStudents),
      Math.round(analyticsData.activeStudents * 0.3) // Estimated highly engaged
    ];
    const engagementLabels = ['Active', 'Inactive', 'Highly Engaged'];
    const colors = ['59,130,246', '239,68,68', '34,197,94'];
    
    drawMiniPieChart(doc, 40, yPos + 20, 25, engagementData, engagementLabels, colors, '👥 Student Engagement');
    
    // Performance trends
    doc.setFontSize(10);
    doc.setTextColor(59, 130, 246);
    doc.text('📈 Performance Insights', 100, yPos + 5);
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    const insights = [
      `• Completion Rate: ${analyticsData.completionRate}%`,
      `• Response Rate: ${analyticsData.responseRate}%`,
      `• Active Participation: ${Math.round((analyticsData.activeStudents / Math.max(analyticsData.totalSubmissions, 1)) * 100)}%`
    ];
    
    insights.forEach((insight, index) => {
      doc.text(insight, 100, yPos + 15 + (index * 7));
    });
    
    yPos += 50;
  }
  
  // Start new page if needed
  if (yPos > 220) {
    doc.addPage();
    yPos = 20;
  }
  
  // Recent Activities Section
  if (analyticsData.recentActivities && analyticsData.recentActivities.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(59, 130, 246);
    doc.text('🕒 Recent Student Activities', 15, yPos);
    yPos += 10;
    
    // Table header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, yPos, 180, 8, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text('Student', 20, yPos + 5);
    doc.text('Quiz', 80, yPos + 5);
    doc.text('Score', 130, yPos + 5);
    doc.text('Time', 160, yPos + 5);
    
    yPos += 12;
    
    analyticsData.recentActivities.slice(0, 12).forEach((activity, index) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      const rowColor = index % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
      doc.rect(15, yPos - 3, 180, 8, 'F');
      
      doc.setFontSize(7);
      doc.text((activity.student || 'Unknown').substring(0, 25), 20, yPos + 2);
      doc.text((activity.quiz || 'N/A').substring(0, 20), 80, yPos + 2);
      
      // Color-coded score
      const score = activity.score || 0;
      doc.setTextColor(score >= 80 ? 34 : score >= 60 ? 251 : 239, 
                       score >= 80 ? 197 : score >= 60 ? 191 : 68, 
                       score >= 80 ? 94 : score >= 60 ? 36 : 68);
      doc.text(`${score}%`, 130, yPos + 2);
      
      doc.setTextColor(0, 0, 0);
      doc.text((activity.time || 'N/A').substring(0, 15), 160, yPos + 2);
      
      yPos += 8;
    });
  }
  
  // Summary Box
  if (yPos < 240) {
    yPos = Math.max(yPos + 10, 240);
    
    doc.setFillColor(34, 197, 94);
    doc.rect(15, yPos, 180, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('📋 SUMMARY INSIGHTS', 20, yPos + 8);
    
    const avgPerformance = analyticsData.avgScore >= 80 ? 'Excellent' : 
                          analyticsData.avgScore >= 70 ? 'Good' : 
                          analyticsData.avgScore >= 60 ? 'Satisfactory' : 'Needs Improvement';
    
    doc.setFontSize(8);
    doc.text(`Overall Performance: ${avgPerformance} | Active Engagement: ${analyticsData.responseRate}% | Total Impact: ${analyticsData.totalSubmissions} submissions`, 20, yPos + 18);
  }
  
  // Footer with branding
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 285, 210, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(`🎓 EduPro Analytics Dashboard • Generated for ${facultyName} • ${new Date().toLocaleDateString()}`, 20, 292);
  
  // Download the PDF
  doc.save(`analytics-report-${facultyName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
}
