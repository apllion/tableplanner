# Google Apps Script Backend Setup

## 1. Create Google Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Table Planer"

## 2. Create Sheets (Tabs)

Create 3 sheets with these exact names and header rows:

### Sheet: `Players`
| playerId | displayName | joinedAt | lastSeen | status |
|----------|-------------|----------|----------|--------|

### Sheet: `Games`
| gameId | name | hostId | minPlayers | maxPlayers | maxSeats | status | createdAt | startedAt | note | scheduledDay | scheduledTime | table | endTime |
|--------|------|--------|------------|------------|----------|--------|-----------|-----------|------|--------------|---------------|-------|----------|

### Sheet: `Seats`
| seatId | gameId | playerId | playerName | joinedAt | note | status |
|--------|--------|----------|------------|----------|------|--------|

## 3. Deploy Apps Script

1. Open **Extensions → Apps Script**
2. Delete any existing code in `Code.gs`
3. Paste the contents of `Code.gs` from this directory
4. Click **Deploy → New Deployment**
5. Select type: **Web app**
6. Set: Execute as **Me**, Access **Anyone**
7. Click **Deploy** and authorize when prompted
8. Copy the deployment URL

## 4. Configure Script Properties

1. In Apps Script, go to **Settings → Script Properties**
2. Add property: `PASSPHRASE_ANSWER` = the answer players must give to register (case-insensitive)

## 5. Configure the App

Create a `.env.local` file in the project root:

```
VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

## 6. Discord Notifications (Optional)

1. In your Discord server, go to channel settings → Integrations → Webhooks
2. Create a webhook and copy the URL
3. In Apps Script, go to **Settings → Script Properties**
4. Add property: `DISCORD_WEBHOOK_URL` = your webhook URL
