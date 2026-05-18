import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'rising-posts',
  eventKey: process.env.INNGEST_EVENT_KEY,
})
