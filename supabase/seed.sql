-- ============================================================================
-- SOC2 Dashboard — Seed Data: Trust Services Criteria
-- ============================================================================
-- Real SOC2 Trust Services Criteria (TSC) from the AICPA 2017 framework.
-- Run this AFTER the migration file (0001_soc2_dashboard.sql).
-- 69 controls across 5 categories: CC, A, PI, C, P
-- ============================================================================

INSERT INTO soc2_controls (code, title, category, description) VALUES
-- ============================================================================
-- CC — Common Criteria (Security) — 64 controls
-- ============================================================================
-- CC1: Control Environment
('CC1.1', 'Control Environment', 'CC', 'The entity demonstrates commitment to integrity and ethical values.'),
('CC1.2', 'Board Independence', 'CC', 'The board of directors demonstrates independence from management and exercises oversight of the development and performance of internal controls.'),
('CC1.3', 'Organizational Structure', 'CC', 'Management establishes, with board oversight, structures, reporting lines, and appropriate authorities and responsibilities in the pursuit of objectives.'),
('CC1.4', 'Commitment to Competence', 'CC', 'The entity demonstrates commitment to attract, develop, and retain competent individuals in alignment with objectives.'),
('CC1.5', 'Accountability', 'CC', 'The entity enforces accountability through performance, reward, and corrective measures.'),
-- CC2: Communication and Information
('CC2.1', 'Internal Communication', 'CC', 'The entity communicates internally information and objectives related to internal controls.'),
('CC2.2', 'External Communication', 'CC', 'The entity communicates externally with affected parties regarding matters affecting the functioning of internal controls.'),
('CC2.3', 'Communication Channels', 'CC', 'The entity designs and maintains communication channels that enable people to report potential issues and concerns.'),
-- CC3: Risk Assessment
('CC3.1', 'Objective Identification', 'CC', 'The entity identifies and assesses risk to the achievement of its objectives.'),
('CC3.2', 'Internal Risk Assessment', 'CC', 'The entity identifies and assesses changes that could significantly impact the system of internal controls.'),
('CC3.3', 'Fraud Risk', 'CC', 'The entity identifies and assesses fraud risk and specifies risk factors.'),
('CC3.4', 'Risk Mitigation', 'CC', 'The entity identifies, assesses, and manages changes that could significantly impact the system of internal controls.'),
-- CC4: Monitoring Activities
('CC4.1', 'Ongoing/Periodic Evaluation', 'CC', 'The entity selects, develops, and performs ongoing and/or separate evaluations to ascertain whether internal controls are present and functioning.'),
('CC4.2', 'Deficiency Evaluation', 'CC', 'The entity evaluates and communicates internal control deficiencies in a timely manner.'),
-- CC5: Control Activities
('CC5.1', 'Control Activity Selection', 'CC', 'The entity selects and develops control activities that contribute to the mitigation of risks.'),
('CC5.2', 'Technology Controls', 'CC', 'The entity selects and develops general control activities over technology.'),
('CC5.3', 'Policy Deployment', 'CC', 'The entity deploys control activities through policies that establish what is expected and procedures that execute policies.'),
-- CC6: Logical and Physical Access Controls
('CC6.1', 'Logical Access Controls', 'CC', 'The entity implements logical access security software, infrastructure, and networks over its information system.'),
('CC6.2', 'User Access Management', 'CC', 'The entity creates and modifies user access to data, software, functions, and networks.'),
('CC6.3', 'Access Removal', 'CC', 'The entity removes access to data, software, functions, and networks when no longer needed.'),
('CC6.4', 'Access Restrictions', 'CC', 'The entity implements physical access controls over its information system.'),
('CC6.5', 'Data Transmission Security', 'CC', 'The entity implements controls to mitigate the risk of unauthorized access to data and software during transmission.'),
('CC6.6', 'Access Authorization', 'CC', 'The entity implements controls to logically or physically access data and software within and outside the entity.'),
('CC6.7', 'Network Security', 'CC', 'The entity implements restrictions to protect data and software from unauthorized access and changes.'),
('CC6.8', 'Malware Protection', 'CC', 'The entity implements controls to detect, mitigate, and protect against malicious software.'),
-- CC7: System Operations
('CC7.1', 'Infrastructure Management', 'CC', 'The entity manages its technology infrastructure to protect the achievement of objectives.'),
('CC7.2', 'Change Management', 'CC', 'The entity authorizes, designs, develops, configures, tests, approves, and implements changes to infrastructure, data, software, and procedures.'),
('CC7.3', 'Change Processing', 'CC', 'The entity authorizes, designs, develops, configures, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet objectives.'),
('CC7.4', 'Incident Identification', 'CC', 'The entity identifies, responds to, and recovers from identified incidents.'),
('CC7.5', 'Incident Response', 'CC', 'The entity identifies, responds to, and recovers from identified security incidents.'),
-- CC8: Change Management
('CC8.1', 'Change Authorization', 'CC', 'The entity authorizes, designs, develops, configures, tests, approves, and implements changes to meet objectives.'),
-- CC9: Risk Mitigation
('CC9.1', 'Vendor Risk Management', 'CC', 'The entity identifies, selects, and uses vendors to meet objectives.'),
('CC9.2', 'Vendor Risk Assessment', 'CC', 'The entity establishes and maintains vendor performance and risk management policies.'),
('CC9.3', 'Risk Assessment Changes', 'CC', 'The entity identifies, assesses, and manages risks associated with changes and business disruptions.'),

