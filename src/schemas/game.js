import * as v from 'valibot'

export const GameSchema = v.object({
  gameId: v.string(),
  name: v.string(),
  hostId: v.string(),
  minPlayers: v.optional(v.nullable(v.number())),
  maxPlayers: v.optional(v.nullable(v.number())),
  maxSeats: v.number(),
  status: v.picklist(['waiting', 'playing', 'finished']),
  createdAt: v.string(),
  startedAt: v.optional(v.nullable(v.string())),
  note: v.optional(v.nullable(v.string())),
  scheduledDay: v.optional(v.nullable(v.number())),
  scheduledTime: v.optional(v.nullable(v.string())),
  table: v.optional(v.nullable(v.string())),
  endTime: v.optional(v.nullable(v.string())),
  endDay: v.optional(v.nullable(v.number())),
})
