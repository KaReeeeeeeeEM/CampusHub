"use client";

import type {
  EventClickArg,
  EventInput as FullCalendarEventInput,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin, { type DateClickArg } from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import { useMemo, useState, useTransition } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiEdit,
  FiGrid,
  FiList,
  FiPlus,
  FiSearch,
} from "react-icons/fi";

import {
  CampusInput,
  CampusTextarea,
  CampusViewToggle,
  Empty,
  campusToast,
} from "@/components/campushub";
import { Modal } from "@/components/shared/modal";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/radix-select";
import type {
  SuperAdminAlmanac,
  SuperAdminAlmanacEvent,
  SuperAdminAlmanacUniversity,
} from "@/features/super-admin/lib/super-admin-almanac-service";

type SuperAdminAlmanacWorkspaceProps = {
  initialAlmanacs: SuperAdminAlmanac[];
  universities: SuperAdminAlmanacUniversity[];
};

type WorkspaceStep = "universities" | "almanacs" | "detail";
type AlmanacViewMode = "calendar" | "timeline" | "cards" | "list";

type AlmanacForm = {
  universityId: string;
  title: string;
  academicYear: string;
  semester: string;
  description: string;
};

type AlmanacEventForm = {
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  isDeadline: boolean;
  deadlineType: string;
  description: string;
};

type UniversitySummary = SuperAdminAlmanacUniversity & {
  almanacCount: number;
  eventCount: number;
  deadlineCount: number;
  latestUpdatedAt: string | null;
  searchable: string;
};

const eventTypes = [
  "SEMESTER_START",
  "SEMESTER_END",
  "REGISTRATION",
  "EXAMINATION",
  "GRADUATION",
  "ORIENTATION",
  "HOLIDAY",
  "WORKSHOP",
  "GENERAL",
];

const deadlineTypes = [
  "REGISTRATION",
  "PAYMENT",
  "SUBMISSION",
  "EXAMINATION",
  "APPLICATION",
  "GENERAL",
];

const viewOptions = [
  { value: "calendar", label: "Calendar", icon: FiCalendar },
  { value: "timeline", label: "Timeline", icon: FiClock },
  { value: "cards", label: "Cards", icon: FiGrid },
  { value: "list", label: "List", icon: FiList },
] as const;

function defaultAlmanacForm(universityId = ""): AlmanacForm {
  return {
    universityId,
    title: "",
    academicYear: "",
    semester: "",
    description: "",
  };
}

function defaultEventForm(
  date = new Date().toISOString().slice(0, 10),
): AlmanacEventForm {
  return {
    title: "",
    eventType: "GENERAL",
    startDate: date,
    endDate: date,
    isDeadline: false,
    deadlineType: "GENERAL",
    description: "",
  };
}

async function parseApiResponse<T>(response: Response) {
  const payload = (await response.json()) as {
    data?: T;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? "Request failed.");
  }

  return payload.data as T;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function periodLabel(almanac: SuperAdminAlmanac) {
  return (
    [almanac.academicYear, almanac.semester].filter(Boolean).join(" · ") ||
    "No academic period set"
  );
}

function eventDateLabel(event: SuperAdminAlmanacEvent) {
  if (event.startDate === event.endDate || !event.endDate) {
    return formatDate(event.startDate);
  }

  return `${formatDate(event.startDate)} to ${formatDate(event.endDate)}`;
}

