import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface TutorialStep {
  target: string; // CSS selector
  title: string;
  content: string;
  position: "top" | "bottom" | "left" | "right";
}

const tutorialSteps: TutorialStep[] = [
  {
    target: "[data-tutorial='metrics']",
    title: "Live Metrics",
    content: "Track key performance indicators in real-time: items processed, active stations, diversion rate, and hazard alerts.",
    position: "bottom",
  },
  {
    target: "[data-tutorial='insights']",
    title: "Waste Analytics",
    content: "View waste composition breakdown and trends over time. See how much is being recycled, composted, or sent to landfill.",
    position: "right",
  },
  {
    target: "[data-tutorial='leaderboard']",
    title: "Station Leaderboard",
    content: "See which stations are performing best based on sorting accuracy. Great for identifying top performers and areas for improvement.",
    position: "right",
  },
  {
    target: "[data-tutorial='map']",
    title: "Interactive Station Map",
    content: "Click any station to see its status, contamination level, and recent activity. Stations are color-coded by performance.",
    position: "bottom",
  },
  {
    target: "[data-tutorial='live-tracking']",
    title: "Live Tracking Feed",
    content: "Watch items being sorted in real-time. Each entry shows what was detected and which bin it went to.",
    position: "top",
  },
  {
    target: "[data-tutorial='alerts']",
    title: "Alerts & Notifications",
    content: "Stay informed about contamination incidents, maintenance needs, and system updates. Critical alerts appear at the top.",
    position: "left",
  },
  {
    target: "[data-tutorial='item-breakdown']",
    title: "Item Breakdown",
    content: "See exactly what items are being disposed of and how they're being sorted across all your stations.",
    position: "left",
  },
];

export function TutorialModal() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});

  const step = tutorialSteps[currentStep];

  const positionTooltip = useCallback(() => {
    if (!isActive || !step) return;

    const target = document.querySelector(step.target);
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipHeight = 160;
    const offset = 16;
    const arrowSize = 8;

    let top = 0;
    let left = 0;
    let arrowTop = 0;
    let arrowLeft = 0;

    switch (step.position) {
      case "bottom":
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowTop = -arrowSize;
        arrowLeft = tooltipWidth / 2 - arrowSize;
        break;
      case "top":
        top = rect.top - tooltipHeight - offset;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowTop = tooltipHeight - 1;
        arrowLeft = tooltipWidth / 2 - arrowSize;
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - offset;
        arrowTop = tooltipHeight / 2 - arrowSize;
        arrowLeft = tooltipWidth - 1;
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + offset;
        arrowTop = tooltipHeight / 2 - arrowSize;
        arrowLeft = -arrowSize;
        break;
    }

    // Keep tooltip in viewport
    left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

    setTooltipStyle({
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipWidth}px`,
      zIndex: 10001,
    });

    setArrowStyle({
      position: "absolute",
      top: `${arrowTop}px`,
      left: `${arrowLeft}px`,
      width: 0,
      height: 0,
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderBottom: step.position === "bottom" ? `${arrowSize}px solid hsl(var(--card))` : "none",
      borderTop: step.position === "top" ? `${arrowSize}px solid hsl(var(--card))` : "none",
      ...(step.position === "left" && {
        borderTop: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid transparent`,
        borderLeft: `${arrowSize}px solid hsl(var(--card))`,
        borderRight: "none",
      }),
      ...(step.position === "right" && {
        borderTop: `${arrowSize}px solid transparent`,
        borderBottom: `${arrowSize}px solid transparent`,
        borderRight: `${arrowSize}px solid hsl(var(--card))`,
        borderLeft: "none",
      }),
    });

    // Highlight the target element
    document.querySelectorAll("[data-tutorial-highlight]").forEach((el) => {
      el.removeAttribute("data-tutorial-highlight");
      (el as HTMLElement).style.removeProperty("position");
      (el as HTMLElement).style.removeProperty("z-index");
      (el as HTMLElement).style.removeProperty("box-shadow");
    });

    (target as HTMLElement).setAttribute("data-tutorial-highlight", "true");
    const computedStyle = window.getComputedStyle(target);
    if (computedStyle.position === "static") {
      (target as HTMLElement).style.position = "relative";
    }
    (target as HTMLElement).style.zIndex = "10000";
    (target as HTMLElement).style.boxShadow = "0 0 0 4px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.2)";

    // Only scroll if element is mostly off-screen (give some buffer)
    const buffer = 100;
    if (rect.top < buffer || rect.bottom > window.innerHeight - buffer) {
      // Scroll just enough to bring the element into view, not center it
      target.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isActive, step]);

  useEffect(() => {
    const timer = setTimeout(() => setIsActive(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isActive) {
      positionTooltip();
      window.addEventListener("resize", positionTooltip);
      window.addEventListener("scroll", positionTooltip, true);
      return () => {
        window.removeEventListener("resize", positionTooltip);
        window.removeEventListener("scroll", positionTooltip, true);
      };
    }
  }, [isActive, currentStep, positionTooltip]);

  const handleClose = () => {
    localStorage.setItem("revisent-tutorial-seen", "true");
    setIsActive(false);
    // Remove all highlights
    document.querySelectorAll("[data-tutorial-highlight]").forEach((el) => {
      el.removeAttribute("data-tutorial-highlight");
      (el as HTMLElement).style.removeProperty("position");
      (el as HTMLElement).style.removeProperty("z-index");
      (el as HTMLElement).style.removeProperty("box-shadow");
    });
    // Scroll back to top - try multiple approaches for iframe compatibility
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Also scroll the main dashboard container
    const dashboardContainer = document.querySelector('.min-h-screen');
    if (dashboardContainer) {
      dashboardContainer.scrollTop = 0;
    }
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive) return null;

  const isLastStep = currentStep === tutorialSteps.length - 1;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-[9999]"
        onClick={handleClose}
      />

      {/* Tooltip */}
      <div
        style={tooltipStyle}
        className="bg-card rounded-xl shadow-2xl border border-border p-4 animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Arrow */}
        <div style={arrowStyle} />

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{step.content}</p>
        </div>

        {/* Progress & Navigation */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} of {tutorialSteps.length}
          </span>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
