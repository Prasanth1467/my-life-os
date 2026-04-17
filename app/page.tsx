"use client"

import { useRouter } from "next/navigation"
import * as React from "react"

export default function Page() {
  const router = useRouter()
  React.useEffect(() => {
    router.replace("/dashboard")
  }, [router])
  return null
}
