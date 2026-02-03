'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, CheckCircle, AlertCircle, X } from 'lucide-react'
import { getDemoAlerts } from '@/lib/demo-data'

export function DemoAlertsDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const alerts = getDemoAlerts()
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  const handleDismissAlert = (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts)
    newDismissed.add(alertId)
    setDismissedAlerts(newDismissed)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getAlertIcon = (type: 'success' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5" />
      case 'info':
      default:
        return <AlertCircle className="w-3.5 h-3.5" />
    }
  }

  const getAlertColor = (type: 'success' | 'info') => {
    switch (type) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'info':
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffHours > 0) {
      return `${diffHours}h ago`
    } else if (diffMins > 0) {
      return `${diffMins}m ago`
    } else {
      return 'Just now'
    }
  }

  // Demo alerts are all positive (success/info), no warnings or errors
  const hasWarningsOrErrors = false

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <Bell className="w-4 h-4 text-muted-foreground" />
        {visibleAlerts.length > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 w-4 h-4 text-[10px] font-semibold rounded-full flex items-center justify-center ${
            hasWarningsOrErrors
              ? 'bg-yellow-500 text-white'
              : 'bg-primary text-white'
          }`}>
            {visibleAlerts.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg z-50">
          <div className="p-3 border-b border-border/50">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Alerts
              {visibleAlerts.length > 0 && (
                <span className="text-xs text-muted-foreground">({visibleAlerts.length})</span>
              )}
            </h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {visibleAlerts.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No alerts at this time</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {visibleAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2.5 rounded-lg border ${getAlertColor(alert.type)}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium leading-snug">{alert.message}</p>
                        <p className="text-xs opacity-60 mt-1">{formatTimeAgo(alert.created_at)}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissAlert(alert.id)
                        }}
                        className="p-1 rounded-full hover:bg-black/10 transition-colors opacity-60 hover:opacity-100"
                        title="Dismiss alert"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
