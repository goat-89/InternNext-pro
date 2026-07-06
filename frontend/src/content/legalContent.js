export const legalReviewStatus = {
  version: 'Review draft 1.0',
  effectiveDate:
    'Pending professional legal approval',
  notice:
    'This document is a production-ready content structure, not approved legal advice. The operating entity, registered address, grievance officer, jurisdiction, retention schedule, and effective date must be completed and reviewed by qualified counsel before launch.',
}

export const legalDocuments = {
  terms: {
    title: 'Terms of Service',
    summary:
      'Rules for accessing InternNext as a student, employer, administrator, or public visitor.',
    sections: [
      {
        title: 'Platform role',
        paragraphs: [
          'InternNext provides technology for internship discovery, applications, employer hiring workflows, support, and optional paid plans. InternNext is not an employer, educational institution, recruitment guarantee, or party to an employment relationship unless the final operating entity expressly agrees otherwise in writing.',
        ],
      },
      {
        title: 'Accounts and eligibility',
        bullets: [
          'Provide accurate, current information and keep authentication methods secure.',
          'Use only the account role assigned through trusted platform records.',
          'Do not share accounts, impersonate another person, or create unauthorized administrator access.',
          'Additional guardian or age-related terms must be finalized before allowing users who cannot legally consent for themselves.',
        ],
      },
      {
        title: 'Marketplace conduct',
        bullets: [
          'Students must submit truthful profiles, applications, qualifications, and documents.',
          'Employers must offer legitimate opportunities and describe compensation, location, eligibility, and responsibilities accurately.',
          'No user may demand candidate payments, publish deceptive opportunities, scrape private data, or bypass platform security.',
          'Selection, rejection, interview, and offer decisions remain the employer responsibility.',
        ],
      },
      {
        title: 'Paid services',
        paragraphs: [
          'Plan features, duration, price, taxes, limits, cancellation, and refund eligibility are shown before purchase. Payment success is recognized only after server-side verification. Paid services do not guarantee selection, interviews, employment, placement, or business outcomes.',
        ],
      },
      {
        title: 'Moderation and termination',
        paragraphs: [
          'Access may be restricted for security, fraud prevention, legal compliance, policy violations, or material risk to users. Final notice, appeal, evidence-preservation, suspension, and termination procedures require legal review before publication.',
        ],
      },
      {
        title: 'Disclaimers and disputes',
        paragraphs: [
          'Opportunity details and user-provided information may change. Users should independently evaluate employers, candidates, interviews, links, documents, and offers. Warranty limitations, liability limits, governing law, jurisdiction, and dispute procedures must be completed for the final operating entity.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    summary:
      'How InternNext proposes to collect, use, disclose, secure, retain, and delete personal data.',
    sections: [
      {
        title: 'Data collected',
        bullets: [
          'Account and contact details, role, verification state, and authentication identifiers.',
          'Student education, skills, preferences, applications, resumes, portfolios, and interview information.',
          'Employer profile, company, listing, applicant-management, verification, and support information.',
          'Payment references, plan status, invoices, webhook outcomes, and billing contact details. Full card credentials are handled by the payment provider and should not be stored by InternNext.',
          'Security, device, operational, audit, support, and notification records needed to operate and protect the service.',
        ],
      },
      {
        title: 'Purposes',
        bullets: [
          'Provide authentication, profiles, opportunity discovery, applications, hiring workflows, billing, support, and notifications.',
          'Verify roles, enforce platform rules, prevent abuse, investigate incidents, and comply with lawful obligations.',
          'Improve reliability and product performance using privacy-limited operational information.',
          'Send optional marketing only where a valid preference or other lawful basis applies.',
        ],
      },
      {
        title: 'Sharing and processors',
        paragraphs: [
          'Data may be shared with authorized students, employers, administrators, infrastructure providers, authentication providers, payment providers, email or messaging providers, professional advisers, and lawful authorities only for defined purposes. A final processor list, transfer assessment, and contractual safeguards must be approved before launch.',
        ],
      },
      {
        title: 'Retention and security',
        paragraphs: [
          'Access controls, Row Level Security, private Storage, audit logs, encryption in transit, secret separation, and incident procedures reduce risk but cannot eliminate it. A documented retention schedule must define how long account, application, payment, support, audit, notification, and backup records remain available.',
        ],
      },
      {
        title: 'Choices and rights',
        bullets: [
          'Correct profile information through available settings or support.',
          'Control supported notification and visibility preferences.',
          'Request account deletion through student or employer settings.',
          'Request access, correction, erasure, grievance handling, consent withdrawal, or nomination where applicable after the final legal workflow is approved.',
        ],
      },
      {
        title: 'Children and changes',
        paragraphs: [
          'Age-gating, guardian consent, child-safety controls, and restricted processing must be finalized before knowingly serving children. Material privacy changes should be communicated through an appropriate notice and version history.',
        ],
      },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    summary:
      'Browser storage used for authentication, preferences, security, and future consent-managed analytics.',
    sections: [
      {
        title: 'Current essential storage',
        paragraphs: [
          'InternNext uses browser storage and Supabase session mechanisms needed to keep users signed in, refresh sessions, protect authentication flows, remember interface preferences, and maintain essential application state.',
        ],
      },
      {
        title: 'Optional technologies',
        paragraphs: [
          'Analytics, advertising, personalization, or third-party tracking must not be described as active unless actually configured. Any future non-essential technology requires an inventory, purpose, provider, duration, consent treatment, and withdrawal method.',
        ],
      },
      {
        title: 'Managing storage',
        paragraphs: [
          'Users can sign out and use browser controls to remove stored data. Removing essential session storage may sign the user out or prevent protected features from working.',
        ],
      },
      {
        title: 'Production requirement',
        paragraphs: [
          'A consent interface and preference record must be implemented before enabling non-essential cookies or similar tracking technologies where consent is required.',
        ],
      },
    ],
  },
  refund: {
    title: 'Refund and Cancellation Policy',
    summary:
      'Draft rules for paid plans, duplicate charges, failed payments, cancellation, and refund review.',
    sections: [
      {
        title: 'Before purchase',
        paragraphs: [
          'The checkout page should show plan features, limits, duration, total price, taxes, and renewal behavior before payment. Payment is complete only after provider and server-side verification.',
        ],
      },
      {
        title: 'Failed or duplicate payments',
        paragraphs: [
          'A failed payment does not activate a plan. Users should report duplicate debits or a debit without plan activation through the payment-support category and include the platform order reference, payment reference, amount, and date. Do not send card numbers, CVV, OTPs, or banking passwords.',
        ],
      },
      {
        title: 'Cancellation',
        paragraphs: [
          'Cancellation stops future service only according to the plan terms shown at purchase. Current code supports entitlement status and refund recording, but automatic recurring-billing cancellation terms must match the final Razorpay configuration.',
        ],
      },
      {
        title: 'Refund review',
        paragraphs: [
          'Eligibility windows, partial-use treatment, taxes, promotional purchases, service delivery, processing time, and non-refundable categories require approval by the operating entity and counsel. Approved refunds should return through the original payment method where supported.',
        ],
      },
      {
        title: 'Disputes',
        paragraphs: [
          'Contact support before initiating a payment dispute so the transaction can be traced. Nothing in this draft is intended to remove non-waivable consumer rights.',
        ],
      },
    ],
  },
  employer: {
    title: 'Employer Terms',
    summary:
      'Additional responsibilities for companies, recruiters, listings, and candidate data.',
    sections: [
      {
        title: 'Authority and verification',
        bullets: [
          'Use employer access only when authorized to represent the stated organization.',
          'Provide accurate company, domain, registration, contact, and verification information.',
          'Do not misrepresent company identity, opportunity approval, compensation, location, or hiring authority.',
        ],
      },
      {
        title: 'Opportunity standards',
        bullets: [
          'Publish genuine internships with clear responsibilities, eligibility, duration, work mode, compensation, and deadlines.',
          'Do not require candidates to pay application, training, equipment, security, or placement fees as a condition of consideration.',
          'Do not publish discriminatory, illegal, unsafe, deceptive, or unrelated opportunities.',
        ],
      },
      {
        title: 'Candidate data',
        paragraphs: [
          'Candidate profiles, resumes, contact details, notes, and applications may be used only for authorized hiring activity. Access must be limited to approved personnel and must not be sold, scraped, repurposed, or retained without a legitimate need.',
        ],
      },
      {
        title: 'Decisions and communications',
        paragraphs: [
          'Employers remain responsible for lawful, fair, and human-reviewed hiring decisions. Internal notes must remain private. Interview links, assignments, offers, and rejection communications must be professional and safe.',
        ],
      },
      {
        title: 'Moderation and plans',
        paragraphs: [
          'Company and internship approval, listing limits, applicant access, analytics, featured placement, and support priority may depend on verification and active entitlements. Suspicious activity may be held for review.',
        ],
      },
    ],
  },
  safety: {
    title: 'Student Safety Guidelines',
    summary:
      'Practical checks for evaluating opportunities, interviews, assignments, and offers.',
    sections: [
      {
        title: 'Never pay for consideration',
        paragraphs: [
          'Treat requests for application fees, deposits, equipment payments, paid training, gift cards, cryptocurrency, or personal transfers as warning signs. Report the listing and stop communication until verified.',
        ],
      },
      {
        title: 'Protect personal information',
        bullets: [
          'Do not share OTPs, passwords, CVV, banking passwords, government-account credentials, or remote-device access.',
          'Share identity, tax, or banking documents only when necessary, after verifying the employer and purpose.',
          'Use platform workflows where available and review links before opening them.',
        ],
      },
      {
        title: 'Interview safety',
        bullets: [
          'Confirm the interviewer, company domain, role, time, location, and meeting link.',
          'For in-person meetings, use a legitimate workplace or safe public setting and tell a trusted person where you are going.',
          'Leave and report conversations involving harassment, coercion, discrimination, illegal work, or unsafe requests.',
        ],
      },
      {
        title: 'Offers and reporting',
        paragraphs: [
          'Verify offer terms, compensation, duties, location, joining date, and company identity before accepting. Report suspicious listings or communications through Contact using the student-support category.',
        ],
      },
    ],
  },
  community: {
    title: 'Community Guidelines',
    summary:
      'Standards for respectful, accurate, safe, and professional platform participation.',
    sections: [
      {
        title: 'Expected conduct',
        bullets: [
          'Communicate professionally and provide accurate information.',
          'Respect privacy, consent, intellectual property, and equal opportunity.',
          'Use reporting and support tools responsibly.',
        ],
      },
      {
        title: 'Not allowed',
        bullets: [
          'Harassment, threats, hate, sexual exploitation, stalking, or discrimination.',
          'Fraud, impersonation, phishing, spam, malware, scraping, credential theft, or payment solicitation.',
          'False qualifications, fabricated companies, deceptive listings, manipulated documents, or unauthorized confidential material.',
          'Attempts to bypass access controls, plan limits, moderation, or account restrictions.',
        ],
      },
      {
        title: 'Enforcement',
        paragraphs: [
          'Reports may lead to content restriction, verification, warning, suspension, removal, evidence preservation, or referral where legally required. Final notice and appeal procedures require legal approval.',
        ],
      },
    ],
  },
  deletion: {
    title: 'Data Deletion Policy',
    summary:
      'How account-deletion requests work and which records may need limited retention.',
    sections: [
      {
        title: 'Requesting deletion',
        paragraphs: [
          'Students and employers can request deletion from their settings by completing the confirmation step. Users who cannot access an account may contact support from the registered address and provide enough information for secure verification.',
        ],
      },
      {
        title: 'What deletion changes',
        paragraphs: [
          'The account is moved into the platform deletion workflow and protected access is removed. Associated profile, application, company, listing, notification, and Storage treatment depends on database relationships, legal retention, fraud prevention, disputes, backups, and the final deletion procedure.',
        ],
      },
      {
        title: 'Records that may remain',
        bullets: [
          'Payment, tax, refund, fraud-prevention, security, audit, support, dispute, and legal-compliance records where retention is required or justified.',
          'Backup copies until the documented backup cycle expires.',
          'De-identified or aggregated information that no longer identifies the user.',
        ],
      },
      {
        title: 'Before production',
        paragraphs: [
          'The operating entity must approve verification steps, completion targets, retention periods, backup deletion, legal holds, and confirmation notices.',
        ],
      },
    ],
  },
  grievance: {
    title: 'Grievance and Support Information',
    summary:
      'How to raise account, safety, privacy, payment, listing, or platform complaints.',
    sections: [
      {
        title: 'Submit a grievance',
        paragraphs: [
          'Use the Contact page and choose the closest category. Include the account email, relevant listing or order reference, dates, and a concise description. Never include passwords, OTPs, CVV, full card numbers, access tokens, or unnecessary identity documents.',
        ],
      },
      {
        title: 'Urgent safety and security',
        paragraphs: [
          'For suspected account compromise, harmful content, fraud, candidate-payment demands, or immediate safety concerns, identify the issue clearly in the subject. Contact appropriate emergency or law-enforcement services where there is immediate danger.',
        ],
      },
      {
        title: 'Escalation details required',
        paragraphs: [
          'Before launch, publish the legal entity name, grievance officer or designated contact, registered office, support email, acknowledgement target, resolution target, escalation path, and any legally required appellate mechanism.',
        ],
      },
      {
        title: 'Payment complaints',
        paragraphs: [
          'Provide the InternNext order reference, provider payment reference, amount, and payment date. Do not send sensitive payment credentials.',
        ],
      },
    ],
  },
  acceptableUse: {
    title: 'Acceptable Use Policy',
    summary:
      'Technical and operational restrictions protecting users and platform infrastructure.',
    sections: [
      {
        title: 'Permitted use',
        paragraphs: [
          'Use InternNext for legitimate internship discovery, applications, hiring, account administration, paid-plan access, and support according to your assigned role.',
        ],
      },
      {
        title: 'Prohibited technical activity',
        bullets: [
          'Unauthorized access, probing, vulnerability exploitation, denial of service, malware, automated scraping, credential attacks, or security-control bypass.',
          'Forging payments, subscriptions, entitlements, notifications, roles, approvals, audit records, or another user identity.',
          'Uploading malicious, unlawful, deceptive, infringing, or unnecessary sensitive content.',
          'Reverse engineering or automated extraction except where expressly permitted by law or written authorization.',
        ],
      },
      {
        title: 'Automation and integrations',
        paragraphs: [
          'Automated access, bulk operations, external integrations, security testing, and research require written authorization and must follow rate limits, privacy safeguards, and documented scopes.',
        ],
      },
      {
        title: 'Response',
        paragraphs: [
          'InternNext may rate-limit, block, investigate, preserve evidence, suspend access, or notify affected parties and authorities where appropriate. Responsible security reports should use the published grievance channel until a dedicated security address is approved.',
        ],
      },
    ],
  },
}

export const legalLinks = [
  ['Privacy Policy', '/privacy'],
  ['Terms of Service', '/terms'],
  ['Cookie Policy', '/cookies'],
  ['Refund Policy', '/refund'],
  ['Employer Terms', '/employer-terms'],
  ['Student Safety', '/student-safety'],
  ['Community Guidelines', '/community-guidelines'],
  ['Data Deletion', '/data-deletion'],
  ['Grievance', '/grievance'],
  ['Acceptable Use', '/acceptable-use'],
]
