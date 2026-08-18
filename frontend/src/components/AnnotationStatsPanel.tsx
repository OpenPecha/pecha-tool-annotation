import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoPeople, IoDocumentText, IoPricetags } from "react-icons/io5";
import { useAnnotationCountsSummary } from "@/hooks";
import type {
  AnnotationTextCount,
  AnnotationUserCount,
} from "@/api/types";

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function StatTile({
  icon,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: number;
}>) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold leading-tight text-foreground">
          {value.toLocaleString()}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: Readonly<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}>) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary"
    />
  );
}

function UserCountsCard({
  users,
  isLoading,
}: Readonly<{ users: AnnotationUserCount[]; isLoading: boolean }>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(query) ||
        (u.full_name ?? "").toLowerCase().includes(query)
    );
  }, [users, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoPeople className="h-5 w-5" />
          Annotations per user
        </CardTitle>
        <CardDescription>
          Every user who has created annotations, most active first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by name or username..."
          />
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">User</th>
                <th className="py-2 pr-4 text-right font-medium">Annotations</th>
                <th className="py-2 pr-4 text-right font-medium">Texts</th>
                <th className="py-2 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((u) => (
                <tr key={u.user_id} className="text-foreground">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">
                      {u.full_name?.trim() || u.username}
                    </div>
                    {u.full_name?.trim() && (
                      <div className="text-xs text-muted-foreground">
                        @{u.username}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                    {u.annotation_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {u.text_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-muted-foreground">
                    {formatDate(u.last_annotated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {users.length === 0
                ? "No annotations have been created yet."
                : "No users match your search."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TextCountsCard({
  texts,
  isLoading,
}: Readonly<{ texts: AnnotationTextCount[]; isLoading: boolean }>) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return texts;
    return texts.filter((t) => t.title.toLowerCase().includes(query));
  }, [texts, search]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoDocumentText className="h-5 w-5" />
          Annotations per text
        </CardTitle>
        <CardDescription>
          Every text with annotations, most annotated first. Click a title to
          open it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by text title..."
          />
        </div>
        <div className="max-h-96 overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Text</th>
                <th className="py-2 pr-4 text-right font-medium">Annotations</th>
                <th className="py-2 pr-4 text-right font-medium">Annotators</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filtered.map((t) => (
                <tr key={t.text_id} className="text-foreground">
                  <td className="max-w-xs py-2.5 pr-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/task/${t.text_id}`)}
                      className="block max-w-full truncate text-left font-medium hover:text-primary hover:underline"
                      title={t.title}
                    >
                      {t.title}
                    </button>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                    {t.annotation_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {t.annotator_count.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-muted-foreground">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {texts.length === 0
                ? "No annotations have been created yet."
                : "No texts match your search."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AnnotationStatsPanel() {
  const { data, isLoading, isError } = useAnnotationCountsSummary();

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <AiOutlineLoading3Quarters className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading annotation statistics...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/30 py-8 text-center">
        <p className="text-muted-foreground">
          Could not load annotation statistics. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon={<IoPricetags className="h-5 w-5" />}
          label="Total annotations"
          value={data.total_annotations}
        />
        <StatTile
          icon={<IoPeople className="h-5 w-5" />}
          label="Users who annotated"
          value={data.by_user.length}
        />
        <StatTile
          icon={<IoDocumentText className="h-5 w-5" />}
          label="Texts with annotations"
          value={data.by_text.length}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <UserCountsCard users={data.by_user} isLoading={isLoading} />
        <TextCountsCard texts={data.by_text} isLoading={isLoading} />
      </div>
    </div>
  );
}
