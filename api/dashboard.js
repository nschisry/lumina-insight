
import { google } from 'googleapis'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const credentials = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT
    )

    const auth = new google.auth.GoogleAuth({
      credentials: {
        ...credentials,
        private_key: credentials.private_key?.replace(/\\n/g, '\n')
      },
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

    const [members, events, attendance, budget] = await Promise.all([
      readSheet('Members'),
      readSheet('Events'),
      readSheet('Attendance'),
      readSheet('Budget')
    ])

    return res.status(200).json({
      members,
      events,
      attendance,
      budget
    })

  } catch (error) {
    console.error('Google Sheets Error:', error)

    return res.status(500).json({
      error: 'Unable to read Google Sheets data'
    })
  }
}
