"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiBriefcase,
  FiCamera,
  FiCalendar,
  FiEdit,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSave,
  FiShield,
  FiUser,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CampusFileUpload, campusToast } from "@/components/campushub";
import { Modal } from "@/components/shared/modal";
import { Skeleton } from "@/components/shared/skeleton";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AccountProfile,
  AccountProfileAnalytics,
} from "@/features/account/lib/account-profile-service";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/store/user-store";

type AccountProfilePayload = {
  data?: {
    profile?: AccountProfile;
    analytics?: AccountProfileAnalytics | null;
  };
  error?: {
    message?: string;
  } | null;
};

type ProfileTab = "overview" | "scope" | "contact" | "about";
type MediaEditor = "avatar" | "cover";
type AccountProfilePageProps = {
  fallbackName?: string;
  identityLabel?: string;
  bioPlaceholder?: string;
};
type ProfileFormState = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  bio: string;
  gender: string;
  dateOfBirth: string;
  profileSticker: string;
};

const profileTabs: Array<{ key: ProfileTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "scope", label: "Scope" },
  { key: "contact", label: "Contact" },
  { key: "about", label: "About" },
];

const profileStickerOptions = [
  {
    id: "kibo-happy",
    label: "Happy Kibo",
    image: "/kibo/images/processed/happy.png",
    className: "bg-sky-100",
  },
  {
    id: "kibo-curious",
    label: "Curious Kibo",
    image: "/kibo/images/processed/curious.png",
    className: "bg-violet-100",
  },
  {
    id: "kibo-proud",
    label: "Proud Kibo",
    image: "/kibo/images/processed/proud.png",
    className: "bg-amber-100",
  },
  {
    id: "kibo-sleepy",
    label: "Sleepy Kibo",
    image: "/kibo/images/processed/sleepy.png",
    className: "bg-slate-100",
  },
  {
    id: "kibo-thinking",
    label: "Thinking Kibo",
    image: "/kibo/images/processed/thinking.png",
    className: "bg-emerald-100",
  },
  {
    id: "kibo-celebrate",
    label: "Celebrating Kibo",
    image: "/kibo/images/processed/celebrate.png",
    className: "bg-rose-100",
  },
  {
    id: "kibo-wave",
    label: "Waving Kibo",
    image: "/kibo/images/processed/Kibo_mascot_waving_cheerfully_202606201529.png",
    className: "bg-cyan-100",
  },
  {
    id: "kibo-jumping",
    label: "Jumping Kibo",
    image: "/kibo/images/processed/Kibo_mascot_jumping_joyfully_air_202606201528.png",
    className: "bg-lime-100",
  },
  {
    id: "kibo-reading",
    label: "Reading Kibo",
    image: "/kibo/images/processed/Kibo_mascot_reading_books_202606201528.png",
    className: "bg-orange-100",
  },
  {
    id: "kibo-peek",
    label: "Peeking Kibo",
    image: "/kibo/images/processed/Kibo_mascot_peeking_from_behind_202606201529.png",
    className: "bg-fuchsia-100",
  },
];

const profileFieldClassName = "flex flex-col gap-3";

function fieldValue(value?: string | null) {
  return value && value.trim() ? value : "Not set";
}

function emptyMuted(value: string) {
  return value === "Not set";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatRole(value?: string | null) {
  return fieldValue(value)
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function dateInputValue(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

function yearsSince(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 365)));
}

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 break-words text-base font-semibold text-foreground",
              emptyMuted(value) && "font-medium text-muted-foreground",
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </article>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5 h-72">{children}</div>
    </article>
  );
}

function AnalyticsEmpty({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground">
      No {label.toLowerCase()} data yet.
    </div>
  );
}

function hasValues(rows: Array<{ value?: number }>) {
  return rows.some((row) => Number(row.value ?? 0) > 0);
}

function getProfileSticker(stickerId?: string | null) {
  return profileStickerOptions.find((option) => option.id === stickerId);
}

