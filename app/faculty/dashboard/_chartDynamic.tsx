// Chart.js dynamic imports for dashboard analytics
<<<<<<< HEAD
import dynamic from "next/dynamic";
=======
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

// Register Chart.js components on client-side only
if (typeof window !== "undefined") {
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
}

>>>>>>> 13b50ce (Updated Faculty and some Student's Functionality)
export const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), { ssr: false });
export const Radar = dynamic(() => import("react-chartjs-2").then(mod => mod.Radar), { ssr: false });
export const Pie = dynamic(() => import("react-chartjs-2").then(mod => mod.Pie), { ssr: false });
