
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { google } = require('googleapis')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: 'http://localhost:5173'
}))

const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'credentials', 'service-account.json'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
})

const sheets = google.sheets({
  version: 'v4',
  auth
})

async function readSheet(sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${sheetName}!A:Z`
  })

  const rows = response.data.values || []

  if (rows.length < 2) return []

  const headers = rows[0].map(header => header.trim())

  return rows.slice(1).map(row => {
    const item = {}

    headers.forEach((header, index) => {
      item[header] = row[index] || ''
    })

    return item
  })
}

app.get('/api/dashboard', async (req, res) => {
  try {
    const [members, events, attendance, budget] = await Promise.all([
      readSheet('Members'),
      readSheet('Events'),
      readSheet('Attendance'),
      readSheet('Budget')
    ])

    res.json({
      members,
      events,
      attendance,
      budget
    })
  } catch (error) {
    console.error('Google Sheets Error:', error.message)
    res.status(500).json({
      error: 'Unable to read Google Sheets data'
    })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`)
})