export function SuperAdminAlmanacWorkspace({
  initialAlmanacs,
  universities,
}: SuperAdminAlmanacWorkspaceProps) {
  const [step, setStep] = useState<WorkspaceStep>("universities");
  const [almanacs, setAlmanacs] = useState(initialAlmanacs);
  const [query, setQuery] = useState("");
  const [selectedUniversityId, setSelectedUniversityId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [view, setView] = useState<AlmanacViewMode>("calendar");
  const [createOpen, setCreateOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [viewingEvent, setViewingEvent] = useState<SuperAdminAlmanacEvent | null>(
    null,
  );
  const [form, setForm] = useState(() => defaultAlmanacForm());
  const [eventForm, setEventForm] = useState(() => defaultEventForm());
  const [isPending, startTransition] = useTransition();
  const normalizedQuery = query.trim().toLowerCase();

  const universitySummaries = useMemo<UniversitySummary[]>(
    () =>
      universities.map((university) => {
        const universityAlmanacs = almanacs.filter(
          (almanac) => almanac.universityId === university.id,
        );
        const latestUpdatedAt =
          universityAlmanacs
            .map((almanac) => almanac.updatedAt ?? almanac.createdAt)
            .filter((date): date is string => Boolean(date))
            .sort()
            .at(-1) ?? null;

        return {
          ...university,
          almanacCount: universityAlmanacs.length,
          eventCount: universityAlmanacs.reduce(
            (total, almanac) => total + almanac.eventCount,
            0,
          ),
          deadlineCount: universityAlmanacs.reduce(
            (total, almanac) => total + almanac.deadlineCount,
            0,
          ),
          latestUpdatedAt,
          searchable: [
            university.name,
            ...universityAlmanacs.flatMap((almanac) => [
              almanac.title,
              almanac.academicYear,
              almanac.semester,
              almanac.description,
            ]),
          ]
            .join(" ")
            .toLowerCase(),
        };
      }),
    [almanacs, universities],
  );
  const filteredUniversities = useMemo(
    () =>
      universitySummaries.filter((university) =>
        normalizedQuery ? university.searchable.includes(normalizedQuery) : true,
      ),
    [normalizedQuery, universitySummaries],
  );
  const selectedUniversity =
    universities.find((university) => university.id === selectedUniversityId) ??
    null;
  const selectedUniversityAlmanacs = useMemo(
    () =>
      almanacs.filter((almanac) => almanac.universityId === selectedUniversityId),
    [almanacs, selectedUniversityId],
  );
  const filteredAlmanacs = useMemo(
    () =>
      selectedUniversityAlmanacs.filter((almanac) => {
        if (!normalizedQuery) return true;

        return [
          almanac.title,
          almanac.academicYear,
          almanac.semester,
          almanac.description,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    [normalizedQuery, selectedUniversityAlmanacs],
  );
  const selectedAlmanac =
    almanacs.find((almanac) => almanac.id === selectedId) ?? null;
  const sortedEvents = useMemo(
    () =>
      [...(selectedAlmanac?.events ?? [])].sort((a, b) =>
        String(a.startDate).localeCompare(String(b.startDate)),
      ),
    [selectedAlmanac?.events],
  );
  const calendarEvents = useMemo<FullCalendarEventInput[]>(
    () =>
      sortedEvents.map((event) => ({
        id: event.id,
        title: event.isDeadline ? `Deadline: ${event.title}` : event.title,
        start: event.startDate ?? undefined,
        end: event.endDate ?? undefined,
        allDay: event.isAllDay,
        backgroundColor: event.color,
        borderColor: event.color,
        classNames: [
          event.isDeadline
            ? "campushub-calendar-event-deadline"
            : event.eventType === "EXAMINATION"
              ? "campushub-calendar-event-exam"
              : "campushub-calendar-event-default",
        ],
      })),
    [sortedEvents],
  );

  const universityColumns: DataTableColumn<UniversitySummary>[] = [
    {
      key: "name",
      header: "University",
      cell: (university) => (
        <div>
          <p className="font-semibold">{university.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Updated {formatDate(university.latestUpdatedAt)}
          </p>
        </div>
      ),
    },
    { key: "almanacCount", header: "Almanacs" },
    { key: "eventCount", header: "Events" },
    { key: "deadlineCount", header: "Deadlines" },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (university) => (
        <Button
          size="sm"
          type="button"
          onClick={() => openUniversity(university.id)}
        >
          Open
        </Button>
      ),
    },
  ];
  const almanacColumns: DataTableColumn<SuperAdminAlmanac>[] = [
    {
      key: "title",
      header: "Almanac",
      cell: (almanac) => (
        <div>
          <p className="font-semibold">{almanac.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {almanac.description || "No description"}
          </p>
        </div>
      ),
    },
    {
      key: "period",
      header: "Academic Period",
      cell: periodLabel,
    },
    { key: "eventCount", header: "Events" },
    { key: "deadlineCount", header: "Deadlines" },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (almanac) => (
        <Button
          size="sm"
          type="button"
          onClick={() => openAlmanac(almanac.id)}
        >
          Open Calendar
        </Button>
      ),
    },
  ];
  const eventColumns: DataTableColumn<SuperAdminAlmanacEvent>[] = [
    {
      key: "title",
      header: "Entry",
      cell: (event) => (
        <div>
          <p className="font-semibold">{event.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {event.eventType.replaceAll("_", " ")}
          </p>
        </div>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      cell: (event) => (event.isDeadline ? "Deadline" : "Event"),
    },
    {
      key: "date",
      header: "Date",
      cell: eventDateLabel,
    },
    { key: "status", header: "Status" },
    {
      key: "action",
      header: "Action",
      className: "text-right",
      cell: (event) => (
        <Button
          size="sm"
          type="button"
          variant="secondary"
          onClick={() => setViewingEvent(event)}
        >
          View
        </Button>
      ),
    },
  ];

  function updateForm<K extends keyof AlmanacForm>(key: K, value: AlmanacForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEventForm<K extends keyof AlmanacEventForm>(
    key: K,
    value: AlmanacEventForm[K],
  ) {
    setEventForm((current) => ({ ...current, [key]: value }));
  }

  function openUniversity(universityId: string) {
    setSelectedUniversityId(universityId);
    setSelectedId("");
    setStep("almanacs");
  }

  function openAlmanac(almanacId: string) {
    setSelectedId(almanacId);
    setStep("detail");
  }

  function openCreateAlmanac() {
    if (!selectedUniversityId) return;

    setForm(defaultAlmanacForm(selectedUniversityId));
    setCreateOpen(true);
  }

  function createAlmanac() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/super-admin/almanacs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        });
        const data = await parseApiResponse<{ almanac: SuperAdminAlmanac }>(
          response,
        );

        setAlmanacs((current) => [data.almanac, ...current]);
        setSelectedUniversityId(data.almanac.universityId);
        setSelectedId(data.almanac.id);
        setForm(defaultAlmanacForm(data.almanac.universityId));
        setCreateOpen(false);
        setStep("detail");
        campusToast.success({
          title: "Almanac Created",
          description: "Open edit mode to add dated almanac events.",
        });
      } catch (error) {
        campusToast.error({
          title: "Unable to create almanac",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  function createAlmanacEvent() {
    if (!selectedAlmanac) return;

    startTransition(async () => {
      try {
        const response = await fetch(
          `/api/super-admin/almanacs/${selectedAlmanac.id}/events`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(eventForm),
          },
        );
        const data = await parseApiResponse<{ event: SuperAdminAlmanacEvent }>(
          response,
        );

        setAlmanacs((current) =>
          current.map((almanac) =>
            almanac.id === selectedAlmanac.id
              ? {
                  ...almanac,
                  eventCount: almanac.eventCount + 1,
                  deadlineCount:
                    almanac.deadlineCount + (data.event.isDeadline ? 1 : 0),
                  events: [...almanac.events, data.event].sort((a, b) =>
                    String(a.startDate).localeCompare(String(b.startDate)),
                  ),
                }
              : almanac,
          ),
        );
        setEventOpen(false);
        setEventForm(defaultEventForm());
        campusToast.success({
          title: "Almanac Event Added",
          description: "The entry has been saved on this almanac.",
        });
      } catch (error) {
        campusToast.error({
          title: "Unable to add almanac event",
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      }
    });
  }

  function openDate(arg: DateClickArg) {
    if (!editMode) return;

    setEventForm(defaultEventForm(arg.dateStr));
    setEventOpen(true);
  }

  function openEvent(arg: EventClickArg) {
    const event = sortedEvents.find((item) => item.id === arg.event.id);
    if (event) setViewingEvent(event);
  }

  function openAddEntry() {
    if (!editMode) return;

    setEventForm(defaultEventForm());
    setEventOpen(true);
  }

  function renderDetailView() {
    if (!selectedAlmanac) return null;

    if (view === "calendar") {
      return (
        <div className="campushub-calendar rounded-lg border border-border bg-surface p-4">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={calendarEvents}
            dateClick={openDate}
            eventClick={openEvent}
            headerToolbar={{
              left: "prevYear,prev today next,nextYear",
              center: "title",
              right: "",
            }}
            buttonText={{ today: "Today" }}
            fixedWeekCount={false}
            height="auto"
            dayMaxEventRows={3}
            moreLinkClick="popover"
            selectable={editMode}
            selectMirror={editMode}
            firstDay={1}
          />
        </div>
      );
    }

    if (view === "timeline") {
      return sortedEvents.length > 0 ? (
        <div className="space-y-4">
          {sortedEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setViewingEvent(event)}
              className="grid w-full gap-4 rounded-lg border border-border bg-surface p-4 text-left transition hover:border-primary/40 md:grid-cols-[10rem_minmax(0,1fr)]"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {event.isDeadline ? "Deadline" : "Event"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {eventDateLabel(event)}
                </p>
              </div>
              <div>
                <h3 className="font-semibold">{event.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {event.description || event.eventType.replaceAll("_", " ")}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          className="min-h-[18rem]"
          title="No timeline entries"
          description="Almanac events and deadlines will appear here after they are added."
        />
      );
    }

    if (view === "cards") {
      return sortedEvents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => setViewingEvent(event)}
              className="rounded-lg border border-border bg-surface p-4 text-left transition hover:border-primary/40"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {event.isDeadline ? "Deadline" : "Event"}
              </p>
              <h3 className="mt-3 font-semibold">{event.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {eventDateLabel(event)}
              </p>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                {event.description || event.eventType.replaceAll("_", " ")}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          className="min-h-[18rem]"
          title="No almanac cards"
          description="Almanac events and deadlines will appear here after they are added."
        />
      );
    }

    return (
      <DataTable
        columns={eventColumns}
        data={sortedEvents}
        getRowId={(event) => event.id}
        pageSize={8}
        empty="No almanac entries found."
      />
    );
  }

  return (
    <section className="mt-8 space-y-8">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <FiSearch
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <CampusInput
            className="pl-11"
            placeholder={
              step === "universities"
                ? "Search universities or almanac details"
                : "Search almanacs"
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant={editMode ? "default" : "secondary"}
          aria-pressed={editMode}
          onClick={() => setEditMode((current) => !current)}
        >
          <FiEdit className="h-4 w-4" aria-hidden="true" />
          {editMode ? "Edit Mode On" : "Enable Edit Mode"}
        </Button>
      </div>

      {step === "universities" ? (
        <DataTable
          columns={universityColumns}
          data={filteredUniversities}
          getRowId={(university) => university.id}
          pageSize={10}
          empty="No universities found."
        />
      ) : null}

      {step === "almanacs" ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("universities")}
              >
                <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                Universities
              </Button>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                University Almanacs
              </p>
              <h2 className="mt-1 text-xl font-semibold">
                {selectedUniversity?.name ?? "Selected university"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Open an almanac to view its events. Enable edit mode to create a
                new almanac.
              </p>
            </div>
            {editMode ? (
              <Button type="button" onClick={openCreateAlmanac}>
                <FiPlus className="h-4 w-4" aria-hidden="true" />
                Create Almanac
              </Button>
            ) : null}
          </div>
          <DataTable
            columns={almanacColumns}
            data={filteredAlmanacs}
            getRowId={(almanac) => almanac.id}
            pageSize={8}
            empty={
              editMode
                ? "No almanacs found. Create one for this university."
                : "No almanacs found for this university."
            }
          />
        </div>
      ) : null}

      {step === "detail" ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep("almanacs")}
                >
                  <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Almanacs
                </Button>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  {selectedUniversity?.name ?? selectedAlmanac?.universityName}
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  {selectedAlmanac?.title ?? "Almanac"}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedAlmanac ? periodLabel(selectedAlmanac) : ""}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <CampusViewToggle
                  value={view}
                  options={viewOptions}
                  onValueChange={setView}
                />
                {editMode ? (
                  <Button type="button" onClick={openAddEntry}>
                    <FiPlus className="h-4 w-4" aria-hidden="true" />
                    Add Entry
                  </Button>
                ) : null}
              </div>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              {editMode
                ? "Click a date in calendar mode to register a new almanac event on this almanac."
                : "Read-only mode is active. Enable edit mode to register almanac events."}
            </p>
          </div>

          {selectedAlmanac ? (
            renderDetailView()
          ) : (
            <Empty
              className="min-h-[24rem]"
              title="No almanac selected"
              description="Return to the almanac table and select an almanac."
            />
          )}
        </div>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Almanac"
        description="Create the academic calendar shell before adding dated entries."
        className="max-w-3xl"
      >
        <form
          className="space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            createAlmanac();
          }}
        >
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              University
            </p>
            <p className="mt-2 text-base font-semibold">
              {selectedUniversity?.name ?? "No university selected"}
            </p>
          </div>
          <label className="block space-y-3">
            <span className="text-sm font-medium">Title</span>
            <CampusInput
              required
              placeholder="e.g. 2026/2027 Academic Almanac"
              value={form.title}
              onChange={(event) => updateForm("title", event.target.value)}
            />
          </label>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block space-y-3">
              <span className="text-sm font-medium">Academic Year</span>
              <CampusInput
                placeholder="e.g. 2026/2027"
                value={form.academicYear}
                onChange={(event) =>
                  updateForm("academicYear", event.target.value)
                }
              />
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">Semester</span>
              <CampusInput
                placeholder="e.g. Semester 1"
                value={form.semester}
                onChange={(event) => updateForm("semester", event.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-3">
            <span className="text-sm font-medium">Description</span>
            <CampusTextarea
              className="min-h-44"
              placeholder="Describe the scope of this almanac."
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </label>
          <Button className="w-full" disabled={isPending} type="submit">
            Create Almanac
          </Button>
        </form>
      </Modal>

      <Modal
        open={eventOpen}
        onOpenChange={setEventOpen}
        title="Add Almanac Entry"
        description={selectedAlmanac?.title}
        className="max-w-3xl"
      >
        <form
          className="space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            createAlmanacEvent();
          }}
        >
          <label className="block space-y-3">
            <span className="text-sm font-medium">Title</span>
            <CampusInput
              required
              placeholder="e.g. Course registration closes"
              value={eventForm.title}
              onChange={(event) => updateEventForm("title", event.target.value)}
            />
          </label>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block space-y-3">
              <span className="text-sm font-medium">Event Type</span>
              <Select
                value={eventForm.eventType}
                onValueChange={(value) => updateEventForm("eventType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">Entry Kind</span>
              <Select
                value={eventForm.isDeadline ? "DEADLINE" : "EVENT"}
                onValueChange={(value) =>
                  updateEventForm("isDeadline", value === "DEADLINE")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EVENT">Event</SelectItem>
                  <SelectItem value="DEADLINE">Deadline</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          {eventForm.isDeadline ? (
            <label className="block space-y-3">
              <span className="text-sm font-medium">Deadline Type</span>
              <Select
                value={eventForm.deadlineType}
                onValueChange={(value) => updateEventForm("deadlineType", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deadlineTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replaceAll("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block space-y-3">
              <span className="text-sm font-medium">Start Date</span>
              <CampusInput
                type="date"
                value={eventForm.startDate}
                onChange={(event) =>
                  updateEventForm("startDate", event.target.value)
                }
              />
            </label>
            <label className="block space-y-3">
              <span className="text-sm font-medium">End Date</span>
              <CampusInput
                type="date"
                value={eventForm.endDate}
                onChange={(event) =>
                  updateEventForm("endDate", event.target.value)
                }
              />
            </label>
          </div>
          <label className="block space-y-3">
            <span className="text-sm font-medium">Description</span>
            <CampusTextarea
              className="min-h-40"
              placeholder="Add notes, instructions, or deadline details."
              value={eventForm.description}
              onChange={(event) =>
                updateEventForm("description", event.target.value)
              }
            />
          </label>
          <Button className="w-full" disabled={isPending} type="submit">
            Add Almanac Entry
          </Button>
        </form>
      </Modal>

      <Modal
        open={Boolean(viewingEvent)}
        onOpenChange={(open) => !open && setViewingEvent(null)}
        title={viewingEvent?.title ?? "Almanac Entry"}
        description={viewingEvent?.eventType.replaceAll("_", " ")}
        className="max-w-xl"
      >
        {viewingEvent ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {viewingEvent.isDeadline ? "Deadline" : "Event"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {eventDateLabel(viewingEvent)}
              </p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {viewingEvent.description || "No description provided."}
            </p>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
