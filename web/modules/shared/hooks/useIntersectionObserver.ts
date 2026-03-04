'use client'

import { useEffect, useRef, useState } from 'react'

export function useIntersectionObserver(callback: () => void, _dependencies: any[] = []) {
    const observerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    callback()
                }
            },
            { threshold: 0.1 }
        )

        const currentRef = observerRef.current
        if (currentRef) {
            observer.observe(currentRef)
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef)
            }
        }
    }, [callback])

    return observerRef
}
