import { db, files, auth, isLocalDev } from '@foundrydb/runtime'

export default function HomePage() {
  const env = isLocalDev() ? 'development' : 'production'
  const dbUrl = (() => {
    try {
      const raw = db.url()
      // Redact password for display
      return raw.replace(/:([^:@]+)@/, ':***@')
    } catch {
      return 'DATABASE_URL not set'
    }
  })()
  const filesEndpoint = (() => {
    try {
      return files.config().endpoint
    } catch {
      return 'S3_ENDPOINT not set'
    }
  })()
  const authIssuer = (() => {
    try {
      return auth.issuerUrl()
    } catch {
      return 'AUTHD_ISSUER_URL not set'
    }
  })()

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        Welcome to your FoundryDB app
      </h1>
      <p style={{ color: '#666', marginBottom: 32 }}>
        Running in <strong>{env}</strong> mode.
      </p>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Resource status</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 0', color: '#888', width: 120 }}>Database</td>
              <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{dbUrl}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '8px 0', color: '#888' }}>Files</td>
              <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{filesEndpoint}</td>
            </tr>
            <tr>
              <td style={{ padding: '8px 0', color: '#888' }}>Auth issuer</td>
              <td style={{ padding: '8px 0', fontFamily: 'monospace' }}>{authIssuer}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Next steps</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.8, paddingLeft: 20, color: '#444' }}>
          <li>Add SQL migrations in <code>migrations/</code> and run <code>foundry migrate</code></li>
          <li>Call <code>db.connect()</code> to get a pg Pool in your API routes</li>
          <li>Use <code>files.client()</code> to upload/download with S3-compatible storage</li>
          <li>Protect pages with tokens verified against <code>auth.issuerUrl()</code></li>
          <li>Run <code>foundry deploy</code> when you are ready to go live</li>
        </ul>
      </section>
    </main>
  )
}
