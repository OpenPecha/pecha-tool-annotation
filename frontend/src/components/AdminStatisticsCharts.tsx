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
import type { AdminStaffDetail, AdminTextStatistics } from "@/api/types";

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

function Metric({
  label,
  description,
  value,
  emphasis = "text-lg font-semibold text-slate-700",
}: Readonly<{
  label: string;
  description?: string;
  value: number | string;
  emphasis?: string;
}>) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-gray-600">{label}</p>
        {description && (
          <p className="text-xs text-gray-400">{description}</p>
        )}
      </div>
      <span className={`shrink-0 ${emphasis}`}>{value}</span>
    </div>
  );
}

export function AdminStatisticsCharts({
  statistics,
}: Readonly<AdminStatisticsChartsProps>) {
  const staffRoleCounts = statistics.staff_role_counts ?? {
    admin: 0,
    reviewer: 0,
    annotator: 0,
  };
  const staffWorkTotals = statistics.staff_work_totals ?? {
    uploaded_files: 0,
    texts_annotated: 0,
    reviews_completed: 0,
    work_in_progress: 0,
  };
  const staffDetails = statistics.staff_details ?? [];
  const totalStaffUsers = statistics.total_staff_users ?? 0;
  const contributingUsers = statistics.contributing_users ?? 0;
  const totalActiveUsers = statistics.total_active_users ?? 0;
  const completionRate = statistics.completion_rate ?? 0;
  const rejectionRate = statistics.rejection_rate ?? 0;
  const avgRejectionsPerText = statistics.avg_rejections_per_text ?? 0;
  const staffRoleData = [
    { name: "Admins", value: staffRoleCounts.admin },
    { name: "Reviewers", value: staffRoleCounts.reviewer },
    { name: "Annotators", value: staffRoleCounts.annotator },
  ];

  const formatStaffName = (staffMember: AdminStaffDetail) =>
    staffMember.full_name?.trim() || staffMember.username;

  const formatRoleLabel = (role: AdminStaffDetail["role"]) =>
    role.charAt(0).toUpperCase() + role.slice(1);

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
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          📊 Text Status Distribution
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Where every text currently sits. &ldquo;Available&rdquo; means nobody has
          claimed it yet; &ldquo;Heavily Rejected&rdquo; means at least half the
          project&apos;s annotators skipped it, so it needs attention.
        </p>
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
              {textStatusData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
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
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          📈 Overall Progress
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          The same texts counted against the corpus total, so you can see how much
          is done versus outstanding.
        </p>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          ❌ Rejection Statistics
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          A rejection is someone skipping a text they were offered. &ldquo;Total
          Rejections&rdquo; counts every skip; &ldquo;Unique Rejected Texts&rdquo;
          counts the distinct texts involved.
        </p>
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
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          🔢 Key Metrics
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          People counts cover this project only &mdash; everyone who has uploaded,
          annotated, reviewed, or been given access to a text here.
        </p>
        <div className="space-y-4">
          <Metric
            label="People on this project"
            description="Accounts that have worked on at least one text here."
            value={contributingUsers}
            emphasis="text-2xl font-bold text-blue-600"
          />
          <Metric
            label="Active staff accounts"
            description="Admin, reviewer, and annotator accounts that can be assigned work."
            value={totalStaffUsers}
          />
          {staffRoleData.map((roleStat) => (
            <Metric
              key={roleStat.name}
              label={roleStat.name}
              value={roleStat.value}
            />
          ))}
          <Metric
            label="All registered accounts"
            description="Everyone who has ever signed in, including people outside this project."
            value={totalActiveUsers}
          />
          <div className="border-t border-gray-200 pt-4">
            <Metric
              label="Staff uploaded files"
              description="Texts uploaded by staff accounts."
              value={staffWorkTotals.uploaded_files}
            />
          </div>
          <Metric
            label="Staff texts annotated"
            description="Texts a staff member finished annotating."
            value={staffWorkTotals.texts_annotated}
          />
          <Metric
            label="Staff reviews completed"
            description="Texts a staff member reviewed and marked done."
            value={staffWorkTotals.reviews_completed}
          />
          <Metric
            label="Staff work in progress"
            description="Texts currently claimed and being annotated."
            value={staffWorkTotals.work_in_progress}
          />
          <Metric
            label="Completion rate"
            description="Share of all texts that have been reviewed."
            value={`${completionRate}%`}
            emphasis="text-2xl font-bold text-green-600"
          />
          <Metric
            label="Rejection rate"
            description="Share of all texts that at least one person skipped."
            value={`${rejectionRate}%`}
            emphasis="text-2xl font-bold text-red-600"
          />
          <Metric
            label="Avg rejections per text"
            description="Among skipped texts, how many people skipped each one."
            value={avgRejectionsPerText}
            emphasis="text-2xl font-bold text-orange-600"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Staff Work Details
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Only admin, reviewer, and annotator accounts are included here.
        </p>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4 font-medium">Staff Member</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Uploaded Files</th>
                <th className="py-2 pr-4 font-medium">Texts Annotated</th>
                <th className="py-2 pr-4 font-medium">Reviews Completed</th>
                <th className="py-2 font-medium">Work In Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffDetails.map((staffMember) => (
                <tr key={staffMember.id} className="align-top text-gray-700">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-gray-900">
                      {formatStaffName(staffMember)}
                    </div>
                    {staffMember.full_name && (
                      <div className="text-xs text-gray-500">
                        @{staffMember.username}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">{formatRoleLabel(staffMember.role)}</td>
                  <td className="py-3 pr-4">{staffMember.uploaded_files}</td>
                  <td className="py-3 pr-4">{staffMember.texts_annotated}</td>
                  <td className="py-3 pr-4">{staffMember.reviews_completed}</td>
                  <td className="py-3">{staffMember.work_in_progress}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffDetails.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              No active admin, reviewer, or annotator accounts found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
