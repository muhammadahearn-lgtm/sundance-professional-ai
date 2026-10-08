import * as React from 'react'
import { Body, Button, Column, Container, Head, Heading, Html, Preview, Row, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

// Privacy-safe: callers pass first name + last initial only. No email/phone/links/salary.
export interface CompareEmailCandidate {
  name: string
  jobTitle?: string
  years?: number | null
  score?: number | null
  strengths?: string[]
}

interface Props {
  recipientName?: string
  jobTitle?: string
  candidates?: CompareEmailCandidate[]
  actionUrl?: string
}

const initials = (n: string) => n.split(/\s+/).map((p) => p.charAt(0)).join('').slice(0, 2).toUpperCase() || 'C'
const scoreText = (s?: number | null) => (s == null ? 'No score yet' : `${Math.round(s)}% match`)
const meta = (c: CompareEmailCandidate) => [c.jobTitle, c.years != null ? `${c.years} yrs experience` : ''].filter(Boolean).join(' · ')

const Pills = ({ items }: { items?: string[] }) =>
  items && items.length ? (
    <Text style={{ margin: '10px 0 0', lineHeight: '26px' }}>
      {items.slice(0, 3).map((s) => (
        <span key={s} style={pill}>{s}</span>
      ))}
    </Text>
  ) : null

const Card = ({ c, rank }: { c: CompareEmailCandidate; rank: number }) => (
  <Section style={card}>
    <Row>
      <Column style={{ width: '48px', verticalAlign: 'top' }}>
        <div style={avatar}>{initials(c.name)}</div>
      </Column>
      <Column style={{ verticalAlign: 'top' }}>
        <Text style={rankBadge}>#{rank}</Text>
        <Text style={cardName}>{c.name}</Text>
        {meta(c) ? <Text style={cardMeta}>{meta(c)}</Text> : null}
      </Column>
      <Column style={{ width: '96px', verticalAlign: 'top', textAlign: 'right' as const }}>
        <Text style={scoreChip}>{scoreText(c.score)}</Text>
      </Column>
    </Row>
    <Pills items={c.strengths} />
  </Section>
)

const CompareShare = ({ recipientName, jobTitle = 'this role', candidates = [], actionUrl }: Props) => {
  const sorted = [...candidates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const top = sorted[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Candidate comparison for ${jobTitle}${top ? ` — top pick: ${top.name}` : ''}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Sundance Professionals</Text>
          <Heading style={h1}>Candidate comparison — {jobTitle}</Heading>
          <Text style={text}>
            {recipientName ? `Hi ${recipientName}, y` : 'Y'}our recruiter would like your opinion on these candidates.
          </Text>

          {top ? (
            <Section style={spotlight}>
              <Text style={spotLabel}>★ AI TOP PICK</Text>
              <Row>
                <Column style={{ width: '60px', verticalAlign: 'middle' }}>
                  <div style={{ ...avatar, width: '48px', height: '48px', lineHeight: '48px', fontSize: '16px', backgroundColor: '#ffffff', color: '#2f5be0' }}>{initials(top.name)}</div>
                </Column>
                <Column style={{ verticalAlign: 'middle' }}>
                  <Text style={spotName}>{top.name}</Text>
                  {meta(top) ? <Text style={spotMeta}>{meta(top)}</Text> : null}
                </Column>
                <Column style={{ width: '90px', verticalAlign: 'middle', textAlign: 'right' as const }}>
                  <Text style={spotScore}>{top.score != null ? `${Math.round(top.score)}%` : '—'}</Text>
                  <Text style={spotScoreLabel}>match</Text>
                </Column>
              </Row>
              {top.strengths?.length ? (
                <Text style={{ margin: '12px 0 0', lineHeight: '26px' }}>
                  {top.strengths.slice(0, 3).map((s) => (
                    <span key={s} style={spotPill}>{s}</span>
                  ))}
                </Text>
              ) : null}
            </Section>
          ) : null}

          <Text style={sectionLabel}>All candidates, best match first</Text>
          {sorted.map((c, i) => (
            <Card key={`${c.name}-${i}`} c={c} rank={i + 1} />
          ))}

          <Section style={ask}>
            <Text style={{ ...text, margin: 0, fontWeight: 600, color: '#151a33' }}>
              Which candidate would you invite to apply for {jobTitle}?
            </Text>
            <Text style={{ ...text, margin: '4px 0 0' }}>Reply to your recruiter with your pick.</Text>
          </Section>

          {actionUrl ? (
            <Section style={{ margin: '8px 0 0' }}>
              <Button href={actionUrl} style={button}>About Sundance Professionals</Button>
            </Section>
          ) : null}

          <Text style={muted}>
            For privacy, this summary shows first names and last initials only. Contact details stay private on Sundance Professionals.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: CompareShare,
  subject: (d: Record<string, any>) => `Candidate comparison — ${d['jobTitle'] || 'your open role'}`,
  displayName: 'Candidate comparison (hiring team)',
  previewData: {
    recipientName: 'Alex',
    jobTitle: 'Senior Frontend Engineer',
    actionUrl: 'https://sundanceprofessionals.com',
    candidates: [
      { name: 'Muhammad A.', jobTitle: 'Frontend Engineer', years: 7, score: 95, strengths: ['React', 'TypeScript', 'Design systems'] },
      { name: 'Jane D.', jobTitle: 'Web Developer', years: 5, score: 86, strengths: ['Vue', 'Accessibility'] },
      { name: 'Sam K.', jobTitle: 'UI Engineer', years: 4, score: 78, strengths: ['CSS', 'Figma'] },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 24px', maxWidth: '600px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 20px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 10px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 20px' }
const spotlight = { backgroundColor: '#2f5be0', borderRadius: '14px', padding: '18px 20px', margin: '0 0 24px' }
const spotLabel = { fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#dbe4ff', margin: '0 0 10px' }
const spotName = { fontSize: '18px', fontWeight: 700, color: '#ffffff', margin: 0 }
const spotMeta = { fontSize: '13px', color: '#dbe4ff', margin: '2px 0 0' }
const spotScore = { fontSize: '26px', fontWeight: 700, color: '#ffffff', margin: 0, lineHeight: '1' }
const spotScoreLabel = { fontSize: '11px', color: '#dbe4ff', margin: '2px 0 0' }
const spotPill = { display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff', fontSize: '12px', fontWeight: 600, borderRadius: '999px', padding: '3px 10px', marginRight: '6px' }
const sectionLabel = { fontSize: '12px', fontWeight: 700, color: '#8a8fa8', textTransform: 'uppercase' as const, letterSpacing: '0.8px', margin: '0 0 10px' }
const card = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px', margin: '0 0 10px' }
const avatar = { width: '38px', height: '38px', lineHeight: '38px', borderRadius: '999px', backgroundColor: '#e8eefc', color: '#2f5be0', fontSize: '13px', fontWeight: 700, textAlign: 'center' as const }
const rankBadge = { display: 'inline-block', fontSize: '11px', fontWeight: 700, color: '#2f5be0', margin: 0 }
const cardName = { fontSize: '15px', fontWeight: 700, color: '#151a33', margin: '0' }
const cardMeta = { fontSize: '13px', color: '#64748b', margin: '2px 0 0' }
const scoreChip = { display: 'inline-block', backgroundColor: '#eef2ff', color: '#2f5be0', fontSize: '12px', fontWeight: 700, borderRadius: '999px', padding: '4px 10px', margin: 0 }
const pill = { display: 'inline-block', backgroundColor: '#f1f5f9', color: '#334155', fontSize: '12px', borderRadius: '999px', padding: '3px 10px', marginRight: '6px' }
const ask = { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '14px 16px', margin: '14px 0 16px' }
const button = { backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '14px', fontWeight: 600, borderRadius: '10px', padding: '11px 20px', textDecoration: 'none' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
