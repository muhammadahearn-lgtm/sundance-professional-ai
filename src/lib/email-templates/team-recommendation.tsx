import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Pick { name: string; role?: string; score?: number | null }
interface Props {
  recruiterName?: string
  reviewerName?: string
  reviewerRole?: string
  kind?: 'recommend' | 'pass_all'
  candidates?: Pick[]
  jobTitle?: string
  company?: string
  note?: string
  pipelineUrl?: string
}

const names = (c: Pick[]) => {
  const n = c.map((x) => x.name)
  if (!n.length) return 'a candidate'
  return n.length === 1 ? n[0]! : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`
}

const TeamRecommendation = ({ recruiterName, reviewerName = 'A hiring team member', reviewerRole, kind = 'recommend', candidates = [], jobTitle = 'your job', company, note, pipelineUrl }: Props) => {
  const pass = kind === 'pass_all'
  const who = reviewerRole ? `${reviewerName} (${reviewerRole})` : reviewerName
  const forJob = company ? `${jobTitle} at ${company}` : jobTitle
  const title = pass ? `${reviewerName} requested more candidates` : `${reviewerName} recommended ${names(candidates)}`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${title} for ${jobTitle}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Sundance Professionals</Text>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>
            {recruiterName ? `Hi ${recruiterName}, ` : ''}
            {pass
              ? `${who} reviewed your comparison for ${forJob} and felt none of the candidates fit. Consider shortlisting a fresh batch.`
              : `${who} reviewed your comparison and picked ${candidates.length > 1 ? `${candidates.length} candidates` : 'a candidate'} for ${forJob}.`}
          </Text>
          {!pass ? candidates.map((c) => (
            <Section key={c.name} style={card}>
              <Text style={cardName}>{c.name}</Text>
              <Text style={cardMeta}>{[c.role, c.score != null ? `${c.score}% Match` : null].filter(Boolean).join(' · ')}</Text>
            </Section>
          )) : null}
          {note ? (
            <Section style={quote}>
              <Text style={quoteLabel}>Their note</Text>
              <Text style={quoteText}>“{note}”</Text>
            </Section>
          ) : null}
          {pipelineUrl ? (
            <Section style={{ margin: '28px 0' }}>
              <Button href={pipelineUrl} target="_blank" style={button}>{`Open ${jobTitle} Pipeline`}</Button>
            </Section>
          ) : null}
          <Text style={muted}>You received this because you shared a candidate comparison with your hiring team on Sundance Professionals.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TeamRecommendation,
  subject: (d: Record<string, any>) => {
    const job = d['company'] ? `${d['jobTitle']} · ${d['company']}` : d['jobTitle'] ?? 'your job'
    return d['kind'] === 'pass_all'
      ? `${d['reviewerName'] ?? 'Your hiring team'} requested more candidates for ${job}`
      : `${d['reviewerName'] ?? 'Your hiring team'} recommended ${names(d['candidates'] ?? [])} for ${job}`
  },
  displayName: 'Hiring team recommendation (to recruiter)',
  previewData: {
    recruiterName: 'Alex', reviewerName: 'Jordan Smith', reviewerRole: 'Hiring Manager', kind: 'recommend',
    candidates: [{ name: 'Muhammad A.', role: 'Data Scientist', score: 100 }, { name: 'Priya S.', role: 'Backend Engineer', score: 74 }],
    jobTitle: 'Data Scientist', company: 'Acme Corp',
    note: 'Loved the PyTorch background, let’s fast-track.', pipelineUrl: 'https://sundanceprofessionals.com/recruiter/pipeline/123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 16px' }
const card = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 18px', margin: '0 0 16px' }
const cardName = { fontSize: '17px', fontWeight: 700, color: '#151a33', margin: '0' }
const cardMeta = { fontSize: '14px', color: '#64748b', margin: '4px 0 0' }
const quote = { backgroundColor: '#f8fafc', borderLeft: '4px solid #2f5be0', borderRadius: '6px', padding: '12px 16px', margin: '0 0 8px' }
const quoteLabel = { fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em', margin: '0 0 4px' }
const quoteText = { fontSize: '15px', color: '#151a33', fontStyle: 'italic' as const, lineHeight: '1.5', margin: '0' }
const button = { backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
