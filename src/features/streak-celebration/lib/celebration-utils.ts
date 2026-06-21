import type { CelebrationViewModel, RewardEvent } from "./types";

function numberFrom(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function nextMilestoneFor(count: number | null) {
  if (!count) return "Keep your streak alive tomorrow";

  const milestones = [3, 7, 30, 100, 365];
  const next = milestones.find((milestone) => milestone > count);

  if (!next) return "Legendary streak status";

  const remaining = next - count;
  return `${remaining} ${remaining === 1 ? "day" : "days"} until: ${next} Day Streak Badge`;
}

export function eventToCelebration(event: RewardEvent): CelebrationViewModel {
  const rewardType = stringFrom(event.reward?.type);
  const milestoneDays =
    numberFrom(event.metadata?.milestoneDays) ??
    numberFrom(event.reward?.milestoneDays);
  const currentCount =
    numberFrom(event.metadata?.currentCount) ?? milestoneDays;
  const previousCount =
    currentCount && currentCount > 1 ? currentCount - 1 : null;

  if (rewardType === "STREAK_FREEZE") {
    const count = currentCount ?? null;

    return {
      kind: "freeze",
      title: "Streak Freeze Activated",
      subtitle: event.description ?? "Your streak was saved.",
      heroIcon: "🧊",
      fromCount: null,
      toCount: count,
      rewardLabel: "Streak protected",
      rewardIcon: "🧊",
      xp: event.xp,
      nextMilestone: count ? nextMilestoneFor(count) : null,
      shareText: "🧊 My CampusHub streak was saved by a Streak Freeze",
    };
  }

  if (rewardType === "STREAK_MILESTONE" || event.entityType === "streak") {
    const count = milestoneDays ?? currentCount ?? 1;

    return {
      kind: "streak",
      title: `${count} Day Streak`,
      subtitle: "Your CampusHub momentum is growing.",
      heroIcon: "🔥",
      fromCount: previousCount,
      toCount: count,
      rewardLabel: `${count} Day Streak`,
      rewardIcon: count >= 30 ? "🏆" : "🔥",
      xp: event.xp,
      nextMilestone: nextMilestoneFor(count),
      shareText: `🔥 I reached a ${count} Day Streak on CampusHub`,
    };
  }

  if (event.trigger === "BADGE_EARNED") {
    const badgeName =
      stringFrom(event.badge?.name) ??
      stringFrom(event.reward?.label) ??
      event.title;

    return {
      kind: "badge",
      title: "Badge Earned",
      subtitle: event.description ?? "You unlocked a CampusHub badge.",
      heroIcon: "🏆",
      fromCount: null,
      toCount: null,
      rewardLabel: badgeName,
      rewardIcon: "🏆",
      xp: event.xp,
      nextMilestone: "Keep building toward your next badge",
      shareText: `🏆 I unlocked ${badgeName} on CampusHub`,
    };
  }

  if (event.trigger === "ACHIEVEMENT_UNLOCKED") {
    const achievementName =
      stringFrom(event.reward?.label) ??
      event.description?.replace(/^You completed /, "").replace(/\.$/, "") ??
      event.title;

    return {
      kind: "achievement",
      title: "Achievement Unlocked",
      subtitle: event.description ?? "A new achievement is now yours.",
      heroIcon: "⭐",
      fromCount: null,
      toCount: null,
      rewardLabel: achievementName,
      rewardIcon: "⭐",
      xp: event.xp,
      nextMilestone: "Keep going to unlock the next achievement",
      shareText: `⭐ I unlocked ${achievementName} on CampusHub`,
    };
  }

  if (event.trigger === "LEVEL_UP") {
    const level =
      numberFrom(event.reward?.level) ?? numberFrom(event.metadata?.level);
    const previousLevel =
      numberFrom(event.reward?.previousLevel) ??
      numberFrom(event.metadata?.previousLevel);

    return {
      kind: "level",
      title: level ? `Level ${level}` : "Level Up",
      subtitle: event.description ?? "Your CampusHub level increased.",
      heroIcon: "⚡",
      fromCount: previousLevel,
      toCount: level,
      rewardLabel: level ? `Level ${level}` : event.title,
      rewardIcon: "⚡",
      xp: event.xp,
      nextMilestone: "Keep earning XP to reach the next level",
      shareText: `⚡ I reached ${level ? `Level ${level}` : "a new level"} on CampusHub`,
    };
  }

  if (event.trigger === "XP_EARNED") {
    const amount =
      event.xp ||
      numberFrom(event.reward?.amount) ||
      numberFrom(event.metadata?.xpAwarded) ||
      0;
    const source = stringFrom(event.reward?.label) ?? event.title;

    return {
      kind: "xp",
      title: amount > 0 ? `+${amount} XP` : "XP Earned",
      subtitle: event.description ?? "Your CampusHub progress increased.",
      heroIcon: "✨",
      fromCount: null,
      toCount: null,
      rewardLabel: source,
      rewardIcon: "✨",
      xp: amount,
      nextMilestone: "Keep earning XP to climb the leaderboard",
      shareText: `✨ I earned ${amount} XP on CampusHub`,
    };
  }

  return {
    kind: "xp",
    title: titleCase(event.trigger),
    subtitle: event.description ?? "Your CampusHub progress increased.",
    heroIcon: "✨",
    fromCount: null,
    toCount: null,
    rewardLabel: event.title,
    rewardIcon: "✨",
    xp: event.xp,
    nextMilestone: "Keep your momentum going",
    shareText: `✨ I made progress on CampusHub: ${event.title}`,
  };
}

export function downloadShareCard(viewModel: CelebrationViewModel) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 675;
  const ctx = canvas.getContext("2d");

  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 1200, 675);
  gradient.addColorStop(0, viewModel.kind === "freeze" ? "#0f4c81" : "#451a03");
  gradient.addColorStop(1, viewModel.kind === "freeze" ? "#67e8f9" : "#f97316");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1200, 675);

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.arc(930, 110, 220, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 128px Montserrat, Arial, sans-serif";
  ctx.fillText(viewModel.heroIcon, 86, 200);

  ctx.font = "bold 64px Montserrat, Arial, sans-serif";
  ctx.fillText(viewModel.title, 86, 320);

  ctx.font = "500 34px Montserrat, Arial, sans-serif";
  ctx.fillText(viewModel.shareText, 86, 390, 980);

  ctx.font = "bold 30px Montserrat, Arial, sans-serif";
  ctx.fillText("CampusHub", 86, 580);

  const link = document.createElement("a");
  link.download = "campushub-streak-card.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}
