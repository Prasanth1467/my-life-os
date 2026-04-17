export type DSAModule = {
  id: string
  title: string
  sections: Array<{ name: string; problems: string[] }>
}

// Curated roadmap (offline, local). Expandable without schema changes.
export const DSA_MODULES: DSAModule[] = [
  {
    id: "beginner",
    title: "Beginner Problems",
    sections: [
      { name: "Language Basics", problems: ["CPP Setup", "Cpp Basics", "Java Setup", "Java Basics", "Java OOPs Basic"] },
      { name: "Logic Building (Patterns)", problems: ["Easy Patterns", "Medium Patterns", "Hard Patterns"] },
      { name: "Basic Maths", problems: ["Reverse a number", "Palindrome Number", "GCD of Two Numbers", "LCM of two numbers"] },
      { name: "Basic Arrays", problems: ["Check if Array is Sorted", "Reverse an array", "Remove duplicates from sorted array"] },
    ],
  },
  {
    id: "arrays",
    title: "Arrays",
    sections: [
      { name: "Fundamentals", problems: ["Largest Element", "Second Largest Element", "Maximum Consecutive Ones"] },
      { name: "Medium", problems: ["Two Sum", "3 Sum", "Kadane's Algorithm", "Next Permutation"] },
      { name: "Hard", problems: ["Count Inversions", "Maximum Product Subarray"] },
    ],
  },
  {
    id: "bsearch",
    title: "Binary Search",
    sections: [
      { name: "Fundamentals", problems: ["Lower Bound", "Upper Bound", "Search in rotated sorted array"] },
      { name: "FAQs", problems: ["Aggressive Cows", "Book Allocation", "Median of 2 sorted arrays"] },
    ],
  },
  {
    id: "dp",
    title: "Dynamic Programming",
    sections: [
      { name: "1D DP", problems: ["Climbing Stairs", "House Robber", "Frog Jump"] },
      { name: "Strings", problems: ["Longest Common Subsequence", "Edit Distance"] },
    ],
  },
]

