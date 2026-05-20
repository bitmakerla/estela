import { Deploy } from "../services/api";

export type TourStepId = "step-1" | "step-2" | "step-3" | "step-4" | "step-5";

export interface TourStepContent {
    tag: string;
    subtag: string;
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
}

export interface TourStep {
    id: TourStepId;
    targetSelector: string;
    placement?: "right" | "left" | "top" | "bottom";
    spotlight?: boolean;
    delayMs?: number;
    spotlightPadding?: { h: number; v: number };
    trigger: (ctx: TourContext) => boolean;
    content: TourStepContent;
}

export interface TourContext {
    currentRoute: string;
    deploys: Deploy[];
    newJobModalOpen: boolean;
    seenSteps: string[];
    lastCompletedStepAt: string | null;
    /** True when the project has at least one spider job (fetched lazily in DeployListPage) */
    projectHasJobs: boolean;
    /** Set from sessionStorage when arriving at job detail from Create */
    justCreatedJob: boolean;
    /** Set when step-4 is completed to trigger step-5 on same page */
    step4Completed: boolean;
}

export const defaultTourContext: TourContext = {
    currentRoute: "",
    deploys: [],
    newJobModalOpen: false,
    seenSteps: [],
    lastCompletedStepAt: null,
    projectHasJobs: false,
    justCreatedJob: false,
    step4Completed: false,
};
