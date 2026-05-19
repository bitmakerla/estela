import { TourContext, defaultTourContext } from "./types";
import { AuthService } from "../services";
import { Deploy } from "../services/api";

type Listener = () => void;

const TOUR_KEY_PREFIX = "estela_tour_";

function getTourKey(): string {
    const username = AuthService.getUserUsername() || "anonymous";
    return `${TOUR_KEY_PREFIX}${username}`;
}

function loadPersisted(): { seenSteps: string[]; lastCompletedStepAt: string | null } {
    try {
        const raw = localStorage.getItem(getTourKey());
        if (raw) return JSON.parse(raw);
    } catch {
        // ignore corrupt data
    }
    return { seenSteps: [], lastCompletedStepAt: null };
}

function persistSeen(steps: string[], lastCompletedStepAt?: string) {
    const data = {
        seenSteps: steps,
        lastCompletedStepAt: lastCompletedStepAt || new Date().toISOString(),
    };
    localStorage.setItem(getTourKey(), JSON.stringify(data));
}

// Navigation tracking keys
const NAV_JOBS_OVERVIEW = `${getTourKey()}_visited_jobs_overview`;
const NAV_JOB_DETAIL = `${getTourKey()}_visited_job_detail`;
const NAV_SCHEDULE = `${getTourKey()}_visited_schedule`;
const OPENED_RUN_MODAL = `${getTourKey()}_opened_run_modal`;

export const TourStore = {
    _ctx: { ...defaultTourContext } as TourContext,
    _listeners: new Set<Listener>(),

    init() {
        const persisted = loadPersisted();
        this._ctx.seenSteps = persisted.seenSteps;
        this._ctx.lastCompletedStepAt = persisted.lastCompletedStepAt;
        this._ctx.neverVisitedJobsOverview = !localStorage.getItem(NAV_JOBS_OVERVIEW);
        this._ctx.neverOpenedRunModal = !localStorage.getItem(OPENED_RUN_MODAL);
        this._ctx.neverVisitedJobDetail = !localStorage.getItem(NAV_JOB_DETAIL);
        this._ctx.neverVisitedSchedule = !localStorage.getItem(NAV_SCHEDULE);

        const flag = sessionStorage.getItem("tour_just_created");
        this._ctx.justCreatedJob = flag === "true";
    },

    getCtx(): TourContext {
        return this._ctx;
    },

    update(partial: Partial<TourContext>) {
        Object.assign(this._ctx, partial);
        this._notify();
    },

    setDeploys(deploys: Deploy[]) {
        this._ctx.deploys = deploys;
        this._notify();
    },

    setJobs(jobs: unknown[]) {
        this._ctx.jobs = jobs;
        this._notify();
    },

    setRoute(route: string) {
        this._ctx.currentRoute = route;
        this._notify();
    },

    setNewJobModalOpen(open: boolean) {
        this._ctx.newJobModalOpen = open;
        this._notify();
    },

    markStepSeen(stepId: string) {
        // Require all previous steps to be completed first
        const stepOrder = ["step-1", "step-2", "step-3", "step-4", "step-5"];
        const idx = stepOrder.indexOf(stepId);
        if (idx === -1) return;
        for (let i = 0; i < idx; i++) {
            if (!this._ctx.seenSteps.includes(stepOrder[i])) {
                return;
            }
        }
        if (!this._ctx.seenSteps.includes(stepId)) {
            this._ctx.seenSteps = [...this._ctx.seenSteps, stepId];
            this._ctx.lastCompletedStepAt = new Date().toISOString();
            persistSeen(this._ctx.seenSteps, this._ctx.lastCompletedStepAt);
        }
        // Step-4 specific: flag for step-5 trigger
        if (stepId === "step-4") {
            this._ctx.step4Completed = true;
        }
        this._notify();
    },

    skipAll() {
        const allSteps = ["step-1", "step-2", "step-3", "step-4", "step-5"];
        this._ctx.seenSteps = allSteps;
        this._ctx.lastCompletedStepAt = new Date().toISOString();
        persistSeen(allSteps, this._ctx.lastCompletedStepAt);
        // Clear session flag
        sessionStorage.removeItem("tour_just_created");
        this._notify();
    },

    markVisitedJobsOverview() {
        if (!localStorage.getItem(NAV_JOBS_OVERVIEW)) {
            localStorage.setItem(NAV_JOBS_OVERVIEW, "true");
            this._ctx.neverVisitedJobsOverview = false;
            this._notify();
        }
    },

    markOpenedRunModal() {
        if (!localStorage.getItem(OPENED_RUN_MODAL)) {
            localStorage.setItem(OPENED_RUN_MODAL, "true");
            this._ctx.neverOpenedRunModal = false;
            this._notify();
        }
    },

    markVisitedJobDetail() {
        if (!localStorage.getItem(NAV_JOB_DETAIL)) {
            localStorage.setItem(NAV_JOB_DETAIL, "true");
            this._ctx.neverVisitedJobDetail = false;
            this._notify();
        }
    },

    markVisitedSchedule() {
        if (!localStorage.getItem(NAV_SCHEDULE)) {
            localStorage.setItem(NAV_SCHEDULE, "true");
            this._ctx.neverVisitedSchedule = false;
            this._notify();
        }
    },

    clearJustCreatedFlag() {
        this._ctx.justCreatedJob = false;
        sessionStorage.removeItem("tour_just_created");
        this._notify();
    },

    // Direct element refs for reliable spotlight targeting
    _runBtnEl: null as HTMLElement | null,
    setRunButtonEl(el: HTMLElement | null) {
        this._runBtnEl = el;
    },
    getRunButtonEl(): HTMLElement | null {
        return this._runBtnEl;
    },

    // Track whether user has any spider jobs
    _hasAnyJobs: false,
    setHasAnyJobs(val: boolean) {
        this._hasAnyJobs = val;
        if (val) {
            localStorage.setItem(`${getTourKey()}_has_jobs`, "true");
        }
    },
    getHasAnyJobs(): boolean {
        if (this._hasAnyJobs) return true;
        return !!localStorage.getItem(`${getTourKey()}_has_jobs`);
    },

    subscribe(fn: Listener): () => void {
        this._listeners.add(fn);
        return () => {
            this._listeners.delete(fn);
        };
    },

    _notify() {
        this._listeners.forEach((fn) => fn());
    },
};
