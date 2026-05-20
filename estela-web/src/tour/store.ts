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

export const TourStore = {
    _ctx: { ...defaultTourContext } as TourContext,
    _listeners: new Set<Listener>(),

    init() {
        const persisted = loadPersisted();
        this._ctx.seenSteps = persisted.seenSteps;
        this._ctx.lastCompletedStepAt = persisted.lastCompletedStepAt;

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

    setRoute(route: string) {
        this._ctx.currentRoute = route;
        this._notify();
    },

    setNewJobModalOpen(open: boolean) {
        this._ctx.newJobModalOpen = open;
        this._notify();
    },

    setProjectHasJobs(val: boolean) {
        this._ctx.projectHasJobs = val;
        this._notify();
    },

    markStepSeen(stepId: string) {
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
        sessionStorage.removeItem("tour_just_created");
        this._notify();
    },

    clearJustCreatedFlag() {
        this._ctx.justCreatedJob = false;
        sessionStorage.removeItem("tour_just_created");
        this._notify();
    },

    // Direct element ref for reliable spotlight targeting of the run button
    _runBtnEl: null as HTMLElement | null,
    setRunButtonEl(el: HTMLElement | null) {
        this._runBtnEl = el;
    },
    getRunButtonEl(): HTMLElement | null {
        return this._runBtnEl;
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
