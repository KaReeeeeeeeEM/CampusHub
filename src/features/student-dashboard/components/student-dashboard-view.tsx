import {
  AlmanacHighlightsWidget,
  AnnouncementHighlightsWidget,
  CampusMapPreviewWidget,
  DashboardSyncStatusWidget,
  NotificationFeedWidget,
  QuickActionsWidget,
  UpcomingEventsWidget,
  WelcomeWidget,
} from "@/features/student-dashboard/components/dashboard-widgets";

export function StudentDashboardView() {
  return (
    <div className="w-full max-w-none space-y-6 px-4 py-6 sm:px-6">
      <WelcomeWidget />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <AnnouncementHighlightsWidget />
        <NotificationFeedWidget />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <UpcomingEventsWidget />
        <AlmanacHighlightsWidget />
        <CampusMapPreviewWidget />
      </div>

      <QuickActionsWidget />
      <DashboardSyncStatusWidget />
    </div>
  );
}
