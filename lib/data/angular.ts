export type AngularModule = {
  id: string
  title: string
  week: string
  topics: string[]
}

export const ANGULAR_MODULES: AngularModule[] = [
  {
    id: "ts-fundamentals",
    title: "TypeScript Fundamentals",
    week: "Week 1",
    topics: [
      "Interfaces & Types (models/ folder, ApiResponse<T>)",
      "Enums (ClaimStatus, ClaimType) with string values",
      "Utility types (Pick/Omit/Partial) and when to use them",
      "Strict null checks and optional fields with ?",
      "Generics basics (ApiResponse<T>, Result<T, E>)",
    ],
  },
  {
    id: "angular-core",
    title: "Angular Core",
    week: "Week 2",
    topics: [
      "Standalone components + routing",
      "Signals vs RxJS: when to choose",
      "Forms (ReactiveForms) + validation patterns",
      "HTTP interceptors + typed API layer",
      "State patterns (feature stores, selectors)",
    ],
  },
  {
    id: "production",
    title: "Production Readiness",
    week: "Week 3",
    topics: [
      "Performance: change detection + trackBy + memoization",
      "Error handling and user-friendly fallbacks",
      "Reusable UI primitives and composition",
      "Testing basics (unit + integration strategy)",
      "Deployment checklist mindset",
    ],
  },
]

