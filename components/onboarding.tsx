"use client"

import { Button } from "@/components/ui/button"
import { 
  Gift, 
  Share2, 
  CheckCircle2, 
  ArrowRight, 
  X,
  MousePointerClick,
  Link as LinkIcon,
  PartyPopper,
  Loader2
} from "lucide-react"
import type { OnboardingStep } from "@/lib/hooks/use-onboarding"
import { DEMO_GIFT } from "@/lib/hooks/use-onboarding"

interface OnboardingProps {
  currentStep: OnboardingStep
  onNext: () => void
  onSkip: () => void
  onComplete: () => void
}

export function Onboarding({ currentStep, onNext, onSkip, onComplete }: OnboardingProps) {
  if (currentStep === "completed") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-card border border-border/50 rounded-lg p-6 max-w-sm mx-4 shadow-2xl animate-scale-in">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center">
                <PartyPopper className="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">You&apos;re all set</h2>
              <p className="text-sm text-muted-foreground">
                Start creating gift lists and share them with friends.
              </p>
            </div>
            <Button onClick={onComplete} className="w-full gap-2">
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (currentStep === "welcome") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-card border border-border/50 rounded-lg p-6 max-w-sm mx-4 shadow-2xl animate-scale-in">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-lg bg-foreground/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-foreground" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Welcome to gift0</h2>
              <p className="text-sm text-muted-foreground">
                Quick tour to get you started.
              </p>
            </div>
            <div className="bg-accent/50 rounded-md p-3 text-left space-y-2">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Gift className="w-3.5 h-3.5 text-foreground" />
                  Add gifts from URLs
                </li>
                <li className="flex items-center gap-2">
                  <Share2 className="w-3.5 h-3.5 text-foreground" />
                  Share with friends
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                  Track purchases
                </li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={onNext} className="flex-1 gap-2">
                Start
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step indicator
  const steps = [
    { key: "add-gift", label: "Add Gift" },
    { key: "share-list", label: "Share" },
    { key: "mark-purchased", label: "Complete" },
  ]
  
  const currentStepIndex = steps.findIndex(s => 
    currentStep.includes(s.key.split("-")[0])
  )

  return (
    <>
      {/* Overlay only for adding-gift step (when modal is showing extraction) */}
      {currentStep === "adding-gift" && (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-[2px] pointer-events-none animate-in fade-in duration-200" />
      )}

      {/* Floating instruction card */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-border/50 rounded-lg shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div 
              className="h-full bg-gradient-to-r from-foreground/50 to-foreground transition-all duration-500"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>

          <div className="p-5">
            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mb-4">
              {steps.map((step, index) => (
                <div 
                  key={step.key}
                  className={`flex items-center gap-1 text-xs font-medium ${
                    index <= currentStepIndex ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full transition-colors ${
                    index < currentStepIndex 
                      ? "bg-foreground" 
                      : index === currentStepIndex 
                        ? "bg-foreground" 
                        : "bg-muted-foreground/30"
                  }`} />
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
              ))}
            </div>

            {/* Step content */}
            {currentStep === "add-gift" && (
              <StepContent
                icon={<MousePointerClick className="w-4 h-4" />}
                iconBg="bg-foreground/10 text-foreground"
                title="Add a gift"
                description={<>Click <strong>New List</strong> in the sidebar.</>}
              />
            )}

            {currentStep === "adding-gift" && (
              <StepContent
                icon={<Loader2 className="w-4 h-4 animate-spin" />}
                iconBg="bg-muted text-foreground"
                title="Adding gift..."
                description="Creating your list."
              />
            )}

            {currentStep === "gift-added" && (
              <StepContent
                icon={<CheckCircle2 className="w-4 h-4" />}
                iconBg="bg-foreground/10 text-foreground"
                title="Gift added"
                description="Now share it with friends."
              >
                <Button onClick={onNext} className="w-full mt-3 gap-2" size="sm">
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </StepContent>
            )}

            {currentStep === "share-list" && (
              <StepContent
                icon={<Share2 className="w-4 h-4" />}
                iconBg="bg-foreground/10 text-foreground"
                title="Share your list"
                description={<>Click <strong>Share</strong> to copy the link.</>}
              />
            )}

            {currentStep === "list-shared" && (
              <StepContent
                icon={<LinkIcon className="w-4 h-4" />}
                iconBg="bg-foreground/10 text-foreground"
                title="Link copied"
                description="Now mark a gift as purchased."
              >
                <Button onClick={onNext} className="w-full mt-3 gap-2" size="sm">
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </StepContent>
            )}

            {currentStep === "mark-purchased" && (
              <StepContent
                icon={<CheckCircle2 className="w-4 h-4" />}
                iconBg="bg-foreground/10 text-foreground"
                title="Mark as purchased"
                description={<>Click the <strong>checkbox</strong> next to the gift.</>}
              />
            )}

            {/* Skip button */}
            {!["adding-gift", "gift-added", "list-shared"].includes(currentStep) && (
              <button
                onClick={onSkip}
                className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function StepContent({
  icon,
  iconBg,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className={`w-8 h-8 rounded-md ${iconBg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {children}
      </div>
    </div>
  )
}
