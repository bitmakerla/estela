import React, { useEffect, useState, useCallback, useRef } from "react";
import { TourStep } from "./types";
import { TourStore } from "./store";
import { findNextStep } from "./steps";
import "./TourOverlay.scss";

interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
    right: number;
    bottom: number;
}

type Placement = "right" | "left" | "top" | "bottom";

function computeTooltipStyle(
    targetRect: Rect,
    placement: Placement,
): { top: number; left: number; arrowClass: string } {
    const GAP = 12;
    const TW = 320;
    const TH = 280;
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;

    let top: number;
    let left: number;
    let arrowClass: string;

    const fitsRight = targetRect.right + GAP + TW <= viewW - 16;
    const fitsLeft = targetRect.left - GAP - TW >= 16;
    const fitsBottom = targetRect.bottom + GAP + TH <= viewH - 16;
    const fitsTop = targetRect.top - GAP - TH >= 16;

    let finalPlacement = placement;

    if (placement === "right" && !fitsRight) {
        finalPlacement = fitsLeft ? "left" : fitsBottom ? "bottom" : "top";
    } else if (placement === "left" && !fitsLeft) {
        finalPlacement = fitsRight ? "right" : fitsBottom ? "bottom" : "top";
    } else if (placement === "top" && !fitsTop) {
        finalPlacement = fitsBottom ? "bottom" : fitsLeft ? "left" : "right";
    } else if (placement === "bottom" && !fitsBottom) {
        finalPlacement = fitsTop ? "top" : fitsLeft ? "left" : "right";
    }

    switch (finalPlacement) {
        case "right":
            top = targetRect.top + targetRect.height / 2 - TH / 2;
            left = targetRect.right + GAP;
            top = Math.max(16, Math.min(top, viewH - TH - 16));
            arrowClass = "tour-tooltip-arrow-left";
            break;
        case "left":
            top = targetRect.top + targetRect.height / 2 - TH / 2;
            left = targetRect.left - TW - GAP;
            top = Math.max(16, Math.min(top, viewH - TH - 16));
            arrowClass = "tour-tooltip-arrow-right";
            break;
        case "bottom":
            top = targetRect.bottom + GAP;
            left = targetRect.left + targetRect.width / 2 - TW / 2;
            left = Math.max(16, Math.min(left, viewW - TW - 16));
            arrowClass = "tour-tooltip-arrow-top";
            break;
        case "top":
            top = targetRect.top - TH - GAP;
            left = targetRect.left + targetRect.width / 2 - TW / 2;
            left = Math.max(16, Math.min(left, viewW - TW - 16));
            arrowClass = "tour-tooltip-arrow-bottom";
            break;
    }

    return { top: Math.round(top), left: Math.round(left), arrowClass };
}

function renderDots(total: number, seen: number): React.ReactNode {
    return Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < seen ? "tour-progress-dot" : "tour-progress-dot tour-progress-dot-inactive"} />
    ));
}

