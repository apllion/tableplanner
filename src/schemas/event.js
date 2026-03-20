import * as v from 'valibot'
import { PlayerSchema } from './player.js'
import { GameSchema } from './game.js'

export const SeatSchema = v.object({
  seatId: v.string(),
  gameId: v.string(),
  playerId: v.string(),
  playerName: v.string(),
  joinedAt: v.string(),
  note: v.optional(v.nullable(v.string())),
  status: v.optional(v.nullable(v.string())),
})

export const EventDataSchema = v.object({
  players: v.array(PlayerSchema),
  games: v.array(GameSchema),
  seats: v.array(SeatSchema),
})
