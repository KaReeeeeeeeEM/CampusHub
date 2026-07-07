# CampusHub User Testing Guide

This guide is for people testing CampusHub as normal users. You do not need to understand the technical side of the platform.

Your job is simple:

- Try to use the platform the way a real user would.
- Notice what feels confusing, broken, slow, missing, or wrong.
- Write down what happened.

## Before You Start

Ask the CampusHub team for:

- The website link.
- Your email and password.
- The role you should test, such as Super Admin, Campus Admin, Student, Student Representative, Employer, Alumni, Teacher, or Committee Member.
- Any invitation link you need to use.

Use this format when reporting a problem:

```text
Page:
What I was trying to do:
What I clicked:
What happened:
What I expected:
Screenshot attached: Yes / No
```

## General Checks For Every Page

Use these checks on every page you visit.

| Test | What To Do | What Should Happen | Result |
| --- | --- | --- | --- |
| Page opens | Open the page from the sidebar or a button. | The page should open without an error. | Pass / Fail |
| Page looks clear | Look at the page layout. | Text, buttons, tables, and cards should be easy to read. | Pass / Fail |
| No fake data | Check the numbers, tables, lists, and cards. | If there is no real data, the page should show zeros or an empty message, not fake examples. | Pass / Fail |
| Buttons work | Click the main buttons on the page. | Buttons should open the correct form, page, menu, or action. | Pass / Fail |
| Search works | Type something in search boxes. | Results should update, or a clear “no results” message should appear. | Pass / Fail |
| Dropdowns work | Open dropdown menus. | Options should appear and be searchable where needed. | Pass / Fail |
| Empty state is helpful | Visit a page with no records. | The page should explain that there is no data yet and what can be done next. | Pass / Fail |
| Mobile view | Try the page on a phone or narrow browser window. | The page should still be usable and readable. | Pass / Fail |
| Logout works | Log out. | You should return to the public or login page, and should not still be logged in. | Pass / Fail |

## Account And Login Tests

| Test | What To Do | What Should Happen | Result |
| --- | --- | --- | --- |
| Login | Enter your email and password. | You should go to the correct dashboard for your role. | Pass / Fail |
| Wrong password | Try logging in with a wrong password. | You should see a clear error message. | Pass / Fail |
| Logout | Click logout. | You should be logged out fully. | Pass / Fail |
| Protected page | After logout, try going back to a dashboard page. | You should be asked to log in again. | Pass / Fail |
| Invitation link | Open an invitation link. | You should see an activation page, not the login page first. | Pass / Fail |
| Password visibility | Use the eye icon on a password field. | The password should show and hide correctly. | Pass / Fail |

## First-Time User And Onboarding Tests

| Test | What To Do | What Should Happen | Result |
| --- | --- | --- | --- |
| First dashboard visit | Log in for the first time. | A short onboarding guide should appear. | Pass / Fail |
| Kibo introduction | Watch the first onboarding. | Kibo should be introduced clearly as a CampusHub mascot/helper. | Pass / Fail |
| Skip onboarding | Click Skip. | The guide should close and not block you. | Pass / Fail |
| Page-specific onboarding | Visit a new page for the first time. | The guide should explain that page, not repeat the same general dashboard guide. | Pass / Fail |
| Repeated onboarding | Revisit a page where onboarding was completed. | The same onboarding should not keep appearing again. | Pass / Fail |

## Super Admin Tests

The Super Admin should be able to see the whole platform.

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Dashboard | Open the Super Admin dashboard. | You should see platform overview information. | Pass / Fail |
| Sidebar | Open sidebar groups. | Only one group should stay open at a time if accordion behavior is enabled. | Pass / Fail |
| Universities | Open Universities. | Existing universities should appear. | Pass / Fail |
| Colleges | Open Colleges. | Existing colleges should appear, not an incorrect “no records” message. | Pass / Fail |
| Departments | Open Departments. | Existing departments should appear if they have been created. | Pass / Fail |
| Users | Open Users. | Users should appear with correct roles and status. | Pass / Fail |
| Delete user | Try deleting a test user only. | You should get a confirmation before deletion. | Pass / Fail |
| Reports | Open Reports. | Report filters, report type dropdown, and export menu should work. | Pass / Fail |
| Events | Open Events. | Events should appear if created, or show a clear empty state. | Pass / Fail |
| Announcements | Open Announcements. | Announcements should appear if created, or show a clear empty state. | Pass / Fail |
| Maps | Open Maps. | Existing campus maps should be listed. There should be grid/list view, not a create button. | Pass / Fail |
| Settings | Open Settings. | Settings should use proper tabs and should not cut off content. | Pass / Fail |
| Notifications | Open Notifications. | The notification page should not show unnecessary internal notes. | Pass / Fail |

