/** Gemeinsame Typen der UI-Komponenten (src/components/ui). */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonType = 'button' | 'submit' | 'reset'

export type IconButtonVariant = 'ghost' | 'secondary' | 'primary'
export type ControlSize = 'sm' | 'md'

export type ToastType = 'success' | 'error' | 'info'
export type CalloutType = 'info' | 'success' | 'warning' | 'danger'

export type TextFieldType = 'text' | 'search' | 'email' | 'url' | 'password'

export interface SegmentedOption {
  value: string
  label: string
  disabled?: boolean
}

export type SelectOption = SegmentedOption