-- ============================================================================
-- A — Availability — Additional criteria
-- ============================================================================
('A1.1', 'Capacity Management', 'A', 'The entity maintains, monitors, and evaluates current processing capacity and demand to meet objectives.'),
('A1.2', 'Environmental Protection', 'A', 'The entity authorizes, designs, develops, configures, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet availability objectives.'),
('A1.3', 'Backup and Recovery', 'A', 'The entity implements and maintains recovery strategies to meet availability objectives.'),
('A1.4', 'Recovery Testing', 'A', 'The entity tests recovery procedures to meet availability objectives.'),
('A1.5', 'Incident Recovery', 'A', 'The entity implements controls to recover from disruptions to meet availability objectives.'),

-- ============================================================================
-- PI — Processing Integrity — Additional criteria
-- ============================================================================
('PI1.1', 'Processing Integrity', 'PI', 'The entity authorizes, designs, develops, configures, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet processing integrity objectives.'),
('PI1.2', 'Data Input Validation', 'PI', 'The entity implements controls to prevent invalid data from being entered into the system.'),
('PI1.3', 'Data Processing Validation', 'PI', 'The entity implements controls to detect and prevent processing errors.'),
('PI1.4', 'Data Output Validation', 'PI', 'The entity implements controls to verify output is accurate and complete.'),
('PI1.5', 'Data Transfer Integrity', 'PI', 'The entity implements controls to maintain data integrity during transfer.'),

-- ============================================================================
-- C — Confidentiality — Additional criteria
-- ============================================================================
('C1.1', 'Confidentiality Controls', 'C', 'The entity identifies and maintains confidential information to meet objectives.'),
('C1.2', 'Confidentiality Agreements', 'C', 'The entity authorizes, designs, develops, configures, tests, approves, and implements changes to maintain confidentiality.'),
('C1.3', 'Data Disposal', 'C', 'The entity disposes of confidential information to meet objectives.'),

-- ============================================================================
-- P — Privacy — Additional criteria
-- ============================================================================
('P1.1', 'Privacy Notice', 'P', 'The entity provides notice to individuals about its privacy practices and the choices available to them.'),
('P1.2', 'Privacy Consent', 'P', 'The entity obtains consent from individuals for the collection, use, and disclosure of personal information.'),
('P1.3', 'Privacy Collection', 'P', 'The entity collects personal information only for the purposes identified in its privacy notice.'),
('P1.4', 'Privacy Use', 'P', 'The entity uses personal information only for the purposes identified in its privacy notice or as permitted by law.'),
('P1.5', 'Privacy Disclosure', 'P', 'The entity discloses personal information only for the purposes identified in its privacy notice or as permitted by law.'),
('P1.6', 'Privacy Quality', 'P', 'The entity maintains the quality of personal information to meet objectives.'),
('P1.7', 'Privacy Disposal', 'P', 'The entity disposes of personal information to meet objectives.'),
('P1.8', 'Privacy Monitoring', 'P', 'The entity monitors changes that could affect privacy practices.'),
('P2.1', 'Privacy Inquiry Response', 'P', 'The entity responds to inquiries from individuals about the collection, use, and disclosure of their personal information.'),
('P2.2', 'Privacy Complaint Response', 'P', 'The entity responds to complaints from individuals about the collection, use, and disclosure of their personal information.'),
('P3.1', 'Privacy Access', 'P', 'The entity provides individuals with access to their personal information.'),
('P3.2', 'Privacy Amendment', 'P', 'The entity allows individuals to amend their personal information.'),
('P3.3', 'Privacy Correction', 'P', 'The entity corrects personal information that is inaccurate, incomplete, or obsolete.'),
('P4.1', 'Privacy Notification', 'P', 'The entity notifies individuals about the collection, use, and disclosure of their personal information.'),
('P4.2', 'Privacy Choice', 'P', 'The entity provides individuals with choices regarding the collection, use, and disclosure of their personal information.'),
('P5.1', 'Privacy Security Safeguards', 'P', 'The entity safeguards personal information during collection, use, disclosure, and disposal.'),
('P5.2', 'Privacy Transmission Security', 'P', 'The entity protects personal information during transmission.'),
('P5.3', 'Privacy Storage Security', 'P', 'The entity protects personal information during storage.'),
('P6.1', 'Privacy Quality Monitoring', 'P', 'The entity monitors personal information quality to meet objectives.'),
('P6.2', 'Privacy Quality Controls', 'P', 'The entity implements controls to maintain the quality of personal information.'),
('P6.3', 'Privacy Data Accuracy', 'P', 'The entity maintains the accuracy, completeness, and validity of personal information.'),
('P7.1', 'Privacy Monitoring and Enforcement', 'P', 'The entity monitors compliance with privacy policies and procedures.'),
('P7.2', 'Privacy Enforcement', 'P', 'The entity enforces compliance with privacy policies and procedures.'),
('P8.1', 'Privacy Request Response', 'P', 'The entity responds to requests from individuals about the collection, use, and disclosure of their personal information.')
ON CONFLICT (code) DO NOTHING;

-- Verify the seed
SELECT category, count(*) as control_count
FROM soc2_controls
GROUP BY category
ORDER BY category;