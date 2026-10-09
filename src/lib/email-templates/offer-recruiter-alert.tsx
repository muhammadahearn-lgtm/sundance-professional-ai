import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

type Kind = 'accepted' | 'declined' | 'negotiation'
interface Props {
  recruiterName?: string
  candidateName?: string
  jobTitle?: string
  kind?: Kind
  salary?: string
  startDate?: string
  reason?: string
  url?: string
}

const TITLES: Record<Kind, (c: string, j: string) => string> = {
  accepted: (c, j) => `${c} accepted your offer for ${j}`,
  declined: (c, j) => `${c} declined your offer for ${j}`,
  negotiation: (c, j) => `${c} wants to discuss the offer for ${j}`,
}

const OfferRecruiterAlert = ({ recruiterName, candidateName = 'Your candidate', jobTitle = 'your job', kind = 'accepted', salary, startDate, reason, url }: Props) => {
  const title = TITLES[kind](candidateName, jobTitle)
  const body = kind === 'accepted'
    ? 'Congratulations on the hire! The job has been closed and the other open applicants were updated.'
    : kind === 'declined'
      ? 'The offer is closed. You can review your other finalists in the pipeline.'
      : 'They started a conversation about the terms. Reply in Messages, then revise the offer if needed.'
  const cta = kind === 'negotiation' ? 'Open Conversation' : 'Open Pipeline'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Sundance Professionals</Text>
          <Heading style={h1}>{kind === 'accepted' ? '🎉 ' : ''}{title}</Heading>
          <Text style={text}>{recruiterName ? `Hi ${recruiterName}, ` : ''}{body}</Text>
          {salary || startDate ? (
            <Section style={card}><Text style={meta}>{[salary ? `Offer: ${salary}` : null, startDate ? `Start: ${startDate}` : null].filter(Boolean).join(' · ')}</Text></Section>
          ) : null}
          {reason ? (
            <Section style={quote}><Text style={quoteLabel}>{kind === 'declined' ? 'Their reason' : 'Their message'}</Text><Text style={quoteText}>“{reason}”</Text></Section>
          ) : null}
          {url ? <Section style={{ margin: '28px 0' }}><Button href={url} style={button}>{cta}</Button></Section> : null}
          <Text style={muted}>You received this because you sent an offer on Sundance Professionals.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: OfferRecruiterAlert,
  subject: (d: Record<string, any>) => TITLES[(d['kind'] as Kind) ?? 'accepted'](d['candidateName'] ?? 'Your candidate', d['jobTitle'] ?? 'your job'),
  displayName: 'Offer response (to recruiter)',
  previewData: { recruiterName: 'Alex', candidateName: 'Muhammad A.', jobTitle: 'Senior Data Engineer', kind: 'accepted', salary: '$150,000', startDate: 'Nov 2, 2026', url: 'https://sundanceprofessionals.com/recruiter/pipeline/123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 16px' }
const card = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', margin: '0 0 16px' }
const meta = { fontSize: '15px', fontWeight: 600, color: '#151a33', margin: '0' }
const quote = { backgroundColor: '#f8fafc', borderLeft: '4px solid #2f5be0', borderRadius: '6px', padding: '12px 16px', margin: '0 0 8px' }
const quoteLabel = { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '0 0 4px' }
const quoteText = { fontSize: '15px', color: '#151a33', fontStyle: 'italic' as const, lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
