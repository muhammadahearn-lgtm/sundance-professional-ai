import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  candidateName?: string
  jobTitle?: string
  company?: string
  revision?: number
  salary?: string
  bonus?: string
  equity?: string
  startDate?: string
  respondBy?: string
  note?: string
  url?: string
}

const OfferCandidate = ({ candidateName, jobTitle = 'the role', company, revision = 1, salary, bonus, equity, startDate, respondBy, note, url }: Props) => {
  const updated = revision > 1
  const forJob = company ? `${jobTitle} at ${company}` : jobTitle
  const rows: [string, string | undefined][] = [['Base salary', salary], ['Signing bonus', bonus], ['Equity', equity], ['Start date', startDate], ['Respond by', respondBy]]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{updated ? `Updated offer terms for ${forJob}` : `You received a job offer for ${forJob}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Sundance Professionals</Text>
          <Heading style={h1}>{updated ? 'Your offer has been updated' : 'You received a job offer!'}</Heading>
          <Text style={text}>{candidateName ? `Hi ${candidateName}, ` : ''}{updated ? `the hiring team revised the offer for ${forJob}.` : `congratulations! The hiring team extended a formal offer for ${forJob}.`}</Text>
          <Section style={card}>
            {rows.filter(([, v]) => v).map(([k, v]) => (
              <Text key={k} style={row}><span style={label}>{k}</span><br />{v}</Text>
            ))}
          </Section>
          {note ? (
            <Section style={quote}><Text style={quoteLabel}>Note from the recruiter</Text><Text style={quoteText}>{note}</Text></Section>
          ) : null}
          {url ? <Section style={{ margin: '28px 0' }}><Button href={url} style={button}>Review & Respond to Offer</Button></Section> : null}
          <Text style={muted}>You can accept, decline, or start a discussion from your application on Sundance Professionals.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OfferCandidate,
  subject: (d: Record<string, any>) => {
    const job = d['company'] ? `${d['jobTitle']} at ${d['company']}` : d['jobTitle'] ?? 'your application'
    return (d['revision'] ?? 1) > 1 ? `Updated offer terms: ${job}` : `Job offer: ${job}`
  },
  displayName: 'Offer extended / revised (to candidate)',
  previewData: { candidateName: 'Muhammad', jobTitle: 'Senior Data Engineer', company: 'Acme Corp', revision: 1, salary: '$150,000', bonus: '$10,000', equity: '0.1% options, 4-year vest', startDate: 'Nov 2, 2026', respondBy: 'Oct 16, 2026', note: "We'd love for you to join us.", url: 'https://sundanceprofessionals.com/candidate/applications' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 16px' }
const card = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '6px 18px', margin: '0 0 16px' }
const row = { fontSize: '16px', fontWeight: 700, color: '#151a33', margin: '10px 0' }
const label = { fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const quote = { backgroundColor: '#f8fafc', borderLeft: '4px solid #2f5be0', borderRadius: '6px', padding: '12px 16px', margin: '0 0 8px' }
const quoteLabel = { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '0 0 4px' }
const quoteText = { fontSize: '15px', color: '#151a33', lineHeight: '1.5', margin: '0', whiteSpace: 'pre-line' as const }
const button = { backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