## Campus Admin Tests

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Dashboard | Open the Campus Admin dashboard. | Your university name should be visible. | Pass / Fail |
| Colleges | Create a test college. | The college should save and appear in the list. | Pass / Fail |
| Departments | Create a test department. | The department should save and appear in the list. | Pass / Fail |
| Representatives | Generate a representative invitation link. | The link should be copyable and usable once. | Pass / Fail |
| Events | Create or view events. | Events should save or show a clear empty state. | Pass / Fail |
| Announcements | Create or view announcements. | Announcements should save or show a clear empty state. | Pass / Fail |
| Committees | View committee pages. | Existing committees should appear or show a clear empty state. | Pass / Fail |
| Reports | Open Reports. | University-specific reports should show real numbers or zeros. | Pass / Fail |
| Map locations | Create a new location. | You should be able to use either Drag Pin or Latitude / Longitude. | Pass / Fail |
| Map location save | Save the new location. | The location should appear on the map/list after saving. | Pass / Fail |

## Student Tests

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Dashboard | Open the Student dashboard. | It should show the full dashboard layout with zeros where there is no data. | Pass / Fail |
| University name | Check the dashboard. | Your university name should be visible. | Pass / Fail |
| Profile | Open Profile. | Your profile should load without errors. | Pass / Fail |
| Career profile | Open Career Profile. | The page should be clear and usable. | Pass / Fail |
| Projects | Open Projects. | Existing projects should appear, or a clear empty state should show. | Pass / Fail |
| Marketplace | Open Marketplace. | No fake product numbers or fake shops should appear. | Pass / Fail |
| Communities | Open Communities. | Real communities should appear, or a clear empty state should show. | Pass / Fail |
| Events | Open Events. | Real events should appear, or a clear empty state should show. | Pass / Fail |
| Notifications | Open Notifications. | Sidebar and notification area should align properly. | Pass / Fail |
| Campus map | Open Campus Map. | The map should fill the page properly and should not show fake locations. | Pass / Fail |
| Lost and found | Open Lost and Found. | No fake items should appear. | Pass / Fail |
| Showcase | Open Showcase. | No fake project stats should appear. | Pass / Fail |

## Student Representative Tests

A Student Representative is also a student, so the student pages should still feel familiar.

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Login redirect | Log in as a representative. | You should go to the representative/student dashboard, not onboarding. | Pass / Fail |
| Sidebar | Check the sidebar. | It should not duplicate the same pages unnecessarily. | Pass / Fail |
| Student pages | Open normal student pages. | They should look similar to the student experience. | Pass / Fail |
| Representative actions | Open pages where representatives can create content. | Create buttons should appear only where the role is allowed to create. | Pass / Fail |
| Announcements | Open Announcements. | You should be able to view all, mine, or other announcements if those filters exist. | Pass / Fail |
| Polls | Open Polls. | You should be able to view or create polls only if allowed. | Pass / Fail |
| Suggestions | Open Suggestions. | Suggestions should use real data or empty states. | Pass / Fail |

## Employer Tests

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Login redirect | Log in as an employer. | You should go to the employer dashboard. | Pass / Fail |
| Employer profile | Open Employer Profile. | The profile page should load and be editable where allowed. | Pass / Fail |
| Opportunities | Create or view opportunities. | Opportunities should save or show a clear empty state. | Pass / Fail |
| Applications | Open Applications. | Applications should show real records or a clear empty state. | Pass / Fail |
| Candidate discovery | Open Candidate Discovery. | No fake candidates should appear. | Pass / Fail |

