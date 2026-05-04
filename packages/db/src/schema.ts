import { sql } from 'drizzle-orm'
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core'
import type {
  CheckStatus,
  IncidentCause,
  MonitorConfig,
  MonitorType,
  NotificationChannelConfig,
  NotificationChannelType,
  Theme,
} from '@pingboard/shared'

const uuid = () => text().$defaultFn(() => crypto.randomUUID())
const timestamp = (name: string) =>
  integer(name, { mode: 'timestamp_ms' }).notNull()
const now = sql`(unixepoch() * 1000)`

export const users = sqliteTable('users', {
  id: uuid().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: timestamp('created_at').default(now),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').default(now),
})

export const monitors = sqliteTable('monitors', {
  id: uuid().primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<MonitorType>().notNull(),
  target: text('target').notNull(),
  intervalSeconds: integer('interval_seconds').notNull().default(60),
  timeoutSeconds: integer('timeout_seconds').notNull().default(10),
  retryCount: integer('retry_count').notNull().default(1),
  config: text('config', { mode: 'json' }).$type<MonitorConfig>().notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  paused: integer('paused', { mode: 'boolean' }).notNull().default(false),
  createdAt: timestamp('created_at').default(now),
  updatedAt: timestamp('updated_at').default(now),
})

export const heartbeats = sqliteTable(
  'heartbeats',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    status: text('status').$type<CheckStatus>().notNull(),
    responseTimeMs: integer('response_time_ms'),
    statusCode: integer('status_code'),
    message: text('message'),
    checkedAt: timestamp('checked_at').default(now),
  },
  (t) => ({
    monitorCheckedIdx: index('heartbeats_monitor_checked_idx').on(
      t.monitorId,
      t.checkedAt,
    ),
  }),
)

export const dailyStats = sqliteTable(
  'daily_stats',
  {
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    date: text('date').notNull(), // ISO date string YYYY-MM-DD
    uptimePct: real('uptime_pct').notNull(),
    avgResponseMs: real('avg_response_ms'),
    incidentsCount: integer('incidents_count').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.monitorId, t.date] }),
  }),
)

export const incidents = sqliteTable('incidents', {
  id: uuid().primaryKey(),
  monitorId: text('monitor_id')
    .notNull()
    .references(() => monitors.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at'),
  resolvedAt: integer('resolved_at', { mode: 'timestamp_ms' }),
  cause: text('cause').$type<IncidentCause>().notNull().default('auto'),
  note: text('note'),
})

export const notificationChannels = sqliteTable('notification_channels', {
  id: uuid().primaryKey(),
  name: text('name').notNull(),
  type: text('type').$type<NotificationChannelType>().notNull(),
  config: text('config', { mode: 'json' })
    .$type<NotificationChannelConfig>()
    .notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
})

export const monitorChannels = sqliteTable(
  'monitor_channels',
  {
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    channelId: text('channel_id')
      .notNull()
      .references(() => notificationChannels.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.monitorId, t.channelId] }),
  }),
)

export const statusPages = sqliteTable(
  'status_pages',
  {
    id: uuid().primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    theme: text('theme').$type<Theme>().notNull().default('auto'),
    passwordHash: text('password_hash'),
    customDomain: text('custom_domain'),
    createdAt: timestamp('created_at').default(now),
  },
  (t) => ({
    slugIdx: uniqueIndex('status_pages_slug_idx').on(t.slug),
  }),
)

export const statusPageMonitors = sqliteTable(
  'status_page_monitors',
  {
    statusPageId: text('status_page_id')
      .notNull()
      .references(() => statusPages.id, { onDelete: 'cascade' }),
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    groupName: text('group_name'),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.statusPageId, t.monitorId] }),
  }),
)

export const maintenanceWindows = sqliteTable(
  'maintenance_windows',
  {
    id: uuid().primaryKey(),
    monitorId: text('monitor_id')
      .notNull()
      .references(() => monitors.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    startsAt: timestamp('starts_at'),
    endsAt: timestamp('ends_at'),
    createdAt: timestamp('created_at').default(now),
  },
  (t) => ({
    monitorTimeIdx: index('maintenance_windows_monitor_time_idx').on(
      t.monitorId,
      t.startsAt,
      t.endsAt,
    ),
  }),
)

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type Monitor = typeof monitors.$inferSelect
export type NewMonitor = typeof monitors.$inferInsert
export type Heartbeat = typeof heartbeats.$inferSelect
export type NewHeartbeat = typeof heartbeats.$inferInsert
export type DailyStat = typeof dailyStats.$inferSelect
export type Incident = typeof incidents.$inferSelect
export type NewIncident = typeof incidents.$inferInsert
export type NotificationChannel = typeof notificationChannels.$inferSelect
export type NewNotificationChannel = typeof notificationChannels.$inferInsert
export type StatusPage = typeof statusPages.$inferSelect
export type NewStatusPage = typeof statusPages.$inferInsert
export type StatusPageMonitor = typeof statusPageMonitors.$inferSelect
export type MaintenanceWindow = typeof maintenanceWindows.$inferSelect
export type NewMaintenanceWindow = typeof maintenanceWindows.$inferInsert
export type Setting = typeof settings.$inferSelect
