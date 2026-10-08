import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

// Privacy-safe: callers pass first name + last initial only. No email/phone/links.
export interface CompareEmailCandidate {
  name: string
  jobTitle?: string
  employer?: string
  location?: string
  years?: number | null
  availability?: string
  arrangement?: string
  salary?: string
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
const tier = (s: number) => (s >= 90 ? 'Excellent Match' : s >= 75 ? 'Strong Match' : s >= 60 ? 'Moderate Match' : 'Weak Match')
const tone = (s: number) => (s >= 90 ? { bg: '#e7f6ec', fg: '#1f8a4c' } : s >= 75 ? { bg: '#e8eefc', fg: '#2f5be0' } : s >= 60 ? { bg: '#fdf3e1', fg: '#a86a07' } : { bg: '#f1f5f9', fg: '#475569' })
const pct = (s?: number | null) => (s == null ? '—' : `${Math.round(s)}%`)

const Best = () => <span style={best}>🏆 BEST</span>

const CompareShare = ({ recipientName, jobTitle = 'this role', candidates = [] }: Props) => {
  const sorted = [...candidates].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  const top = sorted[0]
  const lead = top?.score != null && sorted[1]?.score != null ? Math.round(top.score - (sorted[1].score ?? 0)) : null
  const maxYears = Math.max(...sorted.map((c) => c.years ?? -1))
  const yearsBest = sorted.filter((c) => c.years === maxYears).length === 1 ? maxYears : null
  const scope = `for ${jobTitle}`
  const w = `${Math.floor(100 / Math.max(sorted.length, 1))}%`

  const rows: [string, (c: CompareEmailCandidate, i: number) => React.ReactNode][] = [
    ['Overall Match', (c, i) => c.score == null ? <span style={chip('#f1f5f9', '#475569')}>No score</span> : (
      <>
        <span style={chip(tone(c.score).bg, tone(c.score).fg)}>{pct(c.score)} · {tier(c.score)}</span>
        {i === 0 && sorted.length > 1 ? <Best /> : null}
        <div style={sub}>{scope}</div>
      </>
    )],
    ['Current Role', (c) => c.jobTitle || '—'],
    ['Employer', (c) => c.employer || '—'],
    ['Location', (c) => c.location || '—'],
    ['Experience', (c) => c.years == null ? '—' : <>{c.years} yrs{yearsBest != null && c.years === yearsBest && sorted.length > 1 ? <Best /> : null}</>],
    ['Availability', (c) => c.availability || '—'],
    ['Work Arrangement', (c) => c.arrangement || '—'],
    ['Desired Minimum Salary', (c) => c.salary || '—'],
    ['Strengths', (c) => c.strengths?.length ? c.strengths.slice(0, 4).map((s) => <div key={s} style={{ fontSize: '12px' }}>✓ {s}</div>) : '—'],
  ]

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Candidate comparison for ${jobTitle}${top ? ` — AI top pick: ${top.name}` : ''}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>Sundance Professionals</Text>
          <Heading style={h1}>Candidate comparison — {jobTitle}</Heading>
          <Text style={text}>{recipientName ? `Hi ${recipientName}, y` : 'Y'}our recruiter would like your opinion on these candidates.</Text>

          {top ? (
            <Section style={spot}>
              <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}><tbody><tr>
                <td style={{ width: '104px', verticalAlign: 'middle' }}>
                  <table role="presentation" width={92} cellPadding={0} cellSpacing={0} style={ring}><tbody><tr>
                    <td align="center" valign="middle" width={92} height={86} style={{ textAlign: 'center', verticalAlign: 'middle', padding: 0 }}>
                      <div style={crown}>♛</div>
                      <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f8a4c', lineHeight: '24px', margin: 0 }}>{pct(top.score)}</div>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: '#334155', letterSpacing: '0.5px', lineHeight: '12px', margin: 0 }}>MATCH</div>
                    </td>
                  </tr></tbody></table>
                </td>
                <td style={{ verticalAlign: 'middle', paddingLeft: '14px' }}>
                  <span style={aiTag}>✦ AI TOP PICK</span>
                  <table role="presentation" cellPadding={0} cellSpacing={0} style={{ marginTop: '8px' }}><tbody><tr>
                    <td style={{ verticalAlign: 'middle' }}><div style={{ ...avatar, width: '40px', height: '40px', lineHeight: '40px' }}>{initials(top.name)}</div></td>
                    <td style={{ verticalAlign: 'middle', paddingLeft: '10px' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#151a33' }}>{top.name}</div>
                      <div style={{ fontSize: '13px', color: '#64748b' }}>{[top.jobTitle, top.years != null ? `${top.years} yrs experience` : ''].filter(Boolean).join(' · ')}</div>
                    </td>
                  </tr></tbody></table>
                  <div style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>
                    {top.score != null ? <span style={{ color: '#1f8a4c', fontWeight: 600 }}>{tier(top.score)}</span> : null}
                    {lead != null && lead > 0 ? ` · leads the next option by ${lead} pts` : ''} · strongest of {sorted.length} candidates {scope}
                  </div>
                </td>
              </tr></tbody></table>
              {top.strengths?.length ? (
                <div style={{ marginTop: '14px' }}>
                  {top.strengths.slice(0, 3).map((s) => <span key={s} style={reason}>🏆 {s}</span>)}
                </div>
              ) : null}
            </Section>
          ) : null}

          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={tableBox}>
            <tbody>
              <tr>
                {sorted.map((c, i) => (
                  <td key={`h-${i}`} style={{ ...cell(i), width: w, backgroundColor: i === 0 ? '#f3f6fe' : '#ffffff', borderTop: 'none' }}>
                    <div style={avatar}>{initials(c.name)}</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#151a33', marginTop: '8px' }}>{c.name}</div>
                    <span style={i === 0 ? rankTop : rankPill}>{i === 0 ? '✦ ' : ''}#{i + 1} · {pct(c.score)}</span>
                  </td>
                ))}
              </tr>
              {rows.map(([label, fn]) => (
                <tr key={label}>
                  {sorted.map((c, i) => (
                    <td key={`${label}-${i}`} style={{ ...cell(i), backgroundColor: i === 0 ? '#f3f6fe' : '#ffffff' }}>
                      <div style={rowLabel}>{label}</div>
                      <div style={val}>{fn(c, i)}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <Section style={ask}>
            <Text style={{ ...text, margin: 0, fontWeight: 600, color: '#151a33' }}>Which candidate would you invite to apply for {jobTitle}?</Text>
            <Text style={{ ...text, margin: '4px 0 0' }}>Reply to your recruiter with your pick.</Text>
          </Section>

          <Text style={muted}>For privacy, this comparison shows first names and last initials only. Contact details stay private on Sundance Professionals.</Text>
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
    jobTitle: 'Data Scientist',
    candidates: [
      { name: 'Muhammad A.', jobTitle: 'Data Scientist', employer: 'Sundance Professionals', location: 'Boston, Massachusetts, United States', years: 2, availability: 'Actively Looking', arrangement: 'Hybrid', salary: '$60,000 USD', score: 100, strengths: ['Python (required) matches', 'SQL (required) matches', 'R (required) matches'] },
      { name: 'Jordan T.', jobTitle: 'Data Engineer', employer: '', location: 'Boston, Massachusetts, United States', years: 8, availability: 'Actively Looking', arrangement: 'Remote', salary: '', score: 51, strengths: ['SQL (required) matches'] },
      { name: 'Priya S.', jobTitle: 'Backend Engineer', employer: 'Databricks', location: 'Austin, Texas, United States', years: 4, availability: 'Actively Looking', arrangement: 'Hybrid', salary: '$135,000 USD', score: 33, strengths: [] },
      { name: 'Alex R.', jobTitle: 'Senior Frontend Engineer', employer: 'Stripe', location: 'San Francisco, California, United States', years: 7, availability: 'Actively Looking', arrangement: 'Remote', salary: '$165,000 USD', score: 24, strengths: [] },
    ],
  },
} satisfies TemplateEntry

const chip = (bg: string, fg: string) => ({ display: 'inline-block', backgroundColor: bg, color: fg, fontSize: '12px', fontWeight: 600, borderRadius: '999px', padding: '3px 10px' })
const cell = (i: number) => ({ verticalAlign: 'top' as const, padding: '12px 14px', borderTop: '1px solid #e2e8f0', borderLeft: i > 0 ? '1px solid #e2e8f0' : 'none' })
const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 16px', maxWidth: '760px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 20px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 10px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 20px' }
const spot = { border: '1px solid #dbe4fb', borderRadius: '16px', padding: '20px', margin: '0 0 20px', background: 'linear-gradient(90deg, #f2fbf5 0%, #ffffff 55%, #eef1fe 100%)', backgroundColor: '#f8fafc' }
const ring = { width: '92px', height: '92px', borderRadius: '999px', border: '3px solid #2f5be0', backgroundColor: '#ffffff', borderCollapse: 'separate' as const }
const crown = { fontSize: '14px', lineHeight: '16px', color: '#2f5be0', margin: '0 0 1px' }
const aiTag = { display: 'inline-block', backgroundColor: '#e8eefc', color: '#2f5be0', fontSize: '11px', fontWeight: 700, borderRadius: '999px', padding: '3px 10px', letterSpacing: '0.4px' }
const reason = { display: 'inline-block', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#151a33', fontSize: '13px', borderRadius: '999px', padding: '6px 14px', margin: '0 6px 6px 0' }
const tableBox = { border: '1px solid #e2e8f0', borderRadius: '16px', borderCollapse: 'separate' as const, borderSpacing: 0, overflow: 'hidden' }
const avatar = { width: '36px', height: '36px', lineHeight: '36px', borderRadius: '999px', backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '13px', fontWeight: 700, textAlign: 'center' as const }
const rankTop = { display: 'inline-block', marginTop: '6px', backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '11px', fontWeight: 700, borderRadius: '999px', padding: '2px 8px' }
const rankPill = { ...rankTop, backgroundColor: '#f1f5f9', color: '#334155' }
const rowLabel = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.8px', color: '#64748b', textTransform: 'uppercase' as const, marginBottom: '4px' }
const val = { fontSize: '13px', color: '#151a33', lineHeight: '1.45' }
const sub = { fontSize: '11px', color: '#64748b', marginTop: '3px' }
const best = { display: 'inline-block', marginLeft: '6px', backgroundColor: '#e7f6ec', color: '#1f8a4c', fontSize: '10px', fontWeight: 700, borderRadius: '6px', padding: '1px 6px' }
const ask = { backgroundColor: '#f8fafc', borderRadius: '12px', padding: '14px 16px', margin: '20px 0 16px' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
