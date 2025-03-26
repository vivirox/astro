import React from 'react'
import { cn } from '../../lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton */
  width?: string | number
  /** Height of the skeleton */
  height?: string | number
  /** Number of skeleton items to render */
  count?: number
  /** Whether the skeleton should have a border radius */
  rounded?: boolean
  /** Whether the skeleton should be circular */
  circle?: boolean
  /** Whether the skeleton should have animation */
  animate?: boolean
  /** Whether the skeleton should have a pulse animation */
  pulse?: boolean
  /** Whether the skeleton should have a wave animation */
  wave?: boolean
  /** Additional class name */
  className?: string
}

export function Skeleton({
  width,
  height,
  count = 1,
  rounded = true,
  circle = false,
  animate = true,
  pulse = true,
  wave = false,
  className,
  ...props
}: SkeletonProps) {
  const baseClasses = 'inline-block bg-gray-200 dark:bg-gray-700'
  const animationClasses = animate
    ? pulse
      ? 'animate-pulse'
      : wave
        ? 'animate-skeleton-wave'
        : ''
    : ''

  const shapeClasses = circle ? 'rounded-full' : rounded ? 'rounded' : ''

  const items = []

  const style: React.CSSProperties = {
    ...(width !== undefined && {
      width: typeof width === 'number' ? `${width}px` : width,
    }),
    ...(height !== undefined && {
      height: typeof height === 'number' ? `${height}px` : height,
    }),
  }

  for (let i = 0; i < count; i++) {
    items.push(
      <span
        key={i}
        className={cn(baseClasses, animationClasses, shapeClasses, className)}
        style={style}
        {...props}
      />,
    )

    // Add line break if multiple items are rendered
    if (i < count - 1) {
      items.push(<br key={`br-${i}`} />)
    }
  }

  return <>{items}</>
}

export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = '67%',
  spacing = 8,
  className,
  ...props
}: SkeletonProps & {
  /** Number of lines to render */
  lines?: number
  /** Height of each line */
  lineHeight?: number
  /** Width of the last line (string percentage or pixel value) */
  lastLineWidth?: string | number
  /** Spacing between lines */
  spacing?: number
}) {
  // Convert spacing to proper CSS value
  const spacingPx = typeof spacing === 'number' ? `${spacing}px` : spacing

  const items = []

  for (let i = 0; i < lines; i++) {
    const isLastLine = i === lines - 1
    const width = isLastLine && lastLineWidth ? lastLineWidth : '100%'

    items.push(
      <Skeleton
        key={i}
        width={width}
        height={typeof lineHeight === 'number' ? `${lineHeight}px` : lineHeight}
        className={cn('block', className)}
        style={{
          marginBottom: isLastLine ? 0 : spacingPx,
        }}
        {...props}
      />,
    )
  }

  return <div>{items}</div>
}

export function SkeletonAvatar({
  size = 40,
  className,
  ...props
}: SkeletonProps & {
  /** Size of the avatar */
  size?: number
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      circle
      className={cn('inline-block', className)}
      {...props}
    />
  )
}

export function SkeletonCard({
  width = '100%',
  height = 200,
  className,
  ...props
}: SkeletonProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      className={cn('block', className)}
      {...props}
    />
  )
}

export function SkeletonButton({
  width = 80,
  height = 40,
  className,
  ...props
}: SkeletonProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      className={cn('block', className)}
      {...props}
    />
  )
}

export function SkeletonImage({
  width = '100%',
  height = 200,
  className,
  ...props
}: SkeletonProps) {
  return (
    <Skeleton
      width={width}
      height={height}
      className={cn('block', className)}
      {...props}
    />
  )
}

export default Skeleton
