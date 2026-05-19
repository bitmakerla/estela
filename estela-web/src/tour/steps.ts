import { TourStep, TourContext } from "./types";
import { TourStore } from "./store";

export const TOUR_STEPS: TourStep[] = [
    {
        id: "step-1",
        targetSelector: '[data-tour-target="jobs-overview"]',
        placement: "right",
        spotlight: true,
        trigger: (ctx: TourContext) => {
            const isDeploys = ctx.currentRoute === "deploys";
            const successDeploys = ctx.deploys.filter((d) => d.status === "SUCCESS");
            const hasExactlyOneSuccess = successDeploys.length === 1;
            const noJobs = !TourStore.getHasAnyJobs();
            return isDeploys && hasExactlyOneSuccess && ctx.neverVisitedJobsOverview && noJobs;
        },
        content: {
            tag: "STEP 1 OF 5",
            subtag: "Getting started",
            title: "Now run your spiders",
            description: "Your deploy is live. Head to Jobs → Overview to launch a job and start collecting data.",
            primaryLabel: "Got it",
            secondaryLabel: "Skip tour",
        },
    },
    {
        id: "step-2",
        targetSelector: '[data-tour-target="run-new-job"]',
        placement: "bottom",
        spotlight: true,
        spotlightPadding: { h: 0, v: 0 },
        delayMs: 100,
        trigger: (ctx: TourContext) => {
            const isJobsOverview = ctx.currentRoute === "jobs";
            const step1Seen = ctx.seenSteps.includes("step-1");
            return isJobsOverview && step1Seen && ctx.neverOpenedRunModal;
        },
        content: {
            tag: "STEP 2 OF 5",
            subtag: "Run a spider",
            title: "Launch your first job",
            description: "Click 'Run new job' to choose a spider and start a scraping run.",
            primaryLabel: "Got it",
            secondaryLabel: "Skip tour",
        },
    },
    {
        id: "step-3",
        targetSelector: '[data-tour-target="spider-field"]',
        placement: "top",
        spotlight: true,
        spotlightPadding: { h: 12, v: 8 },
        trigger: (ctx: TourContext) => {
            const step2Seen = ctx.seenSteps.includes("step-2");
            return ctx.newJobModalOpen && step2Seen;
        },
        content: {
            tag: "STEP 3 OF 5",
            subtag: "Configuration",
            title: "Pick a spider — the rest can stay on defaults",
            description:
                "Choose which spider to run. The other options (Data persistence, Resource Tier, etc.) work great on their defaults for your first run. When you're ready, hit Create.",
            primaryLabel: "Got it",
            secondaryLabel: "Skip tour",
        },
    },
    {
        id: "step-4",
        targetSelector: '[data-tour-target="job-stats"]',
        placement: "bottom",
        spotlight: true,
        delayMs: 100,
        trigger: (ctx: TourContext) => {
            const isJobDetail = ctx.currentRoute === "job-detail";
            const step3Seen = ctx.seenSteps.includes("step-3");
            return isJobDetail && step3Seen && ctx.justCreatedJob && ctx.neverVisitedJobDetail;
        },
        content: {
            tag: "STEP 4 OF 5",
            subtag: "Track progress",
            title: "Here's your job — live",
            description:
                "This is the job's overview. As your spider runs you'll see bandwidth, item count and memory fill in. When it finishes, your scraped items will be downloadable from here.",
            primaryLabel: "Got it",
            secondaryLabel: "Skip tour",
        },
    },
    {
        id: "step-5",
        targetSelector: '[data-tour-target="jobs-schedule"]',
        placement: "right",
        spotlight: true,
        delayMs: 1000,
        trigger: (ctx: TourContext) => {
            return (
                ctx.seenSteps.includes("step-1") &&
                ctx.seenSteps.includes("step-2") &&
                ctx.seenSteps.includes("step-3") &&
                ctx.step4Completed &&
                ctx.neverVisitedSchedule
            );
        },
        content: {
            tag: "STEP 5 OF 5",
            subtag: "Power user move",
            title: "Run jobs on a schedule",
            description:
                "Want your spiders to run automatically? Open Jobs → Schedule to set up cron-style schedules so jobs launch without you.",
            primaryLabel: "All done",
            secondaryLabel: "Skip tour",
        },
    },
];

export function findNextStep(ctx: TourContext): TourStep | null {
    for (const step of TOUR_STEPS) {
        if (ctx.seenSteps.includes(step.id)) continue;
        if (step.trigger(ctx)) return step;
    }
    return null;
}
