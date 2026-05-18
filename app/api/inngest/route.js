import { serve } from 'inngest/next'
import { inngest } from '../../../inngest/client'
import { runContentBatch } from '../../../inngest/contentBatch'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runContentBatch],
})
