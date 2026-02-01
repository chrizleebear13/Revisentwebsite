# Dashboard Sidebar Structure

## Overview
Both admin and client dashboards now have a collapsible sidebar with navigation to different sections. The sidebar is:
- **Desktop**: Always visible on the left (256px width)
- **Mobile**: Collapsible with hamburger menu, appears as overlay

---

## Navigation Sections

### 1. **Overview** (`/dashboard`)
**Current Implementation**: ✅ Complete
- Top-level metrics cards (Items Detected, CO₂ Saved, Active Stations, Diversion Rate)
- Live Tracking Chart with D/W/M timeframes
- Waste Analytics (Session Start, Avg/Hour, Duration)
- Item Breakdown with pie chart
- Impact Summary

**Purpose**: High-level snapshot of overall performance

---

### 2. **Stations** (`/stations`)
**Status**: 🔨 To be implemented

#### Client View Content Ideas:
- **Station List**: Cards for each connected station with:
  - Station name, location, status (active/inactive/maintenance)
  - Real-time item count for current session
  - Last detection timestamp
  - Health indicators (battery, connectivity, bin fullness)

- **Individual Station Deep Dive** (click into a station):
  - Dedicated metrics for that station only
  - Historical performance graphs
  - Category breakdown specific to that station
  - Session history with start/end times
  - Maintenance log and alerts
  - Configuration settings (if admin)

- **Station Comparison**:
  - Side-by-side performance metrics
  - Best/worst performing stations
  - Geographic map view (if locations available)

#### Admin View Additional Features:
- Add/remove stations
- Assign stations to groups
- View all stations across all clients
- Bulk configuration updates
- Station health monitoring dashboard

---

### 3. **Analytics** (`/analytics`)
**Status**: 🔨 To be implemented

#### Content Ideas:
- **Trends & Patterns**:
  - Hour-by-hour heatmap showing peak waste times
  - Day-of-week patterns (which days see most activity)
  - Seasonal trends (month-over-month comparisons)
  - Category trends over time (is recycling increasing?)

- **Advanced Visualizations**:
  - Stacked area charts for category distribution over time
  - Correlation analysis (e.g., weather vs. waste volume)
  - Prediction models (expected waste for next week/month)
  - Anomaly detection (unusual spikes or drops)

- **Custom Reports**:
  - Date range selector for custom time periods
  - Exportable reports (PDF, CSV, Excel)
  - Scheduled email reports
  - Report templates (weekly summary, monthly executive report)

- **Comparisons**:
  - Compare current period to previous period
  - Benchmark against industry averages
  - Goal tracking (are we meeting diversion rate targets?)

#### Admin Analytics Additions:
- Platform-wide trends across all clients
- Client performance rankings
- Revenue metrics (if applicable)
- User engagement analytics

---

### 4. **Impact** (`/impact`)
**Status**: 🔨 To be implemented

#### Content Ideas:
- **Environmental Metrics Deep Dive**:
  - Detailed CO₂ savings calculation methodology
  - Pounds of waste diverted from landfill
  - Trees saved equivalent
  - Water conservation impact
  - Energy savings from recycling

- **Visualizations**:
  - Running total counters with animations
  - Impact over time graphs
  - Category-specific impact (compost vs. recycle impact)
  - Comparison to equivalents (e.g., "Equivalent to X cars off the road")

- **Certifications & Achievements**:
  - Badges for milestones (1000 items, 100kg CO₂ saved)
  - Sustainability certificates (downloadable)
  - Compliance reports for regulations
  - ESG reporting data

- **Community Impact**:
  - If multiple groups/clients, show collective impact
  - Leaderboards (gamification)
  - Social sharing features

- **Educational Content**:
  - Why waste sorting matters
  - Impact stories and case studies
  - Best practices for waste reduction

---

### 5. **Settings** (`/settings`)
**Status**: 🔨 To be implemented

#### Client Settings Content:
- **Profile Settings**:
  - User information (name, email, role)
  - Password change
  - Notification preferences
  - Time zone and regional settings

- **Dashboard Preferences**:
  - Default timeframe (D/W/M)
  - Metric units (lbs vs kg, etc.)
  - Color theme preferences
  - Email report frequency

- **Station Configuration** (if permissions allow):
  - Station names and locations
  - Operating hours (for session start/end)
  - Bin capacity settings
  - Alert thresholds (e.g., notify when bin 80% full)

- **Notifications**:
  - Email alerts for station issues
  - Daily/weekly summary emails
  - Achievement notifications
  - Custom alert rules

- **Data & Privacy**:
  - Data export (download all your data)
  - Data retention preferences
  - Privacy settings
  - API access tokens (for integrations)

#### Admin Settings Additions:
- **User Management**:
  - Add/remove users
  - Role assignments
  - Group assignments
  - User activity logs

- **Group Management**:
  - Create/edit groups
  - Assign stations to groups
  - Group-level permissions

- **System Configuration**:
  - Global settings
  - Email templates
  - Calculation formulas (CO₂, impact metrics)
  - Integration settings (APIs, webhooks)

- **Billing & Subscription** (if applicable):
  - Current plan
  - Usage metrics
  - Invoice history
  - Payment methods

---

## Additional Section Ideas

### 6. **Reports** (Could be separate or part of Analytics)
- Pre-built report templates
- Custom report builder
- Scheduled reports
- Report history/archive

### 7. **Alerts & Notifications** (Could be separate section)
- Active alerts dashboard
- Alert history
- Configure alert rules
- Maintenance schedules

### 8. **Insights** (AI/ML driven, future enhancement)
- AI-generated insights ("Your recycling rate increased 15% this week")
- Recommendations for improvement
- Predictive maintenance alerts
- Optimization suggestions

### 9. **Integrations** (For enterprise clients)
- Connect to building management systems
- ERP integrations
- Sustainability reporting platforms
- Third-party data exports

---

## Implementation Priority

### Phase 1 (Essential):
1. ✅ Sidebar navigation component
2. 🔨 Stations page with station list and individual views
3. 🔨 Settings page with basic preferences

### Phase 2 (High Value):
4. 🔨 Analytics page with trends and custom reports
5. 🔨 Impact page with detailed environmental metrics

### Phase 3 (Enhancement):
6. 🔨 Advanced features (AI insights, integrations)
7. 🔨 Mobile app (if needed)

---

## Technical Notes

### File Structure:
```
dashboard/
├── app/
│   ├── admin/
│   │   ├── dashboard/page.tsx      ✅
│   │   ├── stations/page.tsx       🔨
│   │   ├── analytics/page.tsx      🔨
│   │   ├── impact/page.tsx         🔨
│   │   └── settings/page.tsx       🔨
│   └── client/
│       ├── dashboard/page.tsx      ✅
│       ├── stations/page.tsx       🔨
│       ├── analytics/page.tsx      🔨
│       ├── impact/page.tsx         🔨
│       └── settings/page.tsx       🔨
└── components/
    └── DashboardSidebar.tsx        ✅
```

### State Management Considerations:
- For station deep dives, consider using URL params or state management
- Shared components can be reused between admin/client with prop flags
- Real-time subscriptions should be efficient (subscribe only to relevant data)

### Design Consistency:
- All pages should use the same card styles (`gradient-card`)
- Consistent spacing and responsive breakpoints
- Loading states for all data fetches
- Empty states with helpful messaging
