import { NextResponse } from 'next/server'
import { db } from '@foundrydb/runtime'

export async function GET() {
  let dbStatus: string
  try {
    // Attempt a lightweight query to verify Postgres connectivity.
    const pool = (await db.connect()) as {
      query: (sql: string) => Promise<{ rows: unknown[] }>
    }
    await pool.query('SELECT 1')
    dbStatus = 'ok'
  } catch (err) {
    dbStatus = (err as Error).message
  }

  const healthy = dbStatus === 'ok'
  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', db: dbStatus },
    { status: healthy ? 200 : 503 },
  )
}
