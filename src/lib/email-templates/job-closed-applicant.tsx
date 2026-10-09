import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  candidateName?: string
  jobTitle?: string
  company?: string
  url?: string
}

const JobClosedApplicant = ({ candidateName, jobTitle = 'the role', company, url = 'https://sundanceprofessionals.com/candidate/jobs' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`An update on your application for ${jobTitle}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Sundance Professionals</Text>
        <Heading style={h1}>An update on your application</Heading>
        <Text style={text}>{candidateName ? `Hi ${candidateName},` : 'Hi there,'}</Text>
        <Text style={text}>
          Thank you for your interest in <strong>{jobTitle}</strong>{company ? ` at ${company}` : ''} and for the time you invested in the process.
          The position has now been filled, so your application will not be moving forward.
        </Text>
        <Text style={text}>This decision is not a reflection of your potential. Your profile stays active, and new roles that match your skills are posted every week.</Text>
        <Section style={{ margin: '28px 0' }}><Button href={url} style={button}>Explore Open Positions</Button></Section>
        <Text style={text}>We wish you every success in your search.</Text>
        <Text style={muted}>You received this because you applied for this role on Sundance Professionals.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: JobClosedApplicant,
  subject: (d: Record<string, any>) => `Update on your application: ${d['jobTitle'] ?? 'the role'}`,
  displayName: 'Position filled (to applicant)',
  previewData: { candidateName: 'Jordan', jobTitle: 'Senior Data Engineer', company: 'Acme Corp', url: 'https://sundanceprofessionals.com/candidate/jobs' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
