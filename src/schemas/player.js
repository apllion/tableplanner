import * as v from 'valibot'

export const PlayerSchema = v.object({
  playerId: v.string(),
  displayName: v.string(),
  joinedAt: v.string(),
  lastSeen: v.string(),
  status: v.picklist(['active', 'away']),
})
