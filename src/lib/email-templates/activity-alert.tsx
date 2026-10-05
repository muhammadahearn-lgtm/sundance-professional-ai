import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  title?: string
  message?: string
  actionUrl?: string
  actionLabel?: string
}

const ActivityAlert = ({ title, message, actionUrl, actionLabel }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{title || 'You have a new update on Sundance Professionals'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>Sundance Professionals</Text>
        <Heading style={h1}>{title || 'You have a new update'}</Heading>
        {message ? <Text style={text}>{message}</Text> : null}
        {actionUrl ? (
          <Section style={{ margin: '28px 0' }}>
            <Button href={actionUrl} style={button}>{actionLabel || 'Open Sundance Professionals'}</Button>
          </Section>
        ) : null}
        <Text style={muted}>
          You received this because of activity on your Sundance Professionals account. You can choose which alerts you get in your notification settings.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ActivityAlert,
  subject: (d: Record<string, any>) => (d['title'] ? `${d['title']} — Sundance Professionals` : 'New update on Sundance Professionals'),
  displayName: 'Activity alert (applications, status updates, messages)',
  previewData: {
    title: 'New application',
    message: 'Jane Doe applied to Senior Frontend Engineer. Review their profile and match score.',
    actionUrl: 'https://sundanceprofessionals.com/recruiter/applications/123',
    actionLabel: 'Review application',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontSize: '14px', fontWeight: 700, color: '#2f5be0', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 700, color: '#151a33', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#3d4366', lineHeight: '1.6', margin: '0 0 8px' }
const button = { backgroundColor: '#2f5be0', color: '#ffffff', fontSize: '15px', fontWeight: 600, borderRadius: '10px', padding: '12px 22px', textDecoration: 'none' }
const muted = { fontSize: '12px', color: '#8a8fa8', lineHeight: '1.5', margin: '24px 0 0' }
