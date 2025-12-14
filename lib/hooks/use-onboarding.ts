"use client"

import { useState, useEffect, useCallback } from "react"

export type OnboardingStep = 
  | "welcome"
  | "add-gift"
  | "adding-gift"
  | "gift-added"
  | "share-list"
  | "list-shared"
  | "mark-purchased"
  | "completed"

const ONBOARDING_KEY = "gift0-onboarding-completed"

export const DEMO_GIFT = {
  name: "LLM Design Patterns: A Practical Guide to Building Robust",
  url: "https://www.amazon.com/dp/1836207034?sp_csd=d2lkZ2V0TmFtZT1zcF9kZXRhaWw",
  price: "$41.24",
  priority: "low" as const,
  purchased: false,
}

export function useOnboarding() {
  const [isOnboarding, setIsOnboarding] = useState(false)
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome")
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      setIsOnboarding(true)
    }
    setHasCheckedStorage(true)
  }, [])

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      switch (prev) {
        case "welcome":
          return "add-gift"
        case "add-gift":
          return "adding-gift"
        case "adding-gift":
          return "gift-added"
        case "gift-added":
          return "share-list"
        case "share-list":
          return "list-shared"
        case "list-shared":
          return "mark-purchased"
        case "mark-purchased":
          return "completed"
        default:
          return "completed"
      }
    })
  }, [])

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setIsOnboarding(false)
    setCurrentStep("welcome")
  }, [])

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, "true")
    setIsOnboarding(false)
  }, [])

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY)
    setIsOnboarding(true)
    setCurrentStep("welcome")
  }, [])

  return {
    isOnboarding,
    currentStep,
    hasCheckedStorage,
    nextStep,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding,
    setCurrentStep,
  }
}