function ProfileSkeleton() {
  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      <section className="overflow-hidden rounded-lg border border-border bg-surface">
        <Skeleton className="h-44 w-full rounded-none" />
        <div className="px-6 pb-8">
          <div className="-mt-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <Skeleton className="h-40 w-40 rounded-[2rem]" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-80 max-w-full" />
              <Skeleton className="h-10 w-56" />
            </div>
            <div className="grid w-full gap-4 sm:grid-cols-3 lg:w-[28rem]">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
          <div className="mt-8 flex gap-6 border-b border-border pb-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-5 w-20" />
            ))}
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export function AccountProfilePage({
  fallbackName = "CampusHub User",
  identityLabel = "CampusHub Identity",
  bioPlaceholder = "Share a short professional bio, campus focus, or operating mandate.",
}: AccountProfilePageProps = {}) {
  const storedUser = useUserStore((state) => state.user);
  const setStoredUser = useUserStore((state) => state.setUser);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [analytics, setAnalytics] = useState<AccountProfileAnalytics | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaEditor, setMediaEditor] = useState<MediaEditor | null>(null);
  const [mediaValue, setMediaValue] = useState("");
  const [mediaSaving, setMediaSaving] = useState(false);
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    bio: "",
    gender: "",
    dateOfBirth: "",
    profileSticker: "",
  });

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await fetch("/api/account/profile", {
          cache: "no-store",
        });
        const payload = (await response.json()) as AccountProfilePayload;

        if (!active) return;

        if (!response.ok || !payload.data?.profile) {
          throw new Error(payload.error?.message ?? "Unable to load profile.");
        }

        setProfile(payload.data.profile);
        setAnalytics(payload.data.analytics ?? null);
        setError(null);
      } catch (loadError) {
        if (!active) return;

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load profile.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const displayName = useMemo(() => {
    if (!profile) return fallbackName;

    const composedName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    return fieldValue(profile.name) !== "Not set"
      ? profile.name
      : composedName || profile.email;
  }, [fallbackName, profile]);
  const avatarLabel = getInitials(displayName || fallbackName) || "CH";
  const subtitle = profile
    ? fieldValue(profile.title) !== "Not set"
      ? profile.title
      : formatRole(profile.role)
    : fallbackName;
  const locationLine = profile
    ? [profile.universityName, profile.collegeName].filter(Boolean).join(" / ")
    : "";
  const stats = profile
    ? [
        {
          label: "Completion",
          value: `${profile.profileCompletionPercentage}%`,
        },
        { label: "Roles", value: String(profile.roles.length || 1) },
        { label: "Years", value: String(yearsSince(profile.createdAt)) },
      ]
    : [];
  const selectedSticker = getProfileSticker(profile?.profileSticker);

  function openMediaEditor(kind: MediaEditor) {
    if (!profile) return;

    setMediaEditor(kind);
    setMediaValue(
      kind === "avatar"
        ? profile.avatar ?? profile.image ?? ""
        : profile.coverImage ?? "",
    );
  }

  function openProfileEditor() {
    if (!profile) return;

    setProfileForm({
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      phoneNumber: profile.phoneNumber ?? "",
      bio: profile.bio ?? "",
      gender: profile.gender ?? "",
      dateOfBirth: dateInputValue(profile.dateOfBirth),
      profileSticker: profile.profileSticker ?? "",
    });
    setProfileEditorOpen(true);
  }

  async function saveProfileDetails() {
    setProfileSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          phoneNumber: profileForm.phoneNumber,
          bio: profileForm.bio,
          gender: profileForm.gender,
          dateOfBirth: profileForm.dateOfBirth || null,
          profileSticker: profileForm.profileSticker || null,
        }),
      });
      const payload = (await response.json()) as AccountProfilePayload;

      if (!response.ok || !payload.data?.profile) {
        throw new Error(payload.error?.message ?? "Unable to update profile.");
      }

      setProfile(payload.data.profile);
      setAnalytics(payload.data.analytics ?? null);
      if (storedUser) {
        setStoredUser({
          ...storedUser,
          name: payload.data.profile.name,
          image: payload.data.profile.image,
          avatar: payload.data.profile.avatar,
        });
      }
      setProfileEditorOpen(false);
      campusToast.success({
        title: "Profile updated",
        description: "Your profile details have been saved.",
      });
    } catch (saveError) {
      campusToast.error({
        title: "Profile update failed",
        description:
          saveError instanceof Error
            ? saveError.message
            : "Unable to update profile.",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function saveProfileMedia() {
    if (!mediaEditor) return;

    setMediaSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [mediaEditor === "avatar" ? "avatar" : "coverImage"]:
            mediaValue || null,
        }),
      });
      const payload = (await response.json()) as AccountProfilePayload;

      if (!response.ok || !payload.data?.profile) {
        throw new Error(payload.error?.message ?? "Unable to update media.");
      }

      setProfile(payload.data.profile);
      setAnalytics(payload.data.analytics ?? null);
      if (storedUser) {
        setStoredUser({
          ...storedUser,
          name: payload.data.profile.name,
          image: payload.data.profile.image,
          avatar: payload.data.profile.avatar,
        });
      }
      setMediaEditor(null);
      setMediaValue("");
      campusToast.success({
        title: mediaEditor === "avatar" ? "Profile photo updated" : "Cover updated",
        description: "Your profile media has been saved.",
      });
    } catch (saveError) {
      campusToast.error({
        title: "Media update failed",
        description:
          saveError instanceof Error
            ? saveError.message
            : "Unable to update media.",
      });
    } finally {
      setMediaSaving(false);
    }
  }

  if (loading) return <ProfileSkeleton />;

  return (
    <main className="w-full max-w-none px-4 py-6 sm:px-6">
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-5 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {profile ? (
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-black/10">
          <div className="group/cover relative h-64 overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.38),transparent_30%),radial-gradient(circle_at_78%_2%,rgba(219,39,119,0.28),transparent_28%),linear-gradient(135deg,rgba(248,250,252,0.9),rgba(226,232,240,0.25))] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.34),transparent_30%),radial-gradient(circle_at_78%_2%,rgba(219,39,119,0.2),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(24,24,27,0.74))]">
            {profile.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.coverImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface to-transparent" />
            <div className="absolute left-6 top-6 rounded-md border border-white/20 bg-black/25 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
              {identityLabel}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="absolute right-5 top-5 border border-white/20 bg-black/50 text-white opacity-0 shadow-lg backdrop-blur transition hover:bg-black/60 group-hover/cover:opacity-100 group-focus-within/cover:opacity-100"
              title="Edit cover image"
              aria-label="Edit cover image"
              onClick={() => openMediaEditor("cover")}
            >
              <FiCamera className="h-4 w-4" aria-hidden />
              Edit cover
            </Button>
          </div>

          <div className="px-5 pb-8 sm:px-8">
            <div className="relative z-10 -mt-24 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="group/avatar relative z-10 flex h-44 w-44 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] border-4 border-surface bg-primary/10 text-4xl font-semibold text-primary shadow-2xl">
                  {profile.avatar || profile.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar ?? profile.image ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    avatarLabel
                  )}
                  <button
                    type="button"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/62 text-sm font-semibold text-white opacity-0 transition hover:bg-black/70 focus-visible:opacity-100 focus-visible:outline-none group-hover/avatar:opacity-100"
                    title="Edit profile photo"
                    aria-label="Edit profile photo"
                    onClick={() => openMediaEditor("avatar")}
                  >
                    <FiCamera className="h-6 w-6" aria-hidden />
                    Edit photo
                  </button>
                </div>
                <div className="pb-1 [text-shadow:0_2px_18px_rgba(0,0,0,0.65)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold tracking-normal text-white sm:text-4xl">
                      {displayName}
                    </h1>
                    <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-primary-foreground">
                      {fieldValue(profile.status)}
                    </span>
                    {selectedSticker ? (
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/70 text-2xl shadow-lg shadow-black/25",
                          selectedSticker.className,
                        )}
                        title={selectedSticker.label}
                        aria-label={`Profile sticker: ${selectedSticker.label}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedSticker.image}
                          alt=""
                          className="h-10 w-10 object-contain"
                        />
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 max-w-xl text-base leading-7 text-white/82">
                    {fieldValue(subtitle)}
                    {locationLine ? ` based at ${locationLine}` : ""}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button type="button" onClick={openProfileEditor}>
                      <FiEdit className="h-4 w-4" aria-hidden />
                      Edit profile
                    </Button>
                    <Button asChild variant="secondary">
                      <a href={`mailto:${profile.email}`}>
                        <FiMail className="h-4 w-4" aria-hidden />
                        Get in touch
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-lg border border-border bg-background/55 p-4 backdrop-blur sm:grid-cols-3 lg:w-[30rem]">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-md bg-surface/80 p-4 text-left sm:text-center"
                  >
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="mt-2 text-4xl font-semibold tracking-normal text-foreground">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-9 flex gap-8 overflow-x-auto border-b border-border">
              {profileTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    "relative pb-4 text-sm font-medium text-muted-foreground transition hover:text-foreground",
                    activeTab === tab.key && "text-foreground",
                  )}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {activeTab === tab.key ? (
                    <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-foreground" />
                  ) : null}
                </button>
              ))}
            </div>

            {activeTab === "overview" ? (
              <div className="mt-8 space-y-6">
                <div className="grid gap-5 md:grid-cols-3">
                  <InfoCard
                    label="University"
                    value={fieldValue(profile.universityName)}
                    icon={FiMapPin}
                  />
                  <InfoCard
                    label="College"
                    value={fieldValue(profile.collegeName)}
                    icon={FiBriefcase}
                  />
                  <InfoCard
                    label="Department"
                    value={fieldValue(profile.departmentName)}
                    icon={FiBriefcase}
                  />
                </div>

                {analytics ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {analytics.summary.map((item) => (
                        <article
                          key={item.label}
                          className="rounded-lg border border-border bg-background/70 p-5"
                        >
                          <p className="text-sm text-muted-foreground">
                            {item.label}
                          </p>
                          <p className="mt-3 text-3xl font-semibold tracking-normal text-foreground">
                            {item.value.toLocaleString()}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {item.description}
                          </p>
                        </article>
                      ))}
                    </div>

                    <div className="grid gap-5 xl:grid-cols-2">
                      <ChartCard
                        title="University People"
                        description="Role distribution for this university."
                      >
                        {hasValues(analytics.people) ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={analytics.people} barCategoryGap="24%">
                              <CartesianGrid
                                stroke="var(--border)"
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                fill="var(--primary)"
                                radius={[6, 6, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <AnalyticsEmpty label="people" />
                        )}
                      </ChartCard>

                      <ChartCard
                        title="Campus Activity"
                        description="Announcements, events, and polls created over the last six months."
                      >
                        {analytics.activityTrend.some(
                          (row) => row.announcements + row.events + row.polls > 0,
                        ) ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={analytics.activityTrend}>
                              <CartesianGrid
                                stroke="var(--border)"
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="month"
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <Tooltip />
                              <Line
                                type="monotone"
                                dataKey="announcements"
                                stroke="#16a34a"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="events"
                                stroke="#db2777"
                                strokeWidth={2}
                                dot={false}
                              />
                              <Line
                                type="monotone"
                                dataKey="polls"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <AnalyticsEmpty label="activity" />
                        )}
                      </ChartCard>

                      <ChartCard
                        title="Academic Structure"
                        description="Configured institutional records."
                      >
                        {hasValues(analytics.structure) ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={analytics.structure}>
                              <CartesianGrid
                                stroke="var(--border)"
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                fill="#16a34a"
                                radius={[6, 6, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <AnalyticsEmpty label="structure" />
                        )}
                      </ChartCard>

                      <ChartCard
                        title="Operational Footprint"
                        description="Records that support campus services."
                      >
                        {hasValues(analytics.operations) ? (
                          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <BarChart data={analytics.operations}>
                              <CartesianGrid
                                stroke="var(--border)"
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="name"
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                              />
                              <Tooltip />
                              <Bar
                                dataKey="value"
                                fill="#f59e0b"
                                radius={[6, 6, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <AnalyticsEmpty label="operations" />
                        )}
                      </ChartCard>
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeTab === "scope" ? (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <InfoCard
                  label="Role"
                  value={formatRole(profile.role)}
                  icon={FiShield}
                />
                <InfoCard
                  label="Position"
                  value={fieldValue(profile.position)}
                  icon={FiUser}
                />
                <InfoCard
                  label="Staff ID"
                  value={fieldValue(profile.staffId)}
                  icon={FiBriefcase}
                />
              </div>
            ) : null}

            {activeTab === "contact" ? (
              <div className="mt-8 grid gap-5 md:grid-cols-3">
                <InfoCard
                  label="Email"
                  value={fieldValue(profile.email)}
                  icon={FiMail}
                />
                <InfoCard
                  label="Phone"
                  value={fieldValue(profile.phoneNumber)}
                  icon={FiPhone}
                />
                <InfoCard
                  label="Username"
                  value={fieldValue(profile.username)}
                  icon={FiUser}
                />
              </div>
            ) : null}

            {activeTab === "about" ? (
              <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                <article className="rounded-lg border border-border bg-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Bio
                  </p>
                  <p
                    className={cn(
                      "mt-3 text-sm leading-7 text-foreground",
                      !profile.bio && "text-muted-foreground",
                    )}
                  >
                    {fieldValue(profile.bio)}
                  </p>
                </article>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
                  <InfoCard
                    label="Date of Birth"
                    value={formatDate(profile.dateOfBirth)}
                    icon={FiCalendar}
                  />
                  <InfoCard
                    label="Joined"
                    value={formatDate(profile.createdAt)}
                    icon={FiUser}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <Modal
            open={profileEditorOpen}
            onOpenChange={(open) => {
              if (!profileSaving) {
                setProfileEditorOpen(open);
              }
            }}
            title="Edit Profile"
            description="Update the profile details shown on your CampusHub identity page."
            className="max-w-3xl"
          >
            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className={profileFieldClassName}>
                  <span className="text-sm font-medium">First name</span>
                  <Input
                    value={profileForm.firstName}
                    placeholder="e.g. Johnson"
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        firstName: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={profileFieldClassName}>
                  <span className="text-sm font-medium">Last name</span>
                  <Input
                    value={profileForm.lastName}
                    placeholder="e.g. Mmbaga"
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...current,
                        lastName: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <label className={profileFieldClassName}>
                <span className="text-sm font-medium">Phone number</span>
                <Input
                  value={profileForm.phoneNumber}
                  placeholder="e.g. +255 700 000 000"
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      phoneNumber: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="grid gap-5 md:grid-cols-2">
                <label className={profileFieldClassName}>
                  <span className="text-sm font-medium">Gender</span>
                  <Select
                    value={profileForm.gender || "NOT_SET"}
                    onValueChange={(value) =>
                      setProfileForm((current) => ({
                        ...current,
                        gender: value === "NOT_SET" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_SET">Not set</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Non-binary">Non-binary</SelectItem>
                      <SelectItem value="Prefer not to say">
                        Prefer not to say
                      </SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className={profileFieldClassName}>
                  <span className="text-sm font-medium">Date of birth</span>
                  <DatePicker
                    value={profileForm.dateOfBirth}
                    placeholder="Select date of birth"
                    onChange={(value) =>
                      setProfileForm((current) => ({
                        ...current,
                        dateOfBirth: value,
                      }))
                    }
                  />
                </label>
              </div>

              <section className="space-y-5">
                <div>
                  <p className="text-sm font-medium">Profile sticker</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pick a small sticker that appears beside your profile name.
                  </p>
                </div>
                <div className="flex gap-4 overflow-x-auto py-2 pl-4 sm:pl-6">
                  <button
                    type="button"
                    className={cn(
                      "flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-xs font-semibold text-muted-foreground transition hover:border-primary hover:text-foreground",
                      !profileForm.profileSticker &&
                        "outline outline-2 outline-offset-4 outline-primary",
                    )}
                    aria-label="No profile sticker"
                    title="No profile sticker"
                    onClick={() =>
                      setProfileForm((current) => ({
                        ...current,
                        profileSticker: "",
                      }))
                    }
                  >
                    None
                  </button>
                  {profileStickerOptions.map((sticker) => {
                    const selected = profileForm.profileSticker === sticker.id;

                    return (
                      <button
                        key={sticker.id}
                        type="button"
                        className={cn(
                          "relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-white/40 p-2 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg",
                          sticker.className,
                          selected &&
                            "outline outline-2 outline-offset-4 outline-dashed outline-primary",
                        )}
                        aria-label={`Select ${sticker.label} sticker`}
                        title={sticker.label}
                        onClick={() =>
                          setProfileForm((current) => ({
                            ...current,
                            profileSticker: sticker.id,
                          }))
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sticker.image}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </button>
                    );
                  })}
                </div>
              </section>

              <label className={profileFieldClassName}>
                <span className="text-sm font-medium">Bio</span>
                <Textarea
                  value={profileForm.bio}
                  placeholder={bioPlaceholder}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      bio: event.target.value,
                    }))
                  }
                />
              </label>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={profileSaving}
                  onClick={() => setProfileEditorOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={
                    profileSaving ||
                    !profileForm.firstName.trim() ||
                    !profileForm.lastName.trim()
                  }
                  onClick={saveProfileDetails}
                >
                  <FiSave className="h-4 w-4" aria-hidden />
                  {profileSaving ? "Saving..." : "Save profile"}
                </Button>
              </div>
            </div>
          </Modal>

          <Modal
            open={mediaEditor !== null}
            onOpenChange={(open) => {
              if (!open && !mediaSaving) {
                setMediaEditor(null);
                setMediaValue("");
              }
            }}
            title={
              mediaEditor === "avatar"
                ? "Update Profile Photo"
                : "Update Cover Image"
            }
            description={
              mediaEditor === "avatar"
                ? "Upload a clear profile image that will be shown across your account."
                : "Upload a wide cover image for the top of your profile."
            }
            className="max-w-2xl"
          >
            <div className="space-y-5">
              <CampusFileUpload
                label={mediaEditor === "avatar" ? "Profile photo" : "Cover image"}
                value={mediaValue}
                onValueChange={setMediaValue}
                maxSizeMb={1.5}
              />
              <div
                className={cn(
                  "overflow-hidden rounded-lg border border-border bg-background",
                  mediaEditor === "avatar"
                    ? "mx-auto h-44 w-44 rounded-[2rem]"
                    : "h-48 w-full",
                )}
              >
                {mediaValue ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaValue}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    No image selected
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={mediaSaving}
                  onClick={() => {
                    setMediaEditor(null);
                    setMediaValue("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={mediaSaving}
                  onClick={saveProfileMedia}
                >
                  <FiSave className="h-4 w-4" aria-hidden />
                  {mediaSaving ? "Saving..." : "Save media"}
                </Button>
              </div>
            </div>
          </Modal>
        </section>
      ) : null}
    </main>
  );
}

export function CampusAdminProfile() {
  return (
    <AccountProfilePage
      fallbackName="Campus Admin"
      bioPlaceholder="Share a short professional bio, campus focus, or operating mandate."
    />
  );
}
