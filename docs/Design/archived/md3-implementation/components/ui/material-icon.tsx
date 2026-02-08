import * as React from 'react'
import { cn } from '@/lib/utils'

interface MaterialIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: string
  filled?: boolean
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700
  grade?: -25 | 0 | 200
  opticalSize?: 20 | 24 | 40 | 48
}

export function MaterialIcon({
  icon,
  filled = false,
  weight = 400,
  grade = 0,
  opticalSize = 24,
  className,
  style,
  ...props
}: MaterialIconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
        ...style,
      }}
      {...props}
    >
      {icon}
    </span>
  )
}

// Common icon presets
export const MaterialIcons = {
  // Navigation
  menu: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="menu" {...props} />,
  arrowBack: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="arrow_back" {...props} />,
  close: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="close" {...props} />,
  
  // Actions
  add: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="add" {...props} />,
  edit: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="edit" {...props} />,
  delete: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="delete" {...props} />,
  search: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="search" {...props} />,
  
  // Status
  check: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="check" {...props} />,
  error: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="error" {...props} />,
  warning: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="warning" {...props} />,
  info: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="info" {...props} />,
  
  // UI
  home: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="home" {...props} />,
  settings: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="settings" {...props} />,
  person: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="person" {...props} />,
  
  // Arrows
  arrowForward: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="arrow_forward" {...props} />,
  arrowUpward: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="arrow_upward" {...props} />,
  arrowDownward: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="arrow_downward" {...props} />,
  expandMore: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="expand_more" {...props} />,
  expandLess: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="expand_less" {...props} />,
  
  // More
  moreVert: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="more_vert" {...props} />,
  moreHoriz: (props?: Partial<MaterialIconProps>) => <MaterialIcon icon="more_horiz" {...props} />,
}