export const TourOverlay: React.FC = () => {
    const [activeStep, setActiveStep] = useState<TourStep | null>(null);
    const [targetRect, setTargetRect] = useState<Rect | null>(null);
    const [visible, setVisible] = useState(false);
    const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const activeStepRef = useRef<TourStep | null>(null);
    const prevStepIdRef = useRef<string | null>(null);
    const [totalSeen, setTotalSeen] = useState(0);

    useEffect(() => {
        activeStepRef.current = activeStep;
    }, [activeStep]);

    const evaluate = useCallback(() => {
        TourStore.init();
        const ctx = TourStore.getCtx();
        setTotalSeen(ctx.seenSteps.length);
        const step = findNextStep(ctx);
        setActiveStep(step);
    }, []);

    const findTarget = useCallback((selector: string): HTMLElement | null => {
        // Prefer direct ref for run-new-job target
        if (selector === '[data-tour-target="run-new-job"]') {
            return TourStore.getRunButtonEl();
        }
        return document.querySelector(selector) as HTMLElement | null;
    }, []);

    const positionSpotlight = useCallback((step: TourStep, el: HTMLElement) => {
        const measureAndShow = () => {
            const r = el.getBoundingClientRect();
            setTargetRect({
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
                right: r.right,
                bottom: r.bottom,
            });
            setVisible(true);
        };
        if (step.delayMs && step.delayMs > 0) {
            if (delayRef.current) clearTimeout(delayRef.current);
            delayRef.current = setTimeout(measureAndShow, step.delayMs);
        } else {
            requestAnimationFrame(measureAndShow);
        }
    }, []);

    const measureAndShow = useCallback(() => {
        // Clear any pending retry interval and delay
        if (retryRef.current) {
            clearInterval(retryRef.current);
            retryRef.current = null;
        }
        if (delayRef.current) {
            clearTimeout(delayRef.current);
            delayRef.current = null;
        }

        const step = findNextStep(TourStore.getCtx());

        // Hide spotlight when step changes to prevent flash at old position
        if (step?.id !== prevStepIdRef.current) {
            setVisible(false);
            setTargetRect(null);
        }
        prevStepIdRef.current = step?.id || null;

        setActiveStep(step);
        setTotalSeen(TourStore.getCtx().seenSteps.length);

        if (!step) {
            setVisible(false);
            return;
        }

        const el = findTarget(step.targetSelector);
        if (!el) {
            setVisible(false);
            // Target not in DOM yet — retry every 500ms until it appears
            retryRef.current = setInterval(() => {
                const retryEl = findTarget(step.targetSelector);
                if (retryEl) {
                    const id = retryRef.current;
                    if (id) clearInterval(id);
                    retryRef.current = null;
                    positionSpotlight(step, retryEl);
                }
            }, 500);
            return;
        }

        positionSpotlight(step, el);
    }, [positionSpotlight]);

    useEffect(() => {
        evaluate();
        measureAndShow();

        const unsub = TourStore.subscribe(() => {
            evaluate();
            measureAndShow();
        });

        const handleResize = () => {
            const step = activeStepRef.current;
            if (step) {
                const el = findTarget(step.targetSelector);
                if (el) {
                    const r = el.getBoundingClientRect();
                    setTargetRect({
                        top: r.top,
                        left: r.left,
                        width: r.width,
                        height: r.height,
                        right: r.right,
                        bottom: r.bottom,
                    });
                }
            }
        };

        window.addEventListener("resize", handleResize);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && visible && activeStep) {
                TourStore.markStepSeen(activeStep.id);
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            unsub();
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("keydown", handleKeyDown);
            if (delayRef.current) clearTimeout(delayRef.current);
            if (retryRef.current) clearInterval(retryRef.current);
        };
    }, []);

    const handleGotIt = () => {
        if (activeStep) {
            TourStore.markStepSeen(activeStep.id);
        }
    };

    const handleSkip = () => {
        TourStore.skipAll();
    };

    const handleOverlayClick = () => {
        if (activeStep) {
            TourStore.markStepSeen(activeStep.id);
        }
    };

    if (!activeStep || !targetRect || !visible) {
        return null;
    }

    const hasSpotlight = activeStep.spotlight !== false;
    const stepNum = parseInt(activeStep.id.split("-")[1], 10);
    const tooltipPos = computeTooltipStyle(targetRect, activeStep.placement || "right");
    const pad = activeStep.spotlightPadding || { h: 8, v: 6 };

    return (
        <div
            className={`tour-overlay ${hasSpotlight ? "tour-overlay-clickable" : ""}`}
            onClick={hasSpotlight ? handleOverlayClick : undefined}
        >
            {hasSpotlight && (
                <div
                    className="tour-spotlight"
                    style={{
                        top: targetRect.top - pad.v,
                        left: targetRect.left - pad.h,
                        width: targetRect.width + pad.h * 2,
                        height: targetRect.height + pad.v * 2,
                    }}
                />
            )}

            <div
                className="tour-tooltip"
                style={{
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                }}
            >
                <div className={tooltipPos.arrowClass + " tour-tooltip-arrow"} />

                <div className="tour-progress-badge">
                    {renderDots(5, totalSeen)}
                    <span>STEP {stepNum} OF 5</span>
                </div>

                <p className="tour-subtag">{activeStep.content.subtag}</p>
                <h3 className="tour-title">{activeStep.content.title}</h3>
                <p className="tour-description">{activeStep.content.description}</p>

                <div className="tour-actions">
                    <button
                        className={
                            activeStep.id === "step-5" ? "tour-btn-primary tour-btn-primary-green" : "tour-btn-primary"
                        }
                        onClick={handleGotIt}
                    >
                        {activeStep.content.primaryLabel}
                    </button>
                    <button className="tour-btn-secondary" onClick={handleSkip}>
                        {activeStep.content.secondaryLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TourOverlay;