## Alumni Tests

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Login redirect | Log in as alumni. | You should go to the alumni dashboard. | Pass / Fail |
| Profile | Open Profile. | Your profile should load without errors. | Pass / Fail |
| Mentorship | Open Mentorship. | Real mentorship data or a clear empty state should appear. | Pass / Fail |
| Networking | Open Networking. | Real users or a clear empty state should appear. | Pass / Fail |
| Communities | Open Communities. | Real communities or a clear empty state should appear. | Pass / Fail |

## Teacher Tests

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Login redirect | Log in as a teacher. | You should go to the teacher dashboard. | Pass / Fail |
| Dashboard | Open dashboard. | It should show real data or zeros, not fake examples. | Pass / Fail |
| Students | Open student-related pages. | Records should come from the platform data. | Pass / Fail |
| Events and announcements | Open event or announcement pages if available. | The pages should work without duplicated navigation. | Pass / Fail |

## Committee Member Tests

| Area | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Login redirect | Log in as a committee member. | You should go to the correct dashboard. | Pass / Fail |
| Sidebar | Check the sidebar. | Pages should not be duplicated. | Pass / Fail |
| Committees | Open Committees. | Committee information should load or show a clear empty state. | Pass / Fail |
| Events | Open Events. | Create actions should appear only if the role is allowed to create. | Pass / Fail |
| Announcements | Open Announcements. | Create actions should appear only if the role is allowed to create. | Pass / Fail |
| Polls | Open Polls. | Polls should use real data or a clear empty state. | Pass / Fail |

## Public Website Tests

These pages should not use a logged-in user's dashboard theme.

| Page | What To Check | What Should Happen | Result |
| --- | --- | --- | --- |
| Landing page | Open the public homepage. | It should use CampusHub brand styling. | Pass / Fail |
| Universities directory | Open the public universities page. | Real public universities should appear if published. | Pass / Fail |
| University public page | Open a public university page. | The title should use the correct public hero style. | Pass / Fail |
| Public events | Open public events if available. | No dashboard-only styling should appear. | Pass / Fail |
| Public marketplace | Open public marketplace if available. | No fake listings should appear. | Pass / Fail |
| Login button | Click Login. | You should go to the login page. | Pass / Fail |

## PWA And Offline Tests

| Test | What To Do | What Should Happen | Result |
| --- | --- | --- | --- |
| Install app | Try installing CampusHub from the browser. | The app should be installable where supported. | Pass / Fail |
| Offline page | Turn off internet and open the app. | You should see a helpful offline page. | Pass / Fail |
| Back online | Turn internet back on. | The app should reconnect normally. | Pass / Fail |
| Notification settings | Open Settings then Notifications. | You should be able to control reminder types. | Pass / Fail |
| Update message | Use the app after a new release. | If an update is available, the app should show a clear message. | Pass / Fail |

## Kibo Tests

| Test | What To Do | What Should Happen | Result |
| --- | --- | --- | --- |
| Kibo appears | Trigger a milestone, badge, or important message if possible. | Kibo should appear in a helpful, non-annoying way. | Pass / Fail |
| Kibo notification layout | Look at Kibo notification popups. | Kibo should appear centered at the top of the popup, not awkwardly on the side. | Pass / Fail |
| Dismiss Kibo | Close or skip Kibo. | Kibo should close and not block your work. | Pass / Fail |
| Empty states | Visit pages with no data. | Kibo may appear in empty states where helpful. | Pass / Fail |

## Final Feedback

At the end of testing, answer these questions:

1. What was easy to use?
2. What was confusing?
3. Did anything feel broken?
4. Did you see any fake data?
5. Did any page look unfinished?
6. Did any button or link take you to the wrong place?
7. Which role were you testing?
8. Would you feel comfortable using CampusHub with real users?

## Problem Report Template

Use this whenever you find a problem:

```text
Tester name:
Date:
Role tested:
Device used:
Browser used:

Page:
Problem:
Steps I followed:
What happened:
What I expected:
How serious is it? Low / Medium / High / Critical
Screenshot or video attached: Yes / No
```
