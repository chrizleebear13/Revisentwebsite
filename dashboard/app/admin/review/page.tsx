'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardSidebar } from '@/components/DashboardSidebar'
import { AlertTriangle, LogOut, Filter, TrendingUp, Target, RefreshCw, Download, CheckCircle, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Detection {
  id: number
  device_id: string
  client_id: string
  category: 'recycle' | 'compost' | 'trash'
  item: string | null
  confidence: number | null
  created_at: string
  top_item_results: { item: string; confidence: number }[] | null
  category_scores: { category: string; score: number }[] | null
  reason: string | null
}

interface AmbiguousItem extends Detection {
  confidenceGap: number // Difference between top confidence and second-best
  secondBestCategory?: string
  secondBestConfidence?: number
}

interface FrequentItem {
  item: string
  count: number
  category: string
  avgConfidence: number
  lastDetected: string
}

type ReviewTab = 'low-confidence' | 'ambiguous' | 'frequent' | 'model-predictions'

export default function AdminReview() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<ReviewTab>('low-confidence')
  const [lowConfidenceItems, setLowConfidenceItems] = useState<Detection[]>([])
  const [ambiguousItems, setAmbiguousItems] = useState<AmbiguousItem[]>([])
  const [frequentItems, setFrequentItems] = useState<FrequentItem[]>([])
  const [recentDetections, setRecentDetections] = useState<Detection[]>([])
  const [loading, setLoading] = useState(true)
  const [frequencyThreshold, setFrequencyThreshold] = useState(50) // Items detected more than 50 times
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  useEffect(() => {
    fetchReviewData()
  }, [supabase, frequencyThreshold])

  const fetchReviewData = async () => {
    setLoading(true)
    try {
      // Fetch all detections with top_item_results for model analysis
      const { data: items, error } = await supabase
        .from('detections')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000) // Limit to recent 1000 items for performance

      if (error) throw error

      const detections: Detection[] = (items || []).map(item => ({
        id: item.id,
        device_id: item.device_id,
        client_id: item.client_id,
        category: item.category?.toLowerCase() as 'recycle' | 'compost' | 'trash',
        item: item.item,
        confidence: item.confidence,
        created_at: item.created_at,
        top_item_results: item.top_item_results,
        category_scores: item.category_scores,
        reason: item.reason
      }))

      // 1. Find uncertain items (reason === 'uncertain')
      const lowConf = detections.filter(
        item => item.reason?.toLowerCase() === 'uncertain'
      )
      setLowConfidenceItems(lowConf)

      // 2. Find ambiguous items using category_scores if available
      const ambiguous = detections
        .filter(item => {
          if (item.category_scores && item.category_scores.length > 1) {
            // Sort scores descending
            const sorted = [...item.category_scores].sort((a, b) => b.score - a.score)
            const gap = sorted[0].score - sorted[1].score
            return gap < 0.3 // Less than 30% gap between top two categories
          }
          return item.confidence !== null && item.confidence >= 0.4 && item.confidence <= 0.6
        })
        .map(item => {
          let secondBest = { category: 'unknown', score: 0 }
          if (item.category_scores && item.category_scores.length > 1) {
            const sorted = [...item.category_scores].sort((a, b) => b.score - a.score)
            secondBest = { category: sorted[1].category, score: sorted[1].score }
          }
          return {
            ...item,
            confidenceGap: item.confidence ? (0.6 - item.confidence) : 0,
            secondBestCategory: secondBest.category,
            secondBestConfidence: secondBest.score
          }
        })
      setAmbiguousItems(ambiguous)

      // 3. Find frequently detected items
      const itemCounts: Record<string, { count: number; category: string; totalConfidence: number; lastDetected: string }> = {}

      detections.forEach(item => {
        if (item.item) {
          if (!itemCounts[item.item]) {
            itemCounts[item.item] = {
              count: 0,
              category: item.category,
              totalConfidence: 0,
              lastDetected: item.created_at
            }
          }
          itemCounts[item.item].count++
          itemCounts[item.item].totalConfidence += item.confidence || 0
          if (new Date(item.created_at) > new Date(itemCounts[item.item].lastDetected)) {
            itemCounts[item.item].lastDetected = item.created_at
          }
        }
      })

      const frequent = Object.entries(itemCounts)
        .filter(([_, data]) => data.count >= frequencyThreshold)
        .map(([itemName, data]) => ({
          item: itemName,
          count: data.count,
          category: data.category,
          avgConfidence: data.totalConfidence / data.count,
          lastDetected: data.lastDetected
        }))
        .sort((a, b) => b.count - a.count)

      setFrequentItems(frequent)

      // 4. Store recent detections with top_item_results for model predictions tab
      const withTopResults = detections.filter(d => d.top_item_results && d.top_item_results.length > 0)
      setRecentDetections(withTopResults.slice(0, 50))

      setLoading(false)
    } catch (error) {
      console.error('Error fetching review data:', error)
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleExportReview = () => {
    let data: any[] = []
    let filename = ''

    if (activeTab === 'low-confidence') {
      data = lowConfidenceItems.map(item => ({
        ID: item.id,
        'Item': item.item || 'Unknown',
        Category: item.category,
        Confidence: item.confidence?.toFixed(4) || 'N/A',
        'Device ID': item.device_id,
        'Client ID': item.client_id,
        'Detected At': new Date(item.created_at).toISOString()
      }))
      filename = `low-confidence-items-${new Date().toISOString().split('T')[0]}.csv`
    } else if (activeTab === 'ambiguous') {
      data = ambiguousItems.map(item => ({
        ID: item.id,
        'Item': item.item || 'Unknown',
        Category: item.category,
        Confidence: item.confidence?.toFixed(4) || 'N/A',
        'Second Best Category': item.secondBestCategory,
        'Second Best Confidence': item.secondBestConfidence?.toFixed(4) || 'N/A',
        'Device ID': item.device_id,
        'Detected At': new Date(item.created_at).toISOString()
      }))
      filename = `ambiguous-items-${new Date().toISOString().split('T')[0]}.csv`
    } else if (activeTab === 'frequent') {
      data = frequentItems.map(item => ({
        'Item': item.item,
        'Detection Count': item.count,
        Category: item.category,
        'Avg Confidence': item.avgConfidence.toFixed(4),
        'Last Detected': new Date(item.lastDetected).toISOString()
      }))
      filename = `frequent-items-${new Date().toISOString().split('T')[0]}.csv`
    } else if (activeTab === 'model-predictions') {
      data = recentDetections.map(item => ({
        ID: item.id,
        'Top Item': item.item || 'Unknown',
        Category: item.category,
        Confidence: item.confidence?.toFixed(4) || 'N/A',
        'Alternative Predictions': item.top_item_results?.map(r => `${r.item}: ${(r.confidence * 100).toFixed(1)}%`).join(', ') || 'N/A',
        'Reason': item.reason || 'N/A',
        'Detected At': new Date(item.created_at).toISOString()
      }))
      filename = `model-predictions-${new Date().toISOString().split('T')[0]}.csv`
    }

    if (data.length === 0) return

    // Helper to escape CSV values properly
    const escapeCSV = (val: any) => {
      const str = String(val ?? '')
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headers = Object.keys(data[0])
    const csvData = [
      headers.map(escapeCSV).join(','),
      ...data.map(row => headers.map(h => escapeCSV(row[h])).join(','))
    ]
    const csvContent = csvData.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'recycle':
        return 'text-success bg-success/10 border-success/20'
      case 'compost':
        return 'text-warning bg-warning/10 border-warning/20'
      case 'trash':
        return 'text-destructive bg-destructive/10 border-destructive/20'
      default:
        return 'text-muted-foreground bg-muted/10 border-muted/20'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-success'
    if (confidence >= 0.6) return 'text-warning'
    return 'text-destructive'
  }

  const tabs = [
    { id: 'low-confidence' as ReviewTab, label: 'Uncertain', count: lowConfidenceItems.length },
    { id: 'ambiguous' as ReviewTab, label: 'Ambiguous', count: ambiguousItems.length },
    { id: 'frequent' as ReviewTab, label: 'Over-Detection', count: frequentItems.length },
    { id: 'model-predictions' as ReviewTab, label: 'Model Predictions', count: recentDetections.length },
  ]

  return (
    <div className="h-screen overflow-hidden gradient-subtle touch-manipulation">
      <DashboardSidebar isAdmin={true} />
      <div className="lg:ml-64 h-screen overflow-y-auto px-4 md:px-6 lg:px-8 py-3 md:py-4 space-y-3 md:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-card/50 backdrop-blur-xl rounded-xl p-3 shadow-sm border border-border/50">
          <div className="flex items-center gap-3">
            <Image
              src="/assets/Revisentlogo.png"
              alt="Revisent"
              width={120}
              height={36}
              className="h-8 w-auto"
              priority
            />
            <div className="hidden sm:block w-px h-6 bg-border/50"></div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold">Model Review & Training</h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReviewData}
            className="gap-1.5 h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs text-muted-foreground">Uncertain Items</h4>
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <p className="text-2xl font-bold">{lowConfidenceItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Flagged as uncertain by model
                </p>
              </Card>

              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs text-muted-foreground">Ambiguous Items</h4>
                  <Target className="w-4 h-4 text-warning" />
                </div>
                <p className="text-2xl font-bold">{ambiguousItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Close confidence scores
                </p>
              </Card>

              <Card className="p-4 gradient-card shadow-sm border-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs text-muted-foreground">Over-Detected Items</h4>
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <p className="text-2xl font-bold">{frequentItems.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Over {frequencyThreshold} detections
                </p>
              </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 gradient-card shadow-sm border-0">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Filters</h3>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">
                  Frequency Threshold (Over-Detection Tab)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="10"
                    value={frequencyThreshold}
                    onChange={(e) => setFrequencyThreshold(parseInt(e.target.value))}
                    className="flex-1 max-w-xs"
                  />
                  <span className="text-sm font-semibold w-12">
                    {frequencyThreshold}+
                  </span>
                </div>
              </div>
            </Card>

            {/* Tabs */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-primary/10 text-primary border border-primary/20 font-semibold'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReview}
                className="gap-1.5 h-8"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">Export</span>
              </Button>
            </div>

            {/* Tab Content */}
            {activeTab === 'low-confidence' && (
              <div className="space-y-3">
                {lowConfidenceItems.length === 0 ? (
                  <Card className="p-8 gradient-card shadow-sm border-0">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-1">Great Model Performance!</h3>
                      <p className="text-sm text-muted-foreground">
                        No uncertain detections found. Your model is performing well.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      These items were flagged as "uncertain" by the model.
                      Review these to identify patterns and improve model training.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {lowConfidenceItems.map(item => (
                        <Card key={item.id} className="p-4 gradient-card shadow-sm border-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold">
                                  {item.item || 'Unknown Item'}
                                </h4>
                                <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                                  {item.category}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Confidence</span>
                                  <p className={`font-semibold ${getConfidenceColor(item.confidence || 0)}`}>
                                    {item.confidence ? (item.confidence * 100).toFixed(1) : 'N/A'}%
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Device</span>
                                  <p className="font-semibold font-mono text-xs">{item.device_id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Client</span>
                                  <p className="font-semibold">{item.client_id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Detected</span>
                                  <p className="font-semibold">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'ambiguous' && (
              <div className="space-y-3">
                {ambiguousItems.length === 0 ? (
                  <Card className="p-8 gradient-card shadow-sm border-0">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-1">Clear Classifications</h3>
                      <p className="text-sm text-muted-foreground">
                        No ambiguous items found. The model is making decisive predictions.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      These items had similar confidence scores across multiple categories.
                      These are good candidates for additional training data or feature engineering.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {ambiguousItems.map(item => (
                        <Card key={item.id} className="p-4 gradient-card shadow-sm border-0 border-l-4 border-l-warning">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="text-sm font-semibold">
                                  {item.item || 'Unknown Item'}
                                </h4>
                                <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                                  {item.category}
                                </Badge>
                                <Badge variant="outline" className="text-xs text-warning bg-warning/10 border-warning/20">
                                  Ambiguous
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Confidence</span>
                                  <p className="font-semibold text-warning">
                                    {item.confidence ? (item.confidence * 100).toFixed(1) : 'N/A'}%
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">2nd Best</span>
                                  <p className="font-semibold">
                                    {item.secondBestCategory} ({item.secondBestConfidence ? (item.secondBestConfidence * 100).toFixed(1) : 'N/A'}%)
                                  </p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Device</span>
                                  <p className="font-semibold font-mono text-xs">{item.device_id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Client</span>
                                  <p className="font-semibold">{item.client_id}</p>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Detected</span>
                                  <p className="font-semibold">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'frequent' && (
              <div className="space-y-3">
                {frequentItems.length === 0 ? (
                  <Card className="p-8 gradient-card shadow-sm border-0">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-1">Balanced Detection</h3>
                      <p className="text-sm text-muted-foreground">
                        No items are being over-detected. The model has good variety.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      These items are being detected frequently (over {frequencyThreshold} times).
                      This could indicate over-detection, sensor issues, or actual high usage patterns.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {frequentItems.map((item, index) => (
                        <Card key={index} className="p-4 gradient-card shadow-sm border-0">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="text-sm font-semibold mb-1">{item.item}</h4>
                              <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-accent">{item.count}</p>
                              <p className="text-xs text-muted-foreground">detections</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Avg Confidence</span>
                              <p className={`font-semibold ${getConfidenceColor(item.avgConfidence)}`}>
                                {(item.avgConfidence * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Detected</span>
                              <p className="font-semibold">
                                {new Date(item.lastDetected).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'model-predictions' && (
              <div className="space-y-3">
                {recentDetections.length === 0 ? (
                  <Card className="p-8 gradient-card shadow-sm border-0">
                    <div className="text-center">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <h3 className="text-lg font-semibold mb-1">No Model Predictions Available</h3>
                      <p className="text-sm text-muted-foreground">
                        Detections with alternative predictions will appear here.
                      </p>
                    </div>
                  </Card>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      View detailed model predictions including alternative item classifications and confidence scores.
                      This data helps understand how the model is making decisions.
                    </p>
                    <div className="grid grid-cols-1 gap-3">
                      {recentDetections.map(item => (
                        <Card key={item.id} className="p-4 gradient-card shadow-sm border-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold">
                                {item.item || 'Unknown Item'}
                              </h4>
                              <Badge variant="outline" className={`text-xs ${getCategoryColor(item.category)}`}>
                                {item.category}
                              </Badge>
                              <span className={`text-xs font-medium ${getConfidenceColor(item.confidence || 0)}`}>
                                {item.confidence ? (item.confidence * 100).toFixed(1) : 'N/A'}%
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleString()}
                            </span>
                          </div>

                          {/* Top Item Results - Alternative Predictions */}
                          {item.top_item_results && item.top_item_results.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-2">Alternative Predictions:</p>
                              <div className="flex flex-wrap gap-2">
                                {item.top_item_results.slice(0, 5).map((result, idx) => (
                                  <div
                                    key={idx}
                                    className="px-2 py-1 rounded-md bg-muted/30 text-xs"
                                  >
                                    <span className="font-medium">{result.item}</span>
                                    <span className="text-muted-foreground ml-1">
                                      ({(result.confidence * 100).toFixed(1)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Category Scores */}
                          {item.category_scores && item.category_scores.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-muted-foreground mb-2">Category Scores:</p>
                              <div className="flex gap-4">
                                {item.category_scores.map((score, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Badge variant="outline" className={`text-xs ${getCategoryColor(score.category?.toLowerCase())}`}>
                                      {score.category}
                                    </Badge>
                                    <span className="text-xs font-medium">
                                      {(score.score * 100).toFixed(1)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Reason */}
                          {item.reason && (
                            <div className="p-2 rounded-md bg-muted/20 text-xs">
                              <span className="text-muted-foreground">Reason: </span>
                              <span>{item.reason}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Device: <span className="font-mono">{item.device_id}</span></span>
                            <span>Client: {item.client_id}</span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Help Section */}
            <Card className="p-4 gradient-card shadow-sm border-0 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/10">
              <h3 className="text-sm font-semibold mb-2">Using the Review Dashboard</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong>Uncertain:</strong> Items flagged with reason "uncertain" by the model. Review these to identify edge cases
                  or items that need better training data.
                </p>
                <p>
                  <strong>Ambiguous:</strong> Items with similar scores across categories. These indicate classification
                  boundaries that could benefit from additional features or training examples.
                </p>
                <p>
                  <strong>Over-Detection:</strong> Items detected very frequently. Check if this represents actual usage
                  patterns or potential sensor/model issues.
                </p>
                <p>
                  <strong>Model Predictions:</strong> View detailed model output including alternative item predictions and
                  category scores. Only visible to admins.
                </p>
                <p className="pt-2">
                  Export any tab's data as CSV for deeper analysis or to create training datasets for model improvement.
                </p>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
