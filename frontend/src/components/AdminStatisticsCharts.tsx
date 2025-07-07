import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AdminTextStatistics } from "@/api/types";

interface AdminStatisticsChartsProps {
  statistics: AdminTextStatistics;
}

const COLORS = {
  available: "#10B981", // green
  progress: "#F59E0B", // amber
  reviewed: "#8B5CF6", // purple
  rejected: "#EF4444", // red
  heavily_rejected: "#F97316", // orange
};

export function AdminStatisticsCharts({
  statistics,
}: AdminStatisticsChartsProps) {
  // Text Status Distribution Data
  const textStatusData = [
    {
      name: "Available",
      value: statistics.available_for_new_users,
      color: COLORS.available,
    },
    {
      name: "In Progress",
      value: statistics.progress,
      color: COLORS.progress,
    },
    {
      name: "Reviewed",
      value: statistics.reviewed,
      color: COLORS.reviewed,
    },
    {
      name: "Heavily Rejected",
      value: statistics.heavily_rejected_texts,
      color: COLORS.heavily_rejected,
    },
  ];

  // Rejection Statistics Data
  const rejectionData = [
    {
      name: "Total Rejections",
      value: statistics.total_rejections,
      color: COLORS.rejected,
    },
    {
      name: "Unique Rejected Texts",
      value: statistics.unique_rejected_texts,
      color: COLORS.heavily_rejected,
    },
  ];

  // Overall Progress Data
  const progressData = [
    {
      name: "Total Texts",
      value: statistics.total,
      fill: "#3B82F6",
    },
    {
      name: "Available",
      value: statistics.available_for_new_users,
      fill: COLORS.available,
    },
    {
      name: "In Progress",
      value: statistics.progress,
      fill: COLORS.progress,
    },
    {
      name: "Completed",
      value: statistics.reviewed,
      fill: COLORS.reviewed,
    },
    {
      name: "Rejected",
      value: statistics.unique_rejected_texts,
      fill: COLORS.rejected,
    },
  ];

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent)
      return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}
      </text>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Text Status Distribution */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📊 Text Status Distribution
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={textStatusData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {textStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} texts`,
                name,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Overall Progress Bar Chart */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          📈 Overall Progress
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={progressData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis />
            <Tooltip formatter={(value: number) => [`${value}`, "Count"]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rejection Statistics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          ❌ Rejection Statistics
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={rejectionData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip formatter={(value: number) => [`${value}`, "Count"]} />
            <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Metrics Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🔢 Key Metrics
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Active Users</span>
            <span className="text-2xl font-bold text-blue-600">
              {statistics.total_active_users}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Completion Rate</span>
            <span className="text-2xl font-bold text-green-600">
              {statistics.total > 0
                ? ((statistics.reviewed / statistics.total) * 100).toFixed(1)
                : "0"}
              %
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Rejection Rate</span>
            <span className="text-2xl font-bold text-red-600">
              {statistics.total > 0
                ? (
                    (statistics.unique_rejected_texts / statistics.total) *
                    100
                  ).toFixed(1)
                : "0"}
              %
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Avg Rejections per Text</span>
            <span className="text-2xl font-bold text-orange-600">
              {statistics.unique_rejected_texts > 0
                ? (
                    statistics.total_rejections /
                    statistics.unique_rejected_texts
                  ).toFixed(1)
                : "0"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
