"use client"

import { useEffect, useState } from "react"

export default function MobileBlocker({ children }: { children: React.ReactNode }) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)") // lg
    setIsDesktop(mq.matches)

    const handler = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches)
    }

    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  if (isDesktop === null) return null

  if (!isDesktop) {
    return (
      <div className="flex h-screen items-center justify-center text-center px-6">
        <p className="text-3xl text-muted-foreground">
          Desktop only!, gunakan laptop atau pc untuk mengakses dashboard admin!
        </p>
      </div>
    )
  }

  return <>{children}</>
}
